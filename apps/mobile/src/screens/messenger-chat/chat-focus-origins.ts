// 겹침을 닫은 뒤 초점을 돌려보낼 자리 — 연 단추(초점 출처)마다 그 접근성 요소의 test-id입니다(`useChatRoom`이 씁니다).

import type { ChatFocusOrigin } from "./chat-overlay-focus";
import { chatFeedbackTestIds } from "./chat-feedback.contract";
import { chatSettingsTestIds } from "./chat-settings.contract";
import { chatTurnsTestIds as turnIds } from "./chat-turns.contract";
import { messengerChatTestIds as ids } from "./messenger-chat.contract";

export const originTestId: Readonly<Record<ChatFocusOrigin, string>> = {
  more: ids.more,
  settings: ids.settings,
  "snapshot-pill": ids.snapshot,
  "voice-pill": ids.snapVoice,
  "sidebar-story-point": ids.sidebarStoryPoint,
  "sidebar-clear": ids.sidebarClear,
  // 엽전 상점을 연 것은 사이드바의 「Get coins」 단추입니다(엽전 상자 전체가 아니라 접근성 요소인 단추에 id가 있습니다).
  "sidebar-coins": ids.sidebarGetCoins,
  // 1.5 초점 되돌림 자리 — 턴 표시 조각의 test-id입니다(spec §10).
  send: turnIds.coinSend,
  "sidebar-birth-year": ids.sidebarBirthYear,
  "blocked-change-year": ids.blockedChangeYear,
  "sidebar-feedback-mode": chatSettingsTestIds.sidebarFeedback,
  rating: chatFeedbackTestIds.ratingBad,
};
