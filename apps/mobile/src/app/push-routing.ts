// 누른 서버 푸시의 목적지로 가는 규칙입니다(ADR-0034 D3). 이벤트 → 여정(롤플레이 목록이면 롤플레이) 탭을 루트로
// 접고 → 목적지. 특별 유닛 셋은 알림 항목과 **같은 여정 콜백**을 부릅니다 — 그 콜백이 여는 이벤트도 그대로 섭니다.

import type { Dispatch } from "@lynx-js/react";

import type { MessengerUnitId } from "../screens/messenger/messenger.contract";
import type {
  NotificationEventSink,
  PushNotificationTarget,
} from "../screens/notifications/notifications.contract";
import type { PhoneCallUnitId } from "../screens/phone-call/phone-call.contract";
import type { VisualNovelUnitId } from "../screens/visual-novel/visual-novel.contract";
import { tabRootActions } from "./nav-reducer";
import type { NavAction } from "./nav-state";

export type PushTargetOpenerArgs = {
  readonly dispatch: Dispatch<NavAction>;
  readonly notificationEventSink: NotificationEventSink;
  readonly journey: {
    readonly onStartMessengerUnit: (unitId: MessengerUnitId) => void;
    readonly onStartPhoneCallUnit: (unitId: PhoneCallUnitId) => void;
    readonly onStartVisualNovelUnit: (unitId: VisualNovelUnitId) => void;
  };
};

export function pushTargetOpener({
  dispatch,
  notificationEventSink,
  journey,
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
      case "messenger": {
        journey.onStartMessengerUnit(target.unitId);
        return;
      }
      case "phone-call": {
        journey.onStartPhoneCallUnit(target.unitId);
        return;
      }
      case "visual-novel": {
        journey.onStartVisualNovelUnit(target.unitId);
        return;
      }
      default: {
        const exhaustive: never = target;
        return exhaustive;
      }
    }
  };
}
