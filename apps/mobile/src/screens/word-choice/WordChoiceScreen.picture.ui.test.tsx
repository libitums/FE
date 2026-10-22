import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { MotionProvider } from "@libitums/ui-lynx/motion";
import type { AnswerResult } from "../../lib/answer-result";
import { WordChoiceActivity } from "./WordChoiceScreen";
import type { WordChoiceQuestion } from "./word-choice-questions";
import { expectChoiceResult } from "../../components/question-options.test-support";

// `ui` 계층: 단어 선택 활동 안의 그림 갈래 — 그림 문항은 제시문 대신 그림 틀을 세우고, 그림을 기다리는 동안
// 보기를 잠그며, 그림이 못 서면(error · 6초 무응답) 뜻 글자로 바꿔 막히지 않게 합니다. 문항은 매핑 모듈이
// 내는 꼴로 손으로 세웠습니다. 타이머는 가짜입니다.

const pictureQuestion: WordChoiceQuestion = {
  prompt: "water",
  choices: ["카드", "현금", "물", "영수증"],
  answerIndex: 2,
  instruction: "Which word matches the picture?",
  picture: { url: "https://cdn/images/u01-water/s1-05.jpg", answerRomanization: "mul" },
};

const plainQuestion: WordChoiceQuestion = {
  prompt: "___로 할게요.",
  romanization: "___ro halgeyo.",
  choices: ["현금", "봉투", "카드"],
  answerIndex: 2,
  instruction: "Fill in the blank.",
};

const otherPictureQuestion: WordChoiceQuestion = {
  ...pictureQuestion,
  prompt: "bag",
  picture: { url: "https://cdn/images/u01-water/s1-06.jpg", answerRomanization: "mul" },
};

const three = [pictureQuestion, plainQuestion, otherPictureQuestion] as const;

type Finish = (results: readonly AnswerResult[], skippedCount: number) => void;

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function mount(
  questions: readonly WordChoiceQuestion[],
  options: { readonly motion?: "reduced" } = {},
) {
  const spoken: string[] = [];
  vi.stubGlobal("NativeModules", {
    LynxAccessibilityModule: {
      accessibilityAnnounce: (args: { content: string }, callback: (result: unknown) => void) => {
        spoken.push(args.content);
        callback("announced");
      },
    },
  });
  const onFinish = vi.fn<Finish>();
  const element = (
    <WordChoiceActivity questions={questions} onExit={() => {}} onFinish={onFinish} />
  );
  render(
    options.motion === undefined ? (
      element
    ) : (
      <MotionProvider motion={options.motion}>{element}</MotionProvider>
    ),
  );
  return { spoken, onFinish };
}

const id = (testId: string) => screen.getByTestId(testId);
const maybe = (testId: string) => screen.queryByTestId(testId);
const tap = (testId: string): void => void fireEvent.tap(id(testId), {});
const option = (index: number) => id(`ui-lynx-option-selector-item-choice-${index}`);
const options = () => id("word-choice-screen-options");
const layoutOf = (): string | null =>
  within(options()).getByTestId("ui-lynx-option-selector").getAttribute("data-layout");
// 그림을 기다리는 동안 보기는 흐린 래퍼 안에서 탭을 흡수합니다.
const waiting = () => maybe("question-options-waiting");
const pictureRoot = () => id("word-choice-picture");
const fireOnImage = (name: "load" | "error"): void =>
  void fireEvent(id("word-choice-picture-image"), new window.Event(`bindEvent:${name}`));
const elapse = (ms: number): void => {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
};
const unavailableSpeech = "Picture unavailable. Meaning: water";

/** 그림 문항을 load → 정답 → 넘김으로 풉니다. */
function solvePicture(question: WordChoiceQuestion): void {
  fireOnImage("load");
  tap(`ui-lynx-option-selector-item-choice-${question.answerIndex}`);
  tap("learning-shell-advance");
}

/** 그림 없는 문항을 정답 → 넘김으로 풉니다. */
function solvePlain(question: WordChoiceQuestion): void {
  tap(`ui-lynx-option-selector-item-choice-${question.answerIndex}`);
  tap("learning-shell-advance");
}

describe.each([
  { name: "기본 모션", motion: undefined },
  { name: "동작 줄이기", motion: "reduced" as const },
])("WordChoiceActivity 그림 — $name", ({ motion }) => {
  test("UWA1. 그림 문항의 첫 렌더는 제시문 없이 로딩 중인 그림 틀 · 4지 격자 보기 · 잠금이다", () => {
    mount(three, { motion });

    expect(id("learning-shell-form")).toHaveTextContent("Word choice");
    expect(id("learning-shell-instruction")).toHaveTextContent("Which word matches the picture?");
    expect(pictureRoot()).toHaveAttribute("data-load-state", "loading");
    expect(maybe("word-choice-screen-prompt")).not.toBeInTheDocument();
    for (const index of [0, 1, 2, 3]) {
      expect(option(index)).toHaveAttribute("accessibility-traits", "button");
    }
    expect(layoutOf()).toBe("grid");
    expect(waiting()).toBeInTheDocument();
  });

  test("UWA2. 로딩 중의 보기 탭은 흡수되어 판정도 넘김 조작도 생기지 않는다", () => {
    mount(three, { motion });

    tap(`ui-lynx-option-selector-item-choice-${pictureQuestion.answerIndex}`);

    expect(maybe("answer-verdict")).not.toBeInTheDocument();
    for (const index of [0, 1, 2, 3]) {
      expectChoiceResult(option(index), "none");
    }
    expect(maybe("learning-shell-advance")).not.toBeInTheDocument();
  });

  test("UWA3. load 뒤에는 보기가 열리고 정답을 탭하면 정답 배지 · 이름표 · 넘김 조작이 선다", () => {
    mount(three, { motion });

    fireOnImage("load");
    expect(pictureRoot()).toHaveAttribute("data-load-state", "loaded");
    expect(waiting()).not.toBeInTheDocument();
    expect(maybe("word-choice-picture-answer")).not.toBeInTheDocument();

    tap(`ui-lynx-option-selector-item-choice-${pictureQuestion.answerIndex}`);

    expect(id("answer-verdict")).toHaveAttribute("data-result", "correct");
    expectChoiceResult(option(pictureQuestion.answerIndex), "correct");
    expect(id("word-choice-picture-answer")).toHaveAttribute(
      "accessibility-label",
      "Answer: 물, mul, water",
    );
    expect(id("learning-shell-advance")).toBeInTheDocument();
  });

  test("UWA4. 그림 로드 실패는 뜻 글자로 바꿔 보기를 열고 한 번 낭독하며 오답에도 이름표가 정답을 보인다", () => {
    const { spoken } = mount(three, { motion });

    fireOnImage("error");

    expect(pictureRoot()).toHaveAttribute("data-load-state", "failed");
    expect(id("word-choice-picture-fallback")).toHaveTextContent("water");
    expect(waiting()).not.toBeInTheDocument();
    expect(spoken.filter((text) => text === unavailableSpeech)).toHaveLength(1);

    tap("ui-lynx-option-selector-item-choice-0");

    expect(id("answer-verdict")).toHaveAttribute("data-result", "incorrect");
    expect(id("word-choice-picture-answer")).toHaveAttribute(
      "accessibility-label",
      "Answer: 물, mul, water",
    );
  });
});

test("UWA5. 이벤트가 없으면 5999ms까지는 로딩 · 잠김이고 6000ms에 실패로 바뀌어 대체 글자와 함께 열린다", () => {
  mount(three);

  elapse(5999);
  expect(pictureRoot()).toHaveAttribute("data-load-state", "loading");
  expect(waiting()).toBeInTheDocument();

  elapse(1);

  expect(pictureRoot()).toHaveAttribute("data-load-state", "failed");
  expect(id("word-choice-picture-fallback")).toHaveTextContent("water");
  expect(waiting()).not.toBeInTheDocument();
});

test("UWA6a. load로 선 그림은 6000ms가 지나도 로드됨으로 남는다", () => {
  const { spoken } = mount(three);

  fireOnImage("load");
  elapse(6000);

  expect(pictureRoot()).toHaveAttribute("data-load-state", "loaded");
  expect(spoken).not.toContain(unavailableSpeech);
});

test("UWA6b. 실패한 그림은 뒤늦은 load나 시간 초과에도 실패로 남고 낭독은 한 번뿐이다", () => {
  const { spoken } = mount(three);
  const image = id("word-choice-picture-image");

  fireOnImage("error");
  fireEvent(image, new window.Event("bindEvent:load"));
  elapse(6000);

  expect(pictureRoot()).toHaveAttribute("data-load-state", "failed");
  expect(spoken.filter((text) => text === unavailableSpeech)).toHaveLength(1);
});

test("UWA7. 그림 문항을 풀고 넘기면 그림 없는 문항은 제시문과 기존 배치로 서고 곧바로 답할 수 있다", () => {
  mount(three);

  solvePicture(pictureQuestion);

  expect(maybe("word-choice-picture")).not.toBeInTheDocument();
  expect(id("word-choice-screen-prompt")).toHaveTextContent("___로 할게요.");
  expect(layoutOf()).toBe("stack");
  expect(waiting()).not.toBeInTheDocument();

  tap(`ui-lynx-option-selector-item-choice-${plainQuestion.answerIndex}`);

  expect(id("answer-verdict")).toHaveAttribute("data-result", "correct");
});

test("UWA8. 다시 그림 문항에 들어서면 로딩부터 새로 시작한다", () => {
  mount(three);
  const firstSrc = id("word-choice-picture-image").getAttribute("src");

  solvePicture(pictureQuestion);
  solvePlain(plainQuestion);

  expect(pictureRoot()).toHaveAttribute("data-load-state", "loading");
  expect(id("word-choice-picture-image")).toHaveAttribute(
    "src",
    "https://cdn/images/u01-water/s1-06.jpg",
  );
  expect(id("word-choice-picture-image").getAttribute("src")).not.toBe(firstSrc);
  expect(maybe("word-choice-picture-fallback")).not.toBeInTheDocument();
  expect(maybe("word-choice-picture-answer")).not.toBeInTheDocument();
  expect(waiting()).toBeInTheDocument();
});

test("UWA9. 앞 문항 몫의 시간 초과는 새 그림 문항을 실패로 만들지 않는다", () => {
  const { spoken } = mount(three);

  elapse(5000);
  solvePicture(pictureQuestion);
  solvePlain(plainQuestion);
  elapse(1000);

  expect(pictureRoot()).toHaveAttribute("data-load-state", "loading");
  expect(maybe("word-choice-picture-fallback")).not.toBeInTheDocument();
  expect(waiting()).toBeInTheDocument();
  expect(spoken).not.toContain("Picture unavailable. Meaning: bag");
});

test("UWA10. 끝까지 풀고 See results를 두 번 눌러도 문항 수만큼의 결과가 한 번만 올라간다", () => {
  const { onFinish } = mount(three);

  solvePicture(pictureQuestion);
  solvePlain(plainQuestion);
  solvePicture(otherPictureQuestion);

  expect(id("word-choice-screen-complete")).toBeInTheDocument();
  expect(onFinish).toHaveBeenCalledTimes(0);

  tap("learning-shell-action");
  tap("learning-shell-action");

  expect(onFinish).toHaveBeenCalledTimes(1);
  expect(onFinish).toHaveBeenCalledWith(["correct", "correct", "correct"], 0);
});

test("UWA11. 고른 뒤 탭 없이 2500ms가 지나면 다음 문항으로 넘어간다", () => {
  mount(three);

  fireOnImage("load");
  tap(`ui-lynx-option-selector-item-choice-${pictureQuestion.answerIndex}`);
  elapse(2499);
  expect(maybe("word-choice-picture")).toBeInTheDocument();

  elapse(1);

  expect(maybe("word-choice-picture")).not.toBeInTheDocument();
  expect(id("word-choice-screen-prompt")).toHaveTextContent("___로 할게요.");
});

test("UWA13. 그림 없는 문항만 있으면 그림 틀 없이 처음부터 열려 있고 6000ms가 지나도 낭독도 상태 변화도 없다", () => {
  const { spoken } = mount([plainQuestion]);

  expect(maybe("word-choice-picture")).not.toBeInTheDocument();
  expect(waiting()).not.toBeInTheDocument();

  elapse(6000);

  expect(spoken).toHaveLength(0);
  expect(waiting()).not.toBeInTheDocument();
  for (const index of [0, 1, 2]) {
    expectChoiceResult(option(index), "none");
  }
});

// WC3 — 그림 문항은 셸 무대를 bare로 두고 활동이 Card 안에 Card.Media로 그림을 가장자리까지 채웁니다.
// 틀 비율은 보기 행 수로 정합니다(2개 한 행 1:1, 3 ~ 4개 두 행 4:3).
const twoChoicePicture: WordChoiceQuestion = {
  ...pictureQuestion,
  choices: ["물", "불"],
  answerIndex: 0,
};

const frameClassOf = (): string =>
  within(pictureRoot()).getByTestId("word-choice-picture-frame").getAttribute("class") ?? "";

test("WC3. 그림은 bare 무대의 Card.Media 안에 서고 셸 Card 안쪽 여백으로 감싸지 않는다", () => {
  mount([pictureQuestion]);

  const stage = id("learning-shell-stage");
  expect(within(stage).getAllByTestId("ui-lynx-card")).toHaveLength(1);
  const media = within(stage).getByTestId("ui-lynx-card-media");
  expect(media).toContainElement(pictureRoot());
  expect(pictureRoot().closest('[data-testid="ui-lynx-card-content"]')).toBeNull();
});

test("WC3. 보기 두 개는 틀 1:1, 네 개는 틀 4:3이고 둘 다 grid 보기다", () => {
  mount([twoChoicePicture]);
  expect(frameClassOf()).toContain("1-1");
  expect(frameClassOf()).not.toContain("4-3");
  expect(layoutOf()).toBe("grid");
  cleanup();

  mount([pictureQuestion]);
  expect(frameClassOf()).toContain("4-3");
  expect(frameClassOf()).not.toContain("1-1");
  expect(layoutOf()).toBe("grid");
});

test("WC3. 답한 뒤에는 그림 위 이름표가 서고 판정은 카드 안이 아니라 셸 지시문 자리에 선다", () => {
  mount([pictureQuestion]);

  fireOnImage("load");
  tap(`ui-lynx-option-selector-item-choice-${pictureQuestion.answerIndex}`);

  expect(id("word-choice-picture-answer")).toBeInTheDocument();
  expect(within(id("learning-shell-verdict")).getByTestId("answer-verdict")).toHaveAttribute(
    "data-result",
    "correct",
  );
  expect(within(id("learning-shell-stage")).queryByTestId("answer-verdict")).toBeNull();
  expect(document.querySelector(".word-choice-screen-verdict-slot")).toBeNull();
});
