// 누른 서버 푸시의 목적지로 가는 규칙입니다(ADR-0034 D3). 이벤트 → 여정(롤플레이 목록이면 롤플레이) 탭을 루트로
// 접고 → 목적지. 여정 맵과 롤플레이 목록은 탭 루트에서 끝나고, 알림 목록만 그 위에 쌓습니다. 선톡 방은 메신저 탭으로
// 갑니다(ADR-0127 — `companion-push.ts`).

import type { Dispatch } from "@lynx-js/react";

import type {
  NotificationEventSink,
  PushNotificationTarget,
} from "../screens/notifications/notifications.contract";
import type { ChatSource } from "../screens/messenger-chat/chat-source.contract";
import { companionPushActions } from "./companion-push";
import { tabRootActions } from "./nav-reducer";
import type { NavAction } from "./nav-state";

export type PushTargetOpenerArgs = {
  readonly dispatch: Dispatch<NavAction>;
  readonly notificationEventSink: NotificationEventSink;
  /** 선톡 푸시의 방을 찾는 대화 출처입니다(ADR-0127). */
  readonly chatSource: ChatSource;
  /** 지금 계정이 메신저를 쓸 수 있는가(ADR-0128) — 누르는 순간에 읽습니다. */
  readonly canOpenChats: () => boolean;
};

export function pushTargetOpener({
  dispatch,
  notificationEventSink,
  chatSource,
  canOpenChats,
}: PushTargetOpenerArgs): (target: PushNotificationTarget) => void {
  return (target) => {
    if (target.kind === "companion-chat") {
      // 선톡 방(ADR-0127) — 미리보기 A/B의 칸이 있으면 같이 싣습니다.
      notificationEventSink?.({
        name: "push_notification_opened",
        target: target.kind,
        ...(target.variant === null ? {} : { variant: target.variant }),
      });
      for (const action of companionPushActions(chatSource, target.characterId, canOpenChats()))
        dispatch(action);
      return;
    }
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
