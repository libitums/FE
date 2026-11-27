// 답변 호출의 계약(생각 깊이 · 요청 · 페르소나 대화 예시). `chat-send.contract.ts`가 다시 내보낸다(파일 길이 제한으로 나눔).

import type { HistoryEntry } from "./chat-send.contract.ts";

/**
 * 답변의 생각 깊이(`output_config.effort`). 채팅은 짧고 빨라야 해서 low가 기본입니다. `off`는 생각을 끄고(`thinking: disabled`) effort low —
 * Haiku 5.5만 받는다(Sonnet 5.5 · Opus 5.5는 400).
 */
export type ReplyEffort = "low" | "medium" | "high" | "off";
export const replyEfforts: readonly ReplyEffort[] = ["low", "medium", "high", "off"];

/** 페르소나 대화 예시 한 개 — 앞선 대화(있으면) · 학습자 말 · 캐릭터 답(태그 줄). */
export type PersonaExample = {
  readonly history?: readonly (readonly ["user" | "assistant", string])[];
  readonly learner: string;
  readonly reply: readonly string[];
};

export type ReplyRequest = {
  readonly system: string;
  readonly history: readonly HistoryEntry[];
  readonly userText: string;
  /**
   * 서버가 고른 이번 턴 지시(화제 전환 · 학습 표현 삽입). 시스템 프롬프트가 아니라 유저 말 뒤의 system 메시지로 실어
   * 앞부분(시스템 · 지난 대화)의 캐시를 깨지 않는다. 없으면 null · 생략.
   */
  readonly directive?: string | null;
  readonly signal: AbortSignal;
};
