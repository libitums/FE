import { describe, expect, it } from "vitest";

import { uiCopyEn } from "../../lib/ui-copy-en";
import type { LessonPosition } from "../learning/activity-finish";
import type { VocabCardSessionState } from "./vocab-card.contract";
import {
  initialVocabCardSessionState,
  vocabCardRunProgress,
  vocabCardSessionReducer,
  vocabCardStepOf,
} from "./vocab-card";

// `unit` 계층: 단어 카드의 순수 함수 입출력만 봅니다. DOM · 컴포넌트를 import하지 않습니다.

describe("vocabCardSessionReducer", () => {
  it("VC1. nextCard마다 cardIndex가 하나씩 늘고 입력 상태는 바뀌지 않는다", () => {
    const start = Object.freeze({ ...initialVocabCardSessionState });

    const first = vocabCardSessionReducer(start, { type: "nextCard" });
    const second = vocabCardSessionReducer(first, { type: "nextCard" });

    expect(start.cardIndex).toBe(0);
    expect(first.cardIndex).toBe(1);
    expect(second.cardIndex).toBe(2);
    expect(initialVocabCardSessionState).toEqual<VocabCardSessionState>({ cardIndex: 0 });
  });
});

describe("vocabCardStepOf", () => {
  const middle: LessonPosition = { offset: 3, total: 12, last: false };
  const final: LessonPosition = { offset: 10, total: 12, last: true };

  it.each([
    ["레슨 밖의 첫 카드", undefined, 0, 3, "advance"],
    ["레슨 밖의 마지막 카드", undefined, 2, 3, "finish"],
    ["레슨 중간 활동의 첫 카드", middle, 1, 3, "advance"],
    ["레슨 중간 활동의 마지막 카드", middle, 2, 3, "hand-off"],
    ["레슨 끝 활동의 마지막 카드", final, 2, 3, "finish"],
    ["레슨 밖의 한 장짜리", undefined, 0, 1, "finish"],
    ["레슨 중간의 카드 0장", middle, 0, 0, "hand-off"],
    ["레슨 밖의 카드 0장", undefined, 0, 0, "finish"],
  ] as const)("VC2. %s", (_name, lesson, cardIndex, total, expected) => {
    expect(vocabCardStepOf(lesson, cardIndex, total)).toBe(expected);
  });
});

describe("vocabCardRunProgress", () => {
  it.each([
    [0, 3, ["current", "upcoming", "upcoming"], "Word 1 of 3"],
    [1, 3, ["done", "current", "upcoming"], "Word 2 of 3"],
    [3, 7, ["done", "done", "done", "current", "upcoming", "upcoming", "upcoming"], "Word 4 of 7"],
    [0, 1, ["current"], "Word 1 of 1"],
  ] as const)(
    "VC3. %i번째(0부터) / %i장 → 지난 칸은 done · 지금은 current · 남은 칸은 upcoming이고 이름은 순번이다",
    (cardIndex, total, segments, label) => {
      expect(vocabCardRunProgress(cardIndex, total, uiCopyEn)).toEqual({ segments, label });
    },
  );

  it("VC3. 카드가 0장이면 칸도 이름도 없다 — 셀 것이 없는데 Word 1 of 0을 적지 않는다", () => {
    expect(vocabCardRunProgress(0, 0, uiCopyEn)).toEqual({ segments: [], label: "" });
  });
});
