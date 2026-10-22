import { describe, expect, test } from "vitest";

import { bundledCatalogInput } from "../../lib/episode-bundled";
import { uiCopyEn } from "../../lib/ui-copy-en";
import {
  cultureFeedbackAnnouncement,
  cultureFeedbackOf,
  wordChoiceAfterAnswerOf,
  wordChoiceOptionsStateOf,
  wordChoiceQuestionDensityOf,
} from "./word-choice-follow-up";
import type { WordChoiceSessionState } from "./word-choice";
import type { CultureExplanation, CultureScene, WordChoiceQuestion } from "./word-choice-questions";

// `unit` 계층: 단어 선택 · 문화 확인이 답한 뒤 이어지는 방식을 고르는 순수 함수의 입출력만 봅니다.

type Wire = {
  readonly steps: readonly {
    readonly id: string;
    readonly items: readonly {
      readonly feedback?: { readonly correct: { ko: string; en: string } };
    }[];
  }[];
};

const u00 = bundledCatalogInput.episodes["u00-tutorial"] as unknown as Wire;
const s13 = u00.steps.find((step) => step.id === "S13")?.items[0]?.feedback?.correct;
// u00 S13 실데이터의 해설입니다.
const explanation: CultureExplanation = { en: s13?.en, ko: s13?.ko };

const scene: CultureScene = {
  imageUrl: "https://cdn.example/cult.webp",
  line: {
    ko: "한국어 잘하시네요!",
    romanization: "hangugeo jalhasineyo!",
    meaning: "Your Korean is so good!",
  },
};

const choices: WordChoiceQuestion["choices"] = ["잘 먹겠습니다!", "안녕하세요!", "감사합니다!"];

function cultureQuestion(
  culture: WordChoiceQuestion["culture"],
  extra: Partial<WordChoiceQuestion> = {},
): WordChoiceQuestion {
  return { prompt: "질문", choices, answerIndex: 2, culture, ...extra };
}

const sceneQuestion = cultureQuestion({ scene, explanation });
const cardQuestion = cultureQuestion({ scene: null, explanation });
const plainQuestion: WordChoiceQuestion = { prompt: "질문", choices, answerIndex: 2 };

const open: WordChoiceSessionState = {
  questionIndex: 0,
  selectedChoiceIndex: null,
  answeredChoiceIndexes: [],
};

function answered(index: number): WordChoiceSessionState {
  return { questionIndex: 0, selectedChoiceIndex: index, answeredChoiceIndexes: [index] };
}

describe("wordChoiceAfterAnswerOf (CC1)", () => {
  test("문화 확인이면 해설 판을 기다리고 아니면 저절로 넘긴다", () => {
    expect(wordChoiceAfterAnswerOf(sceneQuestion)).toBe("explain");
    expect(wordChoiceAfterAnswerOf(cardQuestion)).toBe("explain");
    expect(wordChoiceAfterAnswerOf(plainQuestion)).toBe("advance");
  });
});

describe("cultureFeedbackOf (CC2 ~ CC4)", () => {
  test("CC2: 장면 문항 정답 — 제목과 영어, 한국어 해설 줄", () => {
    expect(s13?.en).toBeTruthy();
    expect(cultureFeedbackOf(sceneQuestion, "correct", uiCopyEn)).toEqual({
      tone: "correct",
      title: "Nice reply!",
      lines: [
        { text: explanation.en, lang: "en" },
        { text: explanation.ko, lang: "ko" },
      ],
    });
  });

  test("CC2: 질문 카드 문항 정답 — 제목이 That's right!", () => {
    expect(cultureFeedbackOf(cardQuestion, "correct", uiCopyEn)?.title).toBe("That's right!");
  });

  test("CC3: 오답은 tone incorrect, 제목 Not quite, 같은 해설 줄이다", () => {
    const scened = cultureFeedbackOf(sceneQuestion, "incorrect", uiCopyEn);
    const carded = cultureFeedbackOf(cardQuestion, "incorrect", uiCopyEn);

    expect(scened).toMatchObject({ tone: "incorrect", title: "Not quite" });
    expect(carded).toMatchObject({ tone: "incorrect", title: "Not quite" });
    expect(scened?.lines).toEqual([
      { text: explanation.en, lang: "en" },
      { text: explanation.ko, lang: "ko" },
    ]);
  });

  test("CC3: 해설이 한쪽뿐이면 있는 줄만, 둘 다 없으면 빈 줄이다", () => {
    const enOnly = cultureQuestion({ scene: null, explanation: { en: "Say thanks." } });
    const koOnly = cultureQuestion({ scene: null, explanation: { ko: "고맙다고 해요." } });
    const none = cultureQuestion({ scene: null, explanation: {} });

    expect(cultureFeedbackOf(enOnly, "correct", uiCopyEn)?.lines).toEqual([
      { text: "Say thanks.", lang: "en" },
    ]);
    expect(cultureFeedbackOf(koOnly, "correct", uiCopyEn)?.lines).toEqual([
      { text: "고맙다고 해요.", lang: "ko" },
    ]);
    expect(cultureFeedbackOf(none, "correct", uiCopyEn)?.lines).toEqual([]);
  });

  test("CC4: 문화 확인이 아니면 undefined다", () => {
    expect(cultureFeedbackOf(plainQuestion, "correct", uiCopyEn)).toBeUndefined();
  });
});

describe("cultureFeedbackAnnouncement (CC5)", () => {
  test("제목 + 첫 영어 줄이다", () => {
    const feedback = cultureFeedbackOf(sceneQuestion, "correct", uiCopyEn);
    expect(feedback).toBeDefined();
    if (feedback === undefined) return;

    expect(cultureFeedbackAnnouncement(feedback)).toBe(`Nice reply!. ${explanation.en}`);
  });

  test("영어 줄이 없으면 제목만이다", () => {
    expect(
      cultureFeedbackAnnouncement({
        tone: "correct",
        title: "Nice reply!",
        lines: [{ text: "고맙다고 해요.", lang: "ko" }],
      }),
    ).toBe("Nice reply!");
    expect(cultureFeedbackAnnouncement({ tone: "incorrect", title: "Not quite", lines: [] })).toBe(
      "Not quite",
    );
  });
});

describe("wordChoiceOptionsStateOf (CC6)", () => {
  const picture = { url: "https://cdn.example/a.webp", answerRomanization: null };
  const pictureQuestion: WordChoiceQuestion = { ...plainQuestion, picture };

  test("그림을 기다리는 동안은 waiting이다", () => {
    expect(wordChoiceOptionsStateOf(pictureQuestion, open, "loading")).toEqual({ kind: "waiting" });
    expect(wordChoiceOptionsStateOf(pictureQuestion, open, "loaded")).toEqual({ kind: "open" });
  });

  test("답 전은 open이다", () => {
    expect(wordChoiceOptionsStateOf(plainQuestion, open, "loaded")).toEqual({ kind: "open" });
    expect(wordChoiceOptionsStateOf(sceneQuestion, open, "loaded")).toEqual({ kind: "open" });
  });

  test("답한 뒤 저절로 넘기는 문항은 나머지를 비활성으로 둔다", () => {
    expect(wordChoiceOptionsStateOf(plainQuestion, answered(0), "loaded")).toEqual({
      kind: "judged",
      index: 0,
      result: "incorrect",
      rest: "disabled",
    });
    expect(wordChoiceOptionsStateOf(plainQuestion, answered(2), "loaded")).toEqual({
      kind: "judged",
      index: 2,
      result: "correct",
      rest: "disabled",
    });
  });

  test("답한 뒤 해설 판을 세우는 문항은 나머지를 접는다", () => {
    expect(wordChoiceOptionsStateOf(sceneQuestion, answered(1), "loaded")).toEqual({
      kind: "judged",
      index: 1,
      result: "incorrect",
      rest: "collapsed",
    });
  });
});

describe("wordChoiceQuestionDensityOf (CC7)", () => {
  const withLine = (ko: string): WordChoiceQuestion =>
    cultureQuestion({ scene: { imageUrl: null, line: { ko } }, explanation: {} });

  test("장면 대사가 25자 이상이면 compact다", () => {
    expect(wordChoiceQuestionDensityOf("regular", withLine("가".repeat(25)))).toBe("compact");
  });

  test("24자 이하이거나 장면이 없으면 기기 밀도 그대로다", () => {
    expect(wordChoiceQuestionDensityOf("regular", withLine("가".repeat(24)))).toBe("regular");
    expect(wordChoiceQuestionDensityOf("regular", cardQuestion)).toBe("regular");
    expect(wordChoiceQuestionDensityOf("regular", plainQuestion)).toBe("regular");
    expect(wordChoiceQuestionDensityOf("compact", plainQuestion)).toBe("compact");
  });
});
