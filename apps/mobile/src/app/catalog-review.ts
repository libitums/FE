// 카탈로그 레슨의 「틀린 문제 다시 풀기」(사용자 결정 2026-10-23)의 순수 규칙입니다 — 활동 결과에서 틀린 문항을 골라
// 줄을 세우고, 다시 푼 결과로 줄을 넘깁니다. 판정 · 기록 · 이벤트는 첫 시도 결과만 쓰므로 여기는 그것을 모릅니다.
//
// 줄의 규칙: 맞히면 고친 것으로 빠지고, 또 틀리면 줄 맨 뒤로 갑니다 — 맞힐 때까지 뒤로 쌓입니다. 다시 풀 때
// 건너뛰면(말하기를 못 씀) 막히지 않게 줄에서 뺍니다(고친 수에 셉니다).

import type { AnswerResult } from "../lib/answer-result";
import type { NonEmpty } from "../lib/non-empty";
import type { CatalogActivity } from "./catalog-lesson-types";

/** 다시 풀 문항 하나 — 레슨 계획의 몇 번째 활동의 몇 번째 문항인가입니다(둘 다 0부터). */
export type CatalogReviewItem = {
  readonly activityIndex: number;
  readonly questionIndex: number;
};

/** 다시 풀기 국면의 상태입니다. 줄의 머리가 지금 화면의 문항입니다. */
export type CatalogReview = {
  readonly queue: NonEmpty<CatalogReviewItem>;
  /** 고쳐서(또는 건너뛰어) 줄에서 빠진 수입니다. */
  readonly fixedCount: number;
  /** 다시 풀기를 시작할 때의 틀린 문항 수입니다 — 「Let’s fix n mistakes」의 n입니다. */
  readonly initialCount: number;
  /** 지금까지 보인 다시 풀기 화면 수입니다(0부터) — 화면 열쇠 · 중복 finish 표식 · 카운터가 씁니다. */
  readonly attempt: number;
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

/** 틀린 문항이 있으면 다시 풀기를 시작하고, 없으면 `null`입니다. */
export function catalogReviewOf(mistakes: readonly CatalogReviewItem[]): CatalogReview | null {
  const [first, ...rest] = mistakes;
  if (first === undefined) return null;
  return { queue: [first, ...rest], fixedCount: 0, initialCount: mistakes.length, attempt: 0 };
}

/**
 * 머리 문항을 다시 푼 결과로 다음 상태를 냅니다. 맞힘 · 건너뜀(`null`)은 줄에서 빼고, 틀림은 맨 뒤로 보냅니다.
 * 줄이 비면 `null` — 다시 풀기가 끝났습니다.
 */
export function nextCatalogReview(
  review: CatalogReview,
  result: AnswerResult | null,
): CatalogReview | null {
  const [head, ...rest] = review.queue;
  const queue = result === "incorrect" ? [...rest, head] : rest;
  const [first, ...others] = queue;
  if (first === undefined) return null;
  return {
    queue: [first, ...others],
    fixedCount: result === "incorrect" ? review.fixedCount : review.fixedCount + 1,
    initialCount: review.initialCount,
    attempt: review.attempt + 1,
  };
}

/** 세션 헤더의 다시 풀기 카운터입니다 — `Review ordinal / total`과 막대 채움(고친 몫)입니다. */
export type CatalogReviewCounter = {
  readonly ordinal: number;
  readonly total: number;
  readonly fixedCount: number;
};

/**
 * 카운터 규칙: 순번은 지금까지 보인 다시 풀기 화면의 순번(`attempt + 1`)이고, 전체는 이미 보인 화면 수 + 남은 줄
 * 길이(`attempt + queue.length`)입니다. 맞히면 전체가 그대로 순번만 오르고, 또 틀려 뒤로 가면 풀어야 할 화면이
 * 하나 늘어 전체도 함께 오릅니다. 막대는 고친 몫(`fixedCount / total`)입니다.
 */
export function catalogReviewCounterOf(review: CatalogReview): CatalogReviewCounter {
  return {
    ordinal: review.attempt + 1,
    total: review.attempt + review.queue.length,
    fixedCount: review.fixedCount,
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
