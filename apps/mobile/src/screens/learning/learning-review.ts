// 틀린 문제 다시 풀기(2026-10-23) 동안 학습 껍데기가 받는 값입니다 — 세션 헤더의 `Review i / k` · 시작 배지 ·
// 맞혔을 때의 「Fixed it!」 판. 활동 화면은 다시 풀기를 모릅니다: 카탈로그 결선이 활동을 이 context로 감싸고,
// 껍데기만 읽습니다. Provider가 없으면 `null`이라 지금 동작 그대로입니다.

import { createContext, useContext } from "@lynx-js/react";
import type { Context } from "@lynx-js/react";

import type { AnswerResult } from "../../lib/answer-result";
import type { LearningActivityForm } from "../../lib/learning-form";
import type { UiCopy } from "../../lib/ui-copy.contract";
import type { LearningSessionHeader } from "./learning-shell.contract";
import { learningSessionHeader } from "./learning-shell.contract";
import type { LearningShellFeedback } from "./learning-shell-props";

export type LearningReview = {
  /** 지금 화면의 다시 풀기 순번(1부터)입니다. */
  readonly ordinal: number;
  /** 지금까지 보인 화면 수 + 남은 줄 길이입니다 — 또 틀려 뒤로 가면 늡니다. */
  readonly total: number;
  /** 고쳐서 줄에서 빠진 수입니다 — 막대 채움입니다. */
  readonly fixedCount: number;
  /** 다시 풀기 첫 화면이면 처음 틀린 수(시작 배지의 n), 아니면 `null`입니다. */
  readonly introCount: number | null;
};

export const LearningReviewContext: Context<LearningReview | null> =
  createContext<LearningReview | null>(null);

export function useLearningReview(): LearningReview | null {
  return useContext(LearningReviewContext);
}

/**
 * 다시 풀기 동안의 세션 헤더 값입니다. 순번 줄은 `Review i / k`, 학습형 이름표에는 `· try again` 꼬리가 붙고,
 * 막대는 고친 몫(`fixedCount / total`)입니다 — 아직 아무것도 못 고쳤으면 0이라 채움이 서지 않습니다.
 */
export function learningReviewHeader(
  form: LearningActivityForm,
  review: LearningReview,
  copy: UiCopy,
  formLabelOverride?: string,
): LearningSessionHeader {
  const base = learningSessionHeader(form, 0, 1, copy, formLabelOverride);
  const total = Math.max(1, review.total);
  const ordinal = Math.min(Math.max(1, review.ordinal), total);
  const fixed = Math.min(Math.max(0, review.fixedCount), total);
  return {
    progressLabel: copy.learningShell.review.progress(ordinal, total),
    formLabel: `${base.formLabel}${copy.learningShell.review.formSuffix}`,
    fillPercent: (fixed / total) * 100,
    accessibilityLabel: copy.learningShell.review.headerOf(base.formLabel, ordinal, total),
  };
}

export type LearningReviewAnswer = {
  readonly complete: boolean;
  /** 껍데기의 판정 배지 값입니다. */
  readonly verdict: AnswerResult | undefined;
  /** 배지 없이 카드 안에서 판정을 그리는 활동(자판 · 짝 잇기)이 주는 판정입니다. */
  readonly result: AnswerResult | undefined;
  /** 해설 판입니다(문화 확인) — 면의 판정이 곧 답의 판정입니다. */
  readonly feedback: LearningShellFeedback | undefined;
};

/**
 * 다시 푼 문항을 맞혀 「Fixed it!」 판을 세워야 하면 그 판을, 아니면 `null`입니다. 다시 풀기가 아니거나 아직 답하지
 * 않았거나 또 틀렸으면 `null` — 틀린 답의 판정은 지금 모습 그대로입니다.
 */
export function learningReviewFixedFeedback(
  review: LearningReview | null,
  answer: LearningReviewAnswer,
  copy: UiCopy,
): LearningShellFeedback | null {
  if (review === null || answer.complete) return null;
  const judged = answer.verdict ?? answer.result ?? answer.feedback?.tone;
  if (judged !== "correct") return null;
  return { tone: "correct", title: copy.learningShell.review.fixed, lines: [] };
}
