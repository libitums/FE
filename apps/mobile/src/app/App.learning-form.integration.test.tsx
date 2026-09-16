import { afterEach, expect, test, vi } from "vitest";
import { fireEvent, render, screen, cleanup } from "@lynx-js/react/testing-library";

import { App } from "./App";
import { journeyStepOrdinal, type JourneyStepId } from "../screens/journey-map/journey-map";
import type { LearningForm } from "../lib/learning-form";
import { listeningScreenTitle } from "../screens/listening/listening";
import { sentenceOrderScreenTitle } from "../screens/sentence-order/sentence-order";
import { wordChoiceScreenTitle } from "../screens/word-choice/word-choice";
import { cultureScreenTitle } from "../screens/culture/culture";
import { cultureQuizScreenTitle } from "../screens/culture-quiz/culture-quiz";

// LIB-239 (integration-design, u2): 결선(`App.tsx`)이 배정표(`learningFormForStep`)를
// **실제로 경유하는지**를 짓는다. 오늘의 `onStartStep`은 리터럴
// `{ name: "listening" }`을 push하고, `case "sentence-order"` · `case "word-choice"`는
// 아직 던진다 — 이 파일이 잡는 red는 그 두 사실이다.
//
// 1) **대역 반경.** 이 파일만 `learningFormForStep` 하나를 `vi.mock(경로,
//    importOriginal)`로 부분 대역한다. 나머지 export(`journeySteps` ·
//    `completeStep` · `journeyStepOrdinal` · `initialCompletedStepCount` 등)는
//    `importOriginal`로 그대로 통과시켜 맵·진행이 실물로 돈다. `learningFormForStep`의
//    제품 호출자는(고쳐질 예정인) 결선 한 줄뿐이고 학습형은 어떤 UI 텍스트에도
//    나타나지 않으므로, 이 대역이 다른 동작을 가리는 폭이 없다.
// 2) **실물 배정의 증인은 이 파일이 아니다.** 오늘 `learningFormByStep` 다섯 값이
//    전부 `listening`이라는 것과 그것이 맵 → 시작 → 듣기로 실제로 이어진다는 것은
//    `App.integration.test.tsx`의 기존 35건이 대역 없이 지고 있다. 이 파일의
//    I-W5-3만 그 사실의 대조로 최소한으로 반복한다.
// 3) **형태의 선례**는 `SentenceOrderScreen.ui.test.tsx:24-55`다 — 조회 함수 하나만
//    부분 대역하고 그 정당화를 파일에 적어 두는 형태를 그대로 따른다.
// 4) **세션을 몰지 않는다.** `sentenceOrderQuestionsByStep` · `wordChoiceQuestionsByStep`은
//    다섯 스텝 전부 빈 배열이라(계약 §1.9) 학습 화면은 문항 0개 완료 상태로 곧장
//    렌더된다. 그 상태에서 나가는 수단은 `결과 보기` 하나뿐이고 평가로 `replace`한다
//    — 그래서 이 파일의 모든 케이스는 제목 단언에서 멈춘다.

const formStub = vi.hoisted(() => ({
  current: null as LearningForm | ((id: JourneyStepId) => LearningForm) | null,
}));

vi.mock("../screens/journey-map/journey-map", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../screens/journey-map/journey-map")>();
  return {
    ...actual,
    learningFormForStep: (id: JourneyStepId) => {
      const stub = formStub.current;
      if (stub === null) {
        return actual.learningFormForStep(id);
      }
      return typeof stub === "function" ? stub(id) : stub;
    },
  };
});

afterEach(() => {
  formStub.current = null;
});

// 여정 탭 → 스텝 tap → 시트 `시작` tap. `App.integration.test.tsx`의 `startStep`과
// 같은 형태다(파일이 다르므로 다시 선언한다).
function startStep(stepId: JourneyStepId): void {
  fireEvent.tap(screen.getByTestId("bottom-navigator-tab-journey"), {});
  fireEvent.tap(screen.getByTestId(`journey-step-node-${stepId}`), {});
  expect(screen.getByTestId("step-sheet-panel")).toBeInTheDocument();
  fireEvent.tap(screen.getByTestId("step-sheet-start"), {});
}

const allForms: readonly LearningForm[] = ["listening", "sentence-order", "word-choice", "culture"];

// LIB-238(u21): 아래 두 표는 `Record<LearningForm, …>`이라 `LearningForm`에 넷째
// 멤버 `culture`가 늘면서 tsc(TS2741)가 `culture` 키를 요구한다 —
// `journey-map.unit.test.ts`의 `questionCountForForm`이 이미 겪은 것과 같은 자리다.
// 값은 지어낸 것이 아니라 실물이다: `culture-screen-title`은 문화 화면
// (`CultureScreen.tsx`)의 실제 `data-testid`이고, `cultureScreenTitle(ordinal)`은
// `${ordinal}단계 · 문화`를 돌려주는 실제 제목 함수다. 위 `allForms`는 이제 넷이고
// `culture`를 담고 있으므로, `test.each(allForms)`가 이 두 `culture` 항목을 도는
// 케이스가 실제로 있다 — `test.each`가 `allForms`를 그대로 순회하기 때문이다.
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

// I-W5-1 · AC 1 주 판정자. 학습형 셋 각각을 배정표가 돌려준다고 스텝(스텝은 항상
// "ordering", 서수 3)에서 시작하면, 그 학습형의 화면이 열려야 한다. **"ordering은
// F다"라는 존재 명제를 주장하지 않는다** — "표가 F를 돌려주면 F의 화면이 연다"는
// 함축만 주장한다. `listening` 행은 오늘의 실물 배정과 우연히 같아 항등 대조로
// 통과한다 — red의 근거가 아니다.
test.each(allForms)("learningFormForStep이 %s를 돌려주면 시작이 그 화면을 연다", (form) => {
  formStub.current = form;
  render(<App />);

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

// I-W5-4 · AC 2 후반의 주 판정자. I-W5-1의 두 red 행(`sentence-order` · `word-choice`)과
// 같은 경로를 다시 밟되, 학습 화면의 제목에 더해 **`case`가 던지지 않는다**는 것을
// 한 줄 더 짓는다 — `error-boundary-title`이 없다. 오늘은 `onStartStep`이 리터럴이라
// 이 두 `case`에 닿지도 못하므로(닿지 않으면 못 던진다) 이 자체만으로는 구분되지
// 않지만, 제목 단언이 같은 이유로 먼저 빨개진다 — 결선이 배정표를 경유하게 되는
// 순간 제목과 부재 단언이 함께 초록이 된다.
test("learningFormForStep이 sentence-order·word-choice를 돌려줘도 던지지 않고 각 화면이 그대로 뜬다", () => {
  formStub.current = "sentence-order";
  render(<App />);
  startStep("ordering");
  expect(screen.getByTestId("sentence-order-screen-title")).toHaveTextContent(
    sentenceOrderScreenTitle(journeyStepOrdinal("ordering")),
  );
  expect(screen.queryByTestId("error-boundary-title")).not.toBeInTheDocument();
  cleanup();

  formStub.current = "word-choice";
  render(<App />);
  startStep("ordering");
  expect(screen.getByTestId("word-choice-screen-title")).toHaveTextContent(
    wordChoiceScreenTitle(journeyStepOrdinal("ordering")),
  );
  expect(screen.queryByTestId("error-boundary-title")).not.toBeInTheDocument();
});

// I-W5-2 · **AC 4의 본체.** 배정표가 스텝마다 다른 값을 돌려주면 서로 다른 스텝이
// 서로 다른 화면을 연다 — 결선만 확인하고 표를 안 바꾸면 지어지지 않는 사실이다.
// `ordering` → `sentence-order`, `greeting` → `word-choice`로 스텝별로 갈리는 함수를
// 스텁으로 준다. 각각 독립 `render`다 — 문항 0개 화면은 헤더에 `맵으로`가 없어
// 세션을 이어서 몰 수 없다(주석 4번).
const formByStep = (id: JourneyStepId): LearningForm =>
  id === "ordering" ? "sentence-order" : "word-choice";

test("배정표가 스텝마다 갈리면 ordering 스텝에서는 그 스텝에 배정된 화면(sentence-order)이 열린다", () => {
  formStub.current = formByStep;
  render(<App />);

  startStep("ordering");

  expect(screen.getByTestId("sentence-order-screen-title")).toHaveTextContent(
    sentenceOrderScreenTitle(journeyStepOrdinal("ordering")),
  );
});

test("배정표가 스텝마다 갈리면 greeting 스텝에서는 그 스텝에 배정된 화면(word-choice)이 열린다", () => {
  formStub.current = formByStep;
  render(<App />);

  startStep("greeting");

  expect(screen.getByTestId("word-choice-screen-title")).toHaveTextContent(
    wordChoiceScreenTitle(journeyStepOrdinal("greeting")),
  );
});

// I-W5-3 · **대조.** 스텁을 두지 않는다 — 실물 `learningFormByStep`이 그대로 조회된다.
// 오늘 그 표의 다섯 값 전부가 `listening`이므로 `ordering`에서 시작해도 여는 것은
// 듣기 화면이다. 이 케이스는 지금도 통과하고 AC 3(표 불변)이 지켜지는 한 계속
// 통과해야 한다 — red의 근거가 아니라 "표가 바뀌지 않았다"의 회귀 대조다.
test("배정표에 스텁이 없으면 ordering 스텝은 오늘의 실물 배정대로 듣기 화면을 연다", () => {
  render(<App />);

  startStep("ordering");

  expect(screen.getByTestId("listening-screen-title")).toHaveTextContent(
    listeningScreenTitle(journeyStepOrdinal("ordering")),
  );
  expect(screen.queryByTestId("sentence-order-screen-title")).not.toBeInTheDocument();
  expect(screen.queryByTestId("word-choice-screen-title")).not.toBeInTheDocument();
});

// LIB-245 (integration-design) — 문화 학습의 액션 행이 문화 퀴즈를 여는 전이와,
// 퀴즈의 `맵으로`가 맵에 닿는 것(문화 학습이 아니다)을 짓는다. 배정을 "culture"로
// 대역해 문화 학습에 닿는 것은 위 케이스들과 같은 seam이다 — 이 케이스는 그 뒤에
// 이어지는 문화 학습 → 문화 퀴즈 → 맵 전이 하나를 더한다. `learningFormByStep`은
// 손대지 않는다(D6) — 대역이 배정을 대신한다.
//
// 문화 퀴즈의 `맵으로`는 결선(`App.tsx`)의 `wiring.onExitLearning`이 진다 — 이
// 케이스의 마지막 단언은 그 콜백이 `dispatch({ type: "backToRoot" })`를 거는 것으로
// 성립한다.
test("문화 학습의 퀴즈 풀기가 문화 퀴즈를 열고, 퀴즈의 맵으로가 맵으로 돌아온다(문화 학습이 아니다)", () => {
  formStub.current = "culture";
  render(<App />);

  startStep("ordering");

  // 문화 학습이 열렸다.
  expect(screen.getByTestId("culture-screen-title")).toHaveTextContent(
    cultureScreenTitle(journeyStepOrdinal("ordering")),
  );

  // 퀴즈 풀기 → 문화 퀴즈가 열린다.
  fireEvent.tap(screen.getByTestId("culture-screen-quiz"), {});
  expect(screen.getByTestId("culture-quiz-screen-title")).toHaveTextContent(
    cultureQuizScreenTitle(journeyStepOrdinal("ordering")),
  );
  expect(screen.queryByTestId("culture-screen-title")).not.toBeInTheDocument();

  // 퀴즈의 맵으로 → 맵으로 돌아온다(`backToRoot` 판정). 문화 학습이 아니다.
  fireEvent.tap(screen.getByTestId("culture-quiz-screen-exit"), {});
  expect(screen.getByTestId("journey-map-screen-title")).toBeInTheDocument();
  expect(screen.queryByTestId("culture-quiz-screen-title")).not.toBeInTheDocument();
  expect(screen.queryByTestId("culture-screen-title")).not.toBeInTheDocument();
});

// I-B (LIB-245) — 나간 뒤 맵이 꼭대기이고, 거기서 같은 스텝을 다시 시작하면 문화
// 학습이 새로 열린다. 맵이 꼭대기라는 것은 위 케이스의 journey-map-screen-title
// 단언이 이미 짓는다 — push는 위에 쌓고 currentScreen은 꼭대기만 읽으므로 잔재
// 유무는 거기서 가려진다. startStep 헬퍼도 journey-step-node-*를 요구해 같은
// 전제 위에서 재시작한다.
test("문화 퀴즈에서 맵으로 나간 뒤 맵에서 같은 스텝을 다시 시작하면 문화 학습이 다시 뜬다", () => {
  formStub.current = "culture";
  render(<App />);

  startStep("ordering");
  fireEvent.tap(screen.getByTestId("culture-screen-quiz"), {});
  expect(screen.getByTestId("culture-quiz-screen-title")).toBeInTheDocument();

  // 맵으로 나간다.
  fireEvent.tap(screen.getByTestId("culture-quiz-screen-exit"), {});
  expect(screen.getByTestId("journey-map-screen-title")).toBeInTheDocument();

  // 맵에서 같은 스텝을 다시 시작한다 — 스택에 잔재가 없다.
  startStep("ordering");
  expect(screen.getByTestId("culture-screen-title")).toHaveTextContent(
    cultureScreenTitle(journeyStepOrdinal("ordering")),
  );
  expect(screen.queryByTestId("culture-quiz-screen-title")).not.toBeInTheDocument();
});

// I-D (LIB-245) — 퀴즈에 있는 채 다른 탭으로 갔다가 여정 탭으로 돌아오면 퀴즈가
// 그대로 있고, 그때 `맵으로`가 맵에 닿는다. 탭 전환은 활성 스택을 바꾸지 않으므로
// 여정 스택 위의 문화 퀴즈가 그대로 남아 있어야 하고, 그 위에서의 `맵으로`도
// 여전히 `backToRoot`로 맵에 닿아야 한다. 「다른 탭」 = 설정(LIB-257 홈 제거 —
// 설정 제목으로 실제로 떠난 것을 확인한다).
test("문화 퀴즈에 있는 채 다른 탭으로 갔다가 여정 탭으로 돌아오면 퀴즈가 그대로 있고, 그때 맵으로가 맵에 닿는다", () => {
  formStub.current = "culture";
  render(<App />);

  startStep("ordering");
  fireEvent.tap(screen.getByTestId("culture-screen-quiz"), {});
  expect(screen.getByTestId("culture-quiz-screen-title")).toBeInTheDocument();

  // 다른 탭(설정)으로 갔다가 여정 탭으로 돌아온다.
  fireEvent.tap(screen.getByTestId("bottom-navigator-tab-settings"), {});
  fireEvent.tap(screen.getByTestId("bottom-navigator-tab-journey"), {});

  // 퀴즈가 그대로 있다.
  expect(screen.getByTestId("culture-quiz-screen-title")).toHaveTextContent(
    cultureQuizScreenTitle(journeyStepOrdinal("ordering")),
  );

  // 그 상태에서도 맵으로 → 맵에 닿는다.
  fireEvent.tap(screen.getByTestId("culture-quiz-screen-exit"), {});
  expect(screen.getByTestId("journey-map-screen-title")).toBeInTheDocument();
  expect(screen.queryByTestId("culture-quiz-screen-title")).not.toBeInTheDocument();
  expect(screen.queryByTestId("culture-screen-title")).not.toBeInTheDocument();
});
