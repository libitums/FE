import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import type { AnswerResult } from "../../lib/answer-result";
import { uiCopyEn } from "../../lib/ui-copy-en";
import { SentenceOrderActivity } from "./SentenceOrderScreen";
import { tapBottom } from "./sentence-order-check.test-support";
import type { SentenceOrderQuestion } from "./sentence-order-questions";

// `ui` 계층: 대화 조립(E-3) — 대화 순서 문항(`dialogue`)은 지시문 말풍선 없이 **고정된 첫 줄**이 0번 줄에 차 있고,
// 그 아래 정답 순서의 칸마다 화자가 말풍선으로 섭니다. 타일을 누르면 다음 빈 칸에 그 화자 모양으로 들어가되
// **화자가 같은 칸에만** 들어가고(내 조각은 상대 칸에, 상대 조각은 내 칸에 못 들어갑니다), 놓은 말풍선을 누르면
// 그 말풍선부터 뒤가 전부 되돌아갑니다. 고정된 첫 줄은 누를 수 없고 창고에도 없습니다. 채점은 기존 문장 순서와 같습니다.
// 문항은 계획 모듈이 내는 꼴로 손으로 세웠습니다. 칸의 화자는 문항 데이터(`dialogue.speakers`)에서 옵니다.

// 정답 대화: 0 네, 여권 좀 보여주세요.(고정) / 1 여권 여기 있어요. / 2 며칠 묵으시죠? / 3 일주일 묵어요.
// 창고 순서는 정답 순서가 아닙니다 — 칩 인덱스 2 · 0 · 1 순으로 놓아야 맞습니다.
const turns: SentenceOrderQuestion = {
  prompt: "대화 순서대로 놓으세요.",
  chips: ["며칠 묵으시죠?", "일주일 묵어요.", "여권 여기 있어요."],
  answerOrder: [2, 0, 1],
  instruction: "Put the conversation in order.",
  dialogue: {
    opening: { speaker: "counterpart", text: "네, 여권 좀 보여주세요." },
    speakers: ["me", "counterpart", "me"],
    chipSpeakers: ["counterpart", "me", "me"],
  },
  chipMeanings: ["How long are you staying?", "I am staying a week.", "Here is my passport."],
};

// 화자를 지키면서 틀리는 순서입니다 — 내 조각 둘(1 · 2)을 맞바꿉니다.
const wrongOrder = [1, 0, 2] as const;

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
const filledOf = (position: number) => slot(position).getAttribute("data-filled");

test("UD1. 지시문 말풍선이 없고 지시문은 셸 한 줄에만 있으며 첫 줄은 고정된 채 차 있고 그 아래 정답 길이만큼 빈 칸이 선다", () => {
  mount([turns]);

  expect(screen.queryByTestId("sentence-order-screen-prompt")).not.toBeInTheDocument();
  expect(screen.queryByTestId("sentence-order-screen-reply")).not.toBeInTheDocument();
  expect(screen.queryByTestId("sentence-order-screen-sentence")).not.toBeInTheDocument();
  expect(screen.queryByText("대화 순서대로 놓으세요.")).not.toBeInTheDocument();
  expect(screen.getByTestId("learning-shell-instruction")).toHaveTextContent(
    "Put the conversation in order.",
  );

  expect([0, 1, 2, 3].map(speakerOf)).toEqual(["counterpart", "me", "counterpart", "me"]);
  expect(slot(0)).toHaveAttribute("data-filled", "true");
  expect(slot(0)).toHaveAttribute("data-fixed", "true");
  expect(slot(0)).toHaveTextContent("네, 여권 좀 보여주세요.");
  for (const position of [1, 2, 3]) {
    expect(slot(position)).toHaveAttribute("data-filled", "false");
    expect(slot(position)).toHaveAttribute("data-fixed", "false");
  }
  expect(screen.queryByTestId("sentence-order-dialogue-slot-4")).not.toBeInTheDocument();
});

test("UF1. 고정된 첫 줄은 창고에 없고 눌러도 빠지지 않으며 버튼이 아니다", () => {
  mount([turns]);

  expect(
    screen.queryByText("네, 여권 좀 보여주세요.", {
      selector: ".sentence-order-dialogue-chip-text",
    }),
  ).not.toBeInTheDocument();
  expect(screen.queryByTestId("sentence-order-dialogue-chip-3")).not.toBeInTheDocument();
  expect(slot(0)).toHaveAttribute("accessibility-traits", "text");

  fireEvent.tap(slot(0), {});

  expect(slot(0)).toHaveAttribute("data-filled", "true");
  expect(slot(0)).toHaveTextContent("네, 여권 좀 보여주세요.");
  expect(screen.queryByTestId("sentence-order-bank-slot-3")).not.toBeInTheDocument();
});

test("UD2. 타일을 누르면 다음 빈 칸에 그 칸 화자 모양으로 들어가고 창고엔 빈 자리가 남는다", () => {
  mount([turns]);

  tapChip(2);
  expect(slot(1)).toHaveAttribute("data-filled", "true");
  expect(slot(1)).toHaveTextContent("여권 여기 있어요.");
  expect(speakerOf(1)).toBe("me");
  expect(slot(2)).toHaveAttribute("data-filled", "false");

  tapChip(0);
  expect(slot(2)).toHaveAttribute("data-filled", "true");
  expect(slot(2)).toHaveTextContent("며칠 묵으시죠?");
  expect(speakerOf(2)).toBe("counterpart");

  expect(screen.queryByTestId("sentence-order-dialogue-chip-2")).not.toBeInTheDocument();
  expect(screen.getByTestId("sentence-order-bank-slot-2")).toBeInTheDocument();
});

test("US1. 다음 빈 칸이 내 칸이면 상대 조각은 잠기고, 상대 칸이면 내 조각이 잠긴다 — 잠긴 조각은 눌러도 들어가지 않는다", () => {
  mount([turns]);

  // 1번 칸은 나 — 상대 조각(0)은 잠기고 내 조각(1 · 2)은 눌린다.
  expect(chip(0)).toHaveAttribute("accessibility-traits", "disabled");
  expect(chip(1)).toHaveAttribute("accessibility-traits", "button");
  expect(chip(2)).toHaveAttribute("accessibility-traits", "button");
  tapChip(0);
  expect(filledOf(1)).toBe("false");
  expect(chip(0)).toBeInTheDocument();

  // 내 조각을 놓으면 2번 칸(상대)이 다음이라 남은 내 조각(1)이 잠기고 상대 조각(0)이 열린다.
  tapChip(2);
  expect(chip(1)).toHaveAttribute("accessibility-traits", "disabled");
  expect(chip(0)).toHaveAttribute("accessibility-traits", "button");
  tapChip(1);
  expect(filledOf(2)).toBe("false");
  expect(speakerOf(2)).toBe("counterpart");

  tapChip(0);
  expect(filledOf(2)).toBe("true");
  expect(chip(1)).toHaveAttribute("accessibility-traits", "button");
});

test("UD3. 놓은 말풍선을 누르면 그 말풍선부터 뒤가 전부 창고로 되돌아간다", () => {
  mount([turns]);
  tapChip(2);
  tapChip(0);
  tapChip(1);
  expect([1, 2, 3].map(filledOf)).toEqual(["true", "true", "true"]);

  fireEvent.tap(slot(2), {});

  expect([1, 2, 3].map(filledOf)).toEqual(["true", "false", "false"]);
  expect(slot(1)).toHaveTextContent("여권 여기 있어요.");
  expect(chip(0)).toHaveTextContent("며칠 묵으시죠?");
  expect(chip(1)).toHaveTextContent("일주일 묵어요.");
  expect(screen.queryByTestId("sentence-order-bank-slot-0")).not.toBeInTheDocument();
  expect(screen.queryByTestId("sentence-order-bank-slot-1")).not.toBeInTheDocument();
  expect(screen.getByTestId("sentence-order-bank-slot-2")).toBeInTheDocument();
});

test("UD3. 마지막에 놓은 말풍선을 누르면 그 하나만 되돌아간다", () => {
  mount([turns]);
  tapChip(2);
  tapChip(0);

  fireEvent.tap(slot(2), {});

  expect([1, 2].map(filledOf)).toEqual(["true", "false"]);
  expect(chip(0)).toHaveTextContent("며칠 묵으시죠?");
});

test("UD4. 정답 순서로 놓고 확인하면 맞고, 순서가 다르면 틀리며, 채점 뒤엔 말풍선이 눌리지 않는다", () => {
  const onFinish = vi.fn<(results: readonly AnswerResult[], skippedCount: number) => void>();
  mount([turns, turns], onFinish);

  for (const index of turns.answerOrder) tapChip(index);
  tapAction();
  expect(screen.getByTestId("answer-verdict")).toHaveAttribute("data-result", "correct");
  expect(slot(1)).toHaveAttribute("accessibility-traits", "disabled");
  fireEvent.tap(slot(1), {});
  expect(slot(1)).toHaveAttribute("data-filled", "true");
  tapAction();

  for (const index of wrongOrder) tapChip(index);
  tapAction();
  expect(screen.getByTestId("answer-verdict")).toHaveAttribute("data-result", "incorrect");
  tapAction();
  tapAction();

  expect(onFinish).toHaveBeenCalledWith(["correct", "incorrect"], 0);
});

test("UD5. 말풍선은 화자와 순서를 낭독하고 빈 칸도 화자와 순서로 읽히며 고정된 첫 줄은 1번 턴이다", () => {
  mount([turns]);
  const { dialogueSpeaker, dialogueTurn, dialogueEmptyTurn } = uiCopyEn.sentenceOrder;

  expect(slot(0)).toHaveAttribute(
    "accessibility-label",
    dialogueTurn(dialogueSpeaker.counterpart, 1, "네, 여권 좀 보여주세요."),
  );
  expect(slot(1)).toHaveAttribute("accessibility-label", dialogueEmptyTurn(dialogueSpeaker.me, 2));
  tapChip(2);
  tapChip(0);

  expect(slot(1)).toHaveAttribute(
    "accessibility-label",
    dialogueTurn(dialogueSpeaker.me, 2, "여권 여기 있어요."),
  );
  expect(slot(2)).toHaveAttribute(
    "accessibility-label",
    dialogueTurn(dialogueSpeaker.counterpart, 3, "며칠 묵으시죠?"),
  );
  expect(slot(1)).toHaveAttribute("accessibility-traits", "button");
  expect(dialogueSpeaker).toEqual({ counterpart: "Partner", me: "You" });
});

test("USO1. 데이터가 나부터 말하게 하면 고정된 첫 줄이 나 모양이고 다음 빈 칸 낭독은 상대다", () => {
  const meFirst: SentenceOrderQuestion = {
    ...turns,
    dialogue: {
      opening: { speaker: "me", text: "네, 여권 좀 보여주세요." },
      speakers: ["counterpart", "me", "counterpart"],
      chipSpeakers: ["me", "counterpart", "counterpart"],
    },
  };
  mount([meFirst]);
  const { dialogueSpeaker, dialogueEmptyTurn } = uiCopyEn.sentenceOrder;

  expect([0, 1, 2, 3].map(speakerOf)).toEqual(["me", "counterpart", "me", "counterpart"]);
  expect(slot(0).getAttribute("class") ?? "").toContain("-bubble-me");
  expect(slot(1).getAttribute("class") ?? "").toContain("-bubble-counterpart");
  expect(slot(1)).toHaveAttribute(
    "accessibility-label",
    dialogueEmptyTurn(dialogueSpeaker.counterpart, 2),
  );

  tapChip(2);
  expect(speakerOf(1)).toBe("counterpart");
  expect(slot(1)).toHaveTextContent("여권 여기 있어요.");
});

test("USO3. 칸 수는 speakers 길이이고 같은 화자가 연이어 서는 칸도 데이터대로 선다", () => {
  const three: SentenceOrderQuestion = {
    prompt: "대화 순서대로 놓으세요.",
    chips: ["B", "C", "A"],
    answerOrder: [2, 0, 1],
    instruction: "Put the conversation in order.",
    dialogue: {
      opening: { speaker: "me", text: "O" },
      speakers: ["me", "me", "counterpart"],
      chipSpeakers: ["me", "counterpart", "me"],
    },
  };
  mount([three]);
  const { dialogueSpeaker, dialogueTurn, dialogueEmptyTurn } = uiCopyEn.sentenceOrder;

  expect([0, 1, 2, 3].map(speakerOf)).toEqual(["me", "me", "me", "counterpart"]);
  expect(slot(2)).toHaveAttribute("accessibility-label", dialogueEmptyTurn(dialogueSpeaker.me, 3));
  expect(screen.queryByTestId("sentence-order-dialogue-slot-4")).not.toBeInTheDocument();

  tapChip(2);
  tapChip(0);
  expect(slot(1)).toHaveTextContent("A");
  expect(slot(2)).toHaveTextContent("B");
  expect(speakerOf(2)).toBe("me");
  expect(slot(2).getAttribute("class") ?? "").toContain("-bubble-me");
  expect(slot(2)).toHaveAttribute("accessibility-label", dialogueTurn(dialogueSpeaker.me, 3, "B"));
  expect(slot(3)).toHaveAttribute("data-filled", "false");

  fireEvent.tap(slot(2), {});
  expect(slot(2)).toHaveAttribute("data-filled", "false");
  expect(chip(0)).toHaveTextContent("B");
});

test("USO4. 채점은 화자와 무관하게 answerOrder 기준이다 — 화자가 맞아도 순서가 다르면 틀린다", () => {
  const onFinish = vi.fn<(results: readonly AnswerResult[], skippedCount: number) => void>();
  const sameSpeakers: SentenceOrderQuestion = {
    ...turns,
    dialogue: {
      opening: { speaker: "counterpart", text: "네, 여권 좀 보여주세요." },
      speakers: ["me", "me", "counterpart"],
      chipSpeakers: ["me", "counterpart", "me"],
    },
  };
  mount([sameSpeakers, sameSpeakers], onFinish);

  for (const index of sameSpeakers.answerOrder) tapChip(index);
  tapAction();
  expect(screen.getByTestId("answer-verdict")).toHaveAttribute("data-result", "correct");
  tapAction();

  for (const index of [0, 2, 1]) tapChip(index);
  tapAction();
  expect(screen.getByTestId("answer-verdict")).toHaveAttribute("data-result", "incorrect");
  tapAction();
  tapAction();

  expect(onFinish).toHaveBeenCalledWith(["correct", "incorrect"], 0);
});

test("USO5. 조각 화자가 없는 문항은 화자를 가리지 않고 칸이 남는 동안 어느 조각이든 들어간다", () => {
  const unspoken: SentenceOrderQuestion = {
    ...turns,
    dialogue: {
      opening: { speaker: "counterpart", text: "네, 여권 좀 보여주세요." },
      speakers: ["me", "counterpart", "me"],
    },
  };
  mount([unspoken]);

  for (const index of [0, 1, 2])
    expect(chip(index)).toHaveAttribute("accessibility-traits", "button");
  tapChip(0);
  expect(filledOf(1)).toBe("true");
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

  expect(classOf("sentence-order-dialogue-chip-0")).toMatch(/(^|\s)\S*-counterpart(\s|$)/);
  expect(classOf("sentence-order-dialogue-chip-1")).toMatch(/(^|\s)\S*-me(\s|$)/);
  expect(classOf("sentence-order-dialogue-chip-2")).toMatch(/(^|\s)\S*-me(\s|$)/);
  expect(chip(0)).toHaveTextContent("며칠 묵으시죠?");
  expect(within(chip(0)).getByTestId("sentence-order-dialogue-chip-0-meaning")).toHaveTextContent(
    "How long are you staying?",
  );
});

test("SO11. 창고 조각의 이름은 화자 + 글 + 뜻이고 뜻이 없으면 글만 붙는다", () => {
  mount([turns]);
  const { dialogueLine } = uiCopyEn.sentenceOrder;

  expect(chip(2)).toHaveAttribute(
    "accessibility-label",
    "Your line: 여권 여기 있어요., Here is my passport.",
  );
  expect(chip(0)).toHaveAttribute(
    "accessibility-label",
    "Partner's line: 며칠 묵으시죠?, How long are you staying?",
  );
  expect(dialogueLine.me("x")).toBe("Your line: x");
});

test("SO11. 뜻이 없는 문항의 조각은 뜻 줄 없이 `Partner's line: 글` 이름이다", () => {
  const withoutMeanings: SentenceOrderQuestion = { ...turns };
  delete (withoutMeanings as { chipMeanings?: unknown }).chipMeanings;
  mount([withoutMeanings]);

  expect(screen.queryByTestId("sentence-order-dialogue-chip-0-meaning")).not.toBeInTheDocument();
  expect(chip(0)).toHaveAttribute("accessibility-label", "Partner's line: 며칠 묵으시죠?");
});

test("SO11. 채점하면 창고가 접히고 칸 테두리가 판정 클래스를 지며 고정된 첫 줄은 판정을 받지 않는다", () => {
  mount([turns]);

  for (const index of turns.answerOrder) tapChip(index);
  tapAction();

  expect(screen.queryByTestId("sentence-order-dialogue-chip-0")).not.toBeInTheDocument();
  expect(screen.queryByTestId("sentence-order-dialogue-chip-2")).not.toBeInTheDocument();
  for (const position of [1, 2, 3]) {
    expect(classOf(`sentence-order-dialogue-slot-${position}`)).toMatch(/(^|\s)\S*-correct(\s|$)/);
  }
  expect(classOf("sentence-order-dialogue-slot-0")).not.toMatch(/-correct|-incorrect/);
  expect(screen.queryByTestId("sentence-order-dialogue-slot-0-mark")).not.toBeInTheDocument();
  expect(slot(0).getAttribute("accessibility-label")).not.toMatch(/correct$/);
});

test("SO11. 채점 뒤 칸은 색뿐 아니라 이름 접미사와 tick 아이콘으로 정오를 말한다", () => {
  mount([turns]);

  for (const index of turns.answerOrder) tapChip(index);
  tapAction();

  for (const position of [1, 2, 3]) {
    expect(slot(position).getAttribute("accessibility-label")).toMatch(/, correct$/);
    expect(screen.getByTestId(`sentence-order-dialogue-slot-${position}-mark`)).toHaveAttribute(
      "data-result",
      "correct",
    );
  }
});

test("SO11. 틀린 칸은 이름 접미사 incorrect와 cross 아이콘을 지고, 채점 전에는 둘 다 없다", () => {
  mount([turns]);

  for (const index of wrongOrder) tapChip(index);
  expect(screen.queryByTestId("sentence-order-dialogue-slot-1-mark")).not.toBeInTheDocument();
  expect(slot(1).getAttribute("accessibility-label")).not.toMatch(/correct$/);
  tapAction();

  const wrong = [1, 2, 3].filter((position) =>
    slot(position).getAttribute("accessibility-label")?.endsWith(", incorrect"),
  );
  expect(wrong).toEqual([1, 3]);
  for (const position of wrong) {
    expect(screen.getByTestId(`sentence-order-dialogue-slot-${position}-mark`)).toHaveAttribute(
      "data-result",
      "incorrect",
    );
  }
});

test("SO11. 틀린 순서로 채점하면 어긋난 칸이 incorrect 클래스를 진다", () => {
  mount([turns]);

  for (const index of wrongOrder) tapChip(index);
  tapAction();

  const incorrect = [1, 2, 3].filter((position) =>
    /(^|\s)\S*-incorrect(\s|$)/.test(classOf(`sentence-order-dialogue-slot-${position}`)),
  );
  expect(incorrect).toEqual([1, 3]);
});
