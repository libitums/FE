// 여정·학습·알림·설정 콜백을 만들고, 특별 유닛 셋의 콜백을 `special-unit-wiring.ts`에서 받아
// 한 객체로 합칩니다. 진행 상태 넷과 세션 옵션을 여기서 읽고 갱신합니다. 연습 경계 밖의
// 롤플레이 콜백 여덟은 `roleplay-wiring.ts`가 집니다.

import type { Dispatch, SetStateAction } from "@lynx-js/react";

import {
  assessmentCompletesStep,
  assessmentPassCriterion,
  judgeAssessment,
} from "../screens/assessment/assessment";
import type { AnswerResult } from "../lib/answer-result";
import {
  completeStep,
  learningFormForStep,
  type JourneyStepId,
} from "../screens/journey-map/journey-map";
import type { MessengerEventSink, MessengerUnitId } from "../screens/messenger/messenger.contract";
import type {
  NotificationEventSink,
  NotificationItem,
} from "../screens/notifications/notifications.contract";
import { notificationTappedEvent } from "../screens/notifications/notifications";
import type {
  PhoneCallEventSink,
  PhoneCallUnitId,
} from "../screens/phone-call/phone-call.contract";
import type { RoleplayItem } from "../screens/roleplay-list/roleplay-list.contract";
import { sessionOptionChangedEvent, settingsNavOpenedEvent } from "../screens/settings/settings";
import type { SettingsEventSink, SettingsNavTarget } from "../screens/settings/settings.contract";
import { toggleSessionOption } from "../lib/session-options";
import type { SessionOptionKey, SessionOptions } from "../lib/session-options";
import type {
  VisualNovelEventSink,
  VisualNovelProgress,
} from "../screens/visual-novel/visual-novel.contract";
import { learningScreenFor, roleplayScreenFor } from "./screen-routing";
import { specialUnitWiring } from "./special-unit-wiring";
import { tabRootActions } from "./nav-reducer";
import type { NavAction } from "./nav-state";

export type JourneyWiringArgs = {
  readonly messengerEventSink: MessengerEventSink;
  readonly phoneCallEventSink: PhoneCallEventSink;
  readonly visualNovelEventSink: VisualNovelEventSink;
  readonly notificationEventSink: NotificationEventSink;
  readonly settingsEventSink: SettingsEventSink;
  readonly dispatch: Dispatch<NavAction>;
  readonly completedMessengerUnitIds: readonly MessengerUnitId[];
  readonly setCompletedMessengerUnitIds: Dispatch<SetStateAction<readonly MessengerUnitId[]>>;
  readonly completedPhoneCallUnitIds: readonly PhoneCallUnitId[];
  readonly setCompletedPhoneCallUnitIds: Dispatch<SetStateAction<readonly PhoneCallUnitId[]>>;
  readonly visualNovelProgress: VisualNovelProgress;
  readonly setVisualNovelProgress: Dispatch<SetStateAction<VisualNovelProgress>>;
  readonly completedStepCount: number;
  readonly setCompletedStepCount: Dispatch<SetStateAction<number>>;
  readonly sessionOptions: SessionOptions;
  readonly setSessionOptions: Dispatch<SetStateAction<SessionOptions>>;
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
    sessionOptions,
    setSessionOptions,
  } = args;

  const journey = {
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
    // 시트의 `시작`이 여기로 옵니다. 목적지는 `learningFormForStep`이 정하고
    // `learningScreenFor`가 화면으로 옮깁니다 — 학습형 이름을 리터럴로 쓰지 않습니다.
    onStartStep: (id: JourneyStepId) =>
      dispatch({ type: "push", screen: learningScreenFor(learningFormForStep(id), id) }),
    // 중도 이탈입니다. **진행을 갱신하지 않습니다.** `onFinishLearning`과 합치지
    // 않는 이유가 이 한 줄의 차이입니다.
    onExitLearning: () => dispatch({ type: "backToRoot" }),
    // 판정은 평가가 집니다 — `judgeAssessment` → `assessmentCompletesStep`. 셸에
    // `verdict === "passed"` 리터럴을 쓰지 않습니다 — 진행을 쓰는 자리는 여전히
    // 여기 하나입니다.
    onFinishLearning: (id: JourneyStepId, results: readonly AnswerResult[]) => {
      const verdict = judgeAssessment(results, assessmentPassCriterion);
      if (assessmentCompletesStep(verdict)) {
        setCompletedStepCount((count) => completeStep(count, id));
      }
      // `replace`이지 `push`가 아닙니다 — 끝난 학습 세션은 스택에 남길 자리가
      // 아닙니다. 출구는 진입 동작이 무엇이든 활성 스택의 루트로 곧장 갑니다
      // (ADR-0007 D6).
      dispatch({ type: "replace", screen: { name: "assessment", stepId: id, results } });
    },
    // 평가의 `맵으로`입니다. 중도 이탈과 마찬가지로 진행을 갱신하지 않습니다 —
    // 판정은 이미 `onFinishLearning`에서 끝났습니다.
    onExitAssessment: () => dispatch({ type: "backToRoot" }),
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
    // 알림 화면의 `맵으로`입니다. `onExitAssessment`·`onExitCulture`와 같은
    // 형태 — 활성 스택의 루트로 곧장 닿습니다(ADR-0007 D6).
    onExitNotifications: () => {
      dispatch({ type: "backToRoot" });
    },
    // 열림 이벤트 → `push({ name: target })`. `SettingsNavTarget`이 route
    // 이름과 같은 문자열이라 사상 표 없이 곧장 옮깁니다.
    sessionOptions,
    onSelectNavTarget: (target: SettingsNavTarget) => {
      settingsEventSink?.(settingsNavOpenedEvent(target));
      dispatch({ type: "push", screen: { name: target } });
    },
    // 흐름 하나(토글)입니다 — sink 먼저, `setSessionOptions` 나중. `value`는
    // 바뀐 뒤 값입니다.
    onToggleSessionOption: (key: SessionOptionKey) => {
      const next = toggleSessionOption(sessionOptions, key);
      settingsEventSink?.(sessionOptionChangedEvent(key, next[key]));
      setSessionOptions(next);
    },
    // 흐름 셋(나가기)입니다 — 프로필·약관의 `설정으로` → 설정 탭 스택의
    // 루트(ADR-0007 D6).
    onExitSettingsStack: () => dispatch({ type: "backToRoot" }),
  };

  return journey;
}
