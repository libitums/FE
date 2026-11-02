import { describe, expect, test } from "vitest";

import type { AnswerResult } from "../lib/answer-result";
import {
  catalogMistakesOf,
  catalogReviewActivityOf,
  catalogReviewCounterOf,
  catalogReviewedResults,
  catalogReviewOf,
  catalogReviewRemainingToPass,
  catalogReviewStep,
  catalogReviewSummaryOf,
} from "./catalog-review";
import type { CatalogReview, CatalogReviewItem } from "./catalog-review";
import type { CatalogActivity } from "./catalog-lesson-types";

// `unit` 계층: 틀린 문항 고르기(결과 → 문항 자리) · 여는 조건(미통과 · 고치면 통과 가능) · 한 번씩 넘기기 · 판정 · 카운터 규칙만 봅니다.

const correct: AnswerResult = "correct";
const incorrect: AnswerResult = "incorrect";
const item = (activityIndex: number, questionIndex: number): CatalogReviewItem => ({
  activityIndex,
  questionIndex,
});

describe("catalogMistakesOf — 결과를 문항 자리로", () => {
  test("RV1. 결과는 문항 순서대로 대응하고 틀린 자리만 고른다", () => {
    expect(catalogMistakesOf(2, 4, [correct, incorrect, correct, incorrect])).toEqual([
      item(2, 1),
      item(2, 3),
    ]);
  });

  test("RV2. 다 맞히거나 결과가 없으면(카드 · 읽기) 고를 것이 없다", () => {
    expect(catalogMistakesOf(0, 3, [correct, correct, correct])).toEqual([]);
    expect(catalogMistakesOf(0, 5, [])).toEqual([]);
  });

  test("RV3. 건너뛴 문항은 결과가 없으므로 그 자리를 비우고 맞춘다", () => {
    // 문항 0 · 2를 건너뛰면 결과 둘은 문항 1 · 3의 것입니다.
    expect(catalogMistakesOf(1, 4, [incorrect, incorrect], [0, 2])).toEqual([
      item(1, 1),
      item(1, 3),
    ]);
    expect(catalogMistakesOf(1, 3, [correct, incorrect], [1])).toEqual([item(1, 2)]);
  });

  test("RV4. 결과가 문항보다 많아도 없는 자리는 고르지 않는다", () => {
    expect(catalogMistakesOf(0, 1, [correct, incorrect])).toEqual([]);
  });
});

describe("catalogReviewOf — 여는 조건(틀린 문항이 있으면 늘)", () => {
  // 채점 7개 → 기준 5개(60% 올림).
  const criterion = { minCorrectCount: 5 };
  const first: AnswerResult[] = [
    correct,
    incorrect,
    correct,
    incorrect,
    correct,
    incorrect,
    correct,
  ];
  const mistakes = [item(0, 1), item(1, 0), item(2, 2)];

  test("RV5. 미통과이고 다 고치면 넘길 수 있으면 줄 머리 문항부터 연다", () => {
    expect(catalogReviewOf(mistakes, first, criterion)).toEqual({
      queue: mistakes,
      outcomes: [],
      neededToPass: 1,
    });
  });

  test("RV6. 이미 통과여도 틀린 문항이 있으면 연다 — 남은 필요 수는 0이다", () => {
    expect(
      catalogReviewOf(
        [item(0, 1)],
        [correct, correct, correct, correct, correct, incorrect],
        criterion,
      ),
    ).toEqual({ queue: [item(0, 1)], outcomes: [], neededToPass: 0 });
  });

  test("RV7. 다 고쳐도 기준에 못 닿아도 연다 · 틀린 문항이 없으면 열지 않는다", () => {
    // 맞힘 2 + 틀림 2(나머지는 건너뜀) → 다 고쳐도 4 < 5지만 다시 도전은 합니다.
    expect(
      catalogReviewOf([item(0, 0), item(0, 1)], [correct, correct, incorrect, incorrect], criterion)
        ?.neededToPass,
    ).toBe(3);
    expect(catalogReviewOf([], [correct], criterion)).toBeNull();
  });
});

describe("catalogReviewStep — 한 번씩", () => {
  const intro: CatalogReview = {
    queue: [item(0, 1), item(1, 0), item(2, 2)],
    outcomes: [],
    neededToPass: 1,
  };

  test("RV9. 맞히면 고침, 틀리면 놓침 — 어느 쪽이든 줄에서 빠지고 뒤로 가지 않는다", () => {
    const started = intro;
    const afterFix = catalogReviewStep(started, correct);
    expect(afterFix.outcomes).toEqual(["fixed"]);
    expect(afterFix.next?.queue).toEqual([item(1, 0), item(2, 2)]);
    const afterMiss = catalogReviewStep(afterFix.next as CatalogReview, incorrect);
    expect(afterMiss.outcomes).toEqual(["fixed", "missed"]);
    expect(afterMiss.next?.queue).toEqual([item(2, 2)]);
  });

  test("RV10. 건너뜀(null)은 놓침이고, 마지막 문항이면 next가 null이다", () => {
    const last: CatalogReview = {
      ...intro,
      queue: [item(2, 2)],
      outcomes: ["fixed", "missed"],
    };
    expect(catalogReviewStep(last, null)).toEqual({
      outcomes: ["fixed", "missed", "missed"],
      next: null,
    });
  });
});

describe("판정 · 요약 · 카운터", () => {
  test("RV13. 남은 필요 수는 고친 수를 빼고 0 아래로 내려가지 않는다", () => {
    expect(catalogReviewRemainingToPass(2, [])).toBe(2);
    expect(catalogReviewRemainingToPass(2, ["fixed", "missed"])).toBe(1);
    expect(catalogReviewRemainingToPass(1, ["fixed", "fixed"])).toBe(0);
  });

  test("RV14. 고친 수만큼 앞에서부터 오답을 정답으로 친다", () => {
    expect(
      catalogReviewedResults(
        [incorrect, correct, incorrect, incorrect],
        ["missed", "fixed", "fixed"],
      ),
    ).toEqual([correct, correct, correct, incorrect]);
    expect(catalogReviewedResults([incorrect, correct], [])).toEqual([incorrect, correct]);
  });

  test("RV15. 요약은 푼 결과와 남은 필요 수 — 아무것도 안 풀었으면 null", () => {
    expect(catalogReviewSummaryOf(1, ["fixed", "missed"])).toEqual({
      outcomes: ["fixed", "missed"],
      remainingToPass: 0,
    });
    expect(catalogReviewSummaryOf(2, ["missed"])).toEqual({
      outcomes: ["missed"],
      remainingToPass: 2,
    });
    expect(catalogReviewSummaryOf(1, [])).toBeNull();
  });

  test("RV16. 카운터 — 순번은 지금 화면, 전체는 처음 틀린 수(바뀌지 않음), 막대는 고친 수, 칩은 남은 필요 수", () => {
    const review: CatalogReview = {
      queue: [item(1, 0), item(2, 2)],
      outcomes: ["fixed"],
      neededToPass: 2,
    };
    expect(catalogReviewCounterOf(review)).toEqual({
      ordinal: 2,
      total: 3,
      fixedCount: 1,
      remainingToPass: 1,
    });
  });
});

describe("catalogReviewActivityOf — 문항 하나짜리 활동", () => {
  const activity: CatalogActivity = {
    form: "word-choice",
    questions: [
      { prompt: "a", choices: ["x", "y"], answerIndex: 0 },
      { prompt: "b", choices: ["x", "y"], answerIndex: 1 },
    ],
  } as CatalogActivity;

  test("RV11. 같은 학습형에 그 문항 하나만 남긴다", () => {
    const single = catalogReviewActivityOf(activity, 1);
    expect(single?.form).toBe("word-choice");
    expect(single?.questions).toEqual([activity.questions[1]]);
  });

  test("RV12. 없는 문항이면 null", () => {
    expect(catalogReviewActivityOf(activity, 5)).toBeNull();
  });
});
