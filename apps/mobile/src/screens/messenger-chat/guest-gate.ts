// 비회원 로그인 권유 판정입니다(ADR-0166). 순수 — 방의 동작 하나가 계정을 요구하는지만 봅니다.

import type { ChatRoomAction } from "./chat-room-state";
import type { ChatBirthYear } from "./chat-source.contract";
import type { UiCopy } from "../../lib/ui-copy.contract";

/** 권유가 뜬 자리 — 이벤트 `chat_sign_in_prompt_closed`의 `trigger`입니다. tickets는 머리 티켓 모달의 Get more tickets(2026-11-20). */
export type GuestGateTrigger = "send" | "media" | "menu" | "coins" | "add_friend" | "tickets";

/**
 * 비회원이 이 동작을 하면 권유를 띄울지 — 띄우면 그 자리, 아니면 null. 보기 패널 열기는 send. 겹침 가운데 더보기 펼침 · 사진 크게 보기 · 상대 프로필만 그대로 열고,
 * 사진 · 음성 요청은 media, 엽전 상점은 coins, 그 밖(사이드바 · 다시 만들기 · 신고 · 평가 · 피드백 방식 등)은 menu입니다.
 */
export function guestGateOf(action: ChatRoomAction): GuestGateTrigger | null {
  if (action.type === "open-ideas") return "send"; // 전구(Reply ideas) — 보내기와 같은 권유(2026-11-20)
  if (action.type !== "open-overlay") return null;
  switch (action.overlay.kind) {
    case "more-menu":
    case "photo":
    case "profile": // 상대 프로필 보기(ADR-0178 개정 ⟨대화방⟩) — 계정 동작이 아님
      return null;
    case "ask-media":
      return "media";
    case "coin-shop":
      return "coins";
    default:
      return "menu";
  }
}

/**
 * 대화상자 제목 · 본문 — 누른 자리에 맞춥니다(ADR-0166 확인 필요 2, 2026-11-20). 번들 천장(ADR-0149) 때문에 제목은 새 문구 대신 누른 기능의
 * 기존 이름(Get Yeopjeon · Chat settings · Start chatting · Get more tickets)이고, 본문은 메시지(`promptBody`) · 엽전/티켓(`promptKeepBody`) 둘입니다.
 */
export function signInPromptCopyOf(
  trigger: GuestGateTrigger,
  copy: UiCopy,
): { readonly title: string; readonly body: string } {
  const { access, album, room, suggested } = copy.messengerChat;
  switch (trigger) {
    case "coins":
      return { title: album.getCoins, body: access.promptKeepBody };
    case "tickets":
      return { title: copy.tickets.getMore, body: access.promptKeepBody };
    case "menu":
      return { title: room.settings, body: access.promptBody };
    case "add_friend":
      return { title: suggested.startChatting, body: access.promptBody };
    default:
      return { title: access.promptTitle, body: access.promptBody };
  }
}

/** 방을 열 때 생년 시트를 세우는가 — 비회원은 묻지 않고 로그인 뒤 회원 방에서 묻습니다(ADR-0166 확인 필요 1, 2026-11-20). */
export function asksBirthYearOnEntry(kind: ChatBirthYear["kind"], guest: boolean): boolean {
  return !guest && kind === "unasked";
}
