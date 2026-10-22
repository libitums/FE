import { afterEach, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@lynx-js/react/testing-library";

import type { AnswerResult } from "../../lib/answer-result";
import { tapAction } from "./sentence-order-check.test-support";
import { SentenceOrderActivity } from "./SentenceOrderScreen";
import type { SentenceOrderQuestion } from "./sentence-order-questions";

// `ui` 계층: 데이터 활동 `SentenceOrderActivity` — 카탈로그 문항(문항 지시문 · 지원 줄)을 받아 지금과
// 같은 조작으로 푸는지 봅니다. 문항은 계획 모듈이 내는 꼴로 손으로 세웠습니다 — 섞기와 정답 순서
// 계산은 unit이 집니다.

// 정답 문장은 "여권 여기 있어요." — 창고 순서는 정답 순서가 아닙니다.
const wordOrder: SentenceOrderQuestion = {
  prompt: "Here's my passport.",
  chips: ["있어요.", "여권", "여기"],
  answerOrder: [1, 2, 0],
  instruction: "Build the sentence.",
};

// 읽기 줄(Check 뒤에만 보이는 로마자)이 있는 낱말 순서 꼴입니다.
const turnOrder: SentenceOrderQuestion = {
  prompt: "My name is Minsu.",
  chips: ["민수예요.", "저는"],
  answerOrder: [1, 0],
  instruction: "Put the reply in order.",
  reading: { romanization: "jeoneun minsuyeyo.", shown: "after-check" },
};

afterEach(() => {
  vi.unstubAllGlobals();
});

function mount(
  questions: readonly SentenceOrderQuestion[],
  onFinish: (results: readonly AnswerResult[], skippedCount: number) => void = () => {},
) {
  return render(
    <SentenceOrderActivity
      questions={questions}
      gemCount={0}
      onExit={() => {}}
      onFinish={onFinish}
    />,
  );
}

const chip = (index: number) => screen.getByTestId(`sentence-order-chip-${index}`);

function placeInAnswerOrder(question: SentenceOrderQuestion): void {
  for (const chipIndex of question.answerOrder) {
    fireEvent.tap(chip(chipIndex), {});
  }
}

test("US1. 낱말 순서 문항은 창고에 칩을 문항 순서로 보이고 지시문은 문항의 것이며 정답 순서로 놓으면 맞다", () => {
  mount([wordOrder]);

  const bank = screen.getByTestId("sentence-order-screen-bank");
  const bankTexts = [...bank.querySelectorAll('[data-testid^="sentence-order-chip-"]')].map(
    (el) => el.textContent,
  );
  expect(bankTexts).toEqual(wordOrder.chips);
  expect(screen.getByTestId("learning-shell-instruction")).toHaveTextContent("Build the sentence.");
  expect(screen.getByTestId("sentence-order-screen-prompt")).toHaveTextContent(
    "Here's my passport.",
  );

  placeInAnswerOrder(wordOrder);
  tapAction("Check");

  expect(screen.getByTestId("answer-verdict")).toHaveAttribute("data-result", "correct");
});

test("US2. 읽기 줄이 있는 문항은 Check 전에 로마자가 없고 Check 뒤에 서며 문항의 지시문이 보인다", () => {
  mount([turnOrder]);

  expect(screen.getByTestId("learning-shell-instruction")).toHaveTextContent(
    "Put the reply in order.",
  );
  expect(screen.queryByTestId("sentence-order-reading")).not.toBeInTheDocument();
  expect(screen.queryByTestId("sentence-order-screen-romanization")).not.toBeInTheDocument();
  expect(screen.queryByTestId("sentence-order-screen-translation")).not.toBeInTheDocument();

  placeInAnswerOrder(turnOrder);
  tapAction("Check");

  expect(screen.getByTestId("sentence-order-reading")).toHaveTextContent("jeoneun minsuyeyo.");
});

test("US3. 두 문항을 정답 · 오답으로 풀고 결과를 보면 판정 배열과 건너뜀 0이 한 번 올라간다", () => {
  const onFinish = vi.fn<(results: readonly AnswerResult[], skippedCount: number) => void>();
  mount([wordOrder, turnOrder], onFinish);

  placeInAnswerOrder(wordOrder);
  tapAction("Check");
  tapAction("Next");
  // 둘째 문항은 정답의 역순으로 놓아 틀립니다.
  for (const chipIndex of [...turnOrder.answerOrder].reverse()) {
    fireEvent.tap(chip(chipIndex), {});
  }
  tapAction("Check");
  tapAction("Next");

  expect(onFinish).toHaveBeenCalledTimes(0);
  tapAction("See results");

  expect(onFinish).toHaveBeenCalledTimes(1);
  expect(onFinish).toHaveBeenCalledWith(["correct", "incorrect"], 0);
});

test("US4. 완료 카드의 See results는 다른 학습 화면과 같은 아래 자리 — 무대가 떠 있는 버튼 몫을 따로 비우지 않는다", () => {
  // 실기기(u00 S7 · S11): 흐름 안 행 + 떠 있는 버튼 몫 여백이 겹쳐 See results가 안전 영역 밖(749~805)으로 밀렸습니다.
  mount([wordOrder]);
  placeInAnswerOrder(wordOrder);
  tapAction("Check");
  tapAction("Next");

  expect(screen.getByTestId("learning-shell-stage")).toHaveAttribute("data-scene", "complete");
  const stageClass = screen.getByTestId("learning-shell-stage").getAttribute("class") ?? "";
  expect(stageClass.split(" ")).not.toContain("learning-shell-stage-fill-rest");
  expect(stageClass.split(" ")).toContain("learning-shell-stage-fill-flow");
  expect(screen.getByTestId("learning-shell-actions")).toHaveTextContent("See results");
});
