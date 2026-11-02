// 카탈로그 레슨의 「틀린 문제 다시 풀기」 순수 규칙입니다(ADR-0058 적용 기록 ⟨2026-10-30⟩). 일반 학습에서 틀린 문항을 결과
// 전에 한 번씩 다시 풀게 합니다 — 고친 수만큼 첫 결과의 오답을 정답으로 쳐 다시 판정하므로 미통과도 그 자리에서 넘길 수 있습니다.
//
// 줄의 규칙: 틀린 문항을 레슨 순서대로 **한 번씩**만 풉니다. 맞히면 「고침」, 또 틀리거나 건너뛰면(말하기를 못 씀) 「놓침」이고
// 어느 쪽이든 줄에서 빠집니다 — 맞힐 때까지 되풀이하지 않습니다.

import type { AnswerResult } from "../lib/answer-result";
import type { NonEmpty } from "../lib/non-empty";
import type { AssessmentPassCriterion as PassCriterion } from "../screens/assessment/assessment";
import type { CatalogActivity } from "./catalog-lesson-types";

/** 다시 풀 문항 하나 — 레슨 계획의 몇 번째 활동의 몇 번째 문항인가입니다(둘 다 0부터). */
export type CatalogReviewItem = {
  readonly activityIndex: number;
  readonly questionIndex: number;
};

/** 다시 푼 문항 하나의 결과입니다. */
export type CatalogReviewOutcome = "fixed" | "missed";

/** 다시 풀기 국면의 상태입니다. 줄의 머리가 지금 화면의 문항입니다. */
export type CatalogReview = {
  readonly queue: NonEmpty<CatalogReviewItem>;
  /** 지금까지 푼 문항의 결과입니다(푼 순서) — 길이가 곧 보인 다시 풀기 화면 수입니다. */
  readonly outcomes: readonly CatalogReviewOutcome[];
  /** 다시 풀기를 시작할 때 통과까지 더 맞혀야 했던 수입니다 — 이미 통과였으면 0입니다. */
  readonly neededToPass: number;
};

/** 결과 화면에 싣는 다시 풀기 요약입니다. */
export type CatalogReviewSummary = {
  readonly outcomes: NonEmpty<CatalogReviewOutcome>;
  /** 다 풀고도 통과까지 모자란 수입니다 — 통과면 0입니다. */
  readonly remainingToPass: number;
};

/** 세션 헤더의 다시 풀기 카운터입니다 — `Review ordinal / total` · 막대(고친 몫) · 칩(남은 필요 수)입니다. */
export type CatalogReviewCounter = {
  readonly ordinal: number;
  readonly total: number;
  readonly fixedCount: number;
  readonly remainingToPass: number;
};

/**
 * 활동 하나의 결과에서 틀린 문항을 레슨 순서대로 고릅니다. 결과는 답한 문항 순서대로 오고, 건너뛴 문항
 * (`skippedIndexes` — 말하기를 못 써 넘긴 낱말)은 결과가 없으므로 그 자리를 비우고 맞춥니다. 카드처럼 채점하지
 * 않는 활동은 결과가 비어 아무것도 고르지 않습니다.
 */
export function catalogMistakesOf(
  activityIndex: number,
  questionCount: number,
  results: readonly AnswerResult[],
  skippedIndexes: readonly number[] = [],
): readonly CatalogReviewItem[] {
  const answered: number[] = [];
  for (let index = 0; index < questionCount; index += 1) {
    if (!skippedIndexes.includes(index)) answered.push(index);
  }
  const mistakes: CatalogReviewItem[] = [];
  results.forEach((result, order) => {
    const questionIndex = answered[order];
    if (result === "incorrect" && questionIndex !== undefined) {
      mistakes.push({ activityIndex, questionIndex });
    }
  });
  return mistakes;
}

/**
 * 다시 풀기를 엽니다 — 틀린 채점 문항이 하나라도 있으면 통과 · 미통과와 관계없이 엽니다(사용자 결정 2026-10-30: 일반 학습 →
 * 다시 도전 → 결과). 틀린 문항이 없으면 `null`입니다.
 */
export function catalogReviewOf(
  mistakes: readonly CatalogReviewItem[],
  results: readonly AnswerResult[],
  criterion: PassCriterion,
): CatalogReview | null {
  const correctCount = results.filter((result) => result === "correct").length;
  const neededToPass = Math.max(0, criterion.minCorrectCount - correctCount);
  const [first, ...rest] = mistakes;
  if (first === undefined) return null;
  return { queue: [first, ...rest], outcomes: [], neededToPass };
}

/**
 * 머리 문항을 다시 푼 결과로 한 걸음 갑니다. 결과가 `null`이면 건너뜀입니다(놓침으로 칩니다).
 * `next`가 `null`이면 줄이 비었습니다 — `outcomes`로 판정합니다.
 */
export function catalogReviewStep(
  review: CatalogReview,
  result: AnswerResult | null,
): { readonly outcomes: readonly CatalogReviewOutcome[]; readonly next: CatalogReview | null } {
  const outcomes: readonly CatalogReviewOutcome[] = [
    ...review.outcomes,
    result === "correct" ? "fixed" : "missed",
  ];
  const [, first, ...rest] = review.queue;
  if (first === undefined) return { outcomes, next: null };
  return { outcomes, next: { ...review, queue: [first, ...rest], outcomes } };
}

function fixedCountOf(outcomes: readonly CatalogReviewOutcome[]): number {
  return outcomes.filter((outcome) => outcome === "fixed").length;
}

/** 통과까지 더 맞혀야 하는 수입니다 — 고친 수를 뺀 값이고 0 아래로 내려가지 않습니다. */
export function catalogReviewRemainingToPass(
  neededToPass: number,
  outcomes: readonly CatalogReviewOutcome[],
): number {
  return Math.max(0, neededToPass - fixedCountOf(outcomes));
}

/** 첫 결과에서 고친 수만큼 앞에서부터 오답을 정답으로 바꾼 결과입니다 — 판정 · 기록 · 이벤트가 씁니다. */
export function catalogReviewedResults(
  results: readonly AnswerResult[],
  outcomes: readonly CatalogReviewOutcome[],
): readonly AnswerResult[] {
  let fixed = fixedCountOf(outcomes);
  return results.map((result) => {
    if (result !== "incorrect" || fixed === 0) return result;
    fixed -= 1;
    return "correct";
  });
}

/** 결과 화면 요약입니다. 아무것도 풀지 않았으면 `null`입니다. */
export function catalogReviewSummaryOf(
  neededToPass: number,
  outcomes: readonly CatalogReviewOutcome[],
): CatalogReviewSummary | null {
  const [first, ...rest] = outcomes;
  if (first === undefined) return null;
  return {
    outcomes: [first, ...rest],
    remainingToPass: catalogReviewRemainingToPass(neededToPass, outcomes),
  };
}

/**
 * 카운터 규칙: 순번은 지금 화면의 순번(`outcomes.length + 1`), 전체는 처음 틀린 수(푼 수 + 남은 줄)라 바뀌지 않습니다.
 * 막대는 고친 몫, 칩은 남은 필요 수입니다.
 */
export function catalogReviewCounterOf(review: CatalogReview): CatalogReviewCounter {
  const { outcomes, queue, neededToPass } = review;
  return {
    ordinal: outcomes.length + 1,
    total: outcomes.length + queue.length,
    fixedCount: fixedCountOf(outcomes),
    remainingToPass: catalogReviewRemainingToPass(neededToPass, outcomes),
  };
}

/** 활동에서 문항 하나만 남긴 활동입니다 — 다시 풀 문항을 원래 학습형 화면 그대로 세웁니다. 없는 문항이면 `null`. */
export function catalogReviewActivityOf(
  activity: CatalogActivity,
  questionIndex: number,
): CatalogActivity | null {
  const question = activity.questions[questionIndex];
  if (question === undefined) return null;
  // 학습형 꼬리표와 문항의 짝은 원래 활동에서 그대로 옵니다 — 펼침이 그 짝을 좁히지 못해 단언합니다.
  return { ...activity, questions: [question] } as CatalogActivity;
}
