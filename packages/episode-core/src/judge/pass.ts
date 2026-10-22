// 통과 기준과 묶음 판정입니다(순수).

import type { AnswerResult } from "./answer-result";

/** 통과에 필요한 정답 수입니다. */
export type PassCriterion = { readonly minCorrectCount: number };
export type PassVerdict = "passed" | "failed";

/** 통과 = 채점 문항의 60% 올림(최소 1)을 맞힘입니다. 채점할 문항이 없으면 0 — 막지 않습니다. */
export function catalogPassCriterion(questionCount: number): PassCriterion {
  if (questionCount <= 0) return { minCorrectCount: 0 };
  return { minCorrectCount: Math.max(1, Math.floor((3 * questionCount + 4) / 5)) };
}

// 맞은 개수는 이 함수 안에서만 삽니다 — export하지 않습니다. 던지지 않습니다 —
// 빈 배열도 total이고 맞은 개수 0으로 판정됩니다.
export function judgeAssessment(
  results: readonly AnswerResult[],
  criterion: PassCriterion,
): PassVerdict {
  const correctCount = results.filter((result) => result === "correct").length;
  return correctCount >= criterion.minCorrectCount ? "passed" : "failed";
}
