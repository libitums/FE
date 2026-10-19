import type { ReactNode } from "@lynx-js/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import type { AnswerResult } from "../../lib/answer-result";
import { PairMatchActivity } from "../pair-match/PairMatchActivity";
import type { PairMatchQuestion } from "../pair-match/pair-match.contract";
import { VocabCardActivity } from "../vocab-card/VocabCardActivity";
import type { VocabCardQuestion } from "../vocab-card/vocab-card.contract";
import type { LessonPosition } from "./activity-finish";

// `ui` 계층: 한 레슨 안에서 새 활동(단어 카드 · 짝 맞추기)이 받는 `lesson` 위치를 봅니다. 중간 활동은 마지막
// 문항 뒤에 완료 카드 없이 바로 결과를 올리고, 셸 카운터와 진행 막대는 레슨 전체 문항 기준입니다. 레슨의
// 마지막 활동만 마지막 뒤에 끝납니다 — 카드는 See results로 바로, 짝은 완료 카드를 거쳐서입니다.
// 기존 활동의 같은 표는 `LearningActivity.lesson.ui.test.tsx`가 지킵니다.

type Finish = (results: readonly AnswerResult[], skippedCount: number) => void;

const middle: LessonPosition = { offset: 3, total: 12, last: false };
const final: LessonPosition = { offset: 10, total: 12, last: true, activityCount: 4, ordinal: 2 };

afterEach(() => {
  cleanup();
});

const tap = (testId: string): void => void fireEvent.tap(screen.getByTestId(testId), {});
const chapter = () => screen.getByTestId("learning-shell-chapter");
const progress = () => screen.getByTestId("learning-shell-progress");
const actionLabel = () =>
  screen.getByTestId("learning-shell-action").getAttribute("accessibility-label");

const cards: readonly VocabCardQuestion[] = [
  { word: "물", romanization: "mul", meaning: "water", example: null },
  { word: "오다", romanization: "oda", meaning: "to come", example: null },
];

const pair: PairMatchQuestion = {
  words: ["하나", "둘"],
  meanings: ["two", "one"],
  answer: [1, 0],
};

/** 짝 문항 하나를 정답으로 잇고 확인합니다. */
function solvePair(): void {
  tap("pair-match-word-0");
  tap("pair-match-meaning-1");
  tap("pair-match-word-1");
  tap("pair-match-meaning-0");
  tap("learning-shell-action");
}

type Case = {
  readonly name: string;
  /** 이 활동의 완료 카드 testid입니다. 단어 카드는 완료 카드를 두지 않으므로 서지 않는 id입니다. */
  readonly completeId: string;
  readonly mount: (lesson: LessonPosition, onFinish: Finish) => ReactNode;
  /** 첫 문항을 처리하고 둘째 문항으로 넘어갑니다. */
  readonly solveFirst: () => void;
  /** 마지막 문항에서 「다음」 조작까지 합니다(카드 = Next · 짝 = Check 뒤 Next). */
  readonly solveLast: () => void;
  readonly results: readonly AnswerResult[];
};

const cardCase: Case = {
  name: "단어 카드",
  completeId: "vocab-card-complete",
  mount: (lesson, onFinish) => (
    <VocabCardActivity
      questions={cards}
      gemCount={0}
      onExit={() => {}}
      onFinish={onFinish}
      lesson={lesson}
    />
  ),
  solveFirst: () => tap("learning-shell-action"),
  solveLast: () => tap("learning-shell-action"),
  results: [],
};

const pairCase: Case = {
  name: "짝 맞추기",
  completeId: "pair-match-complete",
  mount: (lesson, onFinish) => (
    <PairMatchActivity
      questions={[pair, pair]}
      gemCount={0}
      onExit={() => {}}
      onFinish={onFinish}
      lesson={lesson}
    />
  ),
  solveFirst: () => {
    solvePair();
    tap("learning-shell-action");
  },
  solveLast: () => {
    solvePair();
    tap("learning-shell-action");
  },
  results: ["correct", "correct"],
};

const cases: readonly Case[] = [cardCase, pairCase];

describe.each(cases)("$name — 레슨 안의 위치", (item) => {
  test("UL-I1. 카운터와 진행 막대가 레슨 전체 기준이다(오프셋 + 순번 / 전체)", () => {
    render(item.mount(middle, () => {}));

    expect(chapter()).toHaveTextContent("Lesson 4 / 12");
    expect(Number(progress().getAttribute("data-progress"))).toBeCloseTo((4 / 12) * 100, 5);
  });

  test("UL-I2. 첫 문항을 처리하면 카운터가 한 칸 간다", () => {
    render(item.mount(middle, () => {}));

    item.solveFirst();

    expect(chapter()).toHaveTextContent("Lesson 5 / 12");
    expect(Number(progress().getAttribute("data-progress"))).toBeCloseTo((5 / 12) * 100, 5);
  });

  test("UL-I3. 중간 활동은 마지막 문항의 Next 뒤 완료 카드 없이 결과를 한 번 올린다", () => {
    const onFinish = vi.fn<Finish>();
    render(item.mount(middle, onFinish));

    item.solveFirst();
    expect(onFinish).toHaveBeenCalledTimes(0);
    item.solveLast();

    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(onFinish).toHaveBeenCalledWith(item.results, 0);
    expect(screen.queryByTestId("learning-activity-complete")).not.toBeInTheDocument();
    expect(screen.queryByTestId(item.completeId)).not.toBeInTheDocument();
    expect(screen.queryByText("See results")).not.toBeInTheDocument();
  });
});

test("UL-I3b. 중간 단어 카드의 마지막 버튼 라벨은 Next이고 See results가 아니다", () => {
  render(cardCase.mount(middle, () => {}));

  cardCase.solveFirst();

  expect(actionLabel()).toBe("Next");
});

test("UL-I4a. 마지막 활동인 단어 카드는 마지막 카드에서 See results로 완료 카드 없이 결과를 올린다", () => {
  const onFinish = vi.fn<Finish>();
  render(cardCase.mount(final, onFinish));

  expect(chapter()).toHaveTextContent("Lesson 11 / 12");
  cardCase.solveFirst();
  expect(chapter()).toHaveTextContent("Lesson 12 / 12");
  expect(actionLabel()).toBe("See results");
  expect(onFinish).toHaveBeenCalledTimes(0);

  tap("learning-shell-action");

  expect(onFinish).toHaveBeenCalledTimes(1);
  expect(onFinish).toHaveBeenCalledWith([], 0);
  expect(screen.queryByTestId("learning-activity-complete")).not.toBeInTheDocument();
});

test("UL-I4b. 마지막 활동인 짝 맞추기는 완료 카드를 보이고 See results로만 결과를 올린다", () => {
  const onFinish = vi.fn<Finish>();
  render(pairCase.mount(final, onFinish));

  expect(chapter()).toHaveTextContent("Lesson 11 / 12");
  pairCase.solveFirst();
  pairCase.solveLast();

  expect(onFinish).toHaveBeenCalledTimes(0);
  expect(screen.getByTestId("pair-match-complete")).toBeInTheDocument();
  expect(screen.getByTestId("learning-activity-complete-lesson")).toHaveTextContent("Lesson 2");
  expect(screen.getByTestId("learning-activity-complete-activities")).toHaveTextContent("4");
  expect(chapter()).toHaveTextContent("Lesson 12 / 12");
  expect(actionLabel()).toBe("See results");

  tap("learning-shell-action");

  expect(onFinish).toHaveBeenCalledTimes(1);
  expect(onFinish).toHaveBeenCalledWith(["correct", "correct"], 0);
});
