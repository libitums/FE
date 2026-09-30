// 누른 서버 푸시를 목적지로 옮기는 훅입니다(ADR-0034). 호스트는 누른 알림의 목적지를 **꺼낼 때까지** 들고
// 있고, 이 훅은 앱 구간(진입 흐름이 끝난 뒤)에서만 꺼냅니다 — 스플래시 · 로그인 중에 누른 알림은 여정에
// 들어선 순간 열립니다. 앱이 켜진 채 누르면 호스트가 전역 이벤트로 알립니다.

import { useCallback, useEffect, useLynxGlobalEventListener, useRef } from "@lynx-js/react";

import { takeOpenedPushTarget } from "../lib/push-notifications";
import type { PushNotificationTarget } from "../screens/notifications/notifications.contract";
import { pushTargetFrom } from "./push-target";

export const pushOpenedEventName = "pushNotificationOpened";

export function useOpenedPush(
  inApp: boolean,
  onOpenPushTarget: (target: PushNotificationTarget) => void,
): void {
  // 최신 값을 ref에 두어 리스너를 한 번만 등록합니다 — 콜백은 렌더마다 새로 서지만 리스너는 바뀌지 않습니다.
  const latest = useRef({ inApp, onOpenPushTarget });
  latest.current = { inApp, onOpenPushTarget };

  const openPending = useCallback((): void => {
    if (!latest.current.inApp) return;
    void takeOpenedPushTarget().then((raw) => {
      const target = pushTargetFrom(raw);
      if (target !== null) latest.current.onOpenPushTarget(target);
    });
  }, []);

  // 앱 구간에 들어선 순간에 꺼냅니다.
  useEffect(() => {
    openPending();
  }, [inApp, openPending]);

  useLynxGlobalEventListener(pushOpenedEventName, openPending);
}
