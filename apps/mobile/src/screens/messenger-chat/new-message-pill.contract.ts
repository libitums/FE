// 「새 메시지 ↓」 알약 계약 — 위로 올려 읽는 중 상대 줄이 오면 로그 아래 가운데에 서는 알약과, 새 것 없이 멀리 올렸을 때의 ↓ 단추.

/** 셀 줄의 종류 — 마지막 새 줄이 사진 · 음성이면 문구가 바뀝니다. */
export type PillMedia = "message" | "photo" | "voice";

/** 떠나 있는 동안 온 상대 줄 — 수와 마지막 줄의 종류. */
export type PillArrival = { readonly count: number; readonly latest: PillMedia };

/** 로그 아래에 무엇을 세울지 — 알약 · ↓ 단추 · 없음. */
export type PillView =
  | { readonly kind: "pill"; readonly arrival: PillArrival }
  | { readonly kind: "latest" }
  | null;

export type NewMessagePillCopy = {
  /** 알약 문구 — 「New message」 · 「3 new messages」 · 「Sent a photo · 3 new」. */
  readonly label: (arrival: PillArrival) => string;
  /** 알약 낭독(단추). */
  readonly jump: string;
  /** ↓ 단추 낭독. */
  readonly latest: string;
};

export const newMessagePillTestIds = {
  pill: "messenger-chat-new-pill",
  latest: "messenger-chat-scroll-latest",
} as const;
