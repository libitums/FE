// 겹침이 닫힌 뒤 접근성 초점이 돌아갈 자리입니다(방 UI 상태 리듀서에서 나눔 — 300줄 상한).

import type { ChatOverlay } from "./chat-room-state";

export type ChatFocusOrigin =
  | "more"
  | "settings"
  | "snapshot-pill"
  | "voice-pill"
  | "sidebar-story-point"
  | "sidebar-delete"
  | "sidebar-coins"
  | "send"
  | "sidebar-birth-year"
  | "blocked-change-year"
  | "sidebar-feedback-mode"
  | "rating";

/** 겹침이 닫힌 뒤 접근성 초점이 돌아갈 자리입니다. */
export function focusOriginOf(closing: ChatOverlay): ChatFocusOrigin | null {
  switch (closing.kind) {
    case "none":
      return null;
    case "more-menu":
    case "regen":
      return "more";
    case "report":
      return closing.from === "rating" ? "rating" : "more";
    case "rate-down":
      return "rating";
    case "ask-media":
      return closing.media === "photo" ? "snapshot-pill" : "voice-pill";
    case "sidebar":
      return "settings";
    case "story-point":
      return "sidebar-story-point";
    case "delete-confirm":
      return "sidebar-delete";
    case "coin-shop":
      if (closing.from === "sidebar") return "sidebar-coins";
      if (closing.from === "send") return "send";
      return closing.from === "ask-photo" ? "snapshot-pill" : "voice-pill";
    case "feedback-mode":
      return "sidebar-feedback-mode";
    case "birth-year":
      if (closing.from === "sidebar") return "sidebar-birth-year";
      return closing.from === "blocked" ? "blocked-change-year" : null;
    default: {
      const unreachable: never = closing;
      return unreachable;
    }
  }
}
