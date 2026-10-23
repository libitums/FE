// 카탈로그 레슨의 활동 잇기 · 틀린 문제 다시 풀기 · 판정입니다. `catalog-lesson-wiring.ts`가 커서 떼어 둔 것이고,
// 시작 가드 · 세션 비움 · 기록 · 결과 이동 같은 공용 걸음은 그쪽이 만들어 넘깁니다.
//
// ⟨2026-10-23⟩ 마지막 활동 뒤 첫 시도에 틀린 채점 문항이 있으면 곧바로 판정하지 않고 다시 풀기로 갑니다(사용자 결정).
// 틀린 문항을 원래 학습형 화면에 하나씩 세우고, 맞히면 빠지고 또 틀리면 줄 맨 뒤로 갑니다(`catalog-review.ts`). 줄이
// 비면 지금까지처럼 판정합니다 — 판정 · 기록 · 이벤트는 **첫 시도 결과만** 씁니다. 다시 푼 답은 아무것도 바꾸지 않습니다.

import type { Dispatch, SetStateAction } from "@lynx-js/react";

import type { AnswerResult } from "../lib/answer-result";
import type { CatalogUnitKey } from "../lib/catalog-progress";
import { assessmentCompletesStep, judgeAssessment } from "../screens/assessment/assessment";
import type { EpisodeIntroEventSink } from "../screens/episode-intro/episode-intro.contract";
import { lessonFinishedEventOf } from "./catalog-events";
import { catalogJudgedCountOf, catalogPassCriterion } from "./catalog-lesson-plan";
import type { CatalogLessonPlan } from "./catalog-lesson-types";
import { catalogMistakesOf, catalogReviewOf, nextCatalogReview } from "./catalog-review";
import type { CatalogReview, CatalogReviewItem } from "./catalog-review";
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

  // 유닛 전체를 첫 시도 결과로 한 번 판정합니다 — 이벤트 · 기록 · 결과 화면이 같은 결과를 씁니다.
  const judge = (
    plan: CatalogLessonPlan,
    results: readonly AnswerResult[],
    skippedCount: number,
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
    deps.showComplete(episodeId, unitKey, results, skippedCount, judged);
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
      const review = catalogReviewOf(mistakes);
      if (review === null) {
        judge(plan, gathered, skippedTotal);
        return;
      }
      // 첫 시도 결과는 판정 때까지 들고 있고, 틀린 문항 목록은 줄(route)로 옮겨 비웁니다.
      deps.setPendingResults(gathered);
      deps.setPendingSkippedCount(skippedTotal);
      deps.setPendingMistakes([]);
      showReview(episodeId, unitKey, review);
    },
    onFinishCatalogReview: (episodeId, unitKey, review, results) => {
      const plan = planOf(episodeId, unitKey);
      if (plan === null) return;
      if (!deps.claimFinish(`${episodeId}|${unitKey}|review|${String(review.attempt)}`)) return;
      // 문항 하나짜리 화면이라 결과도 많아야 하나입니다. 없으면 건너뜀입니다(말하기를 못 씀).
      const next = nextCatalogReview(review, results[0] ?? null);
      if (next === null) {
        judge(plan, deps.pendingResults, deps.pendingSkippedCount);
        return;
      }
      showReview(episodeId, unitKey, next);
    },
  };
}
