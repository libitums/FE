// 메신저 탭의 두 화면을 결선 값으로 그립니다(messenger-chat-ui spec §7.1). 키보드 포트는 1단계 고정값입니다.

import { keyboardDockEdgesOf } from "../lib/keyboard-dock";
import { uiCopyFor } from "../lib/ui-copy";
import {
  emptyKeyboardHeightStore,
  unknownKoreanKeyboardProbe,
} from "../screens/messenger-chat/keyboard-ports";
import { MessengerChatScreen } from "../screens/messenger-chat/MessengerChatScreen";
import { MessengerListScreen } from "../screens/messenger-chat/MessengerListScreen";
import type { ScreenWiring } from "./screen-wiring";

/** 가입 직후 이름을 아직 모르면(빈 문자열 포함) 학습 메신저와 같이 「나」 문구를 씁니다 — 말풍선 화자는 비면 안 됩니다. */
function learnerNameOf(wiring: ScreenWiring): string {
  const name = wiring.learnerFill.name?.trim() ?? "";
  return name === "" ? uiCopyFor(wiring.entryLanguage).common.me : name;
}

export function renderMessengerList(wiring: ScreenWiring) {
  const chat = wiring.messengerChat;
  return (
    <MessengerListScreen
      source={chat.source}
      coinBalance={wiring.coinCount ?? 0}
      onOpenRoom={chat.onOpenChatRoom}
      onGoToJourney={chat.onGoToJourney}
      onLayerChange={wiring.onScreenLayerChange}
    />
  );
}

export function renderMessengerChat(roomId: string, wiring: ScreenWiring) {
  const chat = wiring.messengerChat;
  return (
    <MessengerChatScreen
      roomId={roomId}
      source={chat.source}
      keyboardProbe={unknownKoreanKeyboardProbe}
      keyboardHeightStore={emptyKeyboardHeightStore}
      edges={keyboardDockEdgesOf(wiring.safeAreaInsets)}
      learnerName={learnerNameOf(wiring)}
      coinBalance={wiring.coinCount ?? 0}
      onExit={chat.onExitChatRoom}
    />
  );
}
