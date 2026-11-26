// 앱이 앞으로 오거나 연결이 돌아오면(호스트 `contentSyncOpportunity`) 메신저의 열린 방을 조용히 다시 읽습니다(ADR-0138) —
// 끊긴 답 · 선톡 · 다른 기기 대화를 놓치지 않게. 서버 모드 출처만 하고, 답을 기다리는 중이면 출처가 건너뜁니다.
// 서 있는 친구 스토리 목록에도 다시 읽기를 알립니다(ADR-0178 「다시 읽기」) — 목록을 연 뒤 올라온 스토리.
// 앱이 앞에 있을 때 온 인물의 채팅 푸시(호스트 `pushNotificationReceived`, ADR-0200 개정)는 그 인물의 방 기록을 다시 읽습니다 —
// 새 말이면 안 읽음이 올라 목록이 맞춰지고 답장 토스트가 같은 규칙으로 섭니다.

import { useLynxGlobalEventListener } from "@lynx-js/react";

import { foregroundChatPushRoom, pushReceivedEventName } from "./foreground-push";
import { notifyFriendStoriesReload } from "./friend-stories-wiring";
import { currentMessengerChatSource } from "./messenger-chat-wiring";
import { contentSyncEventName } from "./use-episode-content-refresh";

export function useMessengerRefresh(): void {
  useLynxGlobalEventListener(contentSyncEventName, () => {
    "background only";
    currentMessengerChatSource()?.server?.refreshOpenRoom();
    notifyFriendStoriesReload();
  });
  useLynxGlobalEventListener(pushReceivedEventName, (characterId: unknown) => {
    "background only";
    const source = currentMessengerChatSource();
    const roomId = source === null ? null : foregroundChatPushRoom(source, characterId);
    if (roomId !== null) source?.server?.pullRoom(roomId);
  });
}
