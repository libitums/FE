// 키보드 높이 · 슬롯 높이 · 슬롯 내용입니다(messenger-chat-ui spec §5.3).

import type { ComposerKeyboard } from "./keyboard-plan";

/** 값은 아래 바깥 인셋을 포함한 총높이(pt/dp)입니다 [추론 — 시안 Z5 260 · 기본 300]. */
export const CHAT_KEYBOARD_HEIGHTS = {
  table: [
    { belowScreenHeight: 700, height: 260 },
    { belowScreenHeight: 870, height: 300 },
  ],
  tallest: 320,
  plateMin: 200,
} as const;

export type ChatSlot =
  | { readonly kind: "closed" }
  | { readonly kind: "keyboard" }
  | { readonly kind: "ideas"; readonly picked: number | null };
export type PhoneFocus = "focused" | "blurred";
export type ChatSlotContent = "closed" | "learning-keyboard" | "phone-spacer" | "ideas";

export function resolveChatKeyboardHeight(input: {
  readonly stored: number | null;
  readonly screenHeight: number;
  readonly bottomInset: number;
}): number {
  const { stored, screenHeight, bottomInset } = input;
  const floor = CHAT_KEYBOARD_HEIGHTS.plateMin + Math.max(bottomInset, 0);
  const base =
    stored !== null && Number.isFinite(stored) && stored > 0
      ? stored
      : tableHeight(Number.isFinite(screenHeight) && screenHeight > 0 ? screenHeight : null);
  return Math.max(base, floor);
}

function tableHeight(screenHeight: number | null): number {
  const { table, tallest } = CHAT_KEYBOARD_HEIGHTS;
  if (screenHeight === null) return table[0].height;
  const row = table.find((entry) => screenHeight < entry.belowScreenHeight);
  return row === undefined ? tallest : row.height;
}

export function chatKeyboardSlotHeight(input: {
  readonly keyboard: ComposerKeyboard;
  readonly slot: ChatSlot;
  readonly phoneFocus: PhoneFocus;
  readonly underlay: "none" | "learning";
  readonly height: number;
  readonly bottomInset: number;
}): number {
  const { keyboard, slot, phoneFocus, underlay, height, bottomInset } = input;
  // 닫힌 자리는 바닥 인셋만 남습니다(방은 키보드가 닫힌 채 열립니다).
  if (slot.kind === "closed") return bottomInset;
  if (slot.kind === "ideas" || keyboard === "learning") return height;
  // 휴대폰: 학습 키보드를 깔아 둔 동안(바꾸는 중)은 뛰지 않게 자리를 지키고, 그 뒤에는 키보드가 내려가 있으면(blurred)
  // 토글이 있어도 빈 자리를 남기지 않습니다(리뷰 #5).
  if (underlay === "learning") return height;
  return phoneFocus === "focused" ? height : bottomInset;
}

// ChatRoomState를 가져오면 chat-room-state와 순환하므로 읽는 세 칸을 같은 모양으로 적습니다
// (Pick<ChatRoomState, "keyboard" | "underlay" | "slot">과 구조가 같아 그대로 넘어갑니다).
export function chatSlotContent(state: {
  readonly keyboard: ComposerKeyboard;
  readonly underlay: "none" | "learning";
  readonly slot: ChatSlot;
}): ChatSlotContent {
  if (state.slot.kind === "closed") return "closed";
  if (state.slot.kind === "ideas") return "ideas";
  if (state.keyboard === "learning" || state.underlay === "learning") return "learning-keyboard";
  return "phone-spacer";
}
