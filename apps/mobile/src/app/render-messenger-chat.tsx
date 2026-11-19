// 메신저 탭의 두 화면을 결선 값으로 그립니다(messenger-chat-ui spec §7.1). 한국어 자판 탐지는 고정값(모름)이고,
// 휴대폰 키보드 높이는 입력 칸이 잰 값을 기기에 남깁니다(`deviceKeyboardHeightStore`).

import { keyboardDockEdgesOf } from "../lib/keyboard-dock";
import { uiCopyFor } from "../lib/ui-copy";
import { deviceKeyboardHeightStore } from "../screens/messenger-chat/chat-local-stores";
import { unknownKoreanKeyboardProbe } from "../screens/messenger-chat/keyboard-ports";
import { ChatEventsContext } from "../screens/messenger-chat/chat-events";
import { ChatAlbumScreen } from "../screens/messenger-chat/ChatAlbumScreen";
import { ChatMemoriesScreen } from "../screens/messenger-chat/ChatMemoriesScreen";
import { ChatSettingsScreen } from "../screens/messenger-chat/ChatSettingsScreen";
import { MessengerChatScreen } from "../screens/messenger-chat/MessengerChatScreen";
import { MessengerListScreen } from "../screens/messenger-chat/MessengerListScreen";
import type { MessengerListNotice } from "../screens/messenger-chat/messenger-list-notice";
import {
  messengerAccessOf,
  type MessengerAccess,
} from "../screens/messenger-chat/messenger-access";
import type { ScreenWiring } from "./screen-wiring";
import { suggestedFriendsPort } from "./suggested-friends-wiring";

/** 메신저 탭 접근(ADR-0128) — 계정 상태로만 정합니다(2026-11-17부터 시험 계정 표시는 보지 않습니다). */
export function messengerAccessFor(wiring: ScreenWiring): MessengerAccess {
  return messengerAccessOf(wiring.accountState);
}

/** 가입 직후 이름을 아직 모르면(빈 문자열 포함) 학습 메신저와 같이 「나」 문구를 씁니다 — 말풍선 화자는 비면 안 됩니다. */
function learnerNameOf(wiring: ScreenWiring): string {
  const name = wiring.learnerFill.name?.trim() ?? "";
  return name === "" ? uiCopyFor(wiring.entryLanguage).common.me : name;
}

export function renderMessengerList(wiring: ScreenWiring, notice: MessengerListNotice | null) {
  const chat = wiring.messengerChat;
  return (
    <ChatEventsContext.Provider value={{ sink: chat.eventSink, roomId: null }}>
      <MessengerListScreen
        source={chat.source}
        wallet={chat.wallet}
        onOpenRoom={chat.onOpenChatRoom}
        onGoToJourney={chat.onGoToJourney}
        onLayerChange={wiring.onScreenLayerChange}
        notice={notice}
        onNoticeShown={chat.onListNoticeShown}
        access={messengerAccessFor(wiring)}
        onSignIn={wiring.onSignIn}
        friends={suggestedFriendsPort()}
      />
    </ChatEventsContext.Provider>
  );
}

export function renderMessengerChat(roomId: string, wiring: ScreenWiring) {
  const chat = wiring.messengerChat;
  return (
    <ChatEventsContext.Provider value={{ sink: chat.eventSink, roomId }}>
      {/* 방마다 새로 섭니다 — 같은 자리에서 다른 방으로 바뀌어도 앞 방의 말풍선 도구 · 입력 · 턴 상태가 남지 않습니다. */}
      <MessengerChatScreen
        key={roomId}
        roomId={roomId}
        source={chat.source}
        keyboardProbe={unknownKoreanKeyboardProbe}
        keyboardHeightStore={deviceKeyboardHeightStore}
        edges={keyboardDockEdgesOf(wiring.safeAreaInsets)}
        learnerName={learnerNameOf(wiring)}
        wallet={chat.wallet}
        trial={chat.trial}
        tier={chat.tier}
        planOffer={wiring.plans?.messengerOffer}
        onExit={chat.onExitChatRoom}
        onOpenMemories={chat.onOpenMemories}
        onOpenAlbum={chat.onOpenAlbum}
        onOpenMyProfile={chat.onOpenMyProfile}
      />
    </ChatEventsContext.Provider>
  );
}

export function renderChatSettings(wiring: ScreenWiring) {
  const chat = wiring.messengerChat;
  return (
    <ChatSettingsScreen
      source={chat.source}
      onOpenSharedMemories={() => chat.onOpenMemories(null, null)}
      onBack={chat.onExitChatSettingsStack}
    />
  );
}

export function renderChatMemories(
  characterId: string | null,
  characterName: string | null,
  wiring: ScreenWiring,
) {
  const chat = wiring.messengerChat;
  return (
    <ChatMemoriesScreen
      source={chat.source}
      scope={characterId === null ? { kind: "shared" } : { kind: "character", characterId }}
      name={characterId === null ? null : characterName}
      onBack={chat.onExitChatSettingsStack}
    />
  );
}

/** 인물 앨범(ADR-0150) — 방 사이드바에서 쌓이고 뒤로 방으로 돌아갑니다. */
export function renderChatAlbum(roomId: string, characterName: string, wiring: ScreenWiring) {
  const chat = wiring.messengerChat;
  return (
    <ChatEventsContext.Provider value={{ sink: chat.eventSink, roomId }}>
      <ChatAlbumScreen
        source={chat.source}
        roomId={roomId}
        name={characterName}
        wallet={chat.wallet}
        now={chat.now}
        onBack={chat.onExitChatSettingsStack}
      />
    </ChatEventsContext.Provider>
  );
}
