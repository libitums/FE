import { afterEach, expect, test, vi } from "vitest";
import { fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import type { AnswerResult } from "../../lib/answer-result";
import type { JourneyStepId } from "../journey-map/journey-map";
import type { WordChoiceQuestion } from "./word-choice";
import { WordChoiceScreen } from "./WordChoiceScreen";

// `ui` 계층: 실제 컴포넌트를 렌더하고 상태·상호작용을 본다(ADR-0006 D4). 순수
// 함수(word-choice.ts의 세션 리듀서·판정·문구 합성)는 mock하지 않는다 — 화면이
// 그것을 실제로 부르는지가 이 파일이 보는 것의 절반이다. `toHaveClass` ·
// `toHaveStyle` · `toBeVisible`을 쓰지 않는다(docs/conventions/code.md).
//
// 계약: .agent-harness/work/lib-229/spec.md §1.8(e) 「WordChoiceScreen」 표 ·
//       §1.9(b)~(g) 「슬롯 셋」 · §3.2 `ui` 테스트 계획(A1~A7 포함).
//
// **문항 값을 지어내지 않는다** — `wordChoiceQuestionsByStep`은 다섯 스텝 전부
// 빈 배열이다(§8.2 보류 1·2). 이 파일은 그 데이터 파일을 고치지 않고, 자기
// 픽스처를 여기서 만들어 `wordChoiceQuestionsForStep` **하나만** 부분 대역한다.
// 세션 리듀서 · 판정 · 문구 합성 등 나머지 export는 전부 실제 구현 그대로다.

const ORDERING_QUESTIONS: readonly WordChoiceQuestion[] = [
  {
    prompt: "문항 1의 제시문입니다.",
    choices: ["사과", "바나나", "포도", "딸기"],
    answerIndex: 2,
  },
  {
    prompt: "문항 2의 제시문입니다.",
    // 정답 인덱스가 0인 문항 — falsy 분기를 만들지 않았는지 여기서 잡는다.
    choices: ["학교", "공원", "병원", "역"],
    answerIndex: 0,
  },
  {
    prompt: "문항 3의 제시문입니다.",
    choices: ["아침", "점심", "저녁", "밤"],
    answerIndex: 3,
  },
] as const;

vi.mock("./word-choice", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./word-choice")>();
  return {
    ...actual,
    wordChoiceQuestionsForStep: (id: JourneyStepId) =>
      id === "ordering" ? ORDERING_QUESTIONS : [],
  };
});

const CHOICE_TESTIDS = [
  "word-choice-option-0",
  "word-choice-option-1",
  "word-choice-option-2",
  "word-choice-option-3",
] as const;

function renderOrdering(
  overrides: {
    onExit?: () => void;
    onFinish?: (id: JourneyStepId, results?: readonly AnswerResult[]) => void;
  } = {},
) {
  return render(
    <WordChoiceScreen
      stepId="ordering"
      stepOrdinal={3}
      onExit={overrides.onExit ?? (() => {})}
      onFinish={overrides.onFinish ?? (() => {})}
    />,
  );
}

// 문항 하나를 정답으로 응답하고 다음으로 넘긴다. 임의의 대기를 두지 않는다 — tap이
// 리듀서 전이를 동기적으로 일으키고 렌더가 끝난다.
function answerCorrectlyAndAdvance(questionIndex: number): void {
  const question = ORDERING_QUESTIONS[questionIndex];
  if (question === undefined) {
    throw new Error(`fixture missing at index ${questionIndex}`);
  }
  fireEvent.tap(screen.getByTestId(`word-choice-option-${question.answerIndex}`), {});
  fireEvent.tap(screen.getByTestId("word-choice-screen-next"), {});
}

function completeAllThree(): void {
  answerCorrectlyAndAdvance(0);
  answerCorrectlyAndAdvance(1);
  answerCorrectlyAndAdvance(2);
}

// ------------------------------------------------------------ announce 대역
//
// 형태의 정본은 `SentenceOrderScreen.ui.test.tsx`의 `stubAnnounce()`다.
// `lib/accessibility.ts`가 만지는 접점 하나(`NativeModules.LynxAccessibilityModule`)에
// 대역을 둔다 — `lib/accessibility.ts` 자체를 mock하지 않는다.
//
// **`announce`는 호스트가 없어도 던지지 않고 `"unavailable"`을 돌려준다**(ADR-0016
// D11-4) ⇒ `not.toThrow()` 하나로는 호출 0건과 1건을 구별하지 못한다. 그래서 대역을
// 두고 **횟수를 센다**(계약 §5.1).

type AnnounceCall = { content: string };

function stubAnnounce(): AnnounceCall[] {
  const calls: AnnounceCall[] = [];
  vi.stubGlobal("NativeModules", {
    LynxAccessibilityModule: {
      accessibilityAnnounce: (args: { content: string }, callback: (result: unknown) => void) => {
        calls.push({ content: args.content });
        callback("announced");
      },
    },
  });
  return calls;
}

// 없던 전역을 세우므로 테스트마다 원상복구한다 — 지우지 않으면 다른 파일로 샌다.
afterEach(() => {
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------- 처음 렌더

test("제목이 '3단계 · 단어 선택'이고 accessibility-traits='header'다", () => {
  renderOrdering();

  const title = screen.getByTestId("word-choice-screen-title");
  expect(title).toHaveTextContent("3단계 · 단어 선택");
  expect(title).toHaveAttribute("accessibility-traits", "header");
});

test("진행 문구가 '문항 1 / 3'이다", () => {
  renderOrdering();

  expect(screen.getByTestId("word-choice-screen-progress")).toHaveTextContent("문항 1 / 3");
});

test("첫 문항의 제시문이 렌더되고 보기가 네 개다", () => {
  renderOrdering();

  expect(screen.getByTestId("word-choice-screen-prompt")).toHaveTextContent(
    ORDERING_QUESTIONS[0]!.prompt,
  );
  for (const testid of CHOICE_TESTIDS) {
    expect(screen.getByTestId(testid)).toBeInTheDocument();
  }
});

// 어느 스텝에서 왔는지가 제목에 드러난다 — 데이터가 박혀 있으면 여기서 잡힌다.
test("다른 스텝으로 렌더하면 제목이 갈린다", () => {
  const ordering = render(
    <WordChoiceScreen stepId="ordering" stepOrdinal={3} onExit={() => {}} onFinish={() => {}} />,
  );
  const orderingTitle = screen.getByTestId("word-choice-screen-title").textContent;
  ordering.unmount();

  render(
    <WordChoiceScreen stepId="greeting" stepOrdinal={1} onExit={() => {}} onFinish={() => {}} />,
  );

  const greetingTitle = screen.getByTestId("word-choice-screen-title");
  expect(greetingTitle).toHaveTextContent("1단계 · 단어 선택");
  expect(greetingTitle.textContent).not.toBe(orderingTitle);
});

// ---------------------------------------------------------------- 응답 전

test("응답 전에는 나가기만 있고 다음·결과 보기·완료 문구가 없다", () => {
  renderOrdering();

  expect(screen.getByTestId("word-choice-screen-exit")).toBeInTheDocument();
  expect(screen.queryByTestId("word-choice-screen-next")).not.toBeInTheDocument();
  expect(screen.queryByTestId("word-choice-screen-finish")).not.toBeInTheDocument();
  expect(screen.queryByTestId("word-choice-screen-complete")).not.toBeInTheDocument();
});

test("응답 전 네 보기가 전부 data-result='none'이다", () => {
  renderOrdering();

  for (const testid of CHOICE_TESTIDS) {
    expect(screen.getByTestId(testid)).toHaveAttribute("data-result", "none");
  }
});

// 응답 전 네 보기가 전부 접미사를 달면 답을 미리 알려 주는 것이 된다(계약 §1.7(c)).
test("응답 전 네 보기의 accessibility-label에 접미사가 없다", () => {
  renderOrdering();

  for (const testid of CHOICE_TESTIDS) {
    const label = screen.getByTestId(testid).getAttribute("accessibility-label");
    expect(label).not.toContain(", 정답");
    expect(label).not.toContain(", 오답");
  }
});

// ---------------------------------------------------------------- 판정

test("정답 보기를 탭하면 그 보기만 data-result='correct'이고 나머지 셋은 'none'이다", () => {
  renderOrdering();

  const answerIndex = ORDERING_QUESTIONS[0]!.answerIndex;
  fireEvent.tap(screen.getByTestId(`word-choice-option-${answerIndex}`), {});

  CHOICE_TESTIDS.forEach((testid, index) => {
    expect(screen.getByTestId(testid)).toHaveAttribute(
      "data-result",
      index === answerIndex ? "correct" : "none",
    );
  });
});

test("정답 보기를 탭하면 그 보기의 accessibility-label에 ', 정답'이 붙는다", () => {
  renderOrdering();

  const answerIndex = ORDERING_QUESTIONS[0]!.answerIndex;
  const testid = `word-choice-option-${answerIndex}`;
  const before = screen.getByTestId(testid).getAttribute("accessibility-label");

  fireEvent.tap(screen.getByTestId(testid), {});

  expect(screen.getByTestId(testid)).toHaveAttribute("accessibility-label", `${before}, 정답`);
});

test("정답 보기를 탭하면 '다음'이 나타난다", () => {
  renderOrdering();

  fireEvent.tap(screen.getByTestId(`word-choice-option-${ORDERING_QUESTIONS[0]!.answerIndex}`), {});

  expect(screen.getByTestId("word-choice-screen-next")).toBeInTheDocument();
});

// 정답을 알려 주지 않는다(계약 §1.1) — 오답을 골라도 정답 보기는 판정을 지지 않는다.
test("오답 보기를 탭하면 그 보기만 incorrect이고 정답 보기는 여전히 none이다", () => {
  renderOrdering();

  const answerIndex = ORDERING_QUESTIONS[0]!.answerIndex;
  const wrongIndex = (answerIndex + 1) % 4;

  fireEvent.tap(screen.getByTestId(`word-choice-option-${wrongIndex}`), {});

  expect(screen.getByTestId(`word-choice-option-${wrongIndex}`)).toHaveAttribute(
    "data-result",
    "incorrect",
  );
  expect(screen.getByTestId(`word-choice-option-${answerIndex}`)).toHaveAttribute(
    "data-result",
    "none",
  );
});

test("오답을 골라도 정답 보기의 라벨에 접미사가 붙지 않는다", () => {
  renderOrdering();

  const answerIndex = ORDERING_QUESTIONS[0]!.answerIndex;
  const wrongIndex = (answerIndex + 1) % 4;

  fireEvent.tap(screen.getByTestId(`word-choice-option-${wrongIndex}`), {});

  const answerLabel = screen
    .getByTestId(`word-choice-option-${answerIndex}`)
    .getAttribute("accessibility-label");
  expect(answerLabel).not.toContain(", 정답");
});

// 응답은 문항당 한 번뿐이다 — 게이트가 리듀서라는 것의 `ui` 쪽 관찰.
test("응답 뒤 다른 보기를 탭해도 첫 응답이 그대로다", () => {
  renderOrdering();

  const answerIndex = ORDERING_QUESTIONS[0]!.answerIndex;
  const otherIndex = (answerIndex + 1) % 4;

  fireEvent.tap(screen.getByTestId(`word-choice-option-${answerIndex}`), {});
  fireEvent.tap(screen.getByTestId(`word-choice-option-${otherIndex}`), {});

  expect(screen.getByTestId(`word-choice-option-${answerIndex}`)).toHaveAttribute(
    "data-result",
    "correct",
  );
  expect(screen.getByTestId(`word-choice-option-${otherIndex}`)).toHaveAttribute(
    "data-result",
    "none",
  );
});

// 0은 falsy다. 문항 2의 정답 인덱스가 0이다.
test("0번 보기를 골라도 응답으로 기록된다 — 0은 falsy다", () => {
  renderOrdering();

  answerCorrectlyAndAdvance(0);
  fireEvent.tap(screen.getByTestId("word-choice-option-0"), {});

  expect(screen.getByTestId("word-choice-option-0")).toHaveAttribute("data-result", "correct");
  expect(screen.getByTestId("word-choice-screen-next")).toBeInTheDocument();
});

// ---------------------------------------------------------------- 문항 진행

test("'다음'을 탭하면 진행·문항이 갈리고 판정이 초기화되며 '다음'이 다시 사라진다", () => {
  renderOrdering();

  fireEvent.tap(screen.getByTestId(`word-choice-option-${ORDERING_QUESTIONS[0]!.answerIndex}`), {});
  fireEvent.tap(screen.getByTestId("word-choice-screen-next"), {});

  expect(screen.getByTestId("word-choice-screen-progress")).toHaveTextContent("문항 2 / 3");
  expect(screen.getByTestId("word-choice-screen-prompt")).toHaveTextContent(
    ORDERING_QUESTIONS[1]!.prompt,
  );
  for (const testid of CHOICE_TESTIDS) {
    expect(screen.getByTestId(testid)).toHaveAttribute("data-result", "none");
  }
  expect(screen.queryByTestId("word-choice-screen-next")).not.toBeInTheDocument();
});

// ---------------------------------------------------------------- 완료

test("문항 셋을 마치면 완료 문구와 결과 보기가 나타난다", () => {
  renderOrdering();

  completeAllThree();

  expect(screen.getByTestId("word-choice-screen-complete")).toHaveTextContent(
    "문항을 모두 마쳤어요",
  );
  expect(screen.getByTestId("word-choice-screen-finish")).toBeInTheDocument();
});

test("완료 상태에서 나가기·진행·제시문·보기가 전부 사라진다", () => {
  renderOrdering();

  completeAllThree();

  expect(screen.queryByTestId("word-choice-screen-exit")).not.toBeInTheDocument();
  expect(screen.queryByTestId("word-choice-screen-progress")).not.toBeInTheDocument();
  expect(screen.queryByTestId("word-choice-screen-prompt")).not.toBeInTheDocument();
  for (const testid of CHOICE_TESTIDS) {
    expect(screen.queryByTestId(testid)).not.toBeInTheDocument();
  }
});

// 마지막 문항을 응답한 것만으로는 완료가 아니다 — `다음`을 한 번 더 눌러야 넘어간다.
test("마지막 문항에 응답만 해서는 완료가 아니다", () => {
  renderOrdering();

  answerCorrectlyAndAdvance(0);
  answerCorrectlyAndAdvance(1);
  fireEvent.tap(screen.getByTestId(`word-choice-option-${ORDERING_QUESTIONS[2]!.answerIndex}`), {});

  expect(screen.getByTestId("word-choice-screen-progress")).toHaveTextContent("문항 3 / 3");
  expect(screen.queryByTestId("word-choice-screen-finish")).not.toBeInTheDocument();
  expect(screen.getByTestId("word-choice-screen-exit")).toBeInTheDocument();
});

test("결과 보기를 탭하면 onFinish가 stepId와 결과 배열로 정확히 한 번 불린다", () => {
  const onFinish = vi.fn<(id: JourneyStepId, results?: readonly AnswerResult[]) => void>();
  renderOrdering({ onFinish });

  completeAllThree();
  fireEvent.tap(screen.getByTestId("word-choice-screen-finish"), {});

  expect(onFinish).toHaveBeenCalledTimes(1);
  expect(onFinish).toHaveBeenCalledWith("ordering", ["correct", "correct", "correct"]);
});

// 이 슬라이스에 재시도 규칙이 없다 — 오답으로 전부 응답해도 완료된다.
test("전부 오답이어도 완료 상태로 넘어가고 onFinish가 결과 배열과 함께 불린다", () => {
  const onFinish = vi.fn<(id: JourneyStepId, results?: readonly AnswerResult[]) => void>();
  renderOrdering({ onFinish });

  for (const question of ORDERING_QUESTIONS) {
    fireEvent.tap(screen.getByTestId(`word-choice-option-${(question.answerIndex + 1) % 4}`), {});
    fireEvent.tap(screen.getByTestId("word-choice-screen-next"), {});
  }
  fireEvent.tap(screen.getByTestId("word-choice-screen-finish"), {});

  expect(onFinish).toHaveBeenCalledTimes(1);
  expect(onFinish).toHaveBeenCalledWith("ordering", ["incorrect", "incorrect", "incorrect"]);
});

// ---------------------------------------------------------------- 중도 이탈

test("응답 전 나가기를 탭하면 onExit이 한 번, onFinish는 불리지 않는다", () => {
  const onExit = vi.fn<() => void>();
  const onFinish = vi.fn<(id: JourneyStepId) => void>();
  renderOrdering({ onExit, onFinish });

  fireEvent.tap(screen.getByTestId("word-choice-screen-exit"), {});

  expect(onExit).toHaveBeenCalledTimes(1);
  expect(onFinish).not.toHaveBeenCalled();
});

test("문항 하나를 응답한 뒤 나가기를 탭해도 onFinish가 불리지 않는다", () => {
  const onExit = vi.fn<() => void>();
  const onFinish = vi.fn<(id: JourneyStepId) => void>();
  renderOrdering({ onExit, onFinish });

  fireEvent.tap(screen.getByTestId(`word-choice-option-${ORDERING_QUESTIONS[0]!.answerIndex}`), {});
  fireEvent.tap(screen.getByTestId("word-choice-screen-exit"), {});

  expect(onExit).toHaveBeenCalledTimes(1);
  expect(onFinish).not.toHaveBeenCalled();
});

// ---------------------------------------------------------------- 접근성

test("나가기에 element·label='맵으로'·traits='button'이 붙는다", () => {
  renderOrdering();

  const exit = screen.getByTestId("word-choice-screen-exit");
  expect(exit).toHaveAttribute("accessibility-element", "true");
  expect(exit).toHaveAttribute("accessibility-label", "맵으로");
  expect(exit).toHaveAttribute("accessibility-traits", "button");
});

test("다음에 element·label='다음'·traits='button'이 붙는다", () => {
  renderOrdering();

  fireEvent.tap(screen.getByTestId(`word-choice-option-${ORDERING_QUESTIONS[0]!.answerIndex}`), {});

  const next = screen.getByTestId("word-choice-screen-next");
  expect(next).toHaveAttribute("accessibility-element", "true");
  expect(next).toHaveAttribute("accessibility-label", "다음");
  expect(next).toHaveAttribute("accessibility-traits", "button");
});

test("결과 보기에 element·label='결과 보기'·traits='button'이 붙는다", () => {
  renderOrdering();

  completeAllThree();

  const finish = screen.getByTestId("word-choice-screen-finish");
  expect(finish).toHaveAttribute("accessibility-element", "true");
  expect(finish).toHaveAttribute("accessibility-label", "결과 보기");
  expect(finish).toHaveAttribute("accessibility-traits", "button");
  expect(finish).toHaveTextContent("결과 보기");
});

// ADR-0016 D3 정정 기록: 상태는 라벨 접미사이고 accessibility-value를 쓰지 않는다.
test("화면 어느 요소에도 accessibility-value가 없다", () => {
  const { container } = renderOrdering();

  expect(container.querySelectorAll("[accessibility-value]")).toHaveLength(0);

  fireEvent.tap(screen.getByTestId(`word-choice-option-${ORDERING_QUESTIONS[0]!.answerIndex}`), {});

  expect(container.querySelectorAll("[accessibility-value]")).toHaveLength(0);
});

// 버튼 안의 라벨 <text>는 장식이다 — 조작 단위가 되면 정지 노드가 둘로 갈린다
// (ADR-0016 D5).
test("나가기·결과 보기 안의 라벨 텍스트가 조작 단위가 되지 않는다", () => {
  renderOrdering();

  expect(
    screen.getByTestId("word-choice-screen-exit").querySelectorAll("[accessibility-element]"),
  ).toHaveLength(0);

  completeAllThree();

  expect(
    screen.getByTestId("word-choice-screen-finish").querySelectorAll("[accessibility-element]"),
  ).toHaveLength(0);
});

// 조작 단위를 순서까지 센다 — DOM 순서가 곧 계약이다(계약 §1.10(d)).
test("응답 전 조작 단위가 나가기 + 보기 넷이다", () => {
  const { container } = renderOrdering();

  const tappables = [...container.querySelectorAll('[accessibility-traits="button"]')].map((el) =>
    el.getAttribute("data-testid"),
  );

  expect(tappables).toEqual([
    "word-choice-screen-exit",
    "word-choice-option-0",
    "word-choice-option-1",
    "word-choice-option-2",
    "word-choice-option-3",
  ]);
});

test("응답 뒤 조작 단위가 나가기 + 보기 넷 + 다음이다", () => {
  const { container } = renderOrdering();

  fireEvent.tap(screen.getByTestId(`word-choice-option-${ORDERING_QUESTIONS[0]!.answerIndex}`), {});

  const tappables = [...container.querySelectorAll('[accessibility-traits="button"]')].map((el) =>
    el.getAttribute("data-testid"),
  );

  expect(tappables).toEqual([
    "word-choice-screen-exit",
    "word-choice-option-0",
    "word-choice-option-1",
    "word-choice-option-2",
    "word-choice-option-3",
    "word-choice-screen-next",
  ]);
});

test("완료 상태의 조작 단위가 결과 보기 하나뿐이다", () => {
  const { container } = renderOrdering();

  completeAllThree();

  const tappables = [...container.querySelectorAll('[accessibility-traits="button"]')].map((el) =>
    el.getAttribute("data-testid"),
  );

  expect(tappables).toEqual(["word-choice-screen-finish"]);
});

// ---------------------------------------------------------------- 스크롤 영역 (계약 §3.2 A1~A7)

test("[A1] word-choice-screen-scroll이 존재한다", () => {
  renderOrdering();

  expect(screen.getByTestId("word-choice-screen-scroll")).toBeInTheDocument();
});

test("[A2] 진행·제시문·보기 넷이 스크롤 컨테이너 안에 있다", () => {
  renderOrdering();

  const scroll = screen.getByTestId("word-choice-screen-scroll");
  expect(within(scroll).getByTestId("word-choice-screen-progress")).toBeInTheDocument();
  expect(within(scroll).getByTestId("word-choice-screen-prompt")).toBeInTheDocument();
  for (const testid of CHOICE_TESTIDS) {
    expect(within(scroll).getByTestId(testid)).toBeInTheDocument();
  }
});

test("[A3] 제목·나가기·다음이 스크롤 컨테이너 밖에 있다", () => {
  renderOrdering();
  fireEvent.tap(screen.getByTestId(`word-choice-option-${ORDERING_QUESTIONS[0]!.answerIndex}`), {});

  const scroll = screen.getByTestId("word-choice-screen-scroll");
  expect(within(scroll).queryByTestId("word-choice-screen-title")).not.toBeInTheDocument();
  expect(within(scroll).queryByTestId("word-choice-screen-exit")).not.toBeInTheDocument();
  expect(within(scroll).queryByTestId("word-choice-screen-next")).not.toBeInTheDocument();

  expect(screen.getByTestId("word-choice-screen-title")).toBeInTheDocument();
  expect(screen.getByTestId("word-choice-screen-exit")).toBeInTheDocument();
  expect(screen.getByTestId("word-choice-screen-next")).toBeInTheDocument();
});

test("완료 상태에서 완료 문구는 스크롤 안, 결과 보기는 스크롤 밖이다", () => {
  renderOrdering();
  completeAllThree();

  const scroll = screen.getByTestId("word-choice-screen-scroll");
  expect(within(scroll).getByTestId("word-choice-screen-complete")).toBeInTheDocument();
  expect(within(scroll).queryByTestId("word-choice-screen-finish")).not.toBeInTheDocument();
  expect(screen.getByTestId("word-choice-screen-finish")).toBeInTheDocument();
});

test("[A4] scroll-orientation='vertical'이 붙는다", () => {
  renderOrdering();

  expect(screen.getByTestId("word-choice-screen-scroll")).toHaveAttribute(
    "scroll-orientation",
    "vertical",
  );
});

// `@lynx-js/testing-environment`의 `__SetAttribute`가 boolean을 `JSON.stringify`로
// 직렬화한다 — 단언은 문자열 "true"다(계약 §1.9(d)).
test("[A5] scroll-bar-enable='true'가 붙는다", () => {
  renderOrdering();

  expect(screen.getByTestId("word-choice-screen-scroll")).toHaveAttribute(
    "scroll-bar-enable",
    "true",
  );
});

test("[A6] 문항 상태에서 스크롤 컨테이너의 직계 자식이 하나를 넘지 않는다", () => {
  renderOrdering();

  expect(screen.getByTestId("word-choice-screen-scroll").children.length).toBeLessThanOrEqual(1);
});

test("[A6] 완료 상태에서 스크롤 컨테이너의 직계 자식이 하나를 넘지 않는다", () => {
  renderOrdering();
  completeAllThree();

  expect(screen.getByTestId("word-choice-screen-scroll").children.length).toBeLessThanOrEqual(1);
});

test("[A7] 스크롤 컨테이너에 accessibility-*가 하나도 붙지 않는다", () => {
  renderOrdering();

  const scroll = screen.getByTestId("word-choice-screen-scroll");
  expect(scroll).not.toHaveAttribute("accessibility-element");
  expect(scroll).not.toHaveAttribute("accessibility-label");
  expect(scroll).not.toHaveAttribute("accessibility-traits");
  expect(scroll).not.toHaveAttribute("accessibility-elements-hidden");
});

// ------------------------------------------- 완료 전이 발화 (LIB-247 계약 §6.2 X-A~X-E)
//
// 판정(정답/오답)은 이 채널로 나가지 않는다 — 그것은 라벨 접미사(ADR-0016 D3)가
// 이미 지고 있고 위의 판정 절이 그대로다(계약 §1.3). 이 절이 보는 것은 세션의 종료
// 하나다.

// X-A. 완료 전이 뒤 발화가 정확히 하나이고 그 내용이 계약 §3.2 표의 문자열이다.
test("[X-A] 완료 전이 뒤 announce가 정확히 하나이고 content가 '문항을 모두 마쳤어요, 결과 보기'다", () => {
  const calls = stubAnnounce();
  renderOrdering();

  completeAllThree();

  expect(screen.getByTestId("word-choice-screen-complete")).toBeInTheDocument(); // 앵커
  expect(calls).toHaveLength(1);
  expect(calls[0]?.content).toBe("문항을 모두 마쳤어요, 결과 보기");
});

// X-B. 전이 **전에는** 0건이다. 가드(`if (!complete) return;`)를 지우면 문항 도중에
// 완료 발화가 나가고 이 케이스가 잡는다(계약 §6.2(h)).
test("[X-B] 첫 렌더·응답·중간 다음까지 announce가 0건이다", () => {
  const calls = stubAnnounce();
  renderOrdering();

  expect(calls).toHaveLength(0);

  fireEvent.tap(screen.getByTestId(`word-choice-option-${ORDERING_QUESTIONS[0]!.answerIndex}`), {});

  expect(calls).toHaveLength(0);

  fireEvent.tap(screen.getByTestId("word-choice-screen-next"), {});

  expect(screen.getByTestId("word-choice-screen-progress")).toHaveTextContent("문항 2 / 3"); // 앵커
  expect(calls).toHaveLength(0);
});

// X-C. **정확히 한 번**이다. 종료 상태에 닿은 뒤 같은 props로 다시 렌더해도 호출이
// 늘지 않는다 — dep 배열을 지워 매 렌더 실행이 되면 여기서만 잡힌다(계약 §6.2(h)).
// props를 새로 짓지 않고 **같은 참조**를 다시 넘긴다 — 값이 갈려서 늘어난 것이
// 아니라 렌더 자체로 늘어난 것을 보려는 것이다.
test("[X-C] 완료 상태에서 같은 props로 다시 렌더해도 announce가 늘지 않는다", () => {
  const calls = stubAnnounce();
  const onExit = () => {};
  const onFinish = () => {};
  const view = render(
    <WordChoiceScreen stepId="ordering" stepOrdinal={3} onExit={onExit} onFinish={onFinish} />,
  );

  completeAllThree();

  expect(calls).toHaveLength(1);

  view.rerender(
    <WordChoiceScreen stepId="ordering" stepOrdinal={3} onExit={onExit} onFinish={onFinish} />,
  );
  view.rerender(
    <WordChoiceScreen stepId="ordering" stepOrdinal={3} onExit={onExit} onFinish={onFinish} />,
  );

  expect(screen.getByTestId("word-choice-screen-complete")).toBeInTheDocument(); // 앵커
  expect(calls).toHaveLength(1);
});

// X-D. **소리에만 있는 낱말이 0건이다**(ADR-0016 D11-1 · 수용 기준 3). 발화 문자열을
// 리터럴로 다시 적지 않고 **DOM에서 파생해** 짓는다 — 앞절은 종료 문구 요소의 내용,
// 뒷절은 그 순간 화면에 실재하는 유일한 조작 단위의 `accessibility-label`이다.
test("[X-D] 완료 발화가 종료 문구와 그 순간 유일한 조작 단위의 라벨에서 그대로 나온다", () => {
  const calls = stubAnnounce();
  const { container } = renderOrdering();

  completeAllThree();

  const elements = [...container.querySelectorAll("[accessibility-element]")];
  expect(elements.map((el) => el.getAttribute("data-testid"))).toEqual([
    "word-choice-screen-finish",
  ]);

  const completeText = screen.getByTestId("word-choice-screen-complete").textContent ?? "";
  const actionLabel = elements[0]?.getAttribute("accessibility-label") ?? "";

  expect(calls).toHaveLength(1);
  expect(calls[0]?.content).toBe(`${completeText}, ${actionLabel}`);
});

// X-E. **마운트가 곧 완료인 갈래**(계약 §4.2). 문항 표가 빈 스텝은 첫 렌더가 이미
// 종료 상태다 — 전이만 발화하게 만들면 그 갈래가 조용한 채로 남는다.
test("[X-E] 문항이 0인 스텝은 마운트가 곧 완료라 그 순간 announce가 하나 나간다", () => {
  const calls = stubAnnounce();

  render(
    <WordChoiceScreen stepId="greeting" stepOrdinal={1} onExit={() => {}} onFinish={() => {}} />,
  );

  expect(screen.getByTestId("word-choice-screen-complete")).toBeInTheDocument(); // 앵커
  expect(calls).toHaveLength(1);
  expect(calls[0]?.content).toBe("문항을 모두 마쳤어요, 결과 보기");
});
