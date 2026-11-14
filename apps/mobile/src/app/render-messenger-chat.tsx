// 메신저 탭의 두 화면을 결선 값으로 그립니다(messenger-chat-ui spec §7.1). 키보드 포트는 1단계 고정값입니다.

import { keyboardDockEdgesOf } from "../lib/keyboard-dock";
import { uiCopyFor } from "../lib/ui-copy";
import {
  emptyKeyboardHeightStore,
  unknownKoreanKeyboardProbe,
} from "../screens/messenger-chat/keyboard-ports";
import { ChatEventsContext } from "../screens/messenger-chat/chat-events";
import { ChatMemoriesScreen } from "../screens/messenger-chat/ChatMemoriesScreen";
import { ChatSettingsScreen } from "../screens/messenger-chat/ChatSettingsScreen";
import { MessengerChatScreen } from "../screens/messenger-chat/MessengerChatScreen";
import { MessengerListScreen } from "../screens/messenger-chat/MessengerListScreen";
import type { MessengerListNotice } from "../screens/messenger-chat/messenger-list-notice";
import { isTesterAccessActive } from "../lib/tester-access";
import {
  messengerAccessOf,
  type MessengerAccess,
} from "../screens/messenger-chat/messenger-access";
import type { ScreenWiring } from "./screen-wiring";

/** 메신저 탭 접근(ADR-0128) — 계정 상태와 시험 계정 표시(ADR-0085, 렌더마다 세션 훅이 맞춘 값)로 정합니다. */
export function messengerAccessFor(wiring: ScreenWiring): MessengerAccess {
  return messengerAccessOf(wiring.accountState, isTesterAccessActive());
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
        keyboardHeightStore={emptyKeyboardHeightStore}
        edges={keyboardDockEdgesOf(wiring.safeAreaInsets)}
        learnerName={learnerNameOf(wiring)}
        wallet={chat.wallet}
        turns={chat.turns}
        tier={chat.tier}
        planOffer={wiring.plans?.messengerOffer}
        now={chat.now}
        onExit={chat.onExitChatRoom}
        onOpenMemories={chat.onOpenMemories}
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
