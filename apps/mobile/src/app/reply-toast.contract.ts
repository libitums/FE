// 답장 도착 토스트의 계약입니다(ADR-0200) — 채팅 목록 · 그 인물의 방 밖에서 인물의 새 말이 오면 화면 위에 잠깐 알립니다.
// 판정은 순수 함수(`reply-toast.ts`)가, 그리기는 `ReplyToast.tsx`가, 결선은 `use-reply-toast.tsx`가 집니다.

/** 이 답이 내 말에 대한 답인가(`reply`) · 인물이 먼저 보낸 말인가(`proactive`) — 바로 앞 미리보기 줄이 내 글이면 답. */
export type ReplyToastKind = "reply" | "proactive";

/** 출처의 한 방에 안 읽음이 하나 오른 것 — 답 하나(한 턴)에 하나입니다. */
export type ReplyArrival = {
  readonly roomId: string;
  readonly characterId: string;
  readonly kind: ReplyToastKind;
};

/**
 * 지금 화면에서 도착을 어떻게 다루나.
 * `show` 바로 띄움 · `defer` 레슨 중이라 모아 둠 · `list` 채팅 목록(버림, 미룬 것도 버림) ·
 * `room` 그 방(그 인물 것만 버림) · `off` 앱 구간 밖 · 메신저를 못 여는 계정(버림).
 */
export type ReplyToastPlace =
  | { readonly kind: "show" }
  | { readonly kind: "defer" }
  | { readonly kind: "list" }
  | { readonly kind: "room"; readonly roomId: string }
  | { readonly kind: "off" };

/** 떠 있는 카드 하나 — 인물마다 하나. `key`는 설 때 · 갈아 끼울 때마다 새 값(그 카드의 4초를 새로 셈). */
export type ReplyToastCard = {
  readonly key: number;
  readonly roomId: string;
  readonly characterId: string;
  readonly kind: ReplyToastKind;
  /** 레슨 중 미뤘다가 띄운 카드인가(이벤트). */
  readonly deferred: boolean;
};

export type ReplyToastState = {
  /** 쌓인 카드 — 맨 앞이 맨 위(가장 새것). 최대 `REPLY_TOAST_STACK`장. */
  readonly cards: readonly ReplyToastCard[];
  /** 장 수를 넘거나 상한에 걸려 카드로 서지 못한 인물 수 — 맨 아래 카드의 「+N」. 맨 아래 카드가 닫히면 0. */
  readonly more: number;
  /** 레슨 중에 온 도착 — 레슨 밖으로 나오면 인물별 카드로 한꺼번에 띄웁니다. */
  readonly deferred: readonly ReplyArrival[];
  /** 새 카드가 선 시각(ms) — 1분에 3번 상한(카드 단위). */
  readonly shownAt: readonly number[];
  readonly nextKey: number;
};

export type ReplyToastAction =
  | {
      readonly type: "arrive";
      readonly arrivals: readonly ReplyArrival[];
      readonly place: ReplyToastPlace;
      readonly now: number;
    }
  | { readonly type: "place"; readonly place: ReplyToastPlace; readonly now: number }
  /** 그 카드만 닫음(4초 · 위로 밀기 · ×). */
  | { readonly type: "dismiss"; readonly key: number }
  /** 모든 카드를 닫음(카드를 눌러 방으로 감). */
  | { readonly type: "clear" };

/** 자동으로 올라가기까지(ms). */
export const REPLY_TOAST_MS = 4000;
/** 한 번에 쌓이는 카드 최대 수 — 넘으면 맨 아래 카드의 「+N」으로 합칩니다. */
export const REPLY_TOAST_STACK = 3;
/** 1분에 새 카드 최대 수. 넘으면 새 카드를 세우지 않고 떠 있는 맨 아래 카드의 「+N」에 더합니다(없으면 목록의 안 읽음 숫자로만). */
export const REPLY_TOAST_LIMIT = 3;
export const REPLY_TOAST_WINDOW_MS = 60_000;
/** 앱이 앞으로 돌아온 뒤 이 시간 안에 온 도착은 뒤에 있는 동안 온 것으로 보고 띄우지 않습니다(시스템 푸시가 이미 알림). */
export const REPLY_TOAST_RESUME_QUIET_MS = 3000;
/** 위로 이만큼(pt) 밀면 닫힘. */
export const REPLY_TOAST_SWIPE_PT = 24;

export const replyToastTestIds = {
  stack: "reply-toast-stack",
  card: "reply-toast",
  open: "reply-toast-open",
  close: "reply-toast-close",
  more: "reply-toast-more",
  preview: "reply-toast-preview",
} as const;
