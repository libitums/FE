import { describe, expect, it } from "vitest";

import { uiCopyEn } from "../../lib/ui-copy-en";
import type { LessonPosition } from "../learning/activity-finish";
import type { VocabCardSessionState } from "./vocab-card.contract";
import {
  initialVocabCardSessionState,
  vocabCardExampleSupportLabel,
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

describe("vocabCardExampleSupportLabel", () => {
  it("VC-A1. 로마자와 번역을 있는 것만 이 순서로 공백 하나로 잇고 둘 다 없으면 null이다", () => {
    expect(
      vocabCardExampleSupportLabel(
        {
          text: "아니요, 괜찮아요.",
          romanization: "aniyo, gwaenchanayo.",
          translation: "No, I'm fine.",
        },
        uiCopyEn,
      ),
    ).toBe("Pronunciation: aniyo, gwaenchanayo. Meaning: No, I'm fine.");
    expect(
      vocabCardExampleSupportLabel(
        { text: "물 주세요.", romanization: "mul juseyo.", translation: null },
        uiCopyEn,
      ),
    ).toBe("Pronunciation: mul juseyo.");
    expect(
      vocabCardExampleSupportLabel(
        { text: "물 주세요.", romanization: null, translation: "Water, please." },
        uiCopyEn,
      ),
    ).toBe("Meaning: Water, please.");
    expect(
      vocabCardExampleSupportLabel(
        { text: "물 주세요.", romanization: null, translation: null },
        uiCopyEn,
      ),
    ).toBeNull();
  });
});
