// 비회원 로그인 권유 판정입니다(ADR-0166). 순수 — 방의 동작 하나가 계정을 요구하는지만 봅니다.

import type { ChatRoomAction } from "./chat-room-state";

/** 권유가 뜬 자리 — 이벤트 `chat_sign_in_prompt_closed`의 `trigger`입니다. */
export type GuestGateTrigger = "send" | "media" | "menu" | "coins" | "add_friend";

/**
 * 비회원이 이 동작을 하면 권유를 띄울지 — 띄우면 그 자리, 아니면 null. 겹침 가운데 더보기 펼침 · 사진 크게 보기만 그대로 열고,
 * 사진 · 음성 요청은 media, 엽전 상점은 coins, 그 밖(사이드바 · 다시 만들기 · 신고 · 평가 · 피드백 방식 등)은 menu입니다.
 */
export function guestGateOf(action: ChatRoomAction): GuestGateTrigger | null {
  if (action.type !== "open-overlay") return null;
  switch (action.overlay.kind) {
    case "more-menu":
    case "photo":
      return null;
    case "ask-media":
      return "media";
    case "coin-shop":
      return "coins";
    default:
      return "menu";
  }
}
