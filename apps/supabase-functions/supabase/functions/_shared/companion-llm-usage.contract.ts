// LLM 사용량의 어휘 — `chat-send.contract.ts`가 다시 내보냅니다(그 파일의 줄 제한 때문에 따로 둠). 기록은 `companion-usage.ts`.

import type { MissionLlmStep } from "./mission-llm.contract.ts";

/** LLM 호출 단계 — 사용량 기록의 이름. 미션 채점 · 힌트(ADR-0193)도 같은 기록에 남긴다. */
export type LlmStep =
  | "reply"
  | "moderation_input"
  | "moderation_output"
  | "feedback"
  | "translation"
  | "memory"
  | "summary"
  | "suggestions"
  | "judge"
  | MissionLlmStep;

/** 호출 하나의 토큰 사용량(API 응답의 usage). 캐시 쓰기 · 읽기는 입력과 따로 센다. */
export type LlmUsage = {
  readonly step: LlmStep;
  readonly model: string;
  readonly inputTokens: number;
  readonly cacheReadTokens: number;
  readonly cacheWriteTokens: number;
  readonly outputTokens: number;
};
