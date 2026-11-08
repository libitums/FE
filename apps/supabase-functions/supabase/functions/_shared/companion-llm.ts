// LLM 벤더 추상화 계층의 구현 둘: Anthropic(운영)과 fake(키 없는 로컬 · 플레이그라운드 · 테스트).
// 핸들러는 `CompanionLlm`만 알고, 벤더를 바꾸면 이 파일만 바뀝니다(PRD §9 ADR 후보 2).

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

import type {
  ChatSendEnv,
  CompanionLlm,
  ModerationRequest,
  ModerationVerdict,
  ReplyRequest,
} from "./chat-send.contract.ts";
import { segmentsToTagged } from "./companion-segments.ts";
import { moderationCategories, moderationInstruction } from "./companion-safety.ts";

/** 시스템 프롬프트의 두 부분 사이 구분자. 핸들러가 앞(고정) · 뒤(유저별)를 이 줄로 잇습니다. */
export const systemSplit = "\n\n<<<DYNAMIC>>>\n\n";

const verdictSchema = z.object({
  category: z.enum(moderationCategories),
  action: z.enum(["allow", "block", "crisis"]),
});

export class ModerationUnavailable extends Error {}

function historyMessages(request: ReplyRequest): Anthropic.Beta.BetaMessageParam[] {
  const messages: Anthropic.Beta.BetaMessageParam[] = request.history.map((entry) =>
    entry.role === "user"
      ? { role: "user", content: entry.text }
      : { role: "assistant", content: segmentsToTagged(entry.segments) },
  );
  messages.push({ role: "user", content: request.userText });
  return messages;
}

export function anthropicCompanionLlm(
  config: Extract<ChatSendEnv["llm"], { kind: "anthropic" }>,
): CompanionLlm {
  // 재시도는 핸들러가 정합니다(조각을 보내기 전에만 한 번 — API §2.1).
  const client = new Anthropic({ apiKey: config.apiKey, maxRetries: 0 });

  return {
    model: config.model,
    async *reply(request) {
      const [stable, dynamic = ""] = request.system.split(systemSplit);
      const stream = client.beta.messages.stream(
        {
          model: config.model,
          max_tokens: 2000,
          // 채팅은 짧고 빨라야 합니다 — 생각 깊이를 낮춥니다.
          output_config: { effort: "low" },
          // 정책 거절이 나면 서버가 다른 모델로 같은 요청을 다시 돌립니다.
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
          system: [
            { type: "text", text: stable ?? "", cache_control: { type: "ephemeral" } },
            { type: "text", text: dynamic },
          ],
          messages: historyMessages(request),
        },
        { signal: request.signal },
      );
      for await (const event of stream) {
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
          yield event.delta.text;
        }
      }
      const final = await stream.finalMessage();
      if (final.stop_reason === "refusal") throw new Error("refusal");
    },
    async moderate(request) {
      const context =
        request.context === null ? "" : `Learner's message for context:\n${request.context}\n\n`;
      const response = await client.messages.parse(
        {
          model: config.moderationModel,
          max_tokens: 1000,
          output_config: { effort: "low", format: zodOutputFormat(verdictSchema) },
          system: moderationInstruction(request.layer, request.ageBand),
          messages: [{ role: "user", content: `${context}Text to review:\n${request.text}` }],
        },
        { signal: request.signal },
      );
      if (response.stop_reason === "refusal" || response.parsed_output === null) {
        throw new ModerationUnavailable(String(response.stop_reason));
      }
      const verdict = response.parsed_output;
      // 위기는 유저 메시지에서만 판정합니다. 캐릭터 답이 위기로 나오면 차단으로 다룹니다.
      if (verdict.action === "crisis" && request.layer !== "input")
        return { category: verdict.category, action: "block" };
      return verdict;
    },
  };
}

// ------------------------------------------------------------------ fake

const crisisWords = ["죽고 싶", "자살", "kill myself", "suicide", "end my life"];
const blockWords = ["[block]", "사랑해", "섹스", "sex"];

/**
 * 키 없이 도는 결정적 계층입니다. 답은 유저 글을 받아 주는 덕수쌤식 두 줄이고, 검사는 낱말 목록입니다.
 * `[slow]`가 들어가면 조각 사이를 늦춰 스트리밍을 눈으로 볼 수 있게 합니다.
 */
export function fakeCompanionLlm(): CompanionLlm {
  return {
    model: "fake",
    async *reply(request: ReplyRequest) {
      const slow = request.userText.includes("[slow]");
      const echo = request.userText.replace("[slow]", "").trim().slice(0, 40);
      const lines = [
        "@action 이동식 칠판을 끌고 온다",
        `@speech 오, '${echo}'! 좋아요, 좋아요!`,
        "@speech 그럼 퀴즈! 소 더하기 고기는?",
      ];
      for (const line of lines) {
        for (const piece of [`${line.slice(0, 8)}`, `${line.slice(8)}\n`]) {
          if (request.signal.aborted) throw new Error("aborted");
          if (slow) await new Promise((resolve) => setTimeout(resolve, 150));
          yield piece;
        }
      }
    },
    async moderate(request: ModerationRequest): Promise<ModerationVerdict> {
      const text = request.text.toLowerCase();
      if (request.layer === "input" && crisisWords.some((word) => text.includes(word))) {
        return { category: "self_harm", action: "crisis" };
      }
      if (blockWords.some((word) => text.includes(word)))
        return { category: "romance", action: "block" };
      return { category: "safe", action: "allow" };
    },
  };
}

export function companionLlmFor(env: ChatSendEnv): CompanionLlm {
  return env.llm.kind === "fake" ? fakeCompanionLlm() : anthropicCompanionLlm(env.llm);
}
