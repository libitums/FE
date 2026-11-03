// 카탈로그 레슨의 활동 잇기 · 틀린 문제 다시 풀기 · 판정입니다. `catalog-lesson-wiring.ts`가 커서 떼어 둔 것이고,
// 시작 가드 · 세션 비움 · 기록 · 결과 이동 같은 공용 걸음은 그쪽이 만들어 넘깁니다.
//
// ⟨2026-10-30⟩ 레슨의 순서는 늘 「일반 학습 → 틀린 문항 다시 도전 → 결과」입니다(사용자 결정). 마지막 활동 뒤 틀린 채점
// 문항이 있으면 결과 화면 대신 곧바로 그 문항들을 원래 학습형 화면에 한 번씩 세우고, 다 풀면 고친 수만큼 오답을 정답으로
// 쳐서 판정 · 기록 · 이벤트 · 결과 화면을 냅니다(`catalog-review.ts`). 틀린 문항이 없으면 곧바로 결과입니다.

import type { Dispatch, SetStateAction } from "@lynx-js/react";

import type { AnswerResult } from "../lib/answer-result";
import type { CatalogUnitKey } from "../lib/catalog-progress";
import { assessmentCompletesStep, judgeAssessment } from "../screens/assessment/assessment";
import type { EpisodeIntroEventSink } from "../screens/episode-intro/episode-intro.contract";
import { lessonFinishedEventOf } from "./catalog-events";
import { catalogJudgedCountOf, catalogPassCriterion } from "./catalog-lesson-plan";
import type { CatalogLessonPlan } from "./catalog-lesson-types";
import {
  catalogMistakesOf,
  catalogReviewedResults,
  catalogReviewOf,
  catalogReviewStep,
  catalogReviewSummaryOf,
} from "./catalog-review";
import type { CatalogReview, CatalogReviewItem, CatalogReviewSummary } from "./catalog-review";
import type { NavAction } from "./nav-state";

export type CatalogLessonFinish = {
  readonly onFinishCatalogActivity: (
    episodeId: string,
    unitKey: CatalogUnitKey,
    activityIndex: number,
    results: readonly AnswerResult[],
    skippedCount: number,
    skippedIndexes?: readonly number[],
  ) => void;
  /** 다시 풀기 화면(문항 하나)이 끝났을 때입니다. `review`는 그 화면이 선 때의 상태입니다. */
  readonly onFinishCatalogReview: (
    episodeId: string,
    unitKey: CatalogUnitKey,
    review: CatalogReview,
    results: readonly AnswerResult[],
  ) => void;
};

export type CatalogLessonFinishDeps = {
  readonly planOf: (episodeId: string, unitKey: CatalogUnitKey) => CatalogLessonPlan | null;
  readonly dispatch: Dispatch<NavAction>;
  readonly sink: EpisodeIntroEventSink;
  readonly pendingResults: readonly AnswerResult[];
  readonly setPendingResults: Dispatch<SetStateAction<readonly AnswerResult[]>>;
  readonly pendingSkippedCount: number;
  readonly setPendingSkippedCount: Dispatch<SetStateAction<number>>;
  readonly pendingMistakes: readonly CatalogReviewItem[];
  readonly setPendingMistakes: Dispatch<SetStateAction<readonly CatalogReviewItem[]>>;
  /** 같은 표식의 두 번째 finish면 false입니다(연타 · 낡은 결선). */
  readonly claimFinish: (mark: string) => boolean;
  readonly clearSession: () => void;
  readonly markDone: (episodeId: string, unitKey: CatalogUnitKey) => void;
  readonly showComplete: (
    episodeId: string,
    unitKey: CatalogUnitKey,
    results: readonly AnswerResult[],
    skippedCount: number,
    questionCount: number,
    review?: CatalogReviewSummary,
  ) => void;
};

export function catalogLessonFinish(deps: CatalogLessonFinishDeps): CatalogLessonFinish {
  const { planOf, dispatch, sink } = deps;

  const showReview = (episodeId: string, unitKey: CatalogUnitKey, review: CatalogReview): void => {
    dispatch({
      type: "replace",
      screen: {
        name: "catalog-lesson",
        episodeId,
        unitKey,
        activityIndex: review.queue[0].activityIndex,
        review,
      },
    });
  };

  // 유닛 전체를 한 번 판정합니다 — 이벤트 · 기록 · 결과 화면이 같은 결과를 씁니다. 다시 풀고 왔으면 `results`는 고친 수를
  // 이미 반영한 결과이고, 기준(분모)은 첫 결과와 같습니다(문항 수가 바뀌지 않습니다).
  const judge = (
    plan: CatalogLessonPlan,
    results: readonly AnswerResult[],
    skippedCount: number,
    review?: CatalogReviewSummary,
  ): void => {
    const { episodeId, unitKey } = plan;
    deps.clearSession();
    const judged = catalogJudgedCountOf(plan.questionCount, results);
    const verdict = judgeAssessment(results, catalogPassCriterion(judged));
    sink?.(
      lessonFinishedEventOf(
        episodeId,
        unitKey,
        "lesson",
        results,
        plan.questionCount,
        verdict,
        skippedCount,
      ),
    );
    if (assessmentCompletesStep(verdict)) deps.markDone(episodeId, unitKey);
    deps.showComplete(episodeId, unitKey, results, skippedCount, judged, review);
  };

  return {
    onFinishCatalogActivity: (
      episodeId,
      unitKey,
      activityIndex,
      results,
      skippedCount,
      skippedIndexes,
    ) => {
      const plan = planOf(episodeId, unitKey);
      const activity = plan?.activities[activityIndex];
      if (plan === null || activity === undefined) return;
      if (!deps.claimFinish(`${episodeId}|${unitKey}|${activityIndex}`)) return;
      const gathered = [...deps.pendingResults, ...results];
      const skippedTotal = deps.pendingSkippedCount + skippedCount;
      // 결과를 이 활동의 문항 자리에 맞춰 틀린 것만 레슨 순서대로 모읍니다(건너뛴 문항은 다시 풀지 않습니다).
      const mistakes = [
        ...deps.pendingMistakes,
        ...catalogMistakesOf(activityIndex, activity.questions.length, results, skippedIndexes),
      ];
      // 활동이 남았으면 판정하지 않고 다음 활동으로 갈아탑니다 — 판정은 유닛 전체를 놓고 한 번만 합니다.
      if (plan.activities[activityIndex + 1] !== undefined) {
        deps.setPendingResults(gathered);
        deps.setPendingSkippedCount(skippedTotal);
        deps.setPendingMistakes(mistakes);
        dispatch({
          type: "replace",
          screen: { name: "catalog-lesson", episodeId, unitKey, activityIndex: activityIndex + 1 },
        });
        return;
      }
      const criterion = catalogPassCriterion(catalogJudgedCountOf(plan.questionCount, gathered));
      const review = catalogReviewOf(mistakes, gathered, criterion);
      if (review === null) {
        judge(plan, gathered, skippedTotal);
        return;
      }
      // 첫 결과는 판정 때까지 들고 있고, 틀린 문항 목록은 줄(route)로 옮겨 비웁니다.
      deps.setPendingResults(gathered);
      deps.setPendingSkippedCount(skippedTotal);
      deps.setPendingMistakes([]);
      showReview(episodeId, unitKey, review);
    },
    onFinishCatalogReview: (episodeId, unitKey, review, results) => {
      const plan = planOf(episodeId, unitKey);
      if (plan === null) return;
      const attempt = review.outcomes.length;
      if (!deps.claimFinish(`${episodeId}|${unitKey}|review|${String(attempt)}`)) return;
      // 문항 하나짜리 화면이라 결과도 많아야 하나입니다. 없으면 건너뜀(말하기를 못 씀)이고 놓침으로 칩니다.
      const { outcomes, next } = catalogReviewStep(review, results[0] ?? null);
      if (next !== null) {
        showReview(episodeId, unitKey, next);
        return;
      }
      const summary = catalogReviewSummaryOf(review.neededToPass, outcomes) ?? undefined;
      judge(
        plan,
        catalogReviewedResults(deps.pendingResults, outcomes),
        deps.pendingSkippedCount,
        summary,
      );
    },
  };
}
