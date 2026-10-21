// 누른 서버 푸시의 목적지로 가는 규칙입니다(ADR-0034 D3). 이벤트 → 여정(롤플레이 목록이면 롤플레이) 탭을 루트로
// 접고 → 목적지. 여정 맵과 롤플레이 목록은 탭 루트에서 끝나고, 알림 목록만 그 위에 쌓습니다.

import type { Dispatch } from "@lynx-js/react";

import type {
  NotificationEventSink,
  PushNotificationTarget,
} from "../screens/notifications/notifications.contract";
import { tabRootActions } from "./nav-reducer";
import type { NavAction } from "./nav-state";

export type PushTargetOpenerArgs = {
  readonly dispatch: Dispatch<NavAction>;
  readonly notificationEventSink: NotificationEventSink;
};

export function pushTargetOpener({
  dispatch,
  notificationEventSink,
}: PushTargetOpenerArgs): (target: PushNotificationTarget) => void {
  return (target) => {
    notificationEventSink?.({ name: "push_notification_opened", target: target.kind });
    const root = target.kind === "roleplay-list" ? "roleplay" : "journey";
    for (const action of tabRootActions(root)) dispatch(action);
    switch (target.kind) {
      case "journey-map":
      case "roleplay-list": {
        return;
      }
      case "notifications": {
        dispatch({ type: "push", screen: { name: "notifications" } });
        return;
      }
      default: {
        const exhaustive: never = target;
        return exhaustive;
      }
    }
  };
}
