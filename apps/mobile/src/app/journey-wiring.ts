import { guardJourneyUnitStarts } from "./journey-access";
import { completedVisualNovelUnitIdsFrom } from "./journey-progress";
// 여정·학습·알림·설정 콜백을 만들고, 특별 유닛 셋의 콜백을 `special-unit-wiring.ts`에서 받아
// 한 객체로 합칩니다. 진행 상태 넷과 세션 옵션을 여기서 읽고 갱신합니다. 연습 경계 밖의
// 롤플레이 콜백 여덟은 `roleplay-wiring.ts`가 집니다.

import type { Dispatch, SetStateAction } from "@lynx-js/react";
import type {
  EpisodeIntroEventSink,
  EpisodeIntroUnitId,
  EpisodePrologue,
} from "../screens/episode-intro/episode-intro.contract";

import {
  assessmentCompletesStep,
  assessmentPassCriterion,
  judgeAssessment,
} from "../screens/assessment/assessment";
import type { AnswerResult } from "../lib/answer-result";
import {
  completeStep,
  learningFormAt,
  learningFormsForStep,
  type JourneyStepId,
  journeyMapSections,
} from "../screens/journey-map/journey-map";
import type { MessengerEventSink, MessengerUnitId } from "../screens/messenger/messenger.contract";
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
import type {
  PhoneCallEventSink,
  PhoneCallUnitId,
} from "../screens/phone-call/phone-call.contract";
import type { RoleplayItem } from "../screens/roleplay-list/roleplay-list.contract";
import { openLegalDocument } from "../lib/legal-document";
import { settingsNavOpenedEvent } from "../screens/settings/settings";
import type { SettingsEventSink, SettingsNavTarget } from "../screens/settings/settings.contract";
import type { SessionOptions } from "../lib/session-options";
import type {
  VisualNovelEventSink,
  VisualNovelProgress,
} from "../screens/visual-novel/visual-novel.contract";
import { learningScreenFor, roleplayScreenFor } from "./screen-routing";
import { learningSessionWiring } from "./learning-session-wiring";
import { specialUnitWiring } from "./special-unit-wiring";
import { tabRootActions } from "./nav-reducer";
import { pushTargetOpener } from "./push-routing";
import { openNotificationSettings } from "./push-wiring";
import { episodeIntroWiring } from "./episode-intro-wiring";
import type { NavAction } from "./nav-state";

export type JourneyWiringArgs = {
  readonly messengerEventSink: MessengerEventSink;
  readonly phoneCallEventSink: PhoneCallEventSink;
  readonly visualNovelEventSink: VisualNovelEventSink;
  readonly notificationEventSink: NotificationEventSink;
  readonly settingsEventSink: SettingsEventSink;
  readonly episodeIntroEventSink: EpisodeIntroEventSink;
  readonly dispatch: Dispatch<NavAction>;
  readonly completedMessengerUnitIds: readonly MessengerUnitId[];
  readonly setCompletedMessengerUnitIds: Dispatch<SetStateAction<readonly MessengerUnitId[]>>;
  readonly completedPhoneCallUnitIds: readonly PhoneCallUnitId[];
  readonly setCompletedPhoneCallUnitIds: Dispatch<SetStateAction<readonly PhoneCallUnitId[]>>;
  readonly visualNovelProgress: VisualNovelProgress;
  readonly setVisualNovelProgress: Dispatch<SetStateAction<VisualNovelProgress>>;
  readonly completedStepCount: number;
  readonly setCompletedStepCount: Dispatch<SetStateAction<number>>;
  readonly notifications: readonly NotificationItem[];
  readonly setNotifications: Dispatch<SetStateAction<readonly NotificationItem[]>>;
  readonly sessionOptions: SessionOptions;
  readonly episodePrologueFor: (episodeId: string) => EpisodePrologue | undefined;
  /**
   * 한 스텝의 활동들이 지나오며 쌓은 결과입니다. 유닛 하나가 활동 여럿을 잇기 때문에
   * 평가는 **마지막 활동이 끝난 뒤** 한 번만 돌고, 그때까지의 결과를 여기 모읍니다.
   *
   * 스택이 아니라 App 상태인 이유는 이 값이 화면 좌표가 아니기 때문입니다 — 어느
   * 화면에 있든 「이 스텝에서 지금까지 맞고 틀린 것」은 하나입니다. 스택에 실으면
   * 뒤로 가기가 결과를 되감아 평가가 달라집니다.
   */
  readonly pendingResults: readonly AnswerResult[];
  readonly setPendingResults: Dispatch<SetStateAction<readonly AnswerResult[]>>;
  /** 끝낸 표지 유닛입니다. 맵의 표지 게이트(`mapItemStatus`)가 이 값을 봅니다. */
  readonly completedEpisodeIntroIds: readonly EpisodeIntroUnitId[];
  readonly setCompletedEpisodeIntroIds: Dispatch<SetStateAction<readonly EpisodeIntroUnitId[]>>;
  readonly pendingSkippedCount: number;
  readonly setPendingSkippedCount: Dispatch<SetStateAction<number>>;
};

// 반환 객체를 `journey`로 먼저 이름 붙이고, `onMessengerExit`·`onSelectNotification`이
// 그 이름으로 자기참조합니다 — 조립을 옮겨도 참조가 끊기지 않습니다.
export function journeyWiring(args: JourneyWiringArgs) {
  const {
    messengerEventSink,
    phoneCallEventSink,
    visualNovelEventSink,
    notificationEventSink,
    settingsEventSink,
    dispatch,
    completedMessengerUnitIds,
    setCompletedMessengerUnitIds,
    completedPhoneCallUnitIds,
    setCompletedPhoneCallUnitIds,
    visualNovelProgress,
    setVisualNovelProgress,
    completedStepCount,
    setCompletedStepCount,
    notifications,
    setNotifications,
    sessionOptions,
    pendingResults,
    setPendingResults,
    completedEpisodeIntroIds,
    pendingSkippedCount,
    setPendingSkippedCount,
  } = args;

  const unitStarts = {
    ...specialUnitWiring({
      messengerEventSink,
      phoneCallEventSink,
      visualNovelEventSink,
      dispatch,
      completedMessengerUnitIds,
      setCompletedMessengerUnitIds,
      completedPhoneCallUnitIds,
      setCompletedPhoneCallUnitIds,
      visualNovelProgress,
      setVisualNovelProgress,
    }),
    completedStepCount,
    completedEpisodeIntroIds,
    ...learningSessionWiring({
      dispatch,
      setCompletedStepCount,
      pendingResults,
      setPendingResults,
      pendingSkippedCount,
      setPendingSkippedCount,
    }),
    onExitCulture: () => dispatch({ type: "backToRoot" }),
    // push입니다 — replace가 아닙니다. 문화 학습이 스택에 남습니다.
    onStartCultureQuiz: (id: JourneyStepId) =>
      dispatch({ type: "push", screen: { name: "culture-quiz", stepId: id } }),
    // `item.form`별로 해당 sink에 롤플레이 열림 이벤트 → `push(roleplayScreenFor(item))`.
    // `default` 없는 `switch (item.form)` + `never` 망라입니다.
    onStartRoleplayUnit: (item: RoleplayItem) => {
      "background only";
      switch (item.form) {
        case "messenger": {
          messengerEventSink?.({
            name: "messenger_unit_opened",
            unitId: item.unitId,
            entrySource: "roleplay",
          });
          break;
        }
        case "phone-call": {
          phoneCallEventSink?.({
            name: "phone_call_unit_opened",
            unitId: item.unitId,
            entrySource: "roleplay",
          });
          break;
        }
        case "visual-novel": {
          visualNovelEventSink?.({
            name: "visual_novel_unit_opened",
            unitId: item.unitId,
            entrySource: "roleplay",
          });
          break;
        }
        default: {
          const exhaustive: never = item;
          return exhaustive;
        }
      }
      dispatch({ type: "push", screen: roleplayScreenFor(item) });
    },
    // 여정 맵 머리 알림 버튼입니다. 열림 이벤트 → `push` 직전 1회.
    onOpenNotifications: () => {
      notificationEventSink?.({ name: "notifications_opened" });
      dispatch({ type: "push", screen: { name: "notifications" } });
    },
    // 알림 항목 선택입니다. **먼저** 탭 이벤트를 올리고, 그 뒤 대상별로
    // 분기합니다. 특별 유닛 셋은 **기존 여정 콜백을 부를 뿐** 이벤트·`push`를
    // 다시 쓰지 않습니다. 롤플레이 목록은 `tabRootActions("roleplay")`를
    // **순서대로** `dispatch`합니다.
    onSelectNotification: (item: NotificationItem) => {
      notificationEventSink?.(notificationTappedEvent(item));
      switch (item.target.kind) {
        case "messenger": {
          journey.onStartMessengerUnit(item.target.unitId);
          break;
        }
        case "phone-call": {
          journey.onStartPhoneCallUnit(item.target.unitId);
          break;
        }
        case "visual-novel": {
          journey.onStartVisualNovelUnit(item.target.unitId);
          break;
        }
        case "roleplay-list": {
          for (const action of tabRootActions("roleplay")) dispatch(action);
          break;
        }
        default: {
          const exhaustive: never = item.target;
          return exhaustive;
        }
      }
    },
    // 누른 서버 푸시의 목적지입니다(ADR-0034) — 이동 규칙은 `push-routing.ts`입니다.
    onOpenPushTarget: (target: PushNotificationTarget) =>
      pushTargetOpener({ dispatch, notificationEventSink, journey })(target),
    // 알림 삭제입니다. 이벤트를 먼저 올리고 목록에서 뺍니다. 화면을 옮기지 않습니다 —
    // 마지막 알림을 지워도 알림 화면에 남아 빈 상태를 봅니다.
    notifications,
    onDeleteNotification: (item: NotificationItem) => {
      notificationEventSink?.(notificationDeletedEvent(item));
      setNotifications((current) => withoutNotification(current, item.id));
    },
    // 알림 화면의 `맵으로`입니다. `onExitAssessment`·`onExitCulture`와 같은
    // 형태 — 활성 스택의 루트로 곧장 닿습니다(ADR-0007 D6).
    onExitNotifications: () => {
      dispatch({ type: "backToRoot" });
    },
    // 열림 이벤트 → 프로필은 `push`, 문서 둘은 앱 위 브라우저(ADR-0033). 문서는 설정 탭
    // 스택에 쌓이지 않고, 브라우저를 닫으면 설정 화면 그대로입니다.
    sessionOptions,
    onSelectNavTarget: (target: SettingsNavTarget) => {
      settingsEventSink?.(settingsNavOpenedEvent(target));
      if (target === "profile") {
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
  };

  // 알림과 푸시도 이 콜백을 사용하므로 실제 진입 직전에 맵과 같은 규칙으로 차단합니다.
  const journey = {
    ...unitStarts,
    ...guardJourneyUnitStarts(unitStarts, {
      completedStepCount,
      completedEpisodeIntroIds,
      completedMessengerUnitIds,
      completedPhoneCallUnitIds,
      completedVisualNovelUnitIds: completedVisualNovelUnitIdsFrom(visualNovelProgress),
      completedEpisodeFinalIds: [],
    }),
    ...episodeIntroWiring({
      sections: journeyMapSections,
      setCompletedEpisodeIntroIds: args.setCompletedEpisodeIntroIds,
      dispatch,
      prologueFor: args.episodePrologueFor,
      episodeIntroEventSink: args.episodeIntroEventSink,
    }),
  };

  return journey;
}
