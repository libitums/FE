import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import type { AnswerResult } from "../../lib/answer-result";
import { uiCopyEn } from "../../lib/ui-copy-en";
import { SentenceOrderActivity } from "./SentenceOrderScreen";
import { tapBottom } from "./sentence-order-check.test-support";
import type { SentenceOrderQuestion } from "./sentence-order-questions";

// `ui` 계층: 대화 조립(E-3) — 대화 순서 문항(`dialogue`)은 지시문 말풍선 없이 정답 순서의 칸마다
// 화자가 번갈아(짝수 칸 = 상대 · 홀수 칸 = 나) 말풍선으로 섭니다. 타일을 누르면 다음 빈 칸에 그 화자
// 모양으로 들어가고, 놓은 말풍선을 누르면 되돌아갑니다. 채점은 기존 문장 순서와 같습니다.
// 문항은 계획 모듈이 내는 꼴로 손으로 세웠습니다. 칸의 화자는 문항 데이터(`dialogue.speakers`)에서 옵니다.

// 정답 대화: 0 네, 여권 좀 보여주세요. / 1 여권 여기 있어요. / 2 며칠 묵으시죠? / 3 일주일 묵어요.
// 창고 순서는 정답 순서가 아닙니다 — 칩 인덱스 3 · 2 · 0 · 1 순으로 놓아야 맞습니다.
const turns: SentenceOrderQuestion = {
  prompt: "대화 순서대로 놓으세요.",
  chips: ["며칠 묵으시죠?", "일주일 묵어요.", "여권 여기 있어요.", "네, 여권 좀 보여주세요."],
  answerOrder: [3, 2, 0, 1],
  instruction: "Put the conversation in order.",
  dialogue: {
    speakers: ["counterpart", "me", "counterpart", "me"],
    chipSpeakers: ["counterpart", "me", "me", "counterpart"],
  },
  chipMeanings: [
    "How long are you staying?",
    "I am staying a week.",
    "Here is my passport.",
    "Yes, please show me your passport.",
  ],
};

const plain: SentenceOrderQuestion = {
  prompt: "Here's my passport.",
  chips: ["있어요.", "여권", "여기"],
  answerOrder: [1, 2, 0],
  instruction: "Build the sentence.",
};

afterEach(() => {
  cleanup();
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

const slot = (position: number) => screen.getByTestId(`sentence-order-dialogue-slot-${position}`);
const chip = (index: number) => screen.getByTestId(`sentence-order-dialogue-chip-${index}`);
const tapChip = (index: number): void => void fireEvent.tap(chip(index), {});
const tapAction = tapBottom;
const speakerOf = (position: number) => slot(position).getAttribute("data-speaker");

test("UD1. 지시문 말풍선이 없고 지시문은 셸 한 줄에만 있으며 정답 길이만큼 빈 칸이 번갈아 선다", () => {
  mount([turns]);

  expect(screen.queryByTestId("sentence-order-screen-prompt")).not.toBeInTheDocument();
  expect(screen.queryByTestId("sentence-order-screen-reply")).not.toBeInTheDocument();
  expect(screen.queryByTestId("sentence-order-screen-sentence")).not.toBeInTheDocument();
  expect(screen.queryByText("대화 순서대로 놓으세요.")).not.toBeInTheDocument();
  expect(screen.getByTestId("learning-shell-instruction")).toHaveTextContent(
    "Put the conversation in order.",
  );

  expect([0, 1, 2, 3].map(speakerOf)).toEqual(["counterpart", "me", "counterpart", "me"]);
  for (const position of [0, 1, 2, 3]) {
    expect(slot(position)).toHaveAttribute("data-filled", "false");
  }
  expect(screen.queryByTestId("sentence-order-dialogue-slot-4")).not.toBeInTheDocument();
});

test("UD2. 타일을 누르면 다음 빈 칸에 그 칸 화자 모양으로 들어가고 창고엔 빈 자리가 남는다", () => {
  mount([turns]);

  tapChip(3);
  expect(slot(0)).toHaveAttribute("data-filled", "true");
  expect(slot(0)).toHaveTextContent("네, 여권 좀 보여주세요.");
  expect(speakerOf(0)).toBe("counterpart");
  expect(slot(1)).toHaveAttribute("data-filled", "false");

  tapChip(2);
  expect(slot(1)).toHaveAttribute("data-filled", "true");
  expect(slot(1)).toHaveTextContent("여권 여기 있어요.");
  expect(speakerOf(1)).toBe("me");

  expect(screen.queryByTestId("sentence-order-dialogue-chip-3")).not.toBeInTheDocument();
  expect(screen.getByTestId("sentence-order-bank-slot-3")).toBeInTheDocument();
});

test("UD3. 놓은 말풍선을 누르면 창고로 되돌아가고 빈 칸이 된다", () => {
  mount([turns]);
  tapChip(3);
  tapChip(2);

  fireEvent.tap(slot(1), {});

  expect(slot(1)).toHaveAttribute("data-filled", "false");
  expect(slot(0)).toHaveTextContent("네, 여권 좀 보여주세요.");
  expect(chip(2)).toHaveTextContent("여권 여기 있어요.");
  expect(screen.queryByTestId("sentence-order-bank-slot-2")).not.toBeInTheDocument();
});

test("UD4. 정답 순서로 놓고 확인하면 맞고, 순서가 다르면 틀리며, 채점 뒤엔 말풍선이 눌리지 않는다", () => {
  const onFinish = vi.fn<(results: readonly AnswerResult[], skippedCount: number) => void>();
  mount([turns, turns], onFinish);

  for (const index of turns.answerOrder) tapChip(index);
  tapAction();
  expect(screen.getByTestId("answer-verdict")).toHaveAttribute("data-result", "correct");
  expect(slot(0)).toHaveAttribute("accessibility-traits", "disabled");
  fireEvent.tap(slot(0), {});
  expect(slot(0)).toHaveAttribute("data-filled", "true");
  tapAction();

  for (const index of [...turns.answerOrder].reverse()) tapChip(index);
  tapAction();
  expect(screen.getByTestId("answer-verdict")).toHaveAttribute("data-result", "incorrect");
  tapAction();
  tapAction();

  expect(onFinish).toHaveBeenCalledWith(["correct", "incorrect"], 0);
});

test("UD5. 말풍선은 화자와 순서를 낭독하고 빈 칸도 화자와 순서로 읽힌다", () => {
  mount([turns]);
  const { dialogueSpeaker, dialogueTurn, dialogueEmptyTurn } = uiCopyEn.sentenceOrder;

  expect(slot(0)).toHaveAttribute(
    "accessibility-label",
    dialogueEmptyTurn(dialogueSpeaker.counterpart, 1),
  );
  tapChip(3);
  tapChip(2);

  expect(slot(0)).toHaveAttribute(
    "accessibility-label",
    dialogueTurn(dialogueSpeaker.counterpart, 1, "네, 여권 좀 보여주세요."),
  );
  expect(slot(1)).toHaveAttribute(
    "accessibility-label",
    dialogueTurn(dialogueSpeaker.me, 2, "여권 여기 있어요."),
  );
  expect(slot(1)).toHaveAttribute("accessibility-traits", "button");
  expect(dialogueSpeaker).toEqual({ counterpart: "Partner", me: "You" });
});

test("USO1. 데이터가 나부터 말하게 하면 첫 칸이 나 모양이고 빈 칸 낭독도 나다", () => {
  const meFirst: SentenceOrderQuestion = {
    ...turns,
    dialogue: {
      speakers: ["me", "counterpart", "me", "counterpart"],
      chipSpeakers: ["me", "counterpart", "counterpart", "me"],
    },
  };
  mount([meFirst]);
  const { dialogueSpeaker, dialogueEmptyTurn } = uiCopyEn.sentenceOrder;

  expect([0, 1, 2, 3].map(speakerOf)).toEqual(["me", "counterpart", "me", "counterpart"]);
  expect(slot(0).getAttribute("class") ?? "").toContain("-bubble-me");
  expect(slot(1).getAttribute("class") ?? "").toContain("-bubble-counterpart");
  expect(slot(0)).toHaveAttribute("accessibility-label", dialogueEmptyTurn(dialogueSpeaker.me, 1));

  tapChip(3);
  expect(speakerOf(0)).toBe("me");
  expect(slot(0)).toHaveTextContent("네, 여권 좀 보여주세요.");
});

test("USO3. 칸 수는 speakers 길이이고 같은 화자가 연이어 서는 칸도 데이터대로 선다", () => {
  const three: SentenceOrderQuestion = {
    prompt: "대화 순서대로 놓으세요.",
    chips: ["B", "C", "A"],
    answerOrder: [2, 0, 1],
    instruction: "Put the conversation in order.",
    dialogue: { speakers: ["me", "me", "counterpart"], chipSpeakers: ["me", "counterpart", "me"] },
  };
  mount([three]);
  const { dialogueSpeaker, dialogueTurn, dialogueEmptyTurn } = uiCopyEn.sentenceOrder;

  expect([0, 1, 2].map(speakerOf)).toEqual(["me", "me", "counterpart"]);
  expect(slot(1)).toHaveAttribute("accessibility-label", dialogueEmptyTurn(dialogueSpeaker.me, 2));
  expect(screen.queryByTestId("sentence-order-dialogue-slot-3")).not.toBeInTheDocument();

  tapChip(2);
  tapChip(0);
  expect(slot(0)).toHaveTextContent("A");
  expect(slot(1)).toHaveTextContent("B");
  expect(speakerOf(1)).toBe("me");
  expect(slot(1).getAttribute("class") ?? "").toContain("-bubble-me");
  expect(slot(1)).toHaveAttribute("accessibility-label", dialogueTurn(dialogueSpeaker.me, 2, "B"));
  expect(slot(2)).toHaveAttribute("data-filled", "false");

  fireEvent.tap(slot(1), {});
  expect(slot(1)).toHaveAttribute("data-filled", "false");
  expect(chip(0)).toHaveTextContent("B");
});

test("USO4. 채점은 화자와 무관하게 answerOrder 기준이다", () => {
  const onFinish = vi.fn<(results: readonly AnswerResult[], skippedCount: number) => void>();
  const meFirst: SentenceOrderQuestion = {
    ...turns,
    dialogue: {
      speakers: ["me", "me", "counterpart", "counterpart"],
      chipSpeakers: ["counterpart", "counterpart", "me", "me"],
    },
  };
  mount([meFirst, meFirst], onFinish);

  for (const index of meFirst.answerOrder) tapChip(index);
  tapAction();
  expect(screen.getByTestId("answer-verdict")).toHaveAttribute("data-result", "correct");
  tapAction();

  for (const index of [...meFirst.answerOrder].reverse()) tapChip(index);
  tapAction();
  expect(screen.getByTestId("answer-verdict")).toHaveAttribute("data-result", "incorrect");
  tapAction();
  tapAction();

  expect(onFinish).toHaveBeenCalledWith(["correct", "incorrect"], 0);
});

test("UD6. 대화 순서가 아닌 문항은 한 활동 안에서도 줄 배치로 서고 대화 칸이 없다", () => {
  mount([plain, turns]);

  expect(screen.getByTestId("sentence-order-screen-prompt")).toHaveTextContent(
    "Here's my passport.",
  );
  expect(screen.getByTestId("sentence-order-lines")).toBeInTheDocument();
  expect(screen.queryByTestId("sentence-order-screen-reply")).not.toBeInTheDocument();
  expect(screen.queryByTestId("sentence-order-dialogue-slot-0")).not.toBeInTheDocument();

  for (const index of plain.answerOrder)
    fireEvent.tap(screen.getByTestId(`sentence-order-chip-${index}`), {});
  tapAction();
  tapAction();

  expect(screen.getByTestId("sentence-order-dialogue-slot-0")).toBeInTheDocument();
  expect(screen.queryByTestId("sentence-order-lines")).not.toBeInTheDocument();
  expect(screen.queryByTestId("sentence-order-screen-prompt")).not.toBeInTheDocument();
});

// SO11 — 창고 대화 조각은 화자 톤 · 한글 + 뜻 줄 · 화자가 든 이름이고, 채점 뒤 창고는 접히며 칸 테두리가 판정을 낸다.
const classOf = (testId: string): string => screen.getByTestId(testId).getAttribute("class") ?? "";

test("SO11. 창고 조각은 화자별 클래스를 지고 한글 아래 영어 뜻 줄이 선다", () => {
  mount([turns]);

  expect(classOf("sentence-order-dialogue-chip-3")).toMatch(/(^|\s)\S*-counterpart(\s|$)/);
  expect(classOf("sentence-order-dialogue-chip-2")).toMatch(/(^|\s)\S*-me(\s|$)/);
  expect(classOf("sentence-order-dialogue-chip-0")).toMatch(/(^|\s)\S*-counterpart(\s|$)/);
  expect(classOf("sentence-order-dialogue-chip-1")).toMatch(/(^|\s)\S*-me(\s|$)/);
  expect(chip(3)).toHaveTextContent("네, 여권 좀 보여주세요.");
  expect(within(chip(3)).getByTestId("sentence-order-dialogue-chip-3-meaning")).toHaveTextContent(
    "Yes, please show me your passport.",
  );
});

test("SO11. 창고 조각의 이름은 화자 + 글 + 뜻이고 뜻이 없으면 글만 붙는다", () => {
  mount([turns]);
  const { dialogueLine } = uiCopyEn.sentenceOrder;

  expect(chip(2)).toHaveAttribute(
    "accessibility-label",
    "Your line: 여권 여기 있어요., Here is my passport.",
  );
  expect(chip(3)).toHaveAttribute(
    "accessibility-label",
    "Partner's line: 네, 여권 좀 보여주세요., Yes, please show me your passport.",
  );
  expect(dialogueLine.me("x")).toBe("Your line: x");
});

test("SO11. 뜻이 없는 문항의 조각은 뜻 줄 없이 `Partner's line: 글` 이름이다", () => {
  const withoutMeanings: SentenceOrderQuestion = { ...turns };
  delete (withoutMeanings as { chipMeanings?: unknown }).chipMeanings;
  mount([withoutMeanings]);

  expect(screen.queryByTestId("sentence-order-dialogue-chip-3-meaning")).not.toBeInTheDocument();
  expect(chip(3)).toHaveAttribute("accessibility-label", "Partner's line: 네, 여권 좀 보여주세요.");
});

test("SO11. 채점하면 창고가 접히고 칸 테두리가 판정 클래스를 진다", () => {
  mount([turns]);

  for (const index of turns.answerOrder) tapChip(index);
  tapAction();

  expect(screen.queryByTestId("sentence-order-dialogue-chip-0")).not.toBeInTheDocument();
  expect(screen.queryByTestId("sentence-order-dialogue-chip-3")).not.toBeInTheDocument();
  for (const position of [0, 1, 2, 3]) {
    expect(classOf(`sentence-order-dialogue-slot-${position}`)).toMatch(/(^|\s)\S*-correct(\s|$)/);
  }
});

test("SO11. 채점 뒤 칸은 색뿐 아니라 이름 접미사와 tick 아이콘으로 정오를 말한다", () => {
  mount([turns]);

  for (const index of turns.answerOrder) tapChip(index);
  tapAction();

  for (const position of [0, 1, 2, 3]) {
    expect(slot(position).getAttribute("accessibility-label")).toMatch(/, correct$/);
    expect(screen.getByTestId(`sentence-order-dialogue-slot-${position}-mark`)).toHaveAttribute(
      "data-result",
      "correct",
    );
  }
});

test("SO11. 틀린 칸은 이름 접미사 incorrect와 cross 아이콘을 지고, 채점 전에는 둘 다 없다", () => {
  mount([turns]);

  for (const index of [...turns.answerOrder].reverse()) tapChip(index);
  expect(screen.queryByTestId("sentence-order-dialogue-slot-0-mark")).not.toBeInTheDocument();
  expect(slot(0).getAttribute("accessibility-label")).not.toMatch(/correct$/);
  tapAction();

  const wrong = [0, 1, 2, 3].filter((position) =>
    slot(position).getAttribute("accessibility-label")?.endsWith(", incorrect"),
  );
  expect(wrong.length).toBeGreaterThan(0);
  for (const position of wrong) {
    expect(screen.getByTestId(`sentence-order-dialogue-slot-${position}-mark`)).toHaveAttribute(
      "data-result",
      "incorrect",
    );
  }
});

test("SO11. 틀린 순서로 채점하면 어긋난 칸이 incorrect 클래스를 진다", () => {
  mount([turns]);

  for (const index of [...turns.answerOrder].reverse()) tapChip(index);
  tapAction();

  const incorrect = [0, 1, 2, 3].filter((position) =>
    /(^|\s)\S*-incorrect(\s|$)/.test(classOf(`sentence-order-dialogue-slot-${position}`)),
  );
  expect(incorrect.length).toBeGreaterThan(0);
});
