import { describe, expect, it } from "vitest";

import { uiCopyEn } from "../../lib/ui-copy-en";
import { choiceResultAt, judgeWordChoice, wordChoiceSessionResults } from "./word-choice";
import type { WordChoiceQuestion, WordChoiceSessionState } from "./word-choice";
import {
  canAnswerWordChoice,
  wordChoicePictureAnswerOf,
  wordChoicePictureLabel,
  wordChoicePictureStateAfter,
  wordChoicePictureTimeoutMs,
} from "./word-choice-picture";
import type { WordChoicePictureState } from "./word-choice-picture";

// `unit` 계층: 그림 제시의 로드 전이 · 답 가능 여부 · 라벨 · 이름표 값만 봅니다.

const pictureQuestion: WordChoiceQuestion = {
  prompt: "water",
  choices: ["카드", "현금", "물", "영수증"],
  answerIndex: 2,
  instruction: "Which word matches the picture?",
  picture: { url: "https://cdn/images/u01-water/s1-05.jpg", answerRomanization: "mul" },
};

const plainQuestion: WordChoiceQuestion = {
  prompt: "오늘 ___에 갑니다.",
  choices: ["학교", "가방"],
  answerIndex: 0,
};

const states: readonly WordChoicePictureState[] = ["loading", "loaded", "failed"];

describe("wordChoicePictureStateAfter", () => {
  it.each([
    ["loading", "load", "loaded"],
    ["loading", "error", "failed"],
    ["loading", "timeout", "failed"],
    ["loaded", "load", "loaded"],
    ["loaded", "error", "loaded"],
    ["loaded", "timeout", "loaded"],
    ["failed", "load", "failed"],
    ["failed", "error", "failed"],
    ["failed", "timeout", "failed"],
  ] as const)("WP1. %s + %s → %s (끝 상태는 되살리지 않는다)", (state, event, expected) => {
    expect(wordChoicePictureStateAfter(state, event)).toBe(expected);
  });
});

describe("wordChoicePictureTimeoutMs", () => {
  it("WP2. 6초다", () => {
    expect(wordChoicePictureTimeoutMs).toBe(6000);
  });
});

describe("canAnswerWordChoice", () => {
  it("WP3. 그림 문항만 로딩 중에 답을 받지 않는다", () => {
    expect(states.map((state) => canAnswerWordChoice(plainQuestion, state))).toEqual([
      true,
      true,
      true,
    ]);
    expect(states.map((state) => canAnswerWordChoice(pictureQuestion, state))).toEqual([
      false,
      true,
      true,
    ]);
  });
});

describe("wordChoicePictureAnswerOf", () => {
  it("WP4. 그림 문항이면 정답 낱말과 로마자를, 아니면 null을 낸다", () => {
    expect(wordChoicePictureAnswerOf(pictureQuestion)).toEqual({ word: "물", romanization: "mul" });
    expect(
      wordChoicePictureAnswerOf({
        ...pictureQuestion,
        picture: { url: "https://cdn/a.jpg", answerRomanization: null },
      }),
    ).toEqual({ word: "물", romanization: null });
    expect(wordChoicePictureAnswerOf(plainQuestion)).toBeNull();
    expect(wordChoicePictureAnswerOf({ ...pictureQuestion, answerIndex: 9 })).toBeNull();
  });
});

describe("wordChoicePictureLabel", () => {
  it("WP-A1. 그림 틀의 이름이 상태를 따르고 영어 뜻만 담는다", () => {
    expect(wordChoicePictureLabel("water", "loading", uiCopyEn)).toBe("Picture, loading");
    expect(wordChoicePictureLabel("water", "loaded", uiCopyEn)).toBe("Picture: water");
    expect(wordChoicePictureLabel("water", "failed", uiCopyEn)).toBe(
      "Picture unavailable. Meaning: water",
    );
  });

  it("WP-A2. 틀 이름 어디에도 한글이 없고 이름표 문구는 낱말 · 로마자 · 뜻 순이다", () => {
    for (const state of states) {
      expect(wordChoicePictureLabel("water", state, uiCopyEn)).not.toMatch(/[가-힣]/);
    }
    expect(uiCopyEn.wordChoicePicture.answer("물", "mul", "water")).toBe("Answer: 물, mul, water");
    expect(uiCopyEn.wordChoicePicture.answer("물", null, "water")).toBe("Answer: 물, water");
  });
});

describe("그림 문항은 단어 선택의 판정을 그대로 쓴다", () => {
  it("WP5. 타입 단언 없이 판정 · 이력 · 보기 결과 함수에 들어가고 answerIndex대로 판정된다", () => {
    const state: WordChoiceSessionState = {
      questionIndex: 0,
      selectedChoiceIndex: 2,
      answeredChoiceIndexes: [2],
    };

    expect(judgeWordChoice(pictureQuestion, 2)).toBe("correct");
    expect(judgeWordChoice(pictureQuestion, 0)).toBe("incorrect");
    expect(wordChoiceSessionResults([pictureQuestion, plainQuestion], [2, 1])).toEqual([
      "correct",
      "incorrect",
    ]);
    expect(choiceResultAt(state, pictureQuestion, 2)).toBe("correct");
    expect(choiceResultAt(state, pictureQuestion, 1)).toBeNull();
  });
});
