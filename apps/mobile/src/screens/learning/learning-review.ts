// 틀린 문제 다시 풀기(ADR-0058 ⟨2026-10-30⟩) 동안 학습 껍데기가 받는 값입니다 — 세션 헤더의 `Review i / n` · 칩 ·
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
  /** 처음 틀린 수입니다 — 한 번씩만 풀어 바뀌지 않습니다. */
  readonly total: number;
  /** 고친 수입니다 — 막대 채움입니다. */
  readonly fixedCount: number;
  /** 통과까지 더 맞혀야 하는 수입니다 — 0이면 칩이 「Pass unlocked」입니다. */
  readonly remainingToPass: number;
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

/**
 * 다시 도전에서 판정이 서면 세우는 아래 판입니다 — 맞히면 초록 `Fixed it!`, 또 틀리면 빨강 `Not quite`(학습형이 해설 판을
 * 주면 그 제목 · 줄을 씁니다). 판정은 배지(`verdict`) · 카드 안 판정(`result`, 자판 · 짝 잇기) · 해설 판의 면 중 먼저 선 것입니다.
 * 다시 도전이 아니거나 끝났거나 아직 답하지 않았으면 `null` — 평소 모습 그대로입니다.
 */
export function learningReviewPanel(
  review: LearningReview | null,
  answer: {
    readonly complete: boolean;
    readonly verdict: AnswerResult | undefined;
    readonly result: AnswerResult | undefined;
    readonly feedback: LearningShellFeedback | undefined;
  },
  copy: UiCopy,
): LearningShellFeedback | null {
  if (review === null || answer.complete) return null;
  const judged = answer.verdict ?? answer.result ?? answer.feedback?.tone;
  if (judged === undefined) return null;
  const words = copy.learningShell.review;
  // 판은 제자리에 섭니다(`steady`) — 미끄러져 올라오며 판 안 Continue까지 움직이지 않게 합니다(사용자 지적).
  if (judged === "correct") {
    return {
      tone: "correct",
      title: words.fixed,
      lines: answer.feedback?.lines ?? [],
      steady: true,
    };
  }
  return answer.feedback?.tone === "incorrect"
    ? { ...answer.feedback, steady: true }
    : {
        tone: "incorrect",
        title: words.missed,
        lines: [{ text: words.missedLine, lang: "en" }],
        steady: true,
      };
}

/** 헤더 칩의 글과 상태입니다 — 남은 필요 수가 있으면 「n more to pass」, 없으면 「Pass unlocked」입니다. */
export function learningReviewChip(
  review: LearningReview,
  copy: UiCopy,
): { readonly label: string; readonly unlocked: boolean } {
  const unlocked = review.remainingToPass <= 0;
  return {
    label: unlocked
      ? copy.learningShell.review.unlocked
      : copy.learningShell.review.remaining(review.remainingToPass),
    unlocked,
  };
}
