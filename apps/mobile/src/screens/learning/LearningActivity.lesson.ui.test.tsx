import { zeroSafeAreaInsets } from "../../lib/safe-area";
import type { ReactNode } from "@lynx-js/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import type { AnswerResult } from "../../lib/answer-result";
import { initialSessionOptions } from "../../lib/session-options";
import { keystrokesFor } from "../messenger/hangul-keyboard";
import { ListeningActivity } from "../listening/ListeningScreen";
import { SentenceOrderActivity } from "../sentence-order/SentenceOrderScreen";
import { TypingActivity } from "../typing/TypingActivity";
import { WordChoiceActivity } from "../word-choice/WordChoiceScreen";
import type { LessonPosition } from "./activity-finish";

// `ui` 계층: 한 레슨 안에서 학습형이 이어질 때(E-1) 활동이 받는 `lesson` 위치를 봅니다.
// 중간 활동은 마지막 문항 뒤에 완료 카드 없이 바로 결과를 올리고, 셸 카운터와 진행 막대는
// 레슨 전체 문항 기준(오프셋 + 순번 / 전체)입니다. 레슨의 마지막 활동만 완료 카드를 보입니다.
// `lesson`을 주지 않는 쓰임(튜토리얼)은 기존 테스트가 지킵니다.

type Finish = (results: readonly AnswerResult[], skippedCount: number) => void;

const middle: LessonPosition = { offset: 3, total: 12, last: false };
const final: LessonPosition = { offset: 10, total: 12, last: true };

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const tap = (id: string): void => void fireEvent.tap(screen.getByTestId(id), {});
const chapter = () => screen.getByTestId("learning-shell-chapter");
const progress = () => screen.getByTestId("learning-shell-progress");

type Case = {
  readonly name: string;
  readonly completeId: string;
  /** 활동을 세웁니다(문항 둘). */
  readonly mount: (lesson: LessonPosition, onFinish: Finish) => ReactNode;
  /** 첫 문항을 정답으로 풀고 다음 문항으로 넘어갑니다. */
  readonly solveFirst: () => void;
  /** 마지막 문항을 정답으로 풀고 「다음」 조작까지 합니다. */
  readonly solveLast: () => void;
  /** 마지막 문항을 푼 뒤 결과를 올리기 위해 누르는 것이 보이는지(완료 카드 앞 단계) 아닌지. */
  readonly seeResultsLabel: string;
};

const listeningQuestion = (prompt: string) =>
  ({
    prompt,
    romanization: prompt,
    audioSource: null,
    choices: ["a", "b"],
    answerIndex: 0,
  }) as const;

const wordQuestion = (prompt: string) =>
  ({ prompt, choices: ["a", "b", "c"], answerIndex: 1 }) as const;

const orderQuestion = (prompt: string) =>
  ({ prompt, chips: ["둘", "하나"], answerOrder: [1, 0] }) as const;

const typingQuestion = (id: string) =>
  ({
    id,
    kind: "translation",
    instruction: "Say this in Korean.",
    cue: "A week",
    cueSupport: null,
    hint: null,
    answers: ["일주일"],
    audioSource: null,
  }) as const;

function typeWeek(): void {
  for (const key of keystrokesFor("일주일")) tap(`messenger-key-${key}`);
}

const cases: readonly Case[] = [
  {
    name: "듣기",
    completeId: "listening-screen-complete",
    mount: (lesson, onFinish) => (
      <ListeningActivity
        questions={[listeningQuestion("하나"), listeningQuestion("둘")]}
        onExit={() => {}}
        onFinish={onFinish}
        sessionOptions={initialSessionOptions}
        gemCount={0}
        lesson={lesson}
      />
    ),
    solveFirst: () => {
      tap("listening-choice-0");
      tap("learning-shell-advance");
    },
    solveLast: () => {
      tap("listening-choice-0");
      tap("learning-shell-advance");
    },
    seeResultsLabel: "See results",
  },
  {
    name: "단어 선택",
    completeId: "word-choice-screen-complete",
    mount: (lesson, onFinish) => (
      <WordChoiceActivity
        questions={[wordQuestion("하나"), wordQuestion("둘")]}
        onExit={() => {}}
        onFinish={onFinish}
        lesson={lesson}
      />
    ),
    solveFirst: () => {
      tap("word-choice-option-1");
      tap("learning-shell-advance");
    },
    solveLast: () => {
      tap("word-choice-option-1");
      tap("learning-shell-advance");
    },
    seeResultsLabel: "See results",
  },
  {
    name: "문장 순서",
    completeId: "sentence-order-screen-complete",
    mount: (lesson, onFinish) => (
      <SentenceOrderActivity
        questions={[orderQuestion("하나"), orderQuestion("둘")]}
        gemCount={0}
        onExit={() => {}}
        onFinish={onFinish}
        lesson={lesson}
      />
    ),
    solveFirst: () => {
      tap("sentence-order-chip-1");
      tap("sentence-order-chip-0");
      tap("learning-shell-action");
      tap("learning-shell-action");
    },
    solveLast: () => {
      tap("sentence-order-chip-1");
      tap("sentence-order-chip-0");
      tap("learning-shell-action");
      tap("learning-shell-action");
    },
    seeResultsLabel: "See results",
  },
  {
    name: "타자",
    completeId: "typing-activity-complete",
    mount: (lesson, onFinish) => (
      <TypingActivity
        insets={zeroSafeAreaInsets}
        questions={[typingQuestion("T1"), typingQuestion("T2")]}
        gemCount={0}
        onExit={() => {}}
        onFinish={onFinish}
        lesson={lesson}
      />
    ),
    solveFirst: () => {
      typeWeek();
      tap("learning-shell-action");
      tap("learning-shell-action");
    },
    solveLast: () => {
      typeWeek();
      tap("learning-shell-action");
      tap("learning-shell-action");
    },
    seeResultsLabel: "See results",
  },
];

describe.each(cases)("$name — 레슨 안의 위치", (item) => {
  test("UC1. 카운터와 진행 막대가 레슨 전체 기준이다(오프셋 + 순번 / 전체)", () => {
    render(item.mount(middle, () => {}));

    expect(chapter()).toHaveTextContent("Lesson 4 / 12");
    expect(Number(progress().getAttribute("data-progress"))).toBeCloseTo((4 / 12) * 100, 5);

    item.solveFirst();

    expect(chapter()).toHaveTextContent("Lesson 5 / 12");
    expect(Number(progress().getAttribute("data-progress"))).toBeCloseTo((5 / 12) * 100, 5);
  });

  test("UC2. 중간 활동은 마지막 문항 뒤 완료 카드 없이 결과를 한 번 올린다", () => {
    const onFinish = vi.fn<Finish>();
    render(item.mount(middle, onFinish));

    item.solveFirst();
    expect(onFinish).toHaveBeenCalledTimes(0);
    item.solveLast();

    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(onFinish).toHaveBeenCalledWith(["correct", "correct"], 0);
    expect(screen.queryByTestId(item.completeId)).not.toBeInTheDocument();
    expect(screen.queryByTestId("learning-activity-complete")).not.toBeInTheDocument();
    expect(screen.queryByText(item.seeResultsLabel)).not.toBeInTheDocument();
  });

  test("UC3. 레슨의 마지막 활동은 기존처럼 완료 카드를 보이고 See results로만 결과를 올린다", () => {
    const onFinish = vi.fn<Finish>();
    render(item.mount(final, onFinish));

    expect(chapter()).toHaveTextContent("Lesson 11 / 12");
    item.solveFirst();
    item.solveLast();

    expect(onFinish).toHaveBeenCalledTimes(0);
    expect(screen.getByTestId(item.completeId)).toBeInTheDocument();
    // 완료 카드 위에서도 카운터는 레슨의 마지막 문항을 가리킵니다.
    expect(chapter()).toHaveTextContent("Lesson 12 / 12");
    expect(screen.getByTestId("learning-shell-action")).toHaveAttribute(
      "accessibility-label",
      item.seeResultsLabel,
    );

    tap("learning-shell-action");

    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(onFinish).toHaveBeenCalledWith(["correct", "correct"], 0);
  });
});
