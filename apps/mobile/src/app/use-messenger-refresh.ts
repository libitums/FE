// 앱이 앞으로 오거나 연결이 돌아오면(호스트 `contentSyncOpportunity`) 메신저 목록을 맞춥니다(ADR-0138 · ADR-0213) — 열린 방은
// 바로 다시 읽고, 닫힌 방은 목록 요약에서 서버 마지막 메시지가 바뀐 방만 다시 읽어 푸시 없이 온 선톡 · 스토리 반응이 목록에 섭니다.
// 서버 모드 출처만 하고, 답을 기다리는 중이면 출처가 건너뜁니다.
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
    currentMessengerChatSource()?.server?.syncRooms();
    notifyFriendStoriesReload();
  });
  useLynxGlobalEventListener(pushReceivedEventName, (characterId: unknown) => {
    "background only";
    const source = currentMessengerChatSource();
    const roomId = source === null ? null : foregroundChatPushRoom(source, characterId);
    if (roomId !== null) source?.server?.pullRoom(roomId);
  });
}
