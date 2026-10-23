// 카탈로그 레슨 · 최종 테스트의 결선입니다 — 시작 가드 · 활동 잇기 · 판정 · 기록 · 이벤트 · 결과 뒤 이동.
// 레슨의 활동 잇기 · 틀린 문제 다시 풀기 · 판정은 `catalog-lesson-finish.ts`가 집니다.

import type { Dispatch, SetStateAction } from "@lynx-js/react";

import type { AnswerResult } from "../lib/answer-result";
import type { CatalogProgress, CatalogUnitKey } from "../lib/catalog-progress";
import { markCatalogUnitDone } from "../lib/catalog-progress";
import { initialListenPace } from "../lib/listen-pace";
import type { ListenPace } from "../lib/listen-pace";
import { assessmentCompletesStep, judgeAssessment } from "../screens/assessment/assessment";
import type { AssessmentVerdict } from "../screens/assessment/assessment";
import type { EpisodeIntroEventSink } from "../screens/episode-intro/episode-intro.contract";
import { canStartCatalogUnit, catalogUnitRoleOf } from "../screens/journey-map/catalog-map";
import type { CatalogReadySection } from "../screens/journey-map/catalog-map.contract";
import { catalogEpilogueModelOf } from "./catalog-cover-wiring";
import type { CatalogWiringValues } from "./catalog-cover-wiring";
import { finalPassedEventOf, lessonFinishedEventOf, lessonStartedEventOf } from "./catalog-events";
import { catalogFinalPlanFor } from "./catalog-final-model";
import { catalogLessonFinish } from "./catalog-lesson-finish";
import type { CatalogLessonFinish } from "./catalog-lesson-finish";
import { catalogLessonPlanFor, catalogPassCriterion } from "./catalog-lesson-plan";
import type { CatalogReviewItem } from "./catalog-review";
import type { CatalogFinishGuard } from "./catalog-finish-guard";
import type { NavAction } from "./nav-state";

export type CatalogLessonWiring = CatalogLessonFinish & {
  readonly onStartCatalogUnit: (episodeId: string, unitKey: CatalogUnitKey) => void;
  /** 맵 말풍선의 진행 줄 전체 수 — 레슨은 표시 문항 수, 최종 테스트는 턴 수입니다. 짓지 못하면 0. */
  readonly catalogUnitItemCountOf: (episodeId: string, unitKey: CatalogUnitKey) => number;
  readonly onExitCatalogSession: () => void;
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
  readonly dispatch: Dispatch<NavAction>;
  readonly episodeIntroEventSink: EpisodeIntroEventSink;
  readonly pendingResults: readonly AnswerResult[];
  readonly setPendingResults: Dispatch<SetStateAction<readonly AnswerResult[]>>;
  readonly pendingSkippedCount: number;
  readonly setPendingSkippedCount: Dispatch<SetStateAction<number>>;
  /** 첫 시도에 틀린 채점 문항입니다 — 마지막 활동 뒤 다시 풀기 줄이 됩니다. 결과 · 건너뜀 수와 함께 비웁니다. */
  readonly pendingMistakes: readonly CatalogReviewItem[];
  readonly setPendingMistakes: Dispatch<SetStateAction<readonly CatalogReviewItem[]>>;
  /**
   * 방금 끝낸 활동의 표식입니다. 결선은 렌더마다 새로 만들어지고 같은 렌더 안의 연타는 상태를
   * 보지 못하므로, 렌더 사이에 살아남는 가변 값(ref)이어야 합니다.
   */
  readonly finishGuard: CatalogFinishGuard;
  /** 「천천히」 상태의 setter입니다 — 세션을 비우는 자리에서 함께 되돌립니다. */
  readonly setListenPace: Dispatch<SetStateAction<ListenPace>>;
};

export function catalogLessonWiring(args: CatalogLessonWiringArgs): CatalogLessonWiring {
  const {
    episodeContent,
    catalogSections,
    catalogProgress,
    setCatalogProgress,
    learnerFill,
    dispatch,
    episodeIntroEventSink: sink,
    setPendingResults,
    setPendingSkippedCount,
    setPendingMistakes,
    finishGuard,
    setListenPace,
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

  // 세션이 드는 넷을 한 자리에서 비웁니다 — 한쪽만 리셋하는 자리가 생기지 않게 합니다.
  const clearSession = (): void => {
    setPendingResults([]);
    setPendingSkippedCount(0);
    setPendingMistakes([]);
    setListenPace(initialListenPace);
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
    const plan = catalogLessonPlanFor(episodeContent, episodeId, unitKey, learnerFill);
    if (plan === null) return;
    releaseFinish();
    clearSession();
    sink?.(lessonStartedEventOf(plan, "lesson"));
    if (plan.activities.length === 0) {
      // 보일 문항이 하나도 없는 유닛은 화면 없이 막지 않고 결과 화면으로 바로 보냅니다. 채점 문항이 0개여도
      // 카드가 있으면 카드를 한 장씩 보여야 하므로 기준은 채점 수가 아니라 표시 수(활동 유무)입니다.
      sink?.(lessonFinishedEventOf(episodeId, unitKey, "lesson", [], 0, "passed", 0));
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
    const plan = catalogFinalPlanFor(episodeContent, catalogSections, episodeId, learnerFill);
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
      sink?.(lessonFinishedEventOf(episodeId, unitKey, "final", [], 0, "passed", 0));
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
    catalogUnitItemCountOf: (episodeId, unitKey) => {
      const section = sectionOf(episodeId);
      if (section === null) return 0;
      if (catalogUnitRoleOf(section, unitKey) === "final") {
        return (
          catalogFinalPlanFor(episodeContent, catalogSections, episodeId, learnerFill)?.turns
            .length ?? 0
        );
      }
      return (
        catalogLessonPlanFor(episodeContent, episodeId, unitKey, learnerFill)?.shownItemCount ?? 0
      );
    },
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
    ...catalogLessonFinish({
      ...args,
      planOf: (episodeId, unitKey) =>
        catalogLessonPlanFor(episodeContent, episodeId, unitKey, learnerFill),
      sink,
      claimFinish,
      clearSession,
      markDone,
      showComplete: (episodeId, unitKey, results, skippedCount, questionCount) =>
        showComplete("replace", episodeId, unitKey, results, skippedCount, questionCount),
    }),
    onFinishCatalogFinal: (episodeId, results) => {
      const plan = catalogFinalPlanFor(episodeContent, catalogSections, episodeId, learnerFill);
      const section = sectionOf(episodeId);
      if (plan === null || section === null) return;
      const turnCount = plan.turns.length;
      const unitKey = section.finalKey;
      if (!claimFinish(`${episodeId}|${unitKey}|final`)) return;
      const verdict = judgeAssessment(results, catalogPassCriterion(turnCount));
      sink?.(lessonFinishedEventOf(episodeId, unitKey, "final", results, turnCount, verdict, 0));
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
        catalogEpilogueModelOf(episodeContent, catalogSections, episodeId, learnerFill) !== null;
      if (toEpilogue) {
        dispatch({ type: "replace", screen: { name: "catalog-epilogue", episodeId } });
        return;
      }
      dispatch({ type: "backToRoot" });
    },
    onLeaveCatalogEpilogue: () => dispatch({ type: "backToRoot" }),
  };
}
