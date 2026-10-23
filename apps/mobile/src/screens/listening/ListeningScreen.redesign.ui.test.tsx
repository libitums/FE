import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import {
  choiceItemId,
  expectChoiceResult,
  expectChoiceTraits,
} from "../../components/question-options.test-support";
import type { ItemAnswerReport } from "../../lib/item-answer";
import { testIdOrder } from "../../lib/question-audio.test-support";
import { initialSessionOptions } from "../../lib/session-options";
import { useCompactDevice } from "../learning/compact-device.test-support";
import { ListeningActivity } from "./ListeningScreen";
import { questionsForStep } from "./listening-steps.test-support";

// `ui` 계층: 듣기 화면이 보기를 QuestionOptions(outlined-subtle)로 그리고 판정을 셸 지시문 자리에 올리는 것(LS1),
// 긴 제시문이 셸을 compact로 내리는 것(LS2), 문항 판정 보고(EV5)를 봅니다. 문항은 고정 표에서 가져옵니다.
// 서수 문항: 첫 문항은 제시문이 짧고(25자 미만), 둘째 문항은 25자 이상입니다.

const restores: Array<() => void> = [];

afterEach(() => {
  cleanup();
  while (restores.length > 0) restores.pop()?.();
});

function mount(onItemAnswered?: (report: ItemAnswerReport) => void) {
  return render(
    <ListeningActivity
      questions={questionsForStep("ordering")}
      onExit={() => {}}
      onFinish={() => {}}
      sessionOptions={initialSessionOptions}
      gemCount={0}
      {...(onItemAnswered === undefined ? {} : { onItemAnswered })}
    />,
  );
}

const first = questionsForStep("ordering")[0]!;
const answerIndex = first.answerIndex;
const wrongIndex = (answerIndex + 1) % 4;

test("LS1. 보기는 outlined-subtle OptionSelector가 보기 컨테이너 안에 그린다", () => {
  mount();

  const container = screen.getByTestId("listening-screen-choices");
  expect(within(container).getByTestId("ui-lynx-option-selector")).toHaveAttribute(
    "data-variant",
    "outlined-subtle",
  );
  for (const index of [0, 1, 2, 3]) {
    expect(within(container).getByTestId(choiceItemId(index))).toBeInTheDocument();
  }
});

test("LS1. 정답을 고르면 고른 보기만 correct이고 나머지는 disabled이며 판정 배지는 셸 지시문 자리에 선다", () => {
  mount();

  fireEvent.tap(screen.getByTestId(choiceItemId(answerIndex)), {});

  for (const index of [0, 1, 2, 3]) {
    const item = screen.getByTestId(choiceItemId(index));
    expectChoiceResult(item, index === answerIndex ? "correct" : "none");
    expectChoiceTraits(item, "disabled");
  }
  const verdict = screen.getByTestId("learning-shell-verdict");
  expect(within(verdict).getByTestId("answer-verdict")).toHaveAttribute("data-result", "correct");
  expect(
    within(screen.getByTestId("learning-shell-stage")).queryByTestId("answer-verdict"),
  ).toBeNull();
  expect(document.querySelector(".listening-screen-verdict-slot")).toBeNull();
});

test("LS1. 오답을 고르면 그 보기만 incorrect이고 정답 보기는 칠해지지 않는다 — 정답 노출 방지", () => {
  mount();

  fireEvent.tap(screen.getByTestId(choiceItemId(wrongIndex)), {});

  expectChoiceResult(screen.getByTestId(choiceItemId(wrongIndex)), "incorrect");
  expectChoiceResult(screen.getByTestId(choiceItemId(answerIndex)), "none");
  expect(
    within(screen.getByTestId("learning-shell-verdict")).getByTestId("answer-verdict"),
  ).toHaveAttribute("data-result", "incorrect");
});

test("LS1. 답하기 전에는 보기가 모두 button이고 판정 배지가 없다", () => {
  mount();

  for (const index of [0, 1, 2, 3]) {
    expectChoiceTraits(screen.getByTestId(choiceItemId(index)), "button");
  }
  expect(screen.queryByTestId("learning-shell-verdict")).not.toBeInTheDocument();
});

test("LS2. 제시문이 짧은 문항은 기기 밀도(regular)이고 25자 이상 문항은 셸이 compact다", () => {
  mount();
  expect(screen.getByTestId("learning-shell")).toHaveAttribute("data-density", "regular");

  fireEvent.tap(screen.getByTestId(choiceItemId(answerIndex)), {});
  fireEvent.tap(screen.getByTestId("learning-shell-advance"), {});

  expect(screen.getByTestId("learning-shell")).toHaveAttribute("data-density", "compact");
  expect(screen.getByTestId("learning-shell")).toHaveClass("learning-shell-density-compact");
});

test("EV5. 문항 판정은 첫 탭에서 한 번만 보고되고 outcome · density가 실린다", () => {
  const onItemAnswered = vi.fn<(report: ItemAnswerReport) => void>();
  mount(onItemAnswered);

  fireEvent.tap(screen.getByTestId(choiceItemId(wrongIndex)), {});
  fireEvent.tap(screen.getByTestId(choiceItemId(wrongIndex)), {});
  fireEvent.tap(screen.getByTestId(choiceItemId(answerIndex)), {});

  expect(onItemAnswered).toHaveBeenCalledTimes(1);
  expect(onItemAnswered).toHaveBeenCalledWith({
    questionIndex: 0,
    outcome: "incorrect",
    density: "regular",
  });
});

test("EV5. 13 mini 창에서는 density가 compact로 실린다", () => {
  restores.push(useCompactDevice());
  const onItemAnswered = vi.fn<(report: ItemAnswerReport) => void>();
  mount(onItemAnswered);

  fireEvent.tap(screen.getByTestId(choiceItemId(answerIndex)), {});

  expect(onItemAnswered).toHaveBeenCalledTimes(1);
  expect(onItemAnswered).toHaveBeenCalledWith({
    questionIndex: 0,
    outcome: "correct",
    density: "compact",
  });
});

test("AX1. 읽는 순서는 지시문 → 재생 줄 → 보기다", () => {
  const { container } = mount();
  const ids = [
    "learning-shell-instruction",
    "listening-prompt-playback",
    "listening-screen-choices",
  ];

  expect(testIdOrder(container, ids)).toEqual(ids);
});

test("AX1. 판정 뒤에도 판정 배지는 지시문 줄 안에 있어 읽는 순서가 앞선다", () => {
  const { container } = mount();
  fireEvent.tap(screen.getByTestId(choiceItemId(answerIndex)), {});

  const ids = ["learning-shell-verdict", "listening-prompt-playback", "listening-screen-choices"];
  expect(testIdOrder(container, ids)).toEqual(ids);
});
