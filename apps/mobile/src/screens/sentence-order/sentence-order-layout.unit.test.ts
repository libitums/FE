import { describe, expect, test } from "vitest";

import { uiCopyEn } from "../../lib/ui-copy-en";
import {
  initialSentenceOrderSessionState,
  sentenceOrderSessionReducer,
  type SentenceOrderSessionState,
} from "./sentence-order";
import {
  canPlaceDialogueChip,
  dialogueChipAccessibilityLabel,
  dialogueChipInteractionOf,
  sentenceOrderBottomActionOf,
  sentenceOrderLayoutOf,
  sentenceOrderPlacedResultsOf,
  sentenceOrderReadingShown,
} from "./sentence-order-layout";
import type { SentenceOrderQuestion } from "./sentence-order-questions";

// `unit` 계층: 문장 순서 화면의 배치 · 아래 버튼 · 읽기 줄 · 줄 위 판정을 정하는 순수 함수의 입출력만 봅니다.

// u00 S7 모양 — 조각 다섯 중 앞 셋이 정답입니다.
const linesQuestion: SentenceOrderQuestion = {
  prompt: "듣고 문장을 만드세요.",
  chips: ["안녕하세요!", "한국은", "처음이세요?", "잘하시네요!", "감사합니다!"],
  answerOrder: [0, 1, 2],
  reading: {
    romanization: "annyeonghaseyo! hangugeun cheoeumiseyo?",
    shown: "always",
  },
};

// u00 S11 모양 — 대화 조립입니다.
const dialogueQuestion: SentenceOrderQuestion = {
  prompt: "대화 순서대로 놓으세요.",
  chips: ["진짜요? 감사합니다!", "지금부터요!", "언제부터 공부하셨어요?"],
  answerOrder: [0, 2, 1],
  dialogue: {
    opening: { speaker: "counterpart", text: "오, 한국어 잘하시네요!" },
    speakers: ["me", "counterpart", "me"],
    chipSpeakers: ["me", "me", "counterpart"],
  },
  chipMeanings: ["Really? Thank you!", "Starting now!", "How long?"],
};

function arranging(placed: readonly number[]): SentenceOrderSessionState {
  return { ...initialSentenceOrderSessionState, placedChipIndexes: placed };
}

function checked(placed: readonly number[]): SentenceOrderSessionState {
  return { ...arranging(placed), phase: "checked", submittedOrders: [placed] };
}

describe("sentenceOrderLayoutOf (SO1)", () => {
  test("dialogue가 있으면 dialogue, 없으면 lines다", () => {
    expect(sentenceOrderLayoutOf(dialogueQuestion)).toBe("dialogue");
    expect(sentenceOrderLayoutOf(linesQuestion)).toBe("lines");
  });
});

describe("sentenceOrderBottomActionOf (SO2, SO3)", () => {
  test("SO2: lines — 놓은 조각이 없으면 Check는 서되 꺼져 있다", () => {
    expect(sentenceOrderBottomActionOf(linesQuestion, arranging([]))).toEqual({
      kind: "check",
      availability: "disabled",
    });
  });

  test("SO2: lines — 하나라도 놓으면 Check가 켜진다", () => {
    expect(sentenceOrderBottomActionOf(linesQuestion, arranging([3]))).toEqual({
      kind: "check",
      availability: "enabled",
    });
    expect(sentenceOrderBottomActionOf(linesQuestion, arranging([0, 1]))).toEqual({
      kind: "check",
      availability: "enabled",
    });
  });

  test("SO2: lines — 정답 길이만큼 놓아도 저절로 채점되지 않고 Check로만 채점된다", () => {
    const afterToggles = [0, 1, 2].reduce(
      (state, chipIndex) => sentenceOrderSessionReducer(state, { type: "toggleChip", chipIndex }),
      initialSentenceOrderSessionState,
    );

    expect(afterToggles.phase).toBe("arranging");
    expect(afterToggles.submittedOrders).toEqual([]);
    expect(sentenceOrderBottomActionOf(linesQuestion, afterToggles)).toEqual({
      kind: "check",
      availability: "enabled",
    });
  });

  test("SO2: lines — 채점 뒤는 next, 완료(문항 없음)는 results다", () => {
    expect(sentenceOrderBottomActionOf(linesQuestion, checked([0, 1, 2]))).toEqual({
      kind: "next",
    });
    expect(sentenceOrderBottomActionOf(null, arranging([]))).toEqual({ kind: "results" });
  });

  test("SO3: dialogue — 덜 차면 버튼이 없고, 다 차면 Check가 켜지고, 채점 뒤는 next다", () => {
    expect(sentenceOrderBottomActionOf(dialogueQuestion, arranging([]))).toEqual({ kind: "none" });
    expect(sentenceOrderBottomActionOf(dialogueQuestion, arranging([0, 2]))).toEqual({
      kind: "none",
    });
    expect(sentenceOrderBottomActionOf(dialogueQuestion, arranging([0, 2, 1]))).toEqual({
      kind: "check",
      availability: "enabled",
    });
    expect(sentenceOrderBottomActionOf(dialogueQuestion, checked([0, 2, 1]))).toEqual({
      kind: "next",
    });
  });
});

describe("canPlaceDialogueChip · dialogueChipInteractionOf (SO7)", () => {
  test("다음 빈 칸의 화자와 같은 조각만 놓을 수 있다 — 첫 칸(나)엔 내 조각 0 · 1만", () => {
    expect(canPlaceDialogueChip(dialogueQuestion, arranging([]), 0)).toBe(true);
    expect(canPlaceDialogueChip(dialogueQuestion, arranging([]), 1)).toBe(true);
    expect(canPlaceDialogueChip(dialogueQuestion, arranging([]), 2)).toBe(false);
  });

  test("내 조각을 놓으면 다음 칸은 상대라 상대 조각 2만 열리고 내 조각 1은 잠긴다", () => {
    expect(canPlaceDialogueChip(dialogueQuestion, arranging([0]), 2)).toBe(true);
    expect(canPlaceDialogueChip(dialogueQuestion, arranging([0]), 1)).toBe(false);
    expect(dialogueChipInteractionOf(dialogueQuestion, arranging([0]), 2)).toBe("tappable");
    expect(dialogueChipInteractionOf(dialogueQuestion, arranging([0]), 1)).toBe("locked");
  });

  test("칸이 다 찼거나 채점 뒤면 화자가 맞아도 잠긴다", () => {
    expect(canPlaceDialogueChip(dialogueQuestion, arranging([0, 2, 1]), 0)).toBe(false);
    expect(canPlaceDialogueChip(dialogueQuestion, checked([0, 2]), 1)).toBe(false);
    expect(dialogueChipInteractionOf(dialogueQuestion, checked([0, 2]), 1)).toBe("locked");
  });

  test("조각 화자가 없는 문항과 줄 배치 문항은 화자를 가리지 않는다", () => {
    const unspoken: SentenceOrderQuestion = {
      ...dialogueQuestion,
      dialogue: {
        opening: { speaker: "counterpart", text: "오, 한국어 잘하시네요!" },
        speakers: ["me", "counterpart", "me"],
      },
    };

    expect(canPlaceDialogueChip(unspoken, arranging([]), 2)).toBe(true);
    expect(canPlaceDialogueChip(linesQuestion, arranging([]), 4)).toBe(true);
    expect(canPlaceDialogueChip(linesQuestion, arranging([0, 1, 2]), 4)).toBe(false);
  });
});

describe("sentenceOrderReadingShown (SO4)", () => {
  test("always는 놓는 중에도 로마자를 낸다", () => {
    const reading = { romanization: "annyeonghaseyo!", shown: "always" } as const;

    expect(sentenceOrderReadingShown(reading, "arranging")).toBe("annyeonghaseyo!");
    expect(sentenceOrderReadingShown(reading, "checked")).toBe("annyeonghaseyo!");
  });

  test("after-check는 놓는 중에는 null, 채점 뒤에만 로마자를 낸다", () => {
    const reading = { romanization: "annyeonghaseyo!", shown: "after-check" } as const;

    expect(sentenceOrderReadingShown(reading, "arranging")).toBeNull();
    expect(sentenceOrderReadingShown(reading, "checked")).toBe("annyeonghaseyo!");
  });

  test("읽기 줄이 없으면 null이다", () => {
    expect(sentenceOrderReadingShown(undefined, "arranging")).toBeNull();
    expect(sentenceOrderReadingShown(undefined, "checked")).toBeNull();
  });
});

describe("sentenceOrderPlacedResultsOf (SO5)", () => {
  test("자리마다 정답 조각이면 correct, 아니면 incorrect다", () => {
    expect(sentenceOrderPlacedResultsOf(linesQuestion, [0, 1, 2])).toEqual([
      "correct",
      "correct",
      "correct",
    ]);
    expect(sentenceOrderPlacedResultsOf(linesQuestion, [0, 2, 1])).toEqual([
      "correct",
      "incorrect",
      "incorrect",
    ]);
    expect(sentenceOrderPlacedResultsOf(linesQuestion, [4, 1, 3])).toEqual([
      "incorrect",
      "correct",
      "incorrect",
    ]);
  });

  test("덜 놓은 판은 놓은 자리만 판정하고 나머지는 null이다", () => {
    const results = sentenceOrderPlacedResultsOf(linesQuestion, [0, 4]);

    expect(results.slice(0, 2)).toEqual(["correct", "incorrect"]);
    expect(results.slice(2).every((result) => result === null)).toBe(true);
  });
});

describe("dialogueChipAccessibilityLabel (SO6)", () => {
  test("내 말은 Your line, 상대 말은 Partner's line이고 뜻이 있으면 뒤에 붙는다", () => {
    expect(
      dialogueChipAccessibilityLabel("me", "진짜요? 감사합니다!", "Really? Thank you!", uiCopyEn),
    ).toBe("Your line: 진짜요? 감사합니다!, Really? Thank you!");
    expect(
      dialogueChipAccessibilityLabel(
        "counterpart",
        "오, 한국어 잘하시네요!",
        "Oh, nice!",
        uiCopyEn,
      ),
    ).toBe("Partner's line: 오, 한국어 잘하시네요!, Oh, nice!");
  });

  test("뜻이 없으면 화자와 글만이다", () => {
    expect(dialogueChipAccessibilityLabel("counterpart", "지금부터요!", undefined, uiCopyEn)).toBe(
      "Partner's line: 지금부터요!",
    );
  });
});
