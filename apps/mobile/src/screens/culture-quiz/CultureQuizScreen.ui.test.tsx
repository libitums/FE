import { expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@lynx-js/react/testing-library";

import type { JourneyStepId } from "../journey-map/journey-map";
import type { CultureQuizQuestion } from "./culture-quiz";
import { CultureQuizScreen } from "./CultureQuizScreen";

// `ui` 계층: 실제 컴포넌트를 렌더하고 상태·상호작용을 본다(ADR-0006 D4). 순수
// 함수(culture-quiz.ts의 세션 리듀서·판정·문구)는 mock하지 않는다 — 화면이 그것을
// 실제로 부르는지가 이 파일이 보는 것의 절반이다. `toHaveClass` · `toHaveStyle` ·
// `toBeVisible`을 쓰지 않는다(docs/conventions/code.md).
//
// 계약: .agent-harness/work/lib-244/spec.md §4(컴포넌트 계약) · §8.2(ui — required,
// X1~X10).
//
// 이음매 ③(화면이 내용에 의존하지 않는다) — 조회 함수 cultureQuizQuestionsForStep
// **하나만** 부분 대역한다. 나머지 export(리듀서 · 판정 · 문구)는 실물이다. 데이터
// 파일(culture-quiz.ts)을 고치지 않는다.
//
// fixture는 문항 둘 이상이고 보기 개수가 문항마다 다르다 — 개수를 계약이 정하지
// 않았음을(D5) 실물로 보인다. answerIndex: 0인 문항을 하나 포함한다(0을 falsy로
// 다루면 잡힌다).

const ORDERING_QUESTIONS: readonly CultureQuizQuestion[] = [
  {
    prompt: "설날에 어른께 드리는 인사는?",
    // 보기 셋. 정답 인덱스가 0이다 — 0을 falsy로 다루는 자리를 여기서 잡는다.
    choices: ["세배", "성묘", "차례"],
    answerIndex: 0,
  },
  {
    prompt: "한국에서 숫자 4를 꺼리는 이유와 관련 있는 것은?",
    // 보기 다섯 — 앞 문항(셋)과 개수가 다르다(D5 「개수를 계약이 정하지 않는다」의
    // 실물 증거).
    choices: ["死(죽을 사)", "행운의 숫자", "왕의 숫자", "봄의 숫자", "달의 숫자"],
    answerIndex: 2,
  },
] as const;

vi.mock("./culture-quiz", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./culture-quiz")>();
  return {
    ...actual,
    cultureQuizQuestionsForStep: (id: JourneyStepId) =>
      id === "ordering" ? ORDERING_QUESTIONS : [],
  };
});

function renderOrdering(overrides: { onExit?: () => void } = {}) {
  return render(
    <CultureQuizScreen stepId="ordering" stepOrdinal={3} onExit={overrides.onExit ?? (() => {})} />,
  );
}

function optionTestIds(question: CultureQuizQuestion): readonly string[] {
  return question.choices.map((_choice, index) => `culture-quiz-option-${index}`);
}

// ---------------------------------------------------------------- X1: 제목

test("[X1] 제목이 '3단계 · 문화 퀴즈'이고 accessibility-traits='header'다", () => {
  renderOrdering();

  const title = screen.getByTestId("culture-quiz-screen-title");
  expect(title).toHaveTextContent("3단계 · 문화 퀴즈");
  expect(title).toHaveAttribute("accessibility-traits", "header");
});

// ---------------------------------------------------------------- X2: 나가기

test("[X2] -exit가 라벨 '맵으로'·traits='button'이고 탭하면 onExit이 정확히 한 번 불린다", () => {
  const onExit = vi.fn<() => void>();
  renderOrdering({ onExit });

  const exit = screen.getByTestId("culture-quiz-screen-exit");
  expect(exit).toHaveAttribute("accessibility-label", "맵으로");
  expect(exit).toHaveAttribute("accessibility-traits", "button");

  fireEvent.tap(exit, {});

  expect(onExit).toHaveBeenCalledTimes(1);
});

// ---------------------------------------------------------------- X3: 진행 문구

test("[X3] 진행 문구가 fixture의 문항 수를 반영한다 — '문항 1 / 2'", () => {
  renderOrdering();

  expect(screen.getByTestId("culture-quiz-screen-progress")).toHaveTextContent("문항 1 / 2");
});

// ---------------------------------------------------------------- X4: 제시문

test("[X4] 제시문이 fixture의 문자열이다", () => {
  renderOrdering();

  expect(screen.getByTestId("culture-quiz-screen-prompt")).toHaveTextContent(
    ORDERING_QUESTIONS[0]!.prompt,
  );
});

// ---------------------------------------------------------------- X5: 보기 수

test("[X5] 보기 수가 fixture의 choices.length와 같다 — 그 수 + 1번째 testid는 없다", () => {
  renderOrdering();

  const question = ORDERING_QUESTIONS[0]!;
  for (const testid of optionTestIds(question)) {
    expect(screen.getByTestId(testid)).toBeInTheDocument();
  }
  expect(
    screen.queryByTestId(`culture-quiz-option-${question.choices.length}`),
  ).not.toBeInTheDocument();
});

test("[X5] 둘째 문항으로 넘어가면 보기 수가 다섯으로 바뀐다 — 문항마다 개수가 다르다(D5)", () => {
  renderOrdering();

  fireEvent.tap(screen.getByTestId("culture-quiz-option-0"), {});
  fireEvent.tap(screen.getByTestId("culture-quiz-screen-next"), {});

  const question = ORDERING_QUESTIONS[1]!;
  for (const testid of optionTestIds(question)) {
    expect(screen.getByTestId(testid)).toBeInTheDocument();
  }
  expect(
    screen.queryByTestId(`culture-quiz-option-${question.choices.length}`),
  ).not.toBeInTheDocument();
});

// ---------------------------------------------------------------- X6: -next 조건부

test("[X6] 응답 전 -next가 없다. 보기 하나를 탭하면 생긴다", () => {
  renderOrdering();

  expect(screen.queryByTestId("culture-quiz-screen-next")).not.toBeInTheDocument();

  fireEvent.tap(screen.getByTestId("culture-quiz-option-0"), {});

  expect(screen.getByTestId("culture-quiz-screen-next")).toBeInTheDocument();
});

// ---------------------------------------------------------------- X7: 고른 보기에만 접미사

test("[X7] 응답 뒤 고른 보기에만 판정 접미사가 붙고 나머지는 없다 — 정답을 안 골랐어도", () => {
  renderOrdering();

  const question = ORDERING_QUESTIONS[0]!;
  // 정답(0번)이 아닌 1번을 고른다 — 정답 보기(0번)에도 접미사가 안 붙는 것을 본다.
  const chosenIndex = 1;
  expect(chosenIndex).not.toBe(question.answerIndex);

  fireEvent.tap(screen.getByTestId(`culture-quiz-option-${chosenIndex}`), {});

  // 조건부 expect를 피한다(vitest/no-conditional-expect) — 기대 결과를 먼저
  // 배열로 짓고 무조건 단언한다.
  const labels = question.choices.map(
    (_choice, index) =>
      screen.getByTestId(`culture-quiz-option-${index}`).getAttribute("accessibility-label") ?? "",
  );
  const suffixed = labels.map((label) => /, (정답|오답)$/.test(label));

  expect(suffixed).toEqual(question.choices.map((_choice, index) => index === chosenIndex));
});

// ---------------------------------------------------------------- X8: 다음 → 문항 전환

test("[X8] -next를 탭하면 진행 문구가 다음 문항으로 넘어가고 선택이 풀린다 — -next가 다시 사라진다", () => {
  renderOrdering();

  fireEvent.tap(screen.getByTestId("culture-quiz-option-0"), {});
  fireEvent.tap(screen.getByTestId("culture-quiz-screen-next"), {});

  expect(screen.getByTestId("culture-quiz-screen-progress")).toHaveTextContent("문항 2 / 2");
  expect(screen.getByTestId("culture-quiz-screen-prompt")).toHaveTextContent(
    ORDERING_QUESTIONS[1]!.prompt,
  );
  expect(screen.queryByTestId("culture-quiz-screen-next")).not.toBeInTheDocument();
});

// ---------------------------------------------------------------- X9: 완료 상태

test("[X9] 마지막 문항의 -next 뒤 -complete가 뜨고 -exit가 여전히 있다. -next는 없다", () => {
  renderOrdering();

  // 문항 0
  fireEvent.tap(screen.getByTestId("culture-quiz-option-0"), {});
  fireEvent.tap(screen.getByTestId("culture-quiz-screen-next"), {});
  // 문항 1(마지막)
  fireEvent.tap(screen.getByTestId("culture-quiz-option-0"), {});
  fireEvent.tap(screen.getByTestId("culture-quiz-screen-next"), {});

  expect(screen.getByTestId("culture-quiz-screen-complete")).toHaveTextContent(
    "문항을 모두 마쳤어요",
  );
  expect(screen.getByTestId("culture-quiz-screen-exit")).toBeInTheDocument();
  expect(screen.queryByTestId("culture-quiz-screen-next")).not.toBeInTheDocument();
});

// ---------------------------------------------------------------- X10: 스크롤 · 가림

// 인자 하나짜리 부정형 매처로 짓는다(값까지 넘기는 두 인자 형태는 거짓 통과를
// 만든 적이 있다).
test("[X10] -scroll에 accessibility-*가 없다", () => {
  renderOrdering();

  const scroll = screen.getByTestId("culture-quiz-screen-scroll");
  expect(scroll).toBeInTheDocument();
  expect(scroll).not.toHaveAttribute("accessibility-element");
  expect(scroll).not.toHaveAttribute("accessibility-label");
  expect(scroll).not.toHaveAttribute("accessibility-traits");
  expect(scroll).not.toHaveAttribute("accessibility-elements-hidden");
});

test("[X10] accessibility-elements-hidden이 응답 뒤에만 나타나고 그 자리가 표식 래퍼다", () => {
  const { container } = renderOrdering();

  expect(container.querySelectorAll("[accessibility-elements-hidden]")).toHaveLength(0);

  fireEvent.tap(screen.getByTestId("culture-quiz-option-0"), {});

  const hidden = container.querySelectorAll("[accessibility-elements-hidden]");
  expect(hidden).toHaveLength(1);
  expect(hidden[0]).toContainElement(screen.getByTestId("culture-quiz-option-icon-0"));
});

// AC14(a)가 요구하는 나머지 둘. scroll-orientation·scroll-bar-enable이 빠지면
// 초기값이 각각 가로·꺼짐이라 세로 스크롤이 원리적으로 불가능해진다(Dynamic Type로
// 넘친 내용에 닿을 수 없다). 형제 화면(CultureScreen 등)의 스크롤 속성 단언과
// 형태를 맞춘다.
test("[X10] -scroll에 scroll-orientation='vertical'·scroll-bar-enable='true'가 붙는다", () => {
  renderOrdering();

  const scroll = screen.getByTestId("culture-quiz-screen-scroll");
  expect(scroll).toHaveAttribute("scroll-orientation", "vertical");
  expect(scroll).toHaveAttribute("scroll-bar-enable", "true");
});

// AC14(a)의 「직계 자식이 정확히 하나」. 저장소 선례(다른 화면들의 U10류)는
// 「하나를 넘지 않는다」(<=1, 빈 화면을 허용)까지만 재는데, 이 화면은 문항이 항상
// 있어 내용 컨테이너가 항상 렌더된다 — 그래서 "정확히 하나"까지 잴 수 있고 그래야
// 한다. 자식 수뿐 아니라 그 하나가 실제 내용 컨테이너인지(진행 문구·제시문을 담고
// 있는지)까지 확인한다 — 개수만 세면 「자식 하나짜리 빈 껍데기」로도 거짓 통과한다.
test("[X10] -scroll의 직계 자식이 정확히 하나이고 그 자식이 화면의 내용 컨테이너다", () => {
  renderOrdering();

  const scroll = screen.getByTestId("culture-quiz-screen-scroll");
  expect(scroll.children.length).toBe(1);

  const content = scroll.children[0] as HTMLElement;
  expect(content).toContainElement(screen.getByTestId("culture-quiz-screen-progress"));
  expect(content).toContainElement(screen.getByTestId("culture-quiz-screen-prompt"));
});

// ---------------------------------------------------------------- AC14(e): announce 0건

// 화면 파일이 애초에 announce를 참조하지 않는다 — 그 사실을 이 파일에서도 실행으로
// 짓는다. 렌더·응답·완료 전체 경로에서 예외 없이 통과해야 한다(계약 §4.6 「어디에도
// announce 0건」).
test("전체 흐름(응답 → 다음 → 완료)에서 예외 없이 렌더된다 — announce를 쓰지 않는다", () => {
  expect(() => {
    renderOrdering();
    fireEvent.tap(screen.getByTestId("culture-quiz-option-0"), {});
    fireEvent.tap(screen.getByTestId("culture-quiz-screen-next"), {});
    fireEvent.tap(screen.getByTestId("culture-quiz-option-0"), {});
    fireEvent.tap(screen.getByTestId("culture-quiz-screen-next"), {});
  }).not.toThrow();
});
