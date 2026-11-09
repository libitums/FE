// 키보드 높이 · 슬롯 높이 · 슬롯 내용입니다(messenger-chat-ui spec §5.3).

import type { ComposerKeyboard, KeyboardPlan } from "./keyboard-plan";

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
  | { readonly kind: "keyboard" }
  | { readonly kind: "ideas"; readonly picked: number | null };
export type PhoneFocus = "focused" | "blurred";
export type ChatSlotContent = "learning-keyboard" | "phone-spacer" | "ideas";

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
  readonly plan: KeyboardPlan;
  readonly keyboard: ComposerKeyboard;
  readonly slot: ChatSlot;
  readonly phoneFocus: PhoneFocus;
  readonly height: number;
  readonly bottomInset: number;
}): number {
  const { plan, keyboard, slot, phoneFocus, height, bottomInset } = input;
  if (slot.kind === "ideas" || keyboard === "learning") return height;
  if (plan.toggle === "shown") return height;
  return phoneFocus === "focused" ? height : bottomInset;
}

// ChatRoomState를 가져오면 chat-room-state와 순환하므로 읽는 세 칸을 같은 모양으로 적습니다
// (Pick<ChatRoomState, "keyboard" | "underlay" | "slot">과 구조가 같아 그대로 넘어갑니다).
export function chatSlotContent(state: {
  readonly keyboard: ComposerKeyboard;
  readonly underlay: "none" | "learning";
  readonly slot: ChatSlot;
}): ChatSlotContent {
  if (state.slot.kind === "ideas") return "ideas";
  if (state.keyboard === "learning" || state.underlay === "learning") return "learning-keyboard";
  return "phone-spacer";
}
