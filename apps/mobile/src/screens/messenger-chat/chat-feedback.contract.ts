// 교정 카드 · 다시 보내기 · 답 평가의 계약입니다(ADR-0129) — 서버 고정 카드(컴패니언 명세 §4.2) · companion_rate_message 모양.

/** 연필 카드의 종류 — 고침 · 더 자연스러운 말 · 모국어 → 한국어. 제목이 이것을 말한다. */
export type ChatCorrectionKind = "correction" | "better" | "l1_to_ko";
export type ChatCorrectionChange = { readonly start: number; readonly end: number };
/** 고친 곳 하나 — 원래 조각 · 고친 조각 · 이유(사용자 언어). */
export type ChatCorrectionItem = {
  readonly original: string;
  readonly corrected: string;
  readonly reason: string;
};
/** 더 나은 표현 — 글 · 뜻 · 설명(사용자 언어). */
export type ChatBetter = {
  readonly text: string;
  readonly meaning: string;
  readonly explanation: string;
};
export type ChatCorrection = {
  readonly kind: ChatCorrectionKind;
  /** 올바른 문장 전체. */
  readonly corrected: string;
  /** `corrected` 안 바뀐 범위(코드 포인트) — 앱이 강조에 쓴다. */
  readonly changes: readonly ChatCorrectionChange[];
  readonly items: readonly ChatCorrectionItem[];
  readonly better: ChatBetter | null;
  /** `corrected`의 뜻. l1_to_ko는 늘 있다. */
  readonly meaning: string | null;
};

/** 👎 이유 — 서버 p_reasons 다섯. */
export type ChatRatingReason =
  | "awkward_korean"
  | "out_of_character"
  | "too_hard"
  | "uncomfortable"
  | "other";
export type ChatRating =
  | { readonly value: "up" }
  | {
      readonly value: "down";
      readonly reasons: readonly ChatRatingReason[];
      /** 0~200자, 없으면 null. */
      readonly note: string | null;
    };

/** 메신저 문구 표의 `feedback` 칸입니다. */
export type FeedbackCopy = {
  readonly titles: Readonly<Record<ChatCorrectionKind, string>>;
  readonly sendCorrected: string;
  readonly sendInKorean: string;
  readonly cardLabel: (title: string, text: string, detail: string) => string;
  readonly good: string;
  readonly bad: string;
  readonly goodSelected: string;
  readonly badSelected: string;
  readonly liked: string;
  readonly flagged: string;
  readonly sheet: {
    readonly title: string;
    readonly body: (name: string) => string;
    readonly reasons: Readonly<Record<ChatRatingReason, (name: string) => string>>;
    readonly reportPrompt: string;
    readonly report: string;
    readonly noteLabel: string;
    readonly notePlaceholder: string;
    readonly send: string;
    readonly close: string;
  };
};

const feedback = (suffix: string): string => `messenger-chat-${suffix}`;

export const chatFeedbackTestIds = {
  card: feedback("fix-card"),
  cardContent: feedback("fix-card-content"),
  cardTitle: feedback("fix-card-title"),
  cardSegment: (index: number): string => feedback(`fix-card-seg-${index}`),
  cardItem: (index: number): string => feedback(`fix-card-item-${index}`),
  cardBetter: feedback("fix-card-better"),
  cardMeaning: feedback("fix-card-meaning"),
  resend: feedback("fix-card-resend"),
  ratingGood: feedback("rating-good"),
  ratingBad: feedback("rating-bad"),
  ratingResult: feedback("rating-result"),
  sheet: feedback("rating-sheet"),
  sheetReason: (reason: ChatRatingReason): string => feedback(`rating-reason-${reason}`),
  sheetReport: feedback("rating-report"),
  sheetNote: feedback("rating-note"),
} as const;
