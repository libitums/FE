// LLM 벤더 추상화 계층의 Anthropic 구현(운영). 키 없는 구현은 `companion-llm-fake.ts`.
// 핸들러는 `CompanionLlm`만 알고, 벤더를 바꾸면 이 두 파일만 바뀝니다(PRD §9 ADR 후보 2).

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";

import type {
  ChatSendEnv,
  CompanionLlm,
  LlmStep,
  LlmUsage,
  ReplyEffort,
  ReplyRequest,
} from "./chat-send.contract.ts";
import { replyEfforts } from "./chat-send.contract.ts";
import { streamReply, usageOf } from "./companion-llm-reply.ts";

export {
  historyMessages,
  replyThinking,
  serverFallbackOptions,
  systemSplit,
} from "./companion-llm-reply.ts";
import { judgementFrom, replyJudgeContent, replyJudgeSystem } from "./companion-eval-judge.ts";
import { fakeCompanionLlm } from "./companion-llm-fake.ts";
import {
  feedbackContent,
  feedbackFrom,
  feedbackSystemParts,
  learnedFrom,
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
import { suggestionContent, suggestionSystem } from "./companion-suggest-prompts.ts";
import {
  feedbackSchema,
  memorySchema,
  replyJudgeSchema,
  suggestionSchema,
  translationSchema,
  verdictSchema,
} from "./companion-llm-schemas.ts";
import { moderationInstruction } from "./companion-safety.ts";

export class StructuredUnavailable extends Error {}

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
    effort: "low" | "medium" = "low",
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
        output_config: { effort, format: zodOutputFormat(schema) },
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
    reply: (request: ReplyRequest) => streamReply(client, config, request, record),
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
        moderationInstruction(request.layer, request.ageBand, request.romanceLine),
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
      const learned = learnedFrom(result.learned_used, request.targets);
      const card = feedbackFrom(result, request.text);
      return learned.length > 0 ? { ...card, learnedUsed: learned } : card;
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
    async judgeReply(request) {
      // 평가 전용 채점자 — `companionLlmWithModel(env, judgeModel)`로 만든 계층이라 답장 모델(`config.model`)이 곧 채점 모델이다.
      const result = await parse(
        "judge",
        config.model,
        replyJudgeSchema,
        replyJudgeSystem,
        replyJudgeContent(request),
        request.signal,
        "medium",
      );
      return judgementFrom(result, request);
    },
    withUsage: (next) => anthropicCompanionLlm(config, next, client),
  };
}

export function companionLlmFor(env: ChatSendEnv): CompanionLlm {
  return env.llm.kind === "fake" ? fakeCompanionLlm() : anthropicCompanionLlm(env.llm);
}

/** 모든 단계를 한 모델로(`companion-eval`). `…@medium`(· `@high` · `@off`)이면 답변만 그 생각 깊이로. fake는 모델과 상관없이 가짜입니다. */
export function companionLlmWithModel(env: ChatSendEnv, choice: string): CompanionLlm {
  if (env.llm.kind === "fake") return fakeCompanionLlm();
  const [model = choice, effort] = choice.split("@");
  return anthropicCompanionLlm({
    ...env.llm,
    ...((replyEfforts as readonly (string | undefined)[]).includes(effort)
      ? { replyEffort: effort as ReplyEffort }
      : {}),
    model,
    moderationModel: model,
    feedbackModel: model,
    translationModel: model,
    suggestModel: model,
  });
}
