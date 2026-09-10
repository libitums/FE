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
import { HomeScreen } from "../screens/home/HomeScreen";
import { JourneyMapScreen } from "../screens/journey-map/JourneyMapScreen";
import {
  completeStep,
  initialCompletedStepCount,
  journeyStepOrdinal,
  learningFormForStep,
  type JourneyStepId,
} from "../screens/journey-map/journey-map";
import { ListeningScreen } from "../screens/listening/ListeningScreen";
import { RoleplayListScreen } from "../screens/roleplay-list/RoleplayListScreen";
import { SentenceOrderScreen } from "../screens/sentence-order/SentenceOrderScreen";
import { SettingsScreen } from "../screens/settings/SettingsScreen";
import { WordChoiceScreen } from "../screens/word-choice/WordChoiceScreen";
import type {
  MessengerAppProps,
  MessengerEventSink,
} from "../screens/messenger/messenger.contract";
import { MessengerScreen } from "../screens/messenger/MessengerScreen";
import { PhoneCallScreen } from "../screens/phone-call/PhoneCallScreen";
import {
  getPhoneCallConversation,
  completePhoneCallUnit,
  phoneCallCompletionStatus,
} from "../screens/phone-call/phone-call";
import type { PhoneCallUnitId } from "../screens/phone-call/phone-call.contract";
import {
  messengerCompletionStatus,
  messengerConversationFor,
  completeMessengerUnit,
} from "../screens/messenger/messenger";
import { ErrorBoundary } from "./ErrorBoundary";
import { announceCompletion } from "../lib/accessibility";
import { VisualNovelScreen } from "../screens/visual-novel/VisualNovelScreen";
import {
  initialVisualNovelProgress,
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
  type Screen,
} from "./navigation";

import "./app.css";

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
};

// 루트 구성 — 화면 전환 · 에러 경계 · 프로바이더가 여기 모인다 (ADR-0003 D5).
export function App({
  messengerEventSink = null,
  visualNovelEventSink = null,
}: MessengerAppProps & VisualNovelAppProps = {}) {
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
      messengerEventSink?.({ name: "messenger_unit_opened", unitId: id, entryStatus });
      dispatch({ type: "push", screen: { name: "messenger", unitId: id } });
    },
    onMessengerExit: (id, outcome) => {
      // 계약상 중도 이탈만 기록한다. 완료한 세션의 이탈은 완료 이벤트에 중복 집계하지 않는다.
      if (outcome === "incomplete")
        wiring.messengerEventSink?.({ name: "messenger_unit_exited_incomplete", unitId: id });
      dispatch({ type: "backToRoot" });
    },
    onMessengerComplete: (id) => {
      if (!completedMessengerUnitIds.includes(id)) {
        messengerEventSink?.({ name: "messenger_unit_completed", unitId: id });
        setCompletedMessengerUnitIds((ids) => completeMessengerUnit(ids, id));
      }
    },
    onMessengerReplay: (id) =>
      messengerEventSink?.({ name: "messenger_unit_replay_started", unitId: id }),
    completedPhoneCallUnitIds,
    onStartPhoneCallUnit: (id) =>
      dispatch({ type: "push", screen: { name: "phone-call", unitId: id } }),
    onPhoneCallComplete: (id) =>
      setCompletedPhoneCallUnitIds((ids) => completePhoneCallUnit(ids, id)),
    onPhoneCallExit: () => dispatch({ type: "backToRoot" }),
    visualNovelProgress,
    onStartVisualNovelUnit: (id) => {
      "background only";
      const entry = visualNovelEntrySnapshot(visualNovelProgress);
      visualNovelEventSink?.({ name: "visual_novel_unit_opened", unitId: id, ...entry });
      dispatch({ type: "push", screen: { name: "visual-novel", unitId: id } });
    },
    onVisualNovelAdvance: (id, outcome) => {
      "background only";
      if (outcome.progressChanged) setVisualNovelProgress(outcome.progress);
      if (outcome.completedNow) {
        if (outcome.announcement !== null) announceCompletion(outcome.announcement);
        visualNovelEventSink?.({ name: "visual_novel_unit_completed", unitId: id });
      }
    },
    onVisualNovelExit: (outcome, beatId) => {
      "background only";
      if (outcome === "incomplete") {
        visualNovelEventSink?.({
          name: "visual_novel_unit_exited_incomplete",
          unitId: "cafe-arrival-visual-novel",
          beatId,
        });
      }
      dispatch({ type: "backToRoot" });
    },
    onVisualNovelReplay: (id) => {
      "background only";
      visualNovelEventSink?.({ name: "visual_novel_unit_replay_started", unitId: id });
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
    case "home":
      return <HomeScreen />;
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
        />
      );
    case "roleplay-list":
      return <RoleplayListScreen />;
    case "settings":
      return <SettingsScreen />;
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
          onComplete={wiring.onPhoneCallComplete}
          onExit={wiring.onPhoneCallExit}
        />
      );
    case "visual-novel":
      return (
        <VisualNovelScreen
          story={visualNovelStoryFor(screen.unitId)}
          progress={wiring.visualNovelProgress}
          onAdvance={wiring.onVisualNovelAdvance}
          onExit={wiring.onVisualNovelExit}
          onReplay={wiring.onVisualNovelReplay}
        />
      );
    default: {
      const exhaustive: never = screen;
      return exhaustive;
    }
  }
}
