import { describe, expect, test } from "vitest";

import type { AnswerResult } from "../lib/answer-result";
import {
  catalogMistakesOf,
  catalogReviewActivityOf,
  catalogReviewCounterOf,
  catalogReviewOf,
  nextCatalogReview,
} from "./catalog-review";
import type { CatalogReview, CatalogReviewItem } from "./catalog-review";
import type { CatalogActivity } from "./catalog-lesson-types";

// `unit` 계층: 틀린 문항 고르기(결과 → 문항 자리) · 줄 넘기기(맞힘 빠짐 · 틀림 뒤로) · 카운터 규칙만 봅니다.

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

describe("catalogReviewOf · nextCatalogReview — 줄", () => {
  test("RV5. 틀린 문항이 없으면 다시 풀기가 없다", () => {
    expect(catalogReviewOf([])).toBeNull();
  });

  test("RV6. 시작: 레슨 순서 그대로 줄을 세우고 처음 수를 적는다", () => {
    expect(catalogReviewOf([item(0, 1), item(2, 0)])).toEqual({
      queue: [item(0, 1), item(2, 0)],
      fixedCount: 0,
      initialCount: 2,
      attempt: 0,
    });
  });

  test("RV7. 맞히면 빠지고, 또 틀리면 맨 뒤로 가 맞힐 때까지 돌아온다", () => {
    const start = catalogReviewOf([item(0, 1), item(2, 0), item(3, 2)]) as CatalogReview;

    const wrong = nextCatalogReview(start, incorrect) as CatalogReview;
    expect(wrong.queue).toEqual([item(2, 0), item(3, 2), item(0, 1)]);
    expect(wrong.fixedCount).toBe(0);
    expect(wrong.attempt).toBe(1);

    const right = nextCatalogReview(wrong, correct) as CatalogReview;
    expect(right.queue).toEqual([item(3, 2), item(0, 1)]);
    expect(right.fixedCount).toBe(1);
    expect(right.initialCount).toBe(3);
    expect(right.attempt).toBe(2);
  });

  test("RV8. 하나 남은 문항을 또 틀리면 같은 문항이 다시 서고, 맞히면 끝난다", () => {
    const last = catalogReviewOf([item(1, 0)]) as CatalogReview;
    const again = nextCatalogReview(last, incorrect) as CatalogReview;
    expect(again.queue).toEqual([item(1, 0)]);
    expect(again.attempt).toBe(1);
    expect(nextCatalogReview(again, correct)).toBeNull();
  });

  test("RV9. 다시 풀 때 건너뛰면(null) 막히지 않게 줄에서 뺀다", () => {
    const start = catalogReviewOf([item(4, 0), item(4, 1)]) as CatalogReview;
    const skipped = nextCatalogReview(start, null) as CatalogReview;
    expect(skipped.queue).toEqual([item(4, 1)]);
    expect(skipped.fixedCount).toBe(1);
    expect(nextCatalogReview(skipped, null)).toBeNull();
  });
});

describe("catalogReviewCounterOf — Review i / k", () => {
  test("RV10. 순번은 보인 화면 순번, 전체는 보인 수 + 남은 줄 — 틀려 뒤로 가면 전체가 는다", () => {
    const start = catalogReviewOf([item(0, 0), item(0, 1)]) as CatalogReview;
    expect(catalogReviewCounterOf(start)).toEqual({ ordinal: 1, total: 2, fixedCount: 0 });

    const wrong = nextCatalogReview(start, incorrect) as CatalogReview;
    expect(catalogReviewCounterOf(wrong)).toEqual({ ordinal: 2, total: 3, fixedCount: 0 });

    const right = nextCatalogReview(wrong, correct) as CatalogReview;
    expect(catalogReviewCounterOf(right)).toEqual({ ordinal: 3, total: 3, fixedCount: 1 });
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
