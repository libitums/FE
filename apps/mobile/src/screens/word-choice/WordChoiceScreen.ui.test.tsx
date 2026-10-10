import { afterEach, expect, test, vi } from "vitest";
import { fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import type { AnswerResult } from "../../lib/answer-result";
import type { JourneyStepId } from "../journey-map/journey-map";
import type { WordChoiceQuestion } from "./word-choice";
import { WordChoiceScreen } from "./WordChoiceScreen";
import { UiCopyContext } from "../../lib/ui-copy";
import { markedUiCopy } from "../../lib/ui-copy.test-support";

// `ui` 계층: 실제 컴포넌트를 렌더하고 상태·상호작용을 봅니다(ADR-0006 D4). 순수
// 함수(word-choice.ts의 세션 리듀서·판정·문구 합성)는 mock하지 않습니다 — 화면이
// 그것을 실제로 부르는지가 이 파일이 보는 것의 절반입니다. `toHaveClass`·
// `toHaveStyle`·`toBeVisible`을 쓰지 않습니다(docs/conventions/code.md).
//
// **문항 값을 지어내지 않습니다** — `wordChoiceQuestionsByStep`은 다섯 스텝 전부
// 빈 배열입니다. 이 파일은 그 데이터 파일을 고치지 않고, 자기 픽스처를 여기서
// 만들어 `wordChoiceQuestionsForStep` **하나만** 부분 대역합니다. 세션 리듀서·
// 판정·문구 합성 등 나머지 export는 전부 실제 구현 그대로입니다.

const ORDERING_QUESTIONS: readonly WordChoiceQuestion[] = [
  {
    prompt: "문항 1의 제시문입니다.",
    choices: ["사과", "바나나", "포도", "딸기"],
    answerIndex: 2,
  },
  {
    prompt: "문항 2의 제시문입니다.",
    // 정답 인덱스가 0인 문항입니다 — falsy 분기를 만들지 않았는지 여기서 잡습니다.
    choices: ["학교", "공원", "병원", "역"],
    answerIndex: 0,
  },
  {
    prompt: "문항 3의 제시문입니다.",
    choices: ["아침", "점심", "저녁", "밤"],
    answerIndex: 3,
  },
] as const;

// 스텝이 갈리면 제시문도 갈린다는 것을 짓기 위한 둘째 픽스처입니다. 제목 줄이 걷히면서
// (2026-09-28) 「어느 스텝에서 왔는가」를 드러내는 채널이 제시문 하나가 됐고, 그것을
// 대조하려면 문항을 가진 스텝이 둘이어야 합니다.
const GREETING_QUESTIONS: readonly WordChoiceQuestion[] = [
  {
    prompt: "인사 스텝의 제시문입니다.",
    choices: ["안녕", "감사", "죄송", "부탁"],
    answerIndex: 0,
  },
] as const;

vi.mock("./word-choice", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./word-choice")>();
  return {
    ...actual,
    wordChoiceQuestionsForStep: (id: JourneyStepId) => {
      if (id === "ordering") {
        return ORDERING_QUESTIONS;
      }
      return id === "greeting" ? GREETING_QUESTIONS : [];
    },
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
      onExit={overrides.onExit ?? (() => {})}
      onFinish={overrides.onFinish ?? (() => {})}
    />,
  );
}

// 문항 하나를 정답으로 응답하고 다음으로 넘깁니다. 임의의 대기를 두지 않습니다 —
// tap이 리듀서 전이를 동기적으로 일으키고 렌더가 끝납니다.
function answerCorrectlyAndAdvance(questionIndex: number): void {
  const question = ORDERING_QUESTIONS[questionIndex];
  if (question === undefined) {
    throw new Error(`fixture missing at index ${questionIndex}`);
  }
  fireEvent.tap(screen.getByTestId(`word-choice-option-${question.answerIndex}`), {});
  fireEvent.tap(screen.getByTestId("learning-shell-advance"), {});
}

// 나가기는 두 걸음입니다 ⟨2026-09-28⟩ — `×`는 묻기만 하고 실제로 떠나는 것은 모달의
// `Leave`입니다. 그 계약은 껍데기 자신의 테스트가 지므로, 여기서는 「끝까지 나간다」를
// 한 줄로 부릅니다.
function exitThroughConfirm(container: Element): void {
  fireEvent.tap(screen.getByTestId("learning-shell-exit"), {});
  const leave = [...container.querySelectorAll('[data-testid="ui-lynx-button"]')].find(
    (el) => el.getAttribute("accessibility-label") === "Leave",
  );
  expect(leave).toBeDefined();
  fireEvent.tap(leave as Element, {});
}

function completeAllThree(): void {
  answerCorrectlyAndAdvance(0);
  answerCorrectlyAndAdvance(1);
  answerCorrectlyAndAdvance(2);
}

// ------------------------------------------------------------ announce 대역
//
// 형태의 정본은 `SentenceOrderScreen.ui.test.tsx`의 `stubAnnounce()`입니다.
// `lib/accessibility.ts`가 만지는 접점 하나(`NativeModules.LynxAccessibilityModule`)에
// 대역을 둡니다 — `lib/accessibility.ts` 자체를 mock하지 않습니다.
//
// **`announce`는 호스트가 없어도 던지지 않고 `"unavailable"`을 돌려줍니다**(ADR-0016
// D11-4) ⇒ `not.toThrow()` 하나로는 호출 0건과 1건을 구별하지 못합니다. 그래서
// 대역을 두고 **횟수를 셉니다**.

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

// 완료 전용 모듈과 기존 builtin을 함께 관찰하는 대역입니다.
function stubCompletionHost(): { builtin: AnnounceCall[]; completion: AnnounceCall[] } {
  const builtin: AnnounceCall[] = [];
  const completion: AnnounceCall[] = [];
  vi.stubGlobal("NativeModules", {
    LynxAccessibilityModule: {
      accessibilityAnnounce: (args: { content: string }, callback: (result: unknown) => void) => {
        builtin.push({ content: args.content });
        callback("announced");
      },
    },
    CompletionAnnouncementModule: {
      announce: (args: { content: string }, callback: (result: unknown) => void) => {
        completion.push({ content: args.content });
        callback("announced");
      },
    },
  });
  return { builtin, completion };
}

// 없던 전역을 세우므로 테스트마다 원상복구합니다 — 지우지 않으면 다른 파일로 샙니다.
afterEach(() => {
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------- 처음 렌더

// 2026-09-28: 화면 제목 줄이 걷혔습니다 — 껍데기의 세션 헤더가 「지금 어디인가」를
// 말합니다(ADR-0022 D1-2). 그래서 이 화면이 내는 머리는 아래 진행 문구뿐입니다.

test("세션 헤더의 순번이 'Lesson 1 / 3'이다", () => {
  renderOrdering();

  expect(screen.getByTestId("learning-shell-chapter")).toHaveTextContent("Lesson 1 / 3");
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

// 어느 스텝에서 왔는지가 제시문에 드러납니다 — 데이터가 박혀 있으면 여기서 잡힙니다.
test("다른 스텝으로 렌더하면 제시문이 갈린다", () => {
  const ordering = render(
    <WordChoiceScreen stepId="ordering" onExit={() => {}} onFinish={() => {}} />,
  );
  const orderingPrompt = screen.getByTestId("word-choice-screen-prompt").textContent;
  ordering.unmount();

  render(<WordChoiceScreen stepId="greeting" onExit={() => {}} onFinish={() => {}} />);

  expect(screen.getByTestId("word-choice-screen-prompt").textContent).not.toBe(orderingPrompt);
});

// ---------------------------------------------------------------- 응답 전

test("응답 전에는 나가기만 있고 다음·결과 보기·완료 문구가 없다", () => {
  renderOrdering();

  expect(screen.getByTestId("learning-shell-exit")).toBeInTheDocument();
  expect(screen.queryByTestId("learning-shell-advance")).not.toBeInTheDocument();
  expect(screen.queryByTestId("learning-shell-action")).not.toBeInTheDocument();
  expect(screen.queryByTestId("word-choice-screen-complete")).not.toBeInTheDocument();
});

test("응답 전 네 보기가 전부 data-result='none'이다", () => {
  renderOrdering();

  for (const testid of CHOICE_TESTIDS) {
    expect(screen.getByTestId(testid)).toHaveAttribute("data-result", "none");
  }
});

// 응답 전 네 보기가 전부 접미사를 달면 답을 미리 알려 주는 것이 됩니다.
test("응답 전 네 보기의 accessibility-label에 접미사가 없다", () => {
  renderOrdering();

  for (const testid of CHOICE_TESTIDS) {
    const label = screen.getByTestId(testid).getAttribute("accessibility-label");
    expect(label).not.toContain(", correct");
    expect(label).not.toContain(", incorrect");
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

  expect(screen.getByTestId(testid)).toHaveAttribute("accessibility-label", `${before}, correct`);
});

test("정답 보기를 탭하면 '다음'이 나타난다", () => {
  renderOrdering();

  fireEvent.tap(screen.getByTestId(`word-choice-option-${ORDERING_QUESTIONS[0]!.answerIndex}`), {});

  expect(screen.getByTestId("learning-shell-advance")).toBeInTheDocument();
});

// 정답을 알려 주지 않습니다 — 오답을 골라도 정답 보기는 판정을 지지 않습니다.
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
  expect(answerLabel).not.toContain(", correct");
});

// 응답은 문항당 한 번뿐입니다 — 게이트가 리듀서라는 것의 `ui` 쪽 관찰입니다.
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

// 0은 falsy입니다. 문항 2의 정답 인덱스가 0입니다.
test("0번 보기를 골라도 응답으로 기록된다 — 0은 falsy다", () => {
  renderOrdering();

  answerCorrectlyAndAdvance(0);
  fireEvent.tap(screen.getByTestId("word-choice-option-0"), {});

  expect(screen.getByTestId("word-choice-option-0")).toHaveAttribute("data-result", "correct");
  expect(screen.getByTestId("learning-shell-advance")).toBeInTheDocument();
});

// ---------------------------------------------------------------- 문항 진행

test("'다음'을 탭하면 진행·문항이 갈리고 판정이 초기화되며 '다음'이 다시 사라진다", () => {
  renderOrdering();

  fireEvent.tap(screen.getByTestId(`word-choice-option-${ORDERING_QUESTIONS[0]!.answerIndex}`), {});
  fireEvent.tap(screen.getByTestId("learning-shell-advance"), {});

  expect(screen.getByTestId("learning-shell-chapter")).toHaveTextContent("Lesson 2 / 3");
  expect(screen.getByTestId("word-choice-screen-prompt")).toHaveTextContent(
    ORDERING_QUESTIONS[1]!.prompt,
  );
  for (const testid of CHOICE_TESTIDS) {
    expect(screen.getByTestId(testid)).toHaveAttribute("data-result", "none");
  }
  expect(screen.queryByTestId("learning-shell-advance")).not.toBeInTheDocument();
});

// ---------------------------------------------------------------- 완료

test("문항 셋을 마치면 완료 문구와 결과 보기가 나타난다", () => {
  renderOrdering();

  completeAllThree();

  expect(screen.getByTestId("word-choice-screen-complete")).toHaveTextContent("All questions done");
  expect(screen.getByTestId("learning-shell-action")).toBeInTheDocument();
});

// 나가기는 남습니다 — 껍데기의 `×`는 세션 내내 서 있고, 그 목적지(맵)는 아래 버튼의
// 목적지(결과)와 다릅니다. 「같은 곳으로 가는 버튼 둘」이 아닙니다.
//
// 세션 헤더도 남습니다. 완료에는 지금 푸는 문항이 없지만 순번이 사라지면 「방금 뭘
// 마쳤나」가 화면에서 없어집니다 — 그래서 마지막 문항 자리에 섭니다.
test("완료 상태에서 제시문·보기가 사라지고 나가기·순번은 남는다", () => {
  renderOrdering();

  completeAllThree();

  expect(screen.getByTestId("learning-shell-exit")).toBeInTheDocument();
  expect(screen.getByTestId("learning-shell-chapter")).toHaveTextContent("Lesson 3 / 3");
  expect(screen.queryByTestId("word-choice-screen-prompt")).not.toBeInTheDocument();
  for (const testid of CHOICE_TESTIDS) {
    expect(screen.queryByTestId(testid)).not.toBeInTheDocument();
  }
});

// 마지막 문항을 응답한 것만으로는 완료가 아닙니다 — `다음`을 한 번 더 눌러야
// 넘어갑니다.
test("마지막 문항에 응답만 해서는 완료가 아니다", () => {
  renderOrdering();

  answerCorrectlyAndAdvance(0);
  answerCorrectlyAndAdvance(1);
  fireEvent.tap(screen.getByTestId(`word-choice-option-${ORDERING_QUESTIONS[2]!.answerIndex}`), {});

  expect(screen.getByTestId("learning-shell-chapter")).toHaveTextContent("Lesson 3 / 3");
  expect(screen.queryByTestId("learning-shell-action")).not.toBeInTheDocument();
  expect(screen.getByTestId("learning-shell-exit")).toBeInTheDocument();
});

test("결과 보기를 탭하면 onFinish가 stepId와 결과 배열로 정확히 한 번 불린다", () => {
  const onFinish = vi.fn<(id: JourneyStepId, results?: readonly AnswerResult[]) => void>();
  renderOrdering({ onFinish });

  completeAllThree();
  fireEvent.tap(screen.getByTestId("learning-shell-action"), {});

  expect(onFinish).toHaveBeenCalledTimes(1);
  expect(onFinish).toHaveBeenCalledWith("ordering", ["correct", "correct", "correct"], 0);
});

// 이 슬라이스에 재시도 규칙이 없습니다 — 오답으로 전부 응답해도 완료됩니다.
test("전부 오답이어도 완료 상태로 넘어가고 onFinish가 결과 배열과 함께 불린다", () => {
  const onFinish = vi.fn<(id: JourneyStepId, results?: readonly AnswerResult[]) => void>();
  renderOrdering({ onFinish });

  for (const question of ORDERING_QUESTIONS) {
    fireEvent.tap(screen.getByTestId(`word-choice-option-${(question.answerIndex + 1) % 4}`), {});
    fireEvent.tap(screen.getByTestId("learning-shell-advance"), {});
  }
  fireEvent.tap(screen.getByTestId("learning-shell-action"), {});

  expect(onFinish).toHaveBeenCalledTimes(1);
  expect(onFinish).toHaveBeenCalledWith("ordering", ["incorrect", "incorrect", "incorrect"], 0);
});

// ---------------------------------------------------------------- 중도 이탈

test("응답 전 나가기를 끝까지 밟으면 onExit이 한 번, onFinish는 불리지 않는다", () => {
  const onExit = vi.fn<() => void>();
  const onFinish = vi.fn<(id: JourneyStepId) => void>();
  const { container } = renderOrdering({ onExit, onFinish });

  exitThroughConfirm(container);

  expect(onExit).toHaveBeenCalledTimes(1);
  expect(onFinish).not.toHaveBeenCalled();
});

// `×` 하나로는 떠나지 않습니다 — 확인이 「두 걸음」인 이유가 이것입니다. 이 단언이
// 없으면 확인 단계를 지워도 위 테스트가 그대로 초록입니다.
test("`×`만 눌러서는 onExit이 불리지 않는다", () => {
  const onExit = vi.fn<() => void>();
  renderOrdering({ onExit });

  fireEvent.tap(screen.getByTestId("learning-shell-exit"), {});

  expect(onExit).not.toHaveBeenCalled();
});

test("문항 하나를 응답한 뒤 나가도 onFinish가 불리지 않는다", () => {
  const onExit = vi.fn<() => void>();
  const onFinish = vi.fn<(id: JourneyStepId) => void>();
  const { container } = renderOrdering({ onExit, onFinish });

  fireEvent.tap(screen.getByTestId(`word-choice-option-${ORDERING_QUESTIONS[0]!.answerIndex}`), {});
  exitThroughConfirm(container);

  expect(onExit).toHaveBeenCalledTimes(1);
  expect(onFinish).not.toHaveBeenCalled();
});

// ---------------------------------------------------------------- 접근성

// 나가는 수단의 이름이 `맵으로`에서 `나가기`로 갈렸습니다 — 껍데기의 `×`이고, 낱말이
// 아니라 아이콘이라 목적지를 이름에 적지 않습니다(ADR-0022 D1-2).
test("나가기에 element·label='Leave lesson'·traits='button'이 붙는다", () => {
  renderOrdering();

  const exit = screen.getByTestId("learning-shell-exit");
  expect(exit).toHaveAttribute("accessibility-element", "true");
  expect(exit).toHaveAttribute("accessibility-label", "Leave lesson");
  expect(exit).toHaveAttribute("accessibility-traits", "button");
});

// 응답 뒤에 아래 버튼이 서지 않습니다 — 판정을 보인 채 2.5초 뒤 저절로 넘어가고, 그
// 동안 화면 전체가 넘김 층입니다. 듣기와 같은 규약입니다.
test("넘김 층에 element·label='Continue'·traits='button'이 붙는다", () => {
  renderOrdering();

  fireEvent.tap(screen.getByTestId(`word-choice-option-${ORDERING_QUESTIONS[0]!.answerIndex}`), {});

  const advance = screen.getByTestId("learning-shell-advance");
  expect(advance).toHaveAttribute("accessibility-element", "true");
  expect(advance).toHaveAttribute("accessibility-label", "Continue");
  expect(advance).toHaveAttribute("accessibility-traits", "button");
  expect(screen.queryByTestId("learning-shell-action")).not.toBeInTheDocument();
});

test("결과 보기에 element·label='See results'·traits='button'이 붙는다", () => {
  renderOrdering();

  completeAllThree();

  const finish = screen.getByTestId("learning-shell-action");
  expect(finish).toHaveAttribute("accessibility-element", "true");
  expect(finish).toHaveAttribute("accessibility-label", "See results");
  expect(finish).toHaveAttribute("accessibility-traits", "button");
  expect(finish).toHaveTextContent("See results");
});

// ADR-0016 D3 정정 기록: 상태는 라벨 접미사이고 accessibility-value를 쓰지
// 않습니다.
test("화면 어느 요소에도 accessibility-value가 없다", () => {
  const { container } = renderOrdering();

  expect(container.querySelectorAll("[accessibility-value]")).toHaveLength(0);

  fireEvent.tap(screen.getByTestId(`word-choice-option-${ORDERING_QUESTIONS[0]!.answerIndex}`), {});

  expect(container.querySelectorAll("[accessibility-value]")).toHaveLength(0);
});

// 버튼 안의 라벨 <text>는 장식입니다 — 조작 단위가 되면 정지 노드가 둘로 갈립니다
// (ADR-0016 D5).
test("나가기·결과 보기 안의 라벨 텍스트가 조작 단위가 되지 않는다", () => {
  renderOrdering();

  expect(
    screen.getByTestId("learning-shell-exit").querySelectorAll("[accessibility-element]"),
  ).toHaveLength(0);

  completeAllThree();

  expect(
    screen.getByTestId("learning-shell-action").querySelectorAll("[accessibility-element]"),
  ).toHaveLength(0);
});

// 조작 단위를 순서까지 셉니다 — DOM 순서가 곧 계약입니다.
test("응답 전 조작 단위가 나가기 + 보기 넷이다", () => {
  const { container } = renderOrdering();

  const tappables = [...container.querySelectorAll('[accessibility-traits="button"]')].map((el) =>
    el.getAttribute("data-testid"),
  );

  // 상단 바의 알림 버튼이 껍데기와 함께 딸려 옵니다 — 화면의 것이 아니지만 조작
  // 단위의 순서는 화면 전체에서 세므로 여기 셉니다.
  expect(tappables).toEqual([
    "top-bar-notifications",
    "learning-shell-exit",
    "word-choice-option-0",
    "word-choice-option-1",
    "word-choice-option-2",
    "word-choice-option-3",
  ]);
});

test("응답 뒤 조작 단위가 나가기 + 보기 넷 + 넘김 층이다", () => {
  const { container } = renderOrdering();

  fireEvent.tap(screen.getByTestId(`word-choice-option-${ORDERING_QUESTIONS[0]!.answerIndex}`), {});

  const tappables = [...container.querySelectorAll('[accessibility-traits="button"]')].map((el) =>
    el.getAttribute("data-testid"),
  );

  expect(tappables).toEqual([
    "top-bar-notifications",
    "learning-shell-exit",
    "word-choice-option-0",
    "word-choice-option-1",
    "word-choice-option-2",
    "word-choice-option-3",
    "learning-shell-advance",
  ]);
});

test("완료 상태의 조작 단위가 나가기와 결과 보기다", () => {
  const { container } = renderOrdering();

  completeAllThree();

  const tappables = [...container.querySelectorAll('[accessibility-traits="button"]')].map((el) =>
    el.getAttribute("data-testid"),
  );

  expect(tappables).toEqual([
    "top-bar-notifications",
    "learning-shell-exit",
    "learning-shell-action",
  ]);
});

// ---------------------------------------------------------------- 스크롤 영역

test("[A1] learning-shell-scroll이 존재한다", () => {
  renderOrdering();

  expect(screen.getByTestId("learning-shell-scroll")).toBeInTheDocument();
});

// 흐르는 것은 보기 넷뿐입니다 — 제시문은 무대 카드 안(고정)이고 진행은 세션
// 헤더(고정)입니다(ADR-0022 D1-2).
test("[A2] 보기 넷만 스크롤 컨테이너 안에 있다", () => {
  renderOrdering();

  const scroll = screen.getByTestId("learning-shell-scroll");
  for (const testid of CHOICE_TESTIDS) {
    expect(within(scroll).getByTestId(testid)).toBeInTheDocument();
  }
  expect(within(scroll).queryByTestId("learning-shell-chapter")).not.toBeInTheDocument();
  expect(within(scroll).queryByTestId("word-choice-screen-prompt")).not.toBeInTheDocument();
});

test("[A3] 나가기·넘김 층이 스크롤 컨테이너 밖에 있다", () => {
  renderOrdering();
  fireEvent.tap(screen.getByTestId(`word-choice-option-${ORDERING_QUESTIONS[0]!.answerIndex}`), {});

  const scroll = screen.getByTestId("learning-shell-scroll");
  expect(within(scroll).queryByTestId("learning-shell-exit")).not.toBeInTheDocument();
  expect(within(scroll).queryByTestId("learning-shell-advance")).not.toBeInTheDocument();

  expect(screen.getByTestId("learning-shell-exit")).toBeInTheDocument();
  expect(screen.getByTestId("learning-shell-advance")).toBeInTheDocument();
});

// 완료 상태에는 고를 것이 없으므로 **작업 영역 자체가 서지 않습니다**. 완료문은 문항이
// 서 있던 그 무대 카드 안에 대신 섭니다.
test("완료 상태에서 완료 문구는 무대 안, 스크롤은 아예 없고 결과 보기는 무대 밖이다", () => {
  renderOrdering();
  completeAllThree();

  expect(screen.queryByTestId("learning-shell-scroll")).not.toBeInTheDocument();

  const stage = screen.getByTestId("learning-shell-stage");
  expect(within(stage).getByTestId("word-choice-screen-complete")).toBeInTheDocument();
  expect(within(stage).queryByTestId("learning-shell-action")).not.toBeInTheDocument();
  expect(screen.getByTestId("learning-shell-action")).toBeInTheDocument();
});

test("[A4] scroll-orientation='vertical'이 붙는다", () => {
  renderOrdering();

  expect(screen.getByTestId("learning-shell-scroll")).toHaveAttribute(
    "scroll-orientation",
    "vertical",
  );
});

// `@lynx-js/testing-environment`의 `__SetAttribute`가 boolean을 `JSON.stringify`로
// 직렬화합니다 — 단언은 문자열 "false"입니다.
test("[A5] scroll-bar-enable='false'가 붙는다", () => {
  renderOrdering();

  expect(screen.getByTestId("learning-shell-scroll")).toHaveAttribute("scroll-bar-enable", "false");
});

// 끝 상자(`learning-shell-scroll-end`)는 높이만 가진 상자라 `<scroll-view>`가 linear라 `gap`이
// 읽히지 않는다는 ADR-0022 D4의 근거에 걸리지 않습니다(r02.5). 그래서 끝 상자를 뺀 직계 자식이
// 하나 이하이고, 끝 상자가 있다면 그것이 마지막 자식입니다. 다른 둘째 자식은 여전히 실패합니다.
// ReactLynx가 자식 컴포넌트의 루트를 `<wrapper>`로 감싸므로 끝 상자의 자리는 그 상자 자신이거나
// 상자 하나만 품은 wrapper입니다.
test("[A6] 문항 상태에서 스크롤 컨테이너의 직계 자식이 끝 상자를 빼고 하나를 넘지 않는다", () => {
  renderOrdering();

  const scroll = screen.getByTestId("learning-shell-scroll");
  const children = Array.from(scroll.children);
  const slotOf = (el: Element): Element | undefined =>
    children.find((child) => child === el || child.firstElementChild === el);

  const end = screen.queryByTestId("learning-shell-scroll-end");
  const others = end === null ? children : children.filter((child) => child !== slotOf(end));
  if (end !== null) {
    const slot = slotOf(end);
    expect(slot).toBeDefined();
    expect(children[children.length - 1]).toBe(slot);
    if (slot !== end) {
      expect(slot?.children).toHaveLength(1);
    }
  }
  expect(others.length).toBeLessThanOrEqual(1);
});

// 완료 상태에는 스크롤 컨테이너가 아예 없습니다 — 「직계 자식이 하나 이하」가 공허하게
// 참인 자리라, 그 부재 자체를 답니다.
test("[A6] 완료 상태에는 스크롤 컨테이너가 서지 않는다", () => {
  renderOrdering();
  completeAllThree();

  expect(screen.queryByTestId("learning-shell-scroll")).not.toBeInTheDocument();
});

test("[A7] 스크롤 컨테이너에 accessibility-*가 하나도 붙지 않는다", () => {
  renderOrdering();

  const scroll = screen.getByTestId("learning-shell-scroll");
  expect(scroll).not.toHaveAttribute("accessibility-element");
  expect(scroll).not.toHaveAttribute("accessibility-label");
  expect(scroll).not.toHaveAttribute("accessibility-traits");
  expect(scroll).not.toHaveAttribute("accessibility-elements-hidden");
});

// ------------------------------------------- 완료 전이 발화
//
// 판정(정답/오답)은 이 채널로 나가지 않습니다 — 그것은 라벨 접미사(ADR-0016 D3)가
// 이미 지고 있고 위의 판정 절이 그대로입니다. 이 절이 보는 것은 세션의 종료
// 하나입니다.

test("[X-A] 완료 전이 뒤 announce가 정확히 하나이고 content가 'All questions done, See results'다", () => {
  const calls = stubAnnounce();
  renderOrdering();

  completeAllThree();

  expect(screen.getByTestId("word-choice-screen-complete")).toBeInTheDocument(); // 앵커
  expect(calls).toHaveLength(1);
  expect(calls[0]?.content).toBe("All questions done, See results");
});

// 완료 전이에서는 custom만 사용하고 builtin으로 중복 발화하지 않습니다.
test("마지막 다음 뒤 custom 완료 발화가 한 번이고 rerender에도 늘지 않는다", () => {
  const { builtin, completion } = stubCompletionHost();
  const view = renderOrdering();

  expect(completion).toHaveLength(0);
  completeAllThree();

  expect(completion).toHaveLength(1);
  expect(completion[0]?.content).toBe("All questions done, See results");
  expect(builtin).toHaveLength(0);

  view.rerender(<WordChoiceScreen stepId="ordering" onExit={() => {}} onFinish={() => {}} />);
  expect(completion).toHaveLength(1);
  expect(builtin).toHaveLength(0);
});

// X-B. 전이 **전에는** 0건입니다. 가드(`if (!complete) return;`)를 지우면 문항
// 도중에 완료 발화가 나가고 이 케이스가 잡습니다.
test("[X-B] 첫 렌더·응답·중간 다음까지 announce가 0건이다", () => {
  const calls = stubAnnounce();
  renderOrdering();

  expect(calls).toHaveLength(0);

  fireEvent.tap(screen.getByTestId(`word-choice-option-${ORDERING_QUESTIONS[0]!.answerIndex}`), {});

  expect(calls).toHaveLength(0);

  fireEvent.tap(screen.getByTestId("learning-shell-advance"), {});

  expect(screen.getByTestId("learning-shell-chapter")).toHaveTextContent("Lesson 2 / 3"); // 앵커
  expect(calls).toHaveLength(0);
});

// X-C. **정확히 한 번**입니다. 종료 상태에 닿은 뒤 같은 props로 다시 렌더해도
// 호출이 늘지 않습니다 — dep 배열을 지워 매 렌더 실행이 되면 여기서만 잡힙니다.
// props를 새로 짓지 않고 **같은 참조**를 다시 넘깁니다 — 값이 갈려서 늘어난 것이
// 아니라 렌더 자체로 늘어난 것을 보려는 것입니다.
test("[X-C] 완료 상태에서 같은 props로 다시 렌더해도 announce가 늘지 않는다", () => {
  const calls = stubAnnounce();
  const onExit = () => {};
  const onFinish = () => {};
  const view = render(<WordChoiceScreen stepId="ordering" onExit={onExit} onFinish={onFinish} />);

  completeAllThree();

  expect(calls).toHaveLength(1);

  view.rerender(<WordChoiceScreen stepId="ordering" onExit={onExit} onFinish={onFinish} />);
  view.rerender(<WordChoiceScreen stepId="ordering" onExit={onExit} onFinish={onFinish} />);

  expect(screen.getByTestId("word-choice-screen-complete")).toBeInTheDocument(); // 앵커
  expect(calls).toHaveLength(1);
});

// X-D. **소리에만 있는 낱말이 0건입니다**(ADR-0016 D11-1·수용 기준 3). 발화
// 문자열을 리터럴로 다시 적지 않고 **DOM에서 파생해** 짓습니다 — 앞절은 종료
// 문구 요소의 내용, 뒷절은 그 순간 화면에 실재하는 유일한 조작 단위의
// `accessibility-label`입니다.
test("[X-D] 완료 발화가 종료 문구와 그 순간 유일한 조작 단위의 라벨에서 그대로 나온다", () => {
  const calls = stubAnnounce();
  const { container } = renderOrdering();

  completeAllThree();

  // 껍데기가 함께 세우는 것들(상단 바 · 나가기 · 진행)이 같이 잡히므로, 발화의 출처인
  // 아래 버튼을 testid로 집습니다.
  const elements = [...container.querySelectorAll('[accessibility-element="true"]')];
  expect(elements.map((el) => el.getAttribute("data-testid"))).toContain("learning-shell-action");

  const completeText = screen.getByTestId("word-choice-screen-complete").textContent ?? "";
  const actionLabel =
    screen.getByTestId("learning-shell-action").getAttribute("accessibility-label") ?? "";

  expect(calls).toHaveLength(1);
  expect(calls[0]?.content).toBe(`${completeText}, ${actionLabel}`);
});

// X-E. **마운트가 곧 완료인 갈래입니다.** 문항 표가 빈 스텝은 첫 렌더가 이미
// 종료 상태입니다 — 전이만 발화하게 만들면 그 갈래가 조용한 채로 남습니다.
test("[X-E] 문항이 0인 스텝은 마운트가 곧 완료라 그 순간 announce가 하나 나간다", () => {
  const calls = stubAnnounce();

  render(
    <WordChoiceScreen
      // 문항이 0인 스텝입니다 — `greeting`은 이 파일이 픽스처를 준 스텝이라 쓸 수
      // 없습니다.
      stepId="introduction"
      onExit={() => {}}
      onFinish={() => {}}
    />,
  );

  expect(screen.getByTestId("word-choice-screen-complete")).toBeInTheDocument(); // 앵커
  expect(calls).toHaveLength(1);
  expect(calls[0]?.content).toBe("All questions done, See results");
});

// ---------------------------------------------------------------- 영어 렌더 · 문구표 (LA2)

test("[LA2-E] 지시문이 영어이고 보기는 학습 콘텐츠(한국어) 그대로다", () => {
  renderOrdering();

  expect(screen.getByTestId("learning-shell-instruction")).toHaveTextContent(
    "Choose the word that fits.",
  );
  expect(screen.getByTestId("word-choice-option-0")).toHaveTextContent("사과");
});

test("[LA2-E] 응답 뒤 정답 보기의 이름이 ', correct'로 끝난다", () => {
  renderOrdering();
  const question = ORDERING_QUESTIONS[0] as WordChoiceQuestion;
  const answer = question.choices[question.answerIndex];

  fireEvent.tap(screen.getByTestId(`word-choice-option-${question.answerIndex}`), {});

  expect(screen.getByTestId(`word-choice-option-${question.answerIndex}`)).toHaveAttribute(
    "accessibility-label",
    `${answer}, correct`,
  );
});

function renderOrderingMarked(): ReturnType<typeof render> {
  return render(
    <UiCopyContext.Provider value={markedUiCopy}>
      <WordChoiceScreen stepId="ordering" onExit={() => {}} onFinish={() => {}} />
    </UiCopyContext.Provider>,
  );
}

test("[LA2-M] 문구표를 주입하면 지시문 · 나가기가 표의 경로로 나온다", () => {
  renderOrderingMarked();

  expect(screen.getByTestId("learning-shell-instruction")).toHaveTextContent(
    "⟦wordChoice.instruction⟧",
  );
  expect(screen.getByTestId("learning-shell-exit")).toHaveAttribute(
    "accessibility-label",
    "⟦learningShell.exitLesson⟧",
  );
});

test("[LA2-M] 문구표를 주입하고 응답하면 판정 배지 · 보기 접미 · 넘김 층이 표의 경로로 나온다", () => {
  renderOrderingMarked();
  const question = ORDERING_QUESTIONS[0] as WordChoiceQuestion;
  const answerIndex = question.answerIndex;

  fireEvent.tap(screen.getByTestId(`word-choice-option-${answerIndex}`), {});

  expect(screen.getByTestId("answer-verdict")).toHaveAttribute(
    "accessibility-label",
    "⟦common.answerResult.correct⟧",
  );
  expect(screen.getByTestId(`word-choice-option-${answerIndex}`)).toHaveAttribute(
    "accessibility-label",
    `${question.choices[answerIndex]}, ⟦common.answerResultSuffix.correct⟧`,
  );
  expect(screen.getByTestId("learning-shell-advance")).toHaveAttribute(
    "accessibility-label",
    "⟦common.continue⟧",
  );
});

test("[LA2-M] 문구표를 주입하고 문항을 마치면 완료 문구 · 마치기 · 낭독이 표의 경로로 나온다", () => {
  const { builtin, completion } = stubCompletionHost();
  renderOrderingMarked();

  completeAllThree();

  expect(screen.getByTestId("word-choice-screen-complete")).toHaveTextContent(
    "⟦common.allQuestionsDone⟧",
  );
  expect(screen.getByTestId("learning-shell-action")).toHaveAttribute(
    "accessibility-label",
    "⟦common.seeResults⟧",
  );
  expect(completion).toHaveLength(1);
  expect(completion[0]?.content).toBe("⟦common.allQuestionsDone⟧, ⟦common.seeResults⟧");
  expect(builtin).toHaveLength(0);
});
