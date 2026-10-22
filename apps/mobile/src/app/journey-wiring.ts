// 알림 · 설정 · 롤플레이 시작 콜백을 합칩니다. 카탈로그 표지 · 레슨은 catalog-wiring.ts가 담당합니다.

import type { Dispatch, SetStateAction } from "@lynx-js/react";
import type { EpisodeIntroEventSink } from "../screens/episode-intro/episode-intro.contract";

import type {
  NotificationEventSink,
  NotificationItem,
  PushNotificationTarget,
} from "../screens/notifications/notifications.contract";
import {
  notificationDeletedEvent,
  notificationTappedEvent,
  withoutNotification,
} from "../screens/notifications/notifications";
import type { RoleplayItem } from "../screens/roleplay-list/roleplay-list.contract";
import { openLegalDocument } from "../lib/legal-document";
import { settingsNavOpenedEvent } from "../screens/settings/settings";
import type { SettingsEventSink, SettingsNavTarget } from "../screens/settings/settings.contract";
import type { SessionOptions } from "../lib/session-options";
import { roleplayScreenFor } from "./screen-routing";
import { tabRootActions } from "./nav-reducer";
import { submitFeedback } from "../lib/feedback-api";
import type { FeedbackRating } from "../lib/feedback.contract";
import { pushTargetOpener } from "./push-routing";
import { openNotificationSettings } from "./push-wiring";
import type { NavAction } from "./nav-state";

export type JourneyWiringArgs = {
  readonly notificationEventSink: NotificationEventSink;
  readonly settingsEventSink: SettingsEventSink;
  readonly episodeIntroEventSink: EpisodeIntroEventSink;
  readonly dispatch: Dispatch<NavAction>;
  readonly notifications: readonly NotificationItem[];
  readonly setNotifications: Dispatch<SetStateAction<readonly NotificationItem[]>>;
  readonly sessionOptions: SessionOptions;
};

export function journeyWiring(args: JourneyWiringArgs) {
  const { notificationEventSink, settingsEventSink, dispatch, notifications, setNotifications } =
    args;

  return {
    // 롤플레이 목록 항목 선택입니다. 열림 이벤트(출처 `roleplay`) → `push(roleplayScreenFor(item))`.
    onStartRoleplayUnit: (item: RoleplayItem) => {
      "background only";
      args.episodeIntroEventSink?.({
        name: "roleplay_story_opened",
        episodeId: item.episodeId,
      });
      dispatch({ type: "push", screen: roleplayScreenFor(item) });
    },
    // 여정 맵 머리 알림 버튼입니다. 열림 이벤트 → `push` 직전 1회.
    onOpenNotifications: () => {
      notificationEventSink?.({ name: "notifications_opened" });
      dispatch({ type: "push", screen: { name: "notifications" } });
    },
    // 알림 항목 선택입니다. **먼저** 탭 이벤트를 올리고, 그 뒤 대상별로 분기합니다. 롤플레이 목록은
    // `tabRootActions("roleplay")`를 **순서대로** `dispatch`합니다.
    onSelectNotification: (item: NotificationItem) => {
      notificationEventSink?.(notificationTappedEvent(item));
      switch (item.target.kind) {
        case "roleplay-list": {
          for (const action of tabRootActions("roleplay")) dispatch(action);
          break;
        }
        default: {
          const exhaustive: never = item.target.kind;
          return exhaustive;
        }
      }
    },
    // 누른 서버 푸시의 목적지입니다(ADR-0034) — 이동 규칙은 `push-routing.ts`입니다.
    onOpenPushTarget: (target: PushNotificationTarget) =>
      pushTargetOpener({ dispatch, notificationEventSink })(target),
    // 알림 삭제입니다. 이벤트를 먼저 올리고 목록에서 뺍니다. 화면을 옮기지 않습니다 —
    // 마지막 알림을 지워도 알림 화면에 남아 빈 상태를 봅니다.
    notifications,
    onDeleteNotification: (item: NotificationItem) => {
      notificationEventSink?.(notificationDeletedEvent(item));
      setNotifications((current) => withoutNotification(current, item.id));
    },
    // 알림 화면의 `맵으로`입니다. 활성 스택의 루트로 곧장 닿습니다(ADR-0007 D6).
    onExitNotifications: () => {
      dispatch({ type: "backToRoot" });
    },
    // 열림 이벤트 → 프로필은 `push`, 문서 둘은 앱 위 브라우저(ADR-0033). 문서는 설정 탭
    // 스택에 쌓이지 않고, 브라우저를 닫으면 설정 화면 그대로입니다.
    sessionOptions: args.sessionOptions,
    onSelectNavTarget: (target: SettingsNavTarget) => {
      settingsEventSink?.(settingsNavOpenedEvent(target));
      if (target === "profile" || target === "feedback" || target === "learner-profile") {
        dispatch({ type: "push", screen: { name: target } });
        return;
      }
      if (target === "notifications") {
        void openNotificationSettings();
        return;
      }
      openLegalDocument(target);
    },
    onExitSettingsStack: () => dispatch({ type: "backToRoot" }),
    // 설정 피드백 보내기입니다(ADR-0036). 성공한 것만 이벤트로 셉니다 — 글은 싣지 않습니다.
    onSubmitFeedback: async (rating: FeedbackRating, message: string): Promise<boolean> => {
      const ok = await submitFeedback({ kind: "general", rating, message, context: {} });
      if (ok) {
        settingsEventSink?.({
          name: "feedback_submitted",
          rating: String(rating),
          hasMessage: message.trim() !== "",
        });
      }
      return ok;
    },
  };
}
