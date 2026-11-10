// 메시지별 피드백(교정 카드)의 서버 쪽 타입. `chat-send.contract.ts`가 다시 내보냅니다(PRD §3.5 · API §4.3).

import type { SpeechLevel } from "./companion-contract/index.ts";

export type FeedbackMode = "separate" | "natural" | "prefix";
export type FeedbackHistoryEntry = { readonly role: "user" | "assistant"; readonly text: string };
export type BanmalFeedback = "correction" | "better";

/** 조각 하나의 고침과 이유(학습자 언어로 한 문장). */
export type FeedbackItem = { original: string; corrected: string; reason: string };

/**
 * SSE `correction`의 본문에서 `userMessageId`를 뺀 것 — 고정 카드(계약 `correctionDataSchema`). 칸은 늘 모두 있다.
 * 앱 순서: 올바른 문장(`corrected`) → 고칠 점(`items` — 원문 표현 · 고친 표현 · 이유) → 더 나은 표현(`better` — 표현 · 뜻 · 설명).
 */
export type Feedback = {
  /** `skipped` — 만들지 않음(`reason: "suggestion"`: 추천 답변 칩을 그대로 보낸 메시지). */
  readonly status: "ok" | "none" | "unavailable" | "skipped";
  readonly reason?: "suggestion";
  readonly kind: "correction" | "better" | "l1_to_ko" | null;
  /** 학습자 메시지 그대로. */
  readonly original: string;
  /** 모든 고침을 적용한 올바른 · 자연스러운 한국어 문장 전체. `ok`면 늘 있다. */
  readonly corrected: string | null;
  /** 고칠 점마다 하나 — 한 메시지에 여럿일 수 있다. */
  readonly items: FeedbackItem[];
  /** 덧붙이는 다른 자연스러운 표현 — 분명히 도움이 될 때만. 뜻 · 설명은 학습자 언어. */
  readonly better: { text: string; meaning: string; explanation: string } | null;
  /** `corrected`의 뜻(학습자 언어). `l1_to_ko`면 늘 있다. */
  readonly meaning: string | null;
};

export type FeedbackRequest = {
  readonly text: string;
  /** 설명 · 뜻을 쓸 언어. 없으면 영어(PRD §3.5). */
  readonly l1: string | null;
  /** 바로 앞 캐릭터 말 — 대답으로서 자연스러운지 보려고. `history`가 있으면 그쪽이 맥락이다. */
  readonly previous: string | null;
  /** 최근 대화(오래된 것부터, 이번 유저 메시지 제외) — 맥락일 뿐 피드백 대상이 아니다. 비면 `previous`만. */
  readonly history: readonly FeedbackHistoryEntry[];
  /** 지금 관계의 말투 단계 — 존댓말 · 반말 일관성을 보려고. 모르면 null(말투 규칙을 건너뛴다). */
  readonly speechLevel: SpeechLevel | null;
  /** 상대 캐릭터(이름 · 역할 · 반말 피드백 종류) — 선생님 같은 상대에게 반말인지 보려고. */
  readonly character: {
    readonly name: string;
    readonly role: string | null;
    readonly banmalFeedback: BanmalFeedback;
  } | null;
  readonly signal: AbortSignal;
};
