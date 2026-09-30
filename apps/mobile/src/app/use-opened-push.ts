// 누른 서버 푸시를 목적지로 옮기는 훅입니다(ADR-0034). 호스트는 누른 알림의 목적지를 **꺼낼 때까지** 들고
// 있고, 이 훅은 앱 구간(진입 흐름이 끝난 뒤)에서만 꺼냅니다 — 스플래시 · 로그인 중에 누른 알림은 여정에
// 들어선 순간 열립니다. 앱이 켜진 채 누르면 호스트가 전역 이벤트로 알립니다.

import { useEffect, useLynxGlobalEventListener } from "@lynx-js/react";

import { takeOpenedPushTarget } from "../lib/push-notifications";
import type { PushNotificationTarget } from "../screens/notifications/notifications.contract";
import { pushTargetFrom } from "./push-target";

export const pushOpenedEventName = "pushNotificationOpened";

export function useOpenedPush(
  inApp: boolean,
  onOpenPushTarget: (target: PushNotificationTarget) => void,
): void {
  const openPending = (): void => {
    if (!inApp) return;
    void takeOpenedPushTarget().then((raw) => {
      const target = pushTargetFrom(raw);
      if (target !== null) onOpenPushTarget(target);
    });
  };

  useEffect(() => {
    openPending();
    // 앱 구간에 들어선 순간에만 꺼냅니다 — 목적지 콜백은 렌더마다 새로 서므로 의존에 넣지 않습니다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inApp]);

  useLynxGlobalEventListener(pushOpenedEventName, openPending);
}
