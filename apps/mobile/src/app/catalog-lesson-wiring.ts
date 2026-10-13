// 카탈로그 레슨 · 최종 테스트의 결선입니다 — 시작 가드 · 활동 잇기 · 판정 · 기록 · 이벤트 · 결과 뒤 이동.

import type { Dispatch, SetStateAction } from "@lynx-js/react";

import type { AnswerResult } from "../lib/answer-result";
import type { CatalogProgress, CatalogUnitKey } from "../lib/catalog-progress";
import { markCatalogUnitDone } from "../lib/catalog-progress";
import { assessmentCompletesStep, judgeAssessment } from "../screens/assessment/assessment";
import type { AssessmentVerdict } from "../screens/assessment/assessment";
import type { EpisodeFinalUnitId } from "../screens/episode-final/episode-final.contract";
import type { EpisodeIntroEventSink } from "../screens/episode-intro/episode-intro.contract";
import { canStartCatalogUnit, catalogUnitRoleOf } from "../screens/journey-map/catalog-map";
import type { CatalogReadySection } from "../screens/journey-map/catalog-map.contract";
import { catalogEpilogueModelOf, noLearnerProfile } from "./catalog-cover-wiring";
import type { CatalogWiringValues } from "./catalog-cover-wiring";
import { finalPassedEventOf, lessonFinishedEventOf, lessonStartedEventOf } from "./catalog-events";
import { catalogFinalPlanFor } from "./catalog-final-model";
import { catalogLessonPlanFor, catalogPassCriterion } from "./catalog-lesson-plan";
import type { CatalogFinishGuard } from "./catalog-finish-guard";
import type { NavAction } from "./nav-state";

export type CatalogLessonWiring = {
  readonly onStartCatalogUnit: (episodeId: string, unitKey: CatalogUnitKey) => void;
  readonly onExitCatalogSession: () => void;
  readonly onFinishCatalogActivity: (
    episodeId: string,
    unitKey: CatalogUnitKey,
    activityIndex: number,
    results: readonly AnswerResult[],
    skippedCount: number,
  ) => void;
  readonly onFinishCatalogFinal: (episodeId: string, results: readonly AnswerResult[]) => void;
  readonly onExitCatalogUnitComplete: (
    episodeId: string,
    unitKey: CatalogUnitKey,
    verdict: AssessmentVerdict,
  ) => void;
  readonly onLeaveCatalogEpilogue: () => void;
};

export type CatalogLessonWiringArgs = CatalogWiringValues & {
  readonly setCatalogProgress: Dispatch<SetStateAction<CatalogProgress>>;
  readonly completedEpisodeFinalIds: readonly EpisodeFinalUnitId[];
  readonly dispatch: Dispatch<NavAction>;
  readonly episodeIntroEventSink: EpisodeIntroEventSink;
  readonly pendingResults: readonly AnswerResult[];
  readonly setPendingResults: Dispatch<SetStateAction<readonly AnswerResult[]>>;
  readonly pendingSkippedCount: number;
  readonly setPendingSkippedCount: Dispatch<SetStateAction<number>>;
  /**
   * 방금 끝낸 활동의 표식입니다. 결선은 렌더마다 새로 만들어지고 같은 렌더 안의 연타는 상태를
   * 보지 못하므로, 렌더 사이에 살아남는 가변 값(ref)이어야 합니다.
   */
  readonly finishGuard: CatalogFinishGuard;
};

export function catalogLessonWiring(args: CatalogLessonWiringArgs): CatalogLessonWiring {
  const {
    episodeContent,
    catalogSections,
    catalogProgress,
    setCatalogProgress,
    dispatch,
    episodeIntroEventSink: sink,
    pendingResults,
    setPendingResults,
    pendingSkippedCount,
    setPendingSkippedCount,
    finishGuard,
  } = args;

  // 같은 활동 · 같은 최종 테스트의 두 번째 finish를 거릅니다 — 처음 오면 표식을 남기고 true.
  // 시작 · 나가기 · 결과 나가기가 표식을 지워 재시도와 다음 세션은 다시 끝낼 수 있습니다.
  const claimFinish = (mark: string): boolean => {
    if (finishGuard.current === mark) return false;
    finishGuard.current = mark;
    return true;
  };
  const releaseFinish = (): void => {
    finishGuard.current = null;
  };

  // 세션이 드는 둘을 한 자리에서 비웁니다 — 한쪽만 리셋하는 자리가 생기지 않게 합니다.
  const clearSession = (): void => {
    setPendingResults([]);
    setPendingSkippedCount(0);
  };

  const markDone = (episodeId: string, unitKey: CatalogUnitKey): void => {
    setCatalogProgress((progress) => markCatalogUnitDone(progress, episodeId, unitKey));
  };

  const showComplete = (
    action: "push" | "replace",
    episodeId: string,
    unitKey: CatalogUnitKey,
    results: readonly AnswerResult[],
    skippedCount: number,
    questionCount: number,
  ): void => {
    dispatch({
      type: action,
      screen: {
        name: "catalog-unit-complete",
        episodeId,
        unitKey,
        results,
        skippedCount,
        questionCount,
      },
    });
  };

  const startLesson = (episodeId: string, unitKey: CatalogUnitKey): void => {
    const plan = catalogLessonPlanFor(episodeContent, episodeId, unitKey);
    if (plan === null) return;
    releaseFinish();
    clearSession();
    sink?.(lessonStartedEventOf(plan, "lesson"));
    if (plan.activities.length === 0) {
      // 보일 문항이 하나도 없는 유닛은 화면 없이 막지 않고 결과 화면으로 바로 보냅니다. 채점 문항이 0개여도
      // 카드가 있으면 카드를 한 장씩 보여야 하므로 기준은 채점 수가 아니라 표시 수(활동 유무)입니다.
      sink?.(lessonFinishedEventOf(episodeId, unitKey, "lesson", [], 0, "passed"));
      markDone(episodeId, unitKey);
      showComplete("push", episodeId, unitKey, [], 0, 0);
      return;
    }
    dispatch({
      type: "push",
      screen: { name: "catalog-lesson", episodeId, unitKey, activityIndex: 0 },
    });
  };

  const startFinal = (episodeId: string, unitKey: CatalogUnitKey): void => {
    const plan = catalogFinalPlanFor(episodeContent, catalogSections, episodeId);
    if (plan === null) return;
    releaseFinish();
    clearSession();
    const turnCount = plan.turns.length;
    sink?.(
      lessonStartedEventOf(
        {
          episodeId,
          unitKey,
          questionCount: turnCount,
          shownItemCount: turnCount,
          skippedItemCount: plan.skippedItemCount,
        },
        "final",
      ),
    );
    if (turnCount === 0) {
      sink?.(lessonFinishedEventOf(episodeId, unitKey, "final", [], 0, "passed"));
      sink?.(finalPassedEventOf(episodeId, [], 0));
      markDone(episodeId, unitKey);
      showComplete("push", episodeId, unitKey, [], 0, 0);
      return;
    }
    dispatch({ type: "push", screen: { name: "catalog-final", episodeId } });
  };

  const sectionOf = (episodeId: string): CatalogReadySection | null => {
    const section = catalogSections.find((candidate) => candidate.episodeId === episodeId);
    return section?.kind === "catalog-ready" ? section : null;
  };

  return {
    onStartCatalogUnit: (episodeId, unitKey) => {
      if (!canStartCatalogUnit(catalogSections, episodeId, unitKey, catalogProgress)) return;
      const section = sectionOf(episodeId);
      if (section === null) return;
      if (catalogUnitRoleOf(section, unitKey) === "final") {
        startFinal(episodeId, unitKey);
      } else {
        startLesson(episodeId, unitKey);
      }
    },
    onExitCatalogSession: () => {
      releaseFinish();
      clearSession();
      dispatch({ type: "backToRoot" });
    },
    onFinishCatalogActivity: (episodeId, unitKey, activityIndex, results, skippedCount) => {
      const plan = catalogLessonPlanFor(episodeContent, episodeId, unitKey);
      if (plan === null) return;
      if (!claimFinish(`${episodeId}|${unitKey}|${activityIndex}`)) return;
      const gathered = [...pendingResults, ...results];
      const skippedTotal = pendingSkippedCount + skippedCount;
      // 활동이 남았으면 판정하지 않고 다음 활동으로 갈아탑니다 — 판정은 유닛 전체를 놓고 한 번만 합니다.
      if (plan.activities[activityIndex + 1] !== undefined) {
        setPendingResults(gathered);
        setPendingSkippedCount(skippedTotal);
        dispatch({
          type: "replace",
          screen: {
            name: "catalog-lesson",
            episodeId,
            unitKey,
            activityIndex: activityIndex + 1,
          },
        });
        return;
      }
      clearSession();
      const verdict = judgeAssessment(gathered, catalogPassCriterion(plan.questionCount));
      sink?.(
        lessonFinishedEventOf(episodeId, unitKey, "lesson", gathered, plan.questionCount, verdict),
      );
      if (assessmentCompletesStep(verdict)) markDone(episodeId, unitKey);
      showComplete("replace", episodeId, unitKey, gathered, skippedTotal, plan.questionCount);
    },
    onFinishCatalogFinal: (episodeId, results) => {
      const plan = catalogFinalPlanFor(episodeContent, catalogSections, episodeId);
      const section = sectionOf(episodeId);
      if (plan === null || section === null) return;
      const turnCount = plan.turns.length;
      const unitKey = section.finalKey;
      if (!claimFinish(`${episodeId}|${unitKey}|final`)) return;
      const verdict = judgeAssessment(results, catalogPassCriterion(turnCount));
      sink?.(lessonFinishedEventOf(episodeId, unitKey, "final", results, turnCount, verdict));
      if (assessmentCompletesStep(verdict)) {
        sink?.(finalPassedEventOf(episodeId, results, turnCount));
        markDone(episodeId, unitKey);
      }
      showComplete("replace", episodeId, unitKey, results, 0, turnCount);
    },
    onExitCatalogUnitComplete: (episodeId, unitKey, verdict) => {
      releaseFinish();
      const section = sectionOf(episodeId);
      const toEpilogue =
        section !== null &&
        catalogUnitRoleOf(section, unitKey) === "final" &&
        assessmentCompletesStep(verdict) &&
        catalogEpilogueModelOf(episodeContent, catalogSections, episodeId, noLearnerProfile) !==
          null;
      if (toEpilogue) {
        dispatch({ type: "replace", screen: { name: "catalog-epilogue", episodeId } });
        return;
      }
      dispatch({ type: "backToRoot" });
    },
    onLeaveCatalogEpilogue: () => dispatch({ type: "backToRoot" }),
  };
}
