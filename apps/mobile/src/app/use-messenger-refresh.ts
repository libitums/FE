// 앱이 앞으로 오거나 연결이 돌아오면(호스트 `contentSyncOpportunity`) 메신저의 열린 방을 조용히 다시 읽습니다(ADR-0138) —
// 끊긴 답 · 선톡 · 다른 기기 대화를 놓치지 않게. 서버 모드 출처만 하고, 답을 기다리는 중이면 출처가 건너뜁니다.

import { useLynxGlobalEventListener } from "@lynx-js/react";

import { currentMessengerChatSource } from "./messenger-chat-wiring";
import { contentSyncEventName } from "./use-episode-content-refresh";

export function useMessengerRefresh(): void {
  useLynxGlobalEventListener(contentSyncEventName, () => {
    "background only";
    currentMessengerChatSource()?.server?.refreshOpenRoom();
  });
}
