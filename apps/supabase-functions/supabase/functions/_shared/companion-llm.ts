// LLM 벤더 추상화 계층의 Anthropic 구현(운영). 키 없는 구현은 `companion-llm-fake.ts`.
// 핸들러는 `CompanionLlm`만 알고, 벤더를 바꾸면 이 두 파일만 바뀝니다(PRD §9 ADR 후보 2).

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

import type {
  ChatSendEnv,
  CompanionLlm,
  Feedback,
  HistoryEntry,
  ReplyRequest,
} from "./chat-send.contract.ts";
import { fakeCompanionLlm } from "./companion-llm-fake.ts";
import { segmentsToPlain, segmentsToTagged } from "./companion-segments.ts";
import { moderationCategories, moderationInstruction } from "./companion-safety.ts";

/** 시스템 프롬프트의 두 부분 사이 구분자. 핸들러가 앞(고정) · 뒤(유저별)를 이 줄로 잇습니다. */
export const systemSplit = "\n\n<<<DYNAMIC>>>\n\n";

export class StructuredUnavailable extends Error {}

/**
 * 메인 답변의 서버 쪽 대체 모델 옵션. 정책 거절이 나면 서버가 다른 모델로 같은 요청을 다시 돌립니다.
 * Haiku 5.5에는 대체 모델이 없어 옵션을 실으면 요청이 거절되므로, `claude-haiku`로 시작하는 모델은 빼고 보냅니다.
 */
export function serverFallbackOptions(
  model: string,
): { betas: ["server-side-fallback-2026-07-01"]; fallbacks: "default" } | Record<never, never> {
  if (model.startsWith("claude-haiku")) return {};
  return { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" };
}

const verdictSchema = z.object({
  category: z.enum(moderationCategories),
  action: z.enum(["allow", "block", "crisis"]),
});

// 구조화 출력은 선택 칸 대신 nullable로 둡니다. 받은 뒤 null 칸을 지웁니다.
const feedbackSchema = z.object({
  status: z.enum(["ok", "none"]),
  kind: z.enum(["correction", "better", "l1_to_ko"]).nullable(),
  items: z
    .array(z.object({ original: z.string(), corrected: z.string(), reason: z.string() }))
    .nullable(),
  better: z.object({ text: z.string(), meaning: z.string(), explanation: z.string() }).nullable(),
  l1ToKo: z.object({ text: z.string(), meaning: z.string() }).nullable(),
});

const memorySchema = z.object({
  items: z.array(
    z.object({ kind: z.enum(["fact", "event"]), content: z.string(), shared: z.boolean() }),
  ),
});

function historyMessages(
  history: readonly HistoryEntry[],
  userText: string,
): Anthropic.Beta.BetaMessageParam[] {
  const messages: Anthropic.Beta.BetaMessageParam[] = history.map((entry) =>
    entry.role === "user"
      ? { role: "user", content: entry.text }
      : { role: "assistant", content: segmentsToTagged(entry.segments) },
  );
  messages.push({ role: "user", content: userText });
  return messages;
}

const transcript = (history: readonly HistoryEntry[]) =>
  history
    .map((entry) =>
      entry.role === "user"
        ? `학습자: ${entry.text}`
        : `캐릭터: ${segmentsToPlain(entry.segments)}`,
    )
    .join("\n");

export function anthropicCompanionLlm(
  config: Extract<ChatSendEnv["llm"], { kind: "anthropic" }>,
): CompanionLlm {
  // 재시도는 핸들러가 정합니다(조각을 보내기 전에만 한 번 — API §2.1).
  const client = new Anthropic({ apiKey: config.apiKey, maxRetries: 0 });

  async function parse<T>(
    model: string,
    schema: z.ZodType<T>,
    system: string,
    content: string,
    signal: AbortSignal,
  ): Promise<T> {
    const response = await client.messages.parse(
      {
        model,
        max_tokens: 2000,
        output_config: { effort: "low", format: zodOutputFormat(schema) },
        system,
        messages: [{ role: "user", content }],
      },
      { signal },
    );
    if (response.stop_reason === "refusal" || response.parsed_output === null) {
      throw new StructuredUnavailable(String(response.stop_reason));
    }
    return response.parsed_output as T;
  }

  return {
    model: config.model,
    async *reply(request: ReplyRequest) {
      const [stable, dynamic = ""] = request.system.split(systemSplit);
      const stream = client.beta.messages.stream(
        {
          model: config.model,
          max_tokens: 2000,
          // 채팅은 짧고 빨라야 합니다 — 생각 깊이를 낮춥니다.
          output_config: { effort: "low" },
          ...serverFallbackOptions(config.model),
          system: [
            { type: "text", text: stable ?? "", cache_control: { type: "ephemeral" } },
            { type: "text", text: dynamic },
          ],
          messages: historyMessages(request.history, request.userText),
        },
        { signal: request.signal },
      );
      for await (const event of stream) {
        if (event.type === "content_block_delta" && event.delta.type === "text_delta")
          yield event.delta.text;
      }
      const final = await stream.finalMessage();
      if (final.stop_reason === "refusal") throw new Error("refusal");
    },
    async moderate(request) {
      const context =
        request.context === null ? "" : `Learner's message for context:\n${request.context}\n\n`;
      const verdict = await parse(
        config.moderationModel,
        verdictSchema,
        moderationInstruction(request.layer, request.ageBand),
        `${context}Text to review:\n${request.text}`,
        request.signal,
      );
      // 위기는 유저 메시지에서만 판정합니다. 캐릭터 답이 위기로 나오면 차단으로 다룹니다.
      if (verdict.action === "crisis" && request.layer !== "input")
        return { category: verdict.category, action: "block" };
      return verdict;
    },
    async feedback(request) {
      const language = request.l1 ?? "en";
      const result = await parse(
        config.feedbackModel,
        feedbackSchema,
        `You give feedback on one chat message written by a Korean learner. Write reasons, meanings and explanations in the language with BCP 47 tag "${language}".
- If the message is entirely in another language (no Korean), use kind "l1_to_ko": how to say it naturally in Korean, plus its meaning.
- If the Korean has mistakes (grammar, particles, spelling, spacing that changes meaning, unnatural word choice), use kind "correction" with one item per mistake (original fragment, corrected fragment, short reason). You may also fill "better".
- If it is correct but could sound more natural, you may use kind "better".
- If it is fine, use status "none" and leave everything else null.
Keep reasons short (one sentence). Do not correct casual chat style that is natural.`,
        `${request.previous ? `The character just said: ${request.previous}\n` : ""}Learner's message: ${request.text}`,
        request.signal,
      );
      if (result.status === "none" || result.kind === null) return { status: "none" };
      const feedback: Feedback = {
        status: "ok",
        kind: result.kind,
        ...(result.items === null ? {} : { items: result.items }),
        ...(result.better === null ? {} : { better: result.better }),
        ...(result.l1ToKo === null ? {} : { l1ToKo: result.l1ToKo }),
      };
      return feedback;
    },
    async extractMemories(request) {
      const result = await parse(
        config.moderationModel,
        memorySchema,
        `You maintain long-term memory for a chat character. From the latest exchange, extract at most 3 new, durable facts about the learner (preferences, plans, life events) worth remembering in later conversations. Write each in short Korean.
- "shared": true if any character could know it (name, home country, hobbies, level), false if it only belongs to this conversation.
- Skip anything already in the existing memory, small talk, and anything about the character.
${request.minor ? "- The learner may be a minor: never store health, mental health, or emotional-state information.\n" : ""}- If nothing is worth remembering, return an empty list.`,
        `Existing memory:\n${request.existing.map((item) => `- ${item}`).join("\n") || "(none)"}\n\nLearner: ${request.userText}\nCharacter: ${request.reply}`,
        request.signal,
      );
      return result.items.slice(0, 3).filter((item) => item.content.trim() !== "");
    },
    async summarize(request) {
      const response = await client.messages.create(
        {
          model: config.moderationModel,
          max_tokens: 1500,
          output_config: { effort: "low" },
          system:
            "Summarize this Korean-learning chat for the character's memory in at most 6 short Korean sentences: what the learner shared, ongoing topics, and anything promised. Merge with the previous summary. No preamble.",
          messages: [
            {
              role: "user",
              content: `${request.previous ? `Previous summary:\n${request.previous}\n\n` : ""}Conversation:\n${transcript(request.messages)}`,
            },
          ],
        },
        { signal: request.signal },
      );
      const text = response.content
        .flatMap((block) => (block.type === "text" ? [block.text] : []))
        .join("")
        .trim();
      if (text === "") throw new StructuredUnavailable("empty summary");
      return text;
    },
  };
}

export function companionLlmFor(env: ChatSendEnv): CompanionLlm {
  return env.llm.kind === "fake" ? fakeCompanionLlm() : anthropicCompanionLlm(env.llm);
}

/** 모든 단계를 한 모델로 돌리는 계층(`companion-eval`의 모델 바꿔 보기). fake는 모델과 상관없이 가짜입니다. */
export function companionLlmWithModel(env: ChatSendEnv, model: string): CompanionLlm {
  if (env.llm.kind === "fake") return fakeCompanionLlm();
  return anthropicCompanionLlm({
    ...env.llm,
    model,
    moderationModel: model,
    feedbackModel: model,
  });
}
