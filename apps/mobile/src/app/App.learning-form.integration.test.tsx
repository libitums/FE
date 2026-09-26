import { afterEach, expect, test, vi } from "vitest";
import { act, fireEvent, render, screen, cleanup } from "@lynx-js/react/testing-library";

import { App } from "./App";
import { journeyStepOrdinal, type JourneyStepId } from "../screens/journey-map/journey-map";
import type { LearningForm } from "../lib/learning-form";
import { listeningScreenTitle } from "../screens/listening/listening";
import { sentenceOrderScreenTitle } from "../screens/sentence-order/sentence-order";
import { wordChoiceScreenTitle } from "../screens/word-choice/word-choice";
import { cultureScreenTitle } from "../screens/culture/culture";
import { cultureQuizScreenTitle } from "../screens/culture-quiz/culture-quiz";
import { authTokenStorageKey } from "../lib/auth-token";
import { entrySplashDurationMs } from "../lib/entry-flow";

// 결선(`App.tsx`)이 배정표(`learningFormForStep`)를 **실제로 경유하는지**를
// 짓습니다.
//
// 1) **대역 반경.** 이 파일만 `learningFormForStep` 하나를 `vi.mock(경로,
//    importOriginal)`로 부분 대역합니다. 나머지 export(`journeySteps` ·
//    `completeStep` · `journeyStepOrdinal` · `initialCompletedStepCount` 등)는
//    `importOriginal`로 그대로 통과시켜 맵·진행이 실물로 돕니다. `learningFormForStep`의
//    제품 호출자는 결선 한 줄뿐이고 학습형은 어떤 UI 텍스트에도 나타나지 않으므로,
//    이 대역이 다른 동작을 가리는 폭이 없습니다.
// 2) **실물 배정의 증인은 이 파일이 아닙니다.** 오늘 `learningFormByStep` 다섯 값이
//    전부 `listening`이라는 것과 그것이 맵 → 시작 → 듣기로 실제로 이어진다는 것은
//    `App.integration.test.tsx`의 기존 케이스들이 대역 없이 집니다. 이 파일의
//    I-W5-3만 그 사실의 대조로 최소한으로 반복합니다.
// 3) **형태의 선례**는 `SentenceOrderScreen.ui.test.tsx:24-55`입니다 — 조회 함수
//    하나만 부분 대역하고 그 정당화를 파일에 적어 두는 형태를 그대로 따릅니다.
// 4) **세션을 몰지 않습니다.** `sentenceOrderQuestionsByStep` ·
//    `wordChoiceQuestionsByStep`은 다섯 스텝 전부 빈 배열이라 학습 화면은 문항
//    0개 완료 상태로 곧장 렌더됩니다. 그 상태에서 나가는 수단은 `결과 보기`
//    하나뿐이고 평가로 `replace`합니다 — 그래서 이 파일의 모든 케이스는 제목
//    단언에서 멈춥니다.

const formStub = vi.hoisted(() => ({
  current: null as LearningForm | ((id: JourneyStepId) => LearningForm) | null,
}));

vi.mock("../screens/journey-map/journey-map", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../screens/journey-map/journey-map")>();
  return {
    ...actual,
    // 스텁은 학습형 하나를 줍니다 — 배정표가 목록을 돌려주므로 그 하나를 한 항목
    // 목록으로 감쌉니다. 이 파일이 보는 것은 「배정표를 실제로 경유하는가」입니다.
    learningFormsForStep: (id: JourneyStepId) => {
      const stub = formStub.current;
      if (stub === null) {
        return actual.learningFormsForStep(id);
      }
      return [typeof stub === "function" ? stub(id) : stub] as const;
    },
    learningFormAt: (id: JourneyStepId, index: number) => {
      const stub = formStub.current;
      if (stub === null) {
        return actual.learningFormAt(id, index);
      }
      if (index !== 0) {
        return undefined;
      }
      return typeof stub === "function" ? stub(id) : stub;
    },
  };
});

afterEach(() => {
  formStub.current = null;
  vi.unstubAllGlobals();
});

// 기존 `render` 직접 호출 자리를 대신하는 공용 헬퍼(`renderApp`)입니다. 토큰이 있는
// 상태를 스텁하고 가짜 타이머로 `entrySplashDurationMs`만큼 전진시켜 진입
// 스플래시를 건너뜁니다.
function renderApp(ui: Parameters<typeof render>[0]) {
  const previousNativeModules = (globalThis as { NativeModules?: unknown }).NativeModules;
  const tokenStore = new Map<string, string>();
  tokenStore.set(authTokenStorageKey, "existing-token");
  vi.stubGlobal("NativeModules", {
    ...(typeof previousNativeModules === "object" && previousNativeModules !== null
      ? previousNativeModules
      : {}),
    StorageModule: {
      get: (key: string) => tokenStore.get(key) ?? null,
      set: (key: string, value: string) => void tokenStore.set(key, value),
      remove: (key: string) => void tokenStore.delete(key),
    },
  });
  vi.useFakeTimers();
  const result = render(ui);
  act(() => {
    vi.advanceTimersByTime(entrySplashDurationMs);
  });
  vi.useRealTimers();
  return result;
}

// 여정 탭 → 스텝 tap → 시트 `시작` tap입니다. `App.integration.test.tsx`의
// `startStep`과 같은 형태입니다(파일이 다르므로 다시 선언합니다).
function startStep(stepId: JourneyStepId): void {
  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-journey"), {});
  fireEvent.tap(screen.getByTestId(`ui-lynx-learning-unit-${stepId}`), {});
  expect(screen.getByTestId("step-sheet-panel")).toBeInTheDocument();
  fireEvent.tap(screen.getByTestId("step-sheet-start"), {});
}

const allForms: readonly LearningForm[] = ["listening", "sentence-order", "word-choice", "culture"];

// 아래 두 표는 `Record<LearningForm, …>`이라 `LearningForm`에 넷째 멤버 `culture`가
// 늘면서 tsc(TS2741)가 `culture` 키를 요구합니다 — `journey-map.unit.test.ts`의
// `questionCountForForm`이 이미 겪은 것과 같은 자리입니다. 값은 지어낸 것이 아니라
// 실물입니다: `culture-screen-title`은 문화 화면(`CultureScreen.tsx`)의 실제
// `data-testid`이고, `cultureScreenTitle(ordinal)`은 `${ordinal}단계 · 문화`를
// 돌려주는 실제 제목 함수입니다. 위 `allForms`는 이제 넷이고 `culture`를 담고
// 있으므로, `test.each(allForms)`가 이 두 `culture` 항목을 도는 케이스가 실제로
// 있습니다 — `test.each`가 `allForms`를 그대로 순회하기 때문입니다.
const titleTestIdByForm: Record<LearningForm, string> = {
  listening: "listening-screen-title",
  "sentence-order": "sentence-order-screen-title",
  "word-choice": "word-choice-screen-title",
  culture: "culture-screen-title",
};

const titleTextByForm: Record<LearningForm, (ordinal: number) => string> = {
  listening: listeningScreenTitle,
  "sentence-order": sentenceOrderScreenTitle,
  "word-choice": wordChoiceScreenTitle,
  culture: cultureScreenTitle,
};

// I-W5-1 · 학습형 셋 각각을 배정표가 돌려준다고 스텝(스텝은 항상 "ordering", 서수
// 3)에서 시작하면, 그 학습형의 화면이 열려야 합니다. **"ordering은 F다"라는 존재
// 명제를 주장하지 않습니다** — "표가 F를 돌려주면 F의 화면이 연다"는 함축만
// 주장합니다. `listening` 행은 오늘의 실물 배정과 우연히 같아 항등 대조로
// 통과합니다 — red의 근거가 아닙니다.
test.each(allForms)("learningFormForStep이 %s를 돌려주면 시작이 그 화면을 연다", (form) => {
  formStub.current = form;
  renderApp(<App />);

  startStep("ordering");

  const expectedTitle = titleTextByForm[form](journeyStepOrdinal("ordering"));
  expect(screen.getByTestId(titleTestIdByForm[form])).toHaveTextContent(expectedTitle);

  for (const other of allForms) {
    if (other === form) {
      continue;
    }
    expect(screen.queryByTestId(titleTestIdByForm[other])).not.toBeInTheDocument();
  }
  expect(screen.queryByTestId("journey-map-screen-title")).not.toBeInTheDocument();
});

// I-W5-4 · I-W5-1의 두 red 행(`sentence-order` · `word-choice`)과 같은 경로를 다시
// 밟되, 학습 화면의 제목에 더해 **`case`가 던지지 않는다**는 것을 한 줄 더 짓습니다
// — `error-boundary-title`이 없습니다. 오늘은 `onStartStep`이 리터럴이라 이 두
// `case`에 닿지도 못하므로(닿지 않으면 못 던집니다) 이 자체만으로는 구분되지
// 않지만, 제목 단언이 같은 이유로 먼저 빨개집니다 — 결선이 배정표를 경유하게 되는
// 순간 제목과 부재 단언이 함께 초록이 됩니다.
test("learningFormForStep이 sentence-order·word-choice를 돌려줘도 던지지 않고 각 화면이 그대로 뜬다", () => {
  formStub.current = "sentence-order";
  renderApp(<App />);
  startStep("ordering");
  expect(screen.getByTestId("sentence-order-screen-title")).toHaveTextContent(
    sentenceOrderScreenTitle(journeyStepOrdinal("ordering")),
  );
  expect(screen.queryByTestId("error-boundary-title")).not.toBeInTheDocument();
  cleanup();

  formStub.current = "word-choice";
  renderApp(<App />);
  startStep("ordering");
  expect(screen.getByTestId("word-choice-screen-title")).toHaveTextContent(
    wordChoiceScreenTitle(journeyStepOrdinal("ordering")),
  );
  expect(screen.queryByTestId("error-boundary-title")).not.toBeInTheDocument();
});

// I-W5-2 · 배정표가 스텝마다 다른 값을 돌려주면 서로 다른 스텝이 서로 다른 화면을
// 엽니다 — 결선만 확인하고 표를 안 바꾸면 지어지지 않는 사실입니다. `ordering` →
// `sentence-order`, `greeting` → `word-choice`로 스텝별로 갈리는 함수를 스텁으로
// 줍니다. 각각 독립 `render`입니다 — 문항 0개 화면은 헤더에 `맵으로`가 없어
// 세션을 이어서 몰 수 없습니다(위 파일 머리 4번 참고).
const formByStep = (id: JourneyStepId): LearningForm =>
  id === "ordering" ? "sentence-order" : "word-choice";

test("배정표가 스텝마다 갈리면 ordering 스텝에서는 그 스텝에 배정된 화면(sentence-order)이 열린다", () => {
  formStub.current = formByStep;
  renderApp(<App />);

  startStep("ordering");

  expect(screen.getByTestId("sentence-order-screen-title")).toHaveTextContent(
    sentenceOrderScreenTitle(journeyStepOrdinal("ordering")),
  );
});

test("배정표가 스텝마다 갈리면 greeting 스텝에서는 그 스텝에 배정된 화면(word-choice)이 열린다", () => {
  formStub.current = formByStep;
  renderApp(<App />);

  startStep("greeting");

  expect(screen.getByTestId("word-choice-screen-title")).toHaveTextContent(
    wordChoiceScreenTitle(journeyStepOrdinal("greeting")),
  );
});

// I-W5-3 · **대조.** 스텁을 두지 않습니다 — 실물 `learningFormByStep`이 그대로
// 조회됩니다. 오늘 그 표의 다섯 값 전부가 `listening`이므로 `ordering`에서
// 시작해도 여는 것은 듣기 화면입니다. 이 케이스는 지금도 통과하고 표가 바뀌지
// 않는 한 계속 통과해야 합니다 — red의 근거가 아니라 "표가 바뀌지 않았다"의
// 회귀 대조입니다.
test("배정표에 스텁이 없으면 ordering 스텝은 오늘의 실물 배정대로 듣기 화면을 연다", () => {
  renderApp(<App />);

  startStep("ordering");

  expect(screen.getByTestId("listening-screen-title")).toHaveTextContent(
    listeningScreenTitle(journeyStepOrdinal("ordering")),
  );
  expect(screen.queryByTestId("sentence-order-screen-title")).not.toBeInTheDocument();
  expect(screen.queryByTestId("word-choice-screen-title")).not.toBeInTheDocument();
});

// 문화 학습의 액션 행이 문화 퀴즈를 여는 전이와, 퀴즈의 `맵으로`가 맵에 닿는
// 것(문화 학습이 아닙니다)을 짓습니다. 배정을 "culture"로 대역해 문화 학습에
// 닿는 것은 위 케이스들과 같은 seam입니다 — 이 케이스는 그 뒤에 이어지는 문화
// 학습 → 문화 퀴즈 → 맵 전이 하나를 더합니다. `learningFormByStep`은 손대지
// 않습니다 — 대역이 배정을 대신합니다.
//
// 문화 퀴즈의 `맵으로`는 결선(`App.tsx`)의 `wiring.onExitLearning`이 집니다 — 이
// 케이스의 마지막 단언은 그 콜백이 `dispatch({ type: "backToRoot" })`를 거는 것으로
// 성립합니다.
test("문화 학습의 퀴즈 풀기가 문화 퀴즈를 열고, 퀴즈의 맵으로가 맵으로 돌아온다(문화 학습이 아니다)", () => {
  formStub.current = "culture";
  renderApp(<App />);

  startStep("ordering");

  // 문화 학습이 열렸습니다.
  expect(screen.getByTestId("culture-screen-title")).toHaveTextContent(
    cultureScreenTitle(journeyStepOrdinal("ordering")),
  );

  // 퀴즈 풀기 → 문화 퀴즈가 열립니다.
  fireEvent.tap(screen.getByTestId("culture-screen-quiz"), {});
  expect(screen.getByTestId("culture-quiz-screen-title")).toHaveTextContent(
    cultureQuizScreenTitle(journeyStepOrdinal("ordering")),
  );
  expect(screen.queryByTestId("culture-screen-title")).not.toBeInTheDocument();

  // 퀴즈의 맵으로 → 맵으로 돌아옵니다(`backToRoot` 판정). 문화 학습이 아닙니다.
  fireEvent.tap(screen.getByTestId("culture-quiz-screen-exit"), {});
  expect(screen.getByTestId("journey-map-screen-title")).toBeInTheDocument();
  expect(screen.queryByTestId("culture-quiz-screen-title")).not.toBeInTheDocument();
  expect(screen.queryByTestId("culture-screen-title")).not.toBeInTheDocument();
});

// I-B — 나간 뒤 맵이 꼭대기이고, 거기서 같은 스텝을 다시 시작하면 문화 학습이
// 새로 열립니다. 맵이 꼭대기라는 것은 위 케이스의 journey-map-screen-title 단언이
// 이미 짓습니다 — push는 위에 쌓고 currentScreen은 꼭대기만 읽으므로 잔재 유무는
// 거기서 가려집니다. startStep 헬퍼도 ui-lynx-learning-unit-*를 요구해 같은 전제
// 위에서 재시작합니다.
test("문화 퀴즈에서 맵으로 나간 뒤 맵에서 같은 스텝을 다시 시작하면 문화 학습이 다시 뜬다", () => {
  formStub.current = "culture";
  renderApp(<App />);

  startStep("ordering");
  fireEvent.tap(screen.getByTestId("culture-screen-quiz"), {});
  expect(screen.getByTestId("culture-quiz-screen-title")).toBeInTheDocument();

  // 맵으로 나갑니다.
  fireEvent.tap(screen.getByTestId("culture-quiz-screen-exit"), {});
  expect(screen.getByTestId("journey-map-screen-title")).toBeInTheDocument();

  // 맵에서 같은 스텝을 다시 시작합니다 — 스택에 잔재가 없습니다.
  startStep("ordering");
  expect(screen.getByTestId("culture-screen-title")).toHaveTextContent(
    cultureScreenTitle(journeyStepOrdinal("ordering")),
  );
  expect(screen.queryByTestId("culture-quiz-screen-title")).not.toBeInTheDocument();
});

// I-D — 퀴즈에 있는 채 다른 탭으로 갔다가 여정 탭으로 돌아오면 퀴즈가 그대로
// 있고, 그때 `맵으로`가 맵에 닿습니다. 탭 전환은 활성 스택을 바꾸지 않으므로
// 여정 스택 위의 문화 퀴즈가 그대로 남아 있어야 하고, 그 위에서의 `맵으로`도
// 여전히 `backToRoot`로 맵에 닿아야 합니다. 「다른 탭」은 설정입니다(홈 탭이
// 없으므로 설정 제목으로 실제로 떠난 것을 확인합니다).
test("문화 퀴즈에 있는 채 다른 탭으로 갔다가 여정 탭으로 돌아오면 퀴즈가 그대로 있고, 그때 맵으로가 맵에 닿는다", () => {
  formStub.current = "culture";
  renderApp(<App />);

  startStep("ordering");
  fireEvent.tap(screen.getByTestId("culture-screen-quiz"), {});
  expect(screen.getByTestId("culture-quiz-screen-title")).toBeInTheDocument();

  // 다른 탭(설정)으로 갔다가 여정 탭으로 돌아옵니다.
  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-settings"), {});
  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-journey"), {});

  // 퀴즈가 그대로 있습니다.
  expect(screen.getByTestId("culture-quiz-screen-title")).toHaveTextContent(
    cultureQuizScreenTitle(journeyStepOrdinal("ordering")),
  );

  // 그 상태에서도 맵으로 → 맵에 닿습니다.
  fireEvent.tap(screen.getByTestId("culture-quiz-screen-exit"), {});
  expect(screen.getByTestId("journey-map-screen-title")).toBeInTheDocument();
  expect(screen.queryByTestId("culture-quiz-screen-title")).not.toBeInTheDocument();
  expect(screen.queryByTestId("culture-screen-title")).not.toBeInTheDocument();
});
