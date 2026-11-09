// 키보드 규칙입니다(messenger-chat-ui spec §5.2). 문맥 × 한국어 키보드 탐지 → 처음 키보드 · 토글.

import type { KoreanKeyboardPresence } from "./keyboard-ports";

export type KeyboardContext = "lesson" | "chat";
export type ComposerKeyboard = "learning" | "phone";
export type KeyboardPlan = {
  readonly initial: ComposerKeyboard;
  readonly toggle: "shown" | "hidden";
};

export function keyboardPlanFor(
  context: KeyboardContext,
  presence: KoreanKeyboardPresence,
): KeyboardPlan {
  if (context === "lesson") return { initial: "learning", toggle: "hidden" };
  if (presence === "present") return { initial: "phone", toggle: "hidden" };
  return { initial: "learning", toggle: "shown" };
}
