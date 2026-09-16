import { useReducer, useState } from "@lynx-js/react";

import { AssessmentScreen } from "../screens/assessment/AssessmentScreen";
import {
  assessmentCompletesStep,
  assessmentPassCriterion,
  judgeAssessment,
} from "../screens/assessment/assessment";
import { BottomNavigator } from "../components/BottomNavigator";
import { CultureScreen } from "../screens/culture/CultureScreen";
import { cultureNarrativeForStep } from "../screens/culture/culture";
import { CultureQuizScreen } from "../screens/culture-quiz/CultureQuizScreen";
import { JourneyMapScreen } from "../screens/journey-map/JourneyMapScreen";
import {
  completeStep,
  initialCompletedStepCount,
  journeyMapItems,
  journeyStepOrdinal,
  learningFormForStep,
  type JourneyStepId,
} from "../screens/journey-map/journey-map";
import { ListeningScreen } from "../screens/listening/ListeningScreen";
import { NotificationsScreen } from "../screens/notifications/NotificationsScreen";
import { notificationItems } from "../screens/notifications/notification-items";
import { notificationTappedEvent } from "../screens/notifications/notifications";
import type {
  NotificationAppProps,
  NotificationItem,
} from "../screens/notifications/notifications.contract";
import { RoleplayListScreen } from "../screens/roleplay-list/RoleplayListScreen";
import { roleplayItemsFrom } from "../screens/roleplay-list/roleplay-list";
import type { RoleplayItem } from "../screens/roleplay-list/roleplay-list.contract";
import { SentenceOrderScreen } from "../screens/sentence-order/SentenceOrderScreen";
import { SettingsScreen } from "../screens/settings/SettingsScreen";
import { WordChoiceScreen } from "../screens/word-choice/WordChoiceScreen";
import type {
  MessengerAppProps,
  MessengerEventSink,
  MessengerExitOutcome,
  MessengerUnitId,
} from "../screens/messenger/messenger.contract";
import { MessengerScreen } from "../screens/messenger/MessengerScreen";
import { PhoneCallScreen } from "../screens/phone-call/PhoneCallScreen";
import {
  getPhoneCallConversation,
  completePhoneCallUnit,
  phoneCallCompletionStatus,
  practicePhoneCallCompletionStatus,
} from "../screens/phone-call/phone-call";
import type {
  PhoneCallAppProps,
  PhoneCallExitOutcome,
  PhoneCallUnitId,
} from "../screens/phone-call/phone-call.contract";
import {
  messengerCompletionStatus,
  messengerConversationFor,
  completeMessengerUnit,
  practiceMessengerCompletionStatus,
} from "../screens/messenger/messenger";
import { ErrorBoundary } from "./ErrorBoundary";
import { announceCompletion } from "../lib/accessibility";
import { specialUnitExitLabel } from "../lib/special-unit-entry-source";
import { VisualNovelScreen } from "../screens/visual-novel/VisualNovelScreen";
import {
  initialVisualNovelProgress,
  practiceVisualNovelExitOutcome,
  practiceVisualNovelProgress,
  visualNovelEntrySnapshot,
  visualNovelStoryFor,
} from "../screens/visual-novel/visual-novel";
import type {
  VisualNovelAdvanceOutcome,
  VisualNovelAppProps,
  VisualNovelBeatId,
  VisualNovelExitOutcome,
  VisualNovelProgress,
  VisualNovelUnitId,
} from "../screens/visual-novel/visual-novel.contract";
// LIB-229 계약 §1.4(e): 판정 어휘가 lib/answer-result.ts로 승격됐다.
import type { AnswerResult } from "../lib/answer-result";
import {
  currentScreen,
  initialNav,
  learningScreenFor,
  navReducer,
  roleplayScreenFor,
  tabRootActions,
  type RoleplayUnitScreen,
  type Screen,
} from "./navigation";

import "./app.css";

// LIB-255 계약 §2.8: `journeyMapItems`(값)를 읽을 수 있는 자리는 App뿐이다 — 화면
// 폴더 사이 값 import는 금지지만(`code.md` 「import」), `roleplay-list` 폴더는 이
// 표를 직접 볼 수 없다. 그래서 App이 모듈 로드 시 한 번 변환해 모듈 상수로 둔다.
const roleplayItems: readonly RoleplayItem[] = roleplayItemsFrom(journeyMapItems);

// LIB-257 계약 §2.9 2번: `roleplayItems` 선례 그대로 — 모듈 로드 때 한 번만
// `notificationItems()`를 읽어 모듈 상수로 둔다. 알림 화면에는 로컬 상태가 없다(A4).
const notificationList: readonly NotificationItem[] = notificationItems();

// LIB-255 계약 §2.8 · §6 ③겹: 롤플레이 route 셋의 App 쪽 콜백 여덟. 연습 모드
// 경계(계약 §6)의 판정 자리다 — 이 타입의 구현부는 여정 상태 넷
// (`completedStepCount` · `completedMessengerUnitIds` · `completedPhoneCallUnitIds` ·
// `visualNovelProgress`)과 그 setter를 읽지도 부르지도 않는다. sink 호출 ·
// `announceCompletion` · `dispatch(push/backToRoot)` 말고 아무것도 하지 않는다.
type RoleplayUnitWiring = {
  readonly onMessengerExit: (id: MessengerUnitId, outcome: MessengerExitOutcome) => void;
  readonly onMessengerComplete: (id: MessengerUnitId) => void;
  readonly onMessengerReplay: (id: MessengerUnitId) => void;
  readonly onPhoneCallComplete: (id: PhoneCallUnitId) => void;
  readonly onPhoneCallExit: (outcome: PhoneCallExitOutcome) => void;
  readonly onVisualNovelAdvance: (
    id: VisualNovelUnitId,
    outcome: VisualNovelAdvanceOutcome,
  ) => void;
  readonly onVisualNovelExit: (id: VisualNovelUnitId, beatId: VisualNovelBeatId) => void;
  readonly onVisualNovelReplay: (id: VisualNovelUnitId) => void;
};

// 화면 결선이 `renderScreen`에 넘기는 것. 셸이 소유한 값 하나와 콜백 셋이다.
// **`dispatch`도 `NavAction`도 여기 들어가지 않는다** — 화면은 스택을 모른다
// (ADR-0007 D3). 화면이 받는 것은 "무엇이 일어났다"는 콜백뿐이고, 그것을 무슨
// 네비게이션 동작으로 옮길지는 `App`이 정한다.
type ScreenWiring = {
  messengerEventSink: MessengerEventSink;
  completedMessengerUnitIds: readonly import("../screens/messenger/messenger.contract").MessengerUnitId[];
  onStartMessengerUnit: (
    id: import("../screens/messenger/messenger.contract").MessengerUnitId,
  ) => void;
  onMessengerExit: (
    id: import("../screens/messenger/messenger.contract").MessengerUnitId,
    outcome: import("../screens/messenger/messenger.contract").MessengerExitOutcome,
  ) => void;
  onMessengerComplete: (
    id: import("../screens/messenger/messenger.contract").MessengerUnitId,
  ) => void;
  onMessengerReplay: (
    id: import("../screens/messenger/messenger.contract").MessengerUnitId,
  ) => void;
  completedPhoneCallUnitIds: readonly PhoneCallUnitId[];
  onStartPhoneCallUnit: (id: PhoneCallUnitId) => void;
  onPhoneCallComplete: (id: PhoneCallUnitId) => void;
  onPhoneCallExit: (outcome: "incomplete" | "completed") => void;
  onStartVisualNovelUnit: (id: VisualNovelUnitId) => void;
  visualNovelProgress: VisualNovelProgress;
  onVisualNovelAdvance: (id: VisualNovelUnitId, outcome: VisualNovelAdvanceOutcome) => void;
  onVisualNovelExit: (outcome: VisualNovelExitOutcome, beatId: VisualNovelBeatId) => void;
  onVisualNovelReplay: (id: VisualNovelUnitId) => void;
  completedStepCount: number;
  onStartStep: (id: JourneyStepId) => void;
  // (LIB-239) `onExitListening`·`onFinishListening`에서 개명. 학습 화면 셋이 같은
  // 콜백을 받으므로 이름이 듣기에 묶여 있으면 거짓이 된다.
  onExitLearning: () => void;
  // LIB-227 계약 §1.6(c): 듣기가 넘기는 것은 「끝났다」와 「무엇이 일어났는지」뿐이다.
  // 통과 여부는 여기서 계산하지 않는다 — 판정의 권한은 평가로 옮겨갔다(§0.4 · §1.8(b)).
  onFinishLearning: (id: JourneyStepId, results: readonly AnswerResult[]) => void;
  // LIB-227 계약 §1.8(b): 평가의 `맵으로`. 중도 이탈(`onExitLearning`)과 같은 형태로
  // 진행을 갱신하지 않고 활성 스택의 루트로 곧장 닿는다(ADR-0007 D6).
  onExitAssessment: () => void;
  // LIB-238: 문화의 `맵으로`. **진행을 갱신하지 않는다** — 근거는 「이 화면에 나아가는
  // 수단이 없어서」가 아니다. 나아가는 수단은 있다(`퀴즈 풀기` — LIB-244가 세웠다).
  // 근거는 **완료를 걸 판정이 이 경로에 없다**는 것이다: 스텝 완료를 거는 권한은 평가의
  // 판정 하나이고, 문화가 진행에 거는 방식 자체가 아직 미정이다(`docs/screens.md`
  // 「문화 학습과 문화 퀴즈」 미정 표의 「진행에 거는 방식」 행). 활성 스택의 루트로
  // 곧장 닿는 것은 `onExitLearning`·`onExitAssessment`와 같은 형태다(ADR-0007 D6).
  onExitCulture: () => void;
  // LIB-244: 문화 학습의 액션 행 `퀴즈 풀기`. 문화 퀴즈를 push한다 — replace가
  // 아니다. 나아가는 수단은 자기 화면을 스택에서 지우지 않는다(D3.1).
  onStartCultureQuiz: (id: JourneyStepId) => void;
  // LIB-255 계약 §2.8: 롤플레이 목록 항목 선택. 해당 sink에 열림 이벤트(출처
  // `roleplay`) → `push(roleplayScreenFor(item))`.
  onStartRoleplayUnit: (item: RoleplayItem) => void;
  // LIB-255 계약 §2.8 · §6: 롤플레이 route 셋의 콜백 묶음. 연습 경계는 이 타입의
  // 매개변수 모양과 구현부 둘 다가 진다.
  roleplay: RoleplayUnitWiring;
  // LIB-257 계약 §2.9 3번: 여정 맵 머리 알림 버튼 · 알림 항목 선택 · 알림 화면
  // 나가기. `dispatch`도 `NavAction`도 여기 들어가지 않는다(위 원칙 그대로).
  onOpenNotifications: () => void;
  onSelectNotification: (item: NotificationItem) => void;
  onExitNotifications: () => void;
};

// 루트 구성 — 화면 전환 · 에러 경계 · 프로바이더가 여기 모인다 (ADR-0003 D5).
//
// LIB-255 계약 §2.8: `phoneCallEventSink`는 메신저·비주얼 노벨과 같은 방식으로
// App 경계에서 `null`로 정규화된다(§7.3).
export function App({
  messengerEventSink = null,
  visualNovelEventSink = null,
  phoneCallEventSink = null,
  notificationEventSink = null,
}: MessengerAppProps & VisualNovelAppProps & PhoneCallAppProps & NotificationAppProps = {}) {
  // 이 리듀서를 부르는 유일한 자리다. `dispatch`는 셸에 콜백으로 내려간다 —
  // 셸은 `NavAction`도 `dispatch`도 받지 않는다 (ADR-0007 D3).
  const [nav, dispatch] = useReducer(navReducer, initialNav);

  // **진행(완료 스텝 수)의 진실의 출처다** (계약 §0.2). 스텝 상태는 여기서 파생되고
  // (`stepStatusAt`), 데이터에도 `Nav`에도 적지 않는다 — 진행은 라우팅 상태가
  // 아니므로 `Nav`에 필드를 더하지 않는다 (ADR-0007 D3).
  //
  // **영속하지 않는다** — 저장소 모듈을 import하지도 호출하지도 않는다
  // (ADR-0007 D1: 저장소 모듈에 넣는 것은 로그인 토큰뿐이다). 앱을 다시 켜면
  // 진행이 `initialCompletedStepCount`로 돌아가는 것이 정상이고 계약이 그것을 적는다.
  const [completedStepCount, setCompletedStepCount] = useState(initialCompletedStepCount);
  const [completedMessengerUnitIds, setCompletedMessengerUnitIds] = useState<
    readonly import("../screens/messenger/messenger.contract").MessengerUnitId[]
  >([]);
  const [completedPhoneCallUnitIds, setCompletedPhoneCallUnitIds] = useState<
    readonly PhoneCallUnitId[]
  >([]);
  const [visualNovelProgress, setVisualNovelProgress] = useState<VisualNovelProgress>(
    initialVisualNovelProgress,
  );

  const wiring: ScreenWiring = {
    messengerEventSink,
    completedMessengerUnitIds,
    onStartMessengerUnit: (id) => {
      const entryStatus = messengerCompletionStatus(completedMessengerUnitIds, id);
      messengerEventSink?.({
        name: "messenger_unit_opened",
        unitId: id,
        entrySource: "journey",
        entryStatus,
      });
      dispatch({ type: "push", screen: { name: "messenger", unitId: id } });
    },
    onMessengerExit: (id, outcome) => {
      // 계약상 중도 이탈만 기록한다. 완료한 세션의 이탈은 완료 이벤트에 중복 집계하지 않는다.
      if (outcome === "incomplete")
        wiring.messengerEventSink?.({
          name: "messenger_unit_exited_incomplete",
          unitId: id,
          entrySource: "journey",
        });
      dispatch({ type: "backToRoot" });
    },
    onMessengerComplete: (id) => {
      if (!completedMessengerUnitIds.includes(id)) {
        messengerEventSink?.({
          name: "messenger_unit_completed",
          unitId: id,
          entrySource: "journey",
        });
        setCompletedMessengerUnitIds((ids) => completeMessengerUnit(ids, id));
      }
    },
    onMessengerReplay: (id) =>
      messengerEventSink?.({
        name: "messenger_unit_replay_started",
        unitId: id,
        entrySource: "journey",
      }),
    completedPhoneCallUnitIds,
    onStartPhoneCallUnit: (id) => {
      "background only";
      // LIB-255 계약 §2.8 「콜백 구현」: 여정 전화 진입은 열림 이벤트가 새로 는다 —
      // `push` 직전에 `entrySource: "journey"` · `entryStatus`.
      phoneCallEventSink?.({
        name: "phone_call_unit_opened",
        unitId: id,
        entrySource: "journey",
        entryStatus: phoneCallCompletionStatus(completedPhoneCallUnitIds, id),
      });
      dispatch({ type: "push", screen: { name: "phone-call", unitId: id } });
    },
    onPhoneCallComplete: (id) => {
      "background only";
      setCompletedPhoneCallUnitIds((ids) => completePhoneCallUnit(ids, id));
    },
    onPhoneCallExit: () => {
      "background only";
      dispatch({ type: "backToRoot" });
    },
    visualNovelProgress,
    onStartVisualNovelUnit: (id) => {
      "background only";
      const entry = visualNovelEntrySnapshot(visualNovelProgress);
      visualNovelEventSink?.({
        name: "visual_novel_unit_opened",
        unitId: id,
        entrySource: "journey",
        ...entry,
      });
      dispatch({ type: "push", screen: { name: "visual-novel", unitId: id } });
    },
    onVisualNovelAdvance: (id, outcome) => {
      "background only";
      if (outcome.progressChanged) setVisualNovelProgress(outcome.progress);
      if (outcome.completedNow) {
        if (outcome.announcement !== null) announceCompletion(outcome.announcement);
        visualNovelEventSink?.({
          name: "visual_novel_unit_completed",
          unitId: id,
          entrySource: "journey",
        });
      }
    },
    onVisualNovelExit: (outcome, beatId) => {
      "background only";
      if (outcome === "incomplete") {
        visualNovelEventSink?.({
          name: "visual_novel_unit_exited_incomplete",
          unitId: "cafe-arrival-visual-novel",
          beatId,
          entrySource: "journey",
        });
      }
      dispatch({ type: "backToRoot" });
    },
    onVisualNovelReplay: (id) => {
      "background only";
      visualNovelEventSink?.({
        name: "visual_novel_unit_replay_started",
        unitId: id,
        entrySource: "journey",
      });
    },
    completedStepCount,
    // 시트의 `시작`이 여기로 온다. 목적지는 `learningFormForStep`이 정하고
    // `learningScreenFor`가 화면으로 옮긴다. 이 파일은 학습형 이름을 리터럴로 쓰지
    // 않는다.
    //
    // 오늘 `learningFormByStep`의 다섯 값이 전부 `listening`이라 이 줄을 바꿔도 실기
    // 관찰은 안 바뀐다. 「결선이 안 됐다」가 아니라 「배정이 아직 안 왔다」다.
    onStartStep: (id) =>
      dispatch({ type: "push", screen: learningScreenFor(learningFormForStep(id), id) }),
    // 중도 이탈. **진행을 갱신하지 않는다** (수용 기준 10). `onFinishLearning`과
    // 합치지 않는 이유가 이 한 줄의 차이다 (계약 §1.6).
    onExitLearning: () => dispatch({ type: "backToRoot" }),
    // (u7) 판정은 평가가 진다 — `judgeAssessment` → `assessmentCompletesStep`. 셸에
    // `verdict === "passed"` 리터럴을 쓰지 않는다(계약 §1.5 · §1.8(b)). 완료를 거는
    // 조건이 생겼을 뿐 `completeStep`·`Math.max` 자체는 한 글자도 안 바뀐다 —
    // 진행을 쓰는 자리는 여전히 여기 하나다.
    onFinishLearning: (id, results) => {
      const verdict = judgeAssessment(results, assessmentPassCriterion);
      if (assessmentCompletesStep(verdict)) {
        setCompletedStepCount((count) => completeStep(count, id));
      }
      // `replace`이지 `push`가 아니다 — 끝난 학습 세션은 스택에 남길 자리가
      // 아니다. 이 근거는 출구(`onExitAssessment`)의 목적지와는 무관하다 — 출구는
      // 진입 동작이 무엇이든 활성 스택의 루트로 곧장 간다(ADR-0007 D6).
      dispatch({ type: "replace", screen: { name: "assessment", stepId: id, results } });
    },
    // 평가의 `맵으로`. 중도 이탈과 마찬가지로 진행을 갱신하지 않는다 — 판정은 이미
    // `onFinishLearning`에서 끝났다(계약 §1.8(b)).
    onExitAssessment: () => dispatch({ type: "backToRoot" }),
    onExitCulture: () => dispatch({ type: "backToRoot" }),
    // push다 — replace가 아니다(계약 §5.2). 문화 학습이 스택에 남는다.
    onStartCultureQuiz: (id) =>
      dispatch({ type: "push", screen: { name: "culture-quiz", stepId: id } }),
    // LIB-255 계약 §2.8 「콜백 구현」: `item.form`별로 해당 sink에 롤플레이 열림
    // 이벤트(출처 `roleplay`, `entryStatus` 없음 — A4) → `push(roleplayScreenFor(item))`.
    // `default` 없는 `switch (item.form)` + `never` 망라.
    onStartRoleplayUnit: (item) => {
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
    // LIB-255 계약 §2.8 · §6 ③겹: 롤플레이 route 셋의 App 쪽 구현. sink 호출 ·
    // `announceCompletion` · `dispatch(push/backToRoot)` 말고 아무것도 하지 않는다 —
    // 여정 상태 넷(`completedStepCount` · `completedMessengerUnitIds` ·
    // `completedPhoneCallUnitIds` · `visualNovelProgress`)과 그 setter를 읽지도
    // 부르지도 않는다.
    roleplay: {
      onMessengerExit: (id, outcome) => {
        // 계약상 중도 이탈만 기록한다(여정과 같은 규약).
        if (outcome === "incomplete")
          messengerEventSink?.({
            name: "messenger_unit_exited_incomplete",
            unitId: id,
            entrySource: "roleplay",
          });
        dispatch({ type: "backToRoot" });
      },
      // 중복 거름 없음(A2) — 회차마다 발화한다.
      onMessengerComplete: (id) => {
        messengerEventSink?.({
          name: "messenger_unit_completed",
          unitId: id,
          entrySource: "roleplay",
        });
      },
      onMessengerReplay: (id) =>
        messengerEventSink?.({
          name: "messenger_unit_replay_started",
          unitId: id,
          entrySource: "roleplay",
        }),
      onPhoneCallComplete: () => {
        "background only";
        // 전화 완료 이벤트가 없고(A5) 기록도 없다(Q5) — 아무것도 하지 않는다.
      },
      onPhoneCallExit: () => {
        "background only";
        dispatch({ type: "backToRoot" });
      },
      onVisualNovelAdvance: (id, outcome) => {
        "background only";
        // `outcome.progress`는 버린다 — 연습의 진행값은 늘 처음이라 뜻이 없다(계약 §2.8).
        if (outcome.completedNow) {
          if (outcome.announcement !== null) announceCompletion(outcome.announcement);
          visualNovelEventSink?.({
            name: "visual_novel_unit_completed",
            unitId: id,
            entrySource: "roleplay",
          });
        }
      },
      onVisualNovelExit: (id, beatId) => {
        "background only";
        if (practiceVisualNovelExitOutcome(beatId) === "incomplete") {
          visualNovelEventSink?.({
            name: "visual_novel_unit_exited_incomplete",
            unitId: id,
            beatId,
            entrySource: "roleplay",
          });
        }
        dispatch({ type: "backToRoot" });
      },
      onVisualNovelReplay: (id) => {
        "background only";
        visualNovelEventSink?.({
          name: "visual_novel_unit_replay_started",
          unitId: id,
          entrySource: "roleplay",
        });
      },
    },
    // LIB-257 계약 §2.9 4번: 여정 맵 머리 알림 버튼. 열림 이벤트 → `push` 직전 1회
    // (계약 §7.2 순서).
    onOpenNotifications: () => {
      notificationEventSink?.({ name: "notifications_opened" });
      dispatch({ type: "push", screen: { name: "notifications" } });
    },
    // LIB-257 계약 §2.9 4번: 알림 항목 선택. **먼저** 탭 이벤트를 올리고, 그 뒤
    // 대상별로 분기한다. 특별 유닛 셋은 **기존 여정 콜백을 부를 뿐** 이벤트·`push`를
    // 다시 쓰지 않는다(D-a · D-b) — 그 콜백들이 이미 `entrySource: "journey"` 변형과
    // `push`를 한 자리에서 한다. 롤플레이 목록은 `tabRootActions("roleplay")`를
    // **순서대로** `dispatch`한다(D-c) — 여정 스택은 건드리지 않는다.
    onSelectNotification: (item) => {
      notificationEventSink?.(notificationTappedEvent(item));
      switch (item.target.kind) {
        case "messenger": {
          wiring.onStartMessengerUnit(item.target.unitId);
          break;
        }
        case "phone-call": {
          wiring.onStartPhoneCallUnit(item.target.unitId);
          break;
        }
        case "visual-novel": {
          wiring.onStartVisualNovelUnit(item.target.unitId);
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
    // LIB-257 계약 §2.9 4번: 알림 화면의 `맵으로`. `onExitAssessment`·`onExitCulture`와
    // 같은 형태 — 활성 스택의 루트로 곧장 닿는다(ADR-0007 D6).
    onExitNotifications: () => {
      dispatch({ type: "backToRoot" });
    },
  };

  return (
    <ErrorBoundary>
      <view className="app">
        <view className="app-content">{renderScreen(currentScreen(nav), wiring)}</view>
        <BottomNavigator
          tab={nav.tab}
          onSelectTab={(tab) => dispatch({ type: "switchTab", tab })}
        />
      </view>
    </ErrorBoundary>
  );
}

// switch의 exhaustiveness 검사가 빠진 화면을 컴파일 타임에 잡는다.
//
// 값(`initialCompletedStepCount` · `journeyStepOrdinal` · `completeStep`)은 App이 읽어
// props로 내린다 — 화면끼리는 타입만 공유한다(계약 §8.4). 그래서 `ListeningScreen`은
// `stepOrdinal`을 계산하지 않고 받는다.
function renderScreen(screen: Screen, wiring: ScreenWiring) {
  switch (screen.name) {
    case "journey-map":
      // 메신저 통합 전까지는 타입 적합성만 위한 임시 scaffold wiring입니다.
      return (
        <JourneyMapScreen
          completedStepCount={wiring.completedStepCount}
          onStartStep={wiring.onStartStep}
          completedMessengerUnitIds={wiring.completedMessengerUnitIds}
          onStartMessengerUnit={wiring.onStartMessengerUnit}
          completedPhoneCallUnitIds={wiring.completedPhoneCallUnitIds}
          onStartPhoneCallUnit={wiring.onStartPhoneCallUnit}
          completedVisualNovelUnitIds={
            wiring.visualNovelProgress.status === "completed" ? ["cafe-arrival-visual-novel"] : []
          }
          onStartVisualNovelUnit={wiring.onStartVisualNovelUnit}
          // LIB-257 (integration): 여정 맵 머리 알림 버튼 결선(계약 §2.9 5번).
          onOpenNotifications={wiring.onOpenNotifications}
        />
      );
    case "roleplay-list":
      // LIB-255 (integration): 모듈 상수 `roleplayItems`를 그대로 그리고, 선택은
      // `onStartRoleplayUnit`으로 올린다(계약 §2.8).
      return <RoleplayListScreen items={roleplayItems} onSelectItem={wiring.onStartRoleplayUnit} />;
    case "settings":
      return <SettingsScreen />;
    case "notifications":
      // LIB-257 (integration): 모듈 상수 `notificationList`를 그대로 그리고, 선택·
      // 나가기는 결선으로 올린다(계약 §2.9 5번).
      return (
        <NotificationsScreen
          items={notificationList}
          onSelectItem={wiring.onSelectNotification}
          onExit={wiring.onExitNotifications}
        />
      );
    case "listening":
      return (
        <ListeningScreen
          stepId={screen.stepId}
          stepOrdinal={journeyStepOrdinal(screen.stepId)}
          onExit={wiring.onExitLearning}
          onFinish={wiring.onFinishLearning}
        />
      );
    case "assessment":
      return (
        <AssessmentScreen
          stepOrdinal={journeyStepOrdinal(screen.stepId)}
          results={screen.results}
          onExit={wiring.onExitAssessment}
        />
      );
    case "culture":
      return (
        <CultureScreen
          stepOrdinal={journeyStepOrdinal(screen.stepId)}
          narrative={cultureNarrativeForStep(screen.stepId)}
          onExit={wiring.onExitCulture}
          onStartQuiz={() => wiring.onStartCultureQuiz(screen.stepId)}
        />
      );
    // LIB-244: 문화 퀴즈. `onExit`은 학습 화면 셋이 쓰는 그 콜백을 그대로 쓴다 —
    // 하는 일이 문자 그대로 같다(계약 §5.2). 그 하는 일은 `back` 하나가 아니라
    // 활성 스택의 루트로 곧장 닿는 것이다(ADR-0007 D6). `onFinish`가 없다 — 판정이
    // 화면 밖으로 나가지 않는다(D1).
    case "culture-quiz":
      return (
        <CultureQuizScreen
          stepId={screen.stepId}
          stepOrdinal={journeyStepOrdinal(screen.stepId)}
          onExit={wiring.onExitLearning}
        />
      );
    // LIB-239: 결선이 착지했다 — `onStartStep`이 `learningFormForStep`을 거쳐
    // `learningScreenFor`가 돌려주는 화면을 push하므로 이 두 case가 실제로 열린다.
    // 세 학습 화면은 props가 문자 그대로 같지만(§1.6(d)) `Record`나 공통 렌더
    // 헬퍼로 묶지 않는다 — 묶으면 `switch`의 exhaustiveness가 죽고, 그 exhaustiveness가
    // 이 저장소가 「빠진 결선」을 컴파일 타임에 잡는 유일한 장치다. 분기 셋의 중복은
    // 그 장치의 가격이지 결함이 아니다.
    case "sentence-order":
      return (
        <SentenceOrderScreen
          stepId={screen.stepId}
          stepOrdinal={journeyStepOrdinal(screen.stepId)}
          onExit={wiring.onExitLearning}
          onFinish={wiring.onFinishLearning}
        />
      );
    case "word-choice":
      return (
        <WordChoiceScreen
          stepId={screen.stepId}
          stepOrdinal={journeyStepOrdinal(screen.stepId)}
          onExit={wiring.onExitLearning}
          onFinish={wiring.onFinishLearning}
        />
      );
    case "messenger":
      return (
        <MessengerScreen
          conversation={messengerConversationFor(screen.unitId)}
          completionStatus={messengerCompletionStatus(
            wiring.completedMessengerUnitIds,
            screen.unitId,
          )}
          exitLabel={specialUnitExitLabel("journey")}
          onExit={(outcome) => wiring.onMessengerExit(screen.unitId, outcome)}
          onComplete={wiring.onMessengerComplete}
          onReplay={wiring.onMessengerReplay}
        />
      );
    case "phone-call":
      return (
        <PhoneCallScreen
          unitId={screen.unitId}
          conversation={getPhoneCallConversation()}
          completionStatus={phoneCallCompletionStatus(
            wiring.completedPhoneCallUnitIds,
            screen.unitId,
          )}
          exitLabel={specialUnitExitLabel("journey")}
          onComplete={wiring.onPhoneCallComplete}
          onExit={wiring.onPhoneCallExit}
        />
      );
    case "visual-novel":
      return (
        <VisualNovelScreen
          story={visualNovelStoryFor(screen.unitId)}
          progress={wiring.visualNovelProgress}
          exitLabel={specialUnitExitLabel("journey")}
          onAdvance={wiring.onVisualNovelAdvance}
          onExit={wiring.onVisualNovelExit}
          onReplay={wiring.onVisualNovelReplay}
        />
      );
    // LIB-255 (integration): 롤플레이 route 셋. `renderRoleplayUnitScreen`이 연습
    // 경계(계약 §6)를 진 매개변수 타입으로 세 화면을 잇는다(계약 §2.8).
    case "roleplay-messenger":
    case "roleplay-phone-call":
    case "roleplay-visual-novel":
      return renderRoleplayUnitScreen(screen, wiring.roleplay);
    default: {
      const exhaustive: never = screen;
      return exhaustive;
    }
  }
}

// LIB-255 계약 §2.8 · §6 ②겹: 롤플레이 route 셋의 렌더. **모듈 수준 함수** —
// `App` 함수 안의 클로저로 두지 않는다. 안에 두면 App 상태를 캡처할 수 있어 연습
// 경계(매개변수 타입에 여정 상태 필드가 없다는 것)가 사라진다. 자기 `switch`에
// `never` 망라를 갖고 `renderScreen`의 망라도 그대로 선다 — 둘 다 선다(계약 §2.8
// 「새 패턴」).
function renderRoleplayUnitScreen(screen: RoleplayUnitScreen, wiring: RoleplayUnitWiring) {
  switch (screen.name) {
    case "roleplay-messenger":
      return (
        <MessengerScreen
          conversation={messengerConversationFor(screen.unitId)}
          completionStatus={practiceMessengerCompletionStatus()}
          exitLabel={specialUnitExitLabel("roleplay")}
          onExit={(outcome) => wiring.onMessengerExit(screen.unitId, outcome)}
          onComplete={wiring.onMessengerComplete}
          onReplay={wiring.onMessengerReplay}
        />
      );
    case "roleplay-phone-call":
      return (
        <PhoneCallScreen
          unitId={screen.unitId}
          conversation={getPhoneCallConversation()}
          completionStatus={practicePhoneCallCompletionStatus()}
          exitLabel={specialUnitExitLabel("roleplay")}
          onComplete={wiring.onPhoneCallComplete}
          onExit={wiring.onPhoneCallExit}
        />
      );
    case "roleplay-visual-novel":
      // 화면의 `onExit` 첫 인자(`outcome`)를 버린다 — 연습의 `progress`는 늘 처음이라
      // `visualNovelExitOutcome(progress)`가 늘 `incomplete`라 뜻이 없다. 연습의 판정은
      // `wiring.onVisualNovelExit`을 거쳐 `practiceVisualNovelExitOutcome(beatId)`가
      // 진다(계약 §2.8).
      return (
        <VisualNovelScreen
          story={visualNovelStoryFor(screen.unitId)}
          progress={practiceVisualNovelProgress()}
          exitLabel={specialUnitExitLabel("roleplay")}
          onAdvance={wiring.onVisualNovelAdvance}
          onExit={(_outcome, beatId) => wiring.onVisualNovelExit(screen.unitId, beatId)}
          onReplay={wiring.onVisualNovelReplay}
        />
      );
    default: {
      const exhaustive: never = screen;
      return exhaustive;
    }
  }
}
