// LLM 벤더 추상화 계층의 Anthropic 구현(운영). 키 없는 구현은 `companion-llm-fake.ts`.
// 핸들러는 `CompanionLlm`만 알고, 벤더를 바꾸면 이 두 파일만 바뀝니다(PRD §9 ADR 후보 2).

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";

import type {
  ChatSendEnv,
  CompanionLlm,
  HistoryEntry,
  LlmStep,
  LlmUsage,
  ReplyRequest,
} from "./chat-send.contract.ts";
import { fakeCompanionLlm } from "./companion-llm-fake.ts";
import {
  feedbackContent,
  feedbackFrom,
  feedbackSystemParts,
  translationContent,
  translationSystem,
} from "./companion-llm-prompts.ts";
import {
  memoryContent,
  memoryOpsFrom,
  memorySystem,
  summaryContent,
  summarySystem,
} from "./companion-memory-prompts.ts";
import { segmentsToTagged } from "./companion-segments.ts";
import { suggestionContent, suggestionSystem } from "./companion-suggest-prompts.ts";
import {
  feedbackSchema,
  memorySchema,
  suggestionSchema,
  translationSchema,
  verdictSchema,
} from "./companion-llm-schemas.ts";
import { moderationInstruction } from "./companion-safety.ts";

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

/**
 * 지난 대화 + 이번 유저 말(+ 이번 턴 지시). 지난 대화의 마지막 메시지에 캐시 표시를 단다 — 지난 대화는 요약 사이에 뒤로 붙기만 하므로
 * (`companion_begin_turn`이 마지막 요약 뒤 메시지를 준다) 다음 턴에는 여기까지가 캐시에서 읽힌다. 이번 턴 지시는 그 뒤의 system 메시지라
 * 앞부분을 바꾸지 않는다.
 */
export function historyMessages(
  history: readonly HistoryEntry[],
  userText: string,
  directive: string | null = null,
): Anthropic.Beta.BetaMessageParam[] {
  const messages: Anthropic.Beta.BetaMessageParam[] = history.map((entry, index) => {
    const text = entry.role === "user" ? entry.text : segmentsToTagged(entry.segments);
    const content =
      index === history.length - 1
        ? [{ type: "text" as const, text, cache_control: { type: "ephemeral" as const } }]
        : text;
    return { role: entry.role, content };
  });
  messages.push({ role: "user", content: userText });
  if (directive !== null && directive !== "") messages.push({ role: "system", content: directive });
  return messages;
}

type ResponseUsage = {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens: number | null;
  cache_creation_input_tokens: number | null;
};

/** 응답의 usage → 기록 한 건. 캐시 칸은 null일 수 있고, usage가 없으면(대역) 기록하지 않는다. */
function usageOf(step: LlmStep, model: string, usage: ResponseUsage | undefined): LlmUsage | null {
  if (usage === undefined) return null;
  return {
    step,
    model,
    inputTokens: usage.input_tokens,
    cacheReadTokens: usage.cache_read_input_tokens ?? 0,
    cacheWriteTokens: usage.cache_creation_input_tokens ?? 0,
    outputTokens: usage.output_tokens,
  };
}

export function anthropicCompanionLlm(
  config: Extract<ChatSendEnv["llm"], { kind: "anthropic" }>,
  onUsage: (usage: LlmUsage) => void = () => {},
  // 재시도는 핸들러가 정합니다(조각을 보내기 전에만 한 번 — API §2.1).
  client: Anthropic = new Anthropic({ apiKey: config.apiKey, maxRetries: 0 }),
): CompanionLlm {
  const record = (usage: LlmUsage | null) => {
    if (usage !== null) onUsage(usage);
  };
  // 시스템 글은 단계마다(검사는 층 · 연령대, 피드백은 언어 · 말투 단계마다) 같고 바뀌는 글은 user 쪽이라 캐시 표시를 단다.
  // Claude 5 세대의 캐시 최소 길이(512토큰)보다 짧은 글은 표시가 있어도 그냥 캐시되지 않는다.
  async function parse<T>(
    step: LlmStep,
    model: string,
    schema: z.ZodType<T>,
    system: string | { stable: string; dynamic: string },
    content: string,
    signal: AbortSignal,
  ): Promise<T> {
    const blocks: Anthropic.TextBlockParam[] =
      typeof system === "string"
        ? [{ type: "text", text: system, cache_control: { type: "ephemeral" } }]
        : [
            { type: "text", text: system.stable, cache_control: { type: "ephemeral" } },
            { type: "text", text: system.dynamic },
          ];
    const response = await client.messages.parse(
      {
        model,
        max_tokens: 2000,
        output_config: { effort: "low", format: zodOutputFormat(schema) },
        system: blocks,
        messages: [{ role: "user", content }],
      },
      { signal },
    );
    record(usageOf(step, model, response.usage));
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
          messages: historyMessages(request.history, request.userText, request.directive ?? null),
        },
        { signal: request.signal },
      );
      for await (const event of stream) {
        if (event.type === "content_block_delta" && event.delta.type === "text_delta")
          yield event.delta.text;
      }
      const final = await stream.finalMessage();
      record(usageOf("reply", config.model, final.usage));
      if (final.stop_reason === "refusal") throw new Error("refusal");
    },
    async moderate(request) {
      const label =
        request.layer === "input"
          ? "The character's previous message, for context only"
          : "Learner's message for context";
      const context = request.context === null ? "" : `${label}:\n${request.context}\n\n`;
      const verdict = await parse(
        request.layer === "input" ? "moderation_input" : "moderation_output",
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
      const result = await parse(
        "feedback",
        config.feedbackModel,
        feedbackSchema,
        feedbackSystemParts(request),
        feedbackContent(request),
        request.signal,
      );
      return feedbackFrom(result, request.text);
    },
    async translate(request) {
      const result = await parse(
        "translation",
        config.translationModel,
        translationSchema,
        translationSystem(request.l1, request.segments.length),
        translationContent(request),
        request.signal,
      );
      return result.lines;
    },
    async extractMemories(request) {
      const result = await parse(
        "memory",
        config.moderationModel,
        memorySchema,
        memorySystem(request.minor),
        memoryContent(request),
        request.signal,
      );
      return memoryOpsFrom(result.ops, request.existing);
    },
    async summarize(request) {
      const response = await client.messages.create(
        {
          model: config.moderationModel,
          max_tokens: 1500,
          output_config: { effort: "low" },
          system: summarySystem,
          messages: [
            {
              role: "user",
              content: summaryContent(request),
            },
          ],
        },
        { signal: request.signal },
      );
      record(usageOf("summary", config.moderationModel, response.usage));
      const text = response.content
        .flatMap((block) => (block.type === "text" ? [block.text] : []))
        .join("")
        .trim();
      if (text === "") throw new StructuredUnavailable("empty summary");
      return text;
    },
    async suggest(request) {
      // Haiku에는 서버 쪽 대체 모델이 없지만 `parse`는 대체 옵션을 싣지 않으므로 모델과 상관없이 같은 호출이다.
      const result = await parse(
        "suggestions",
        config.suggestModel ?? config.moderationModel,
        suggestionSchema,
        suggestionSystem,
        suggestionContent(request),
        request.signal,
      );
      return result.items;
    },
    withUsage: (next) => anthropicCompanionLlm(config, next, client),
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
    translationModel: model,
    suggestModel: model,
  });
}
