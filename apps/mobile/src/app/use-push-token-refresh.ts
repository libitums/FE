// 호스트가 FCM 토큰이 바뀌었다고 알리면 조용히 다시 등록하는 훅입니다. 이벤트는 토큰을 싣지 않습니다 —
// 현재 토큰은 `register`가 읽고, 세션 · 권한 판정은 `syncPushDevice`가 이미 듭니다.

import { useCallback, useLynxGlobalEventListener } from "@lynx-js/react";

import { syncPushDevice } from "./push-wiring";

export const pushTokenRefreshedEventName = "pushTokenRefreshed";

/** 호스트가 토큰이 바뀌었다고 알리면 조용히 다시 등록합니다. 묻지 않습니다. */
export function usePushTokenRefresh(): void {
  const onRefreshed = useCallback((): void => {
    void syncPushDevice({ ask: false });
  }, []);

  useLynxGlobalEventListener(pushTokenRefreshedEventName, onRefreshed);
}
