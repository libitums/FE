// 카탈로그 레슨 · 최종 테스트의 결선입니다 — 시작 가드 · 활동 잇기 · 판정 · 기록 · 이벤트 · 결과 뒤 이동.
// 레슨의 활동 잇기 · 틀린 문제 다시 풀기 · 판정은 `catalog-lesson-finish.ts`가 집니다.

import { rememberMapCleared } from "../screens/journey-map/journey-map-cleared-memory";
import type { Dispatch, SetStateAction } from "@lynx-js/react";

import type { AnswerResult } from "../lib/answer-result";
import type { CatalogProgress, CatalogUnitKey } from "../lib/catalog-progress";
import { isCatalogUnitDone, markCatalogUnitDone } from "../lib/catalog-progress";
import { initialListenPace } from "../lib/listen-pace";
import type { ListenPace } from "../lib/listen-pace";
import { assessmentCompletesStep, judgeAssessment } from "../screens/assessment/assessment";
import type { AssessmentVerdict } from "../screens/assessment/assessment";
import type { EpisodeIntroEventSink } from "../screens/episode-intro/episode-intro.contract";
import { canStartCatalogUnit, catalogUnitRoleOf } from "../screens/journey-map/catalog-map";
import type { CatalogReadySection } from "../screens/journey-map/catalog-map.contract";
import type { CatalogWiringValues } from "./catalog-cover-wiring";
import { catalogUnitCompleteLeadsToEpilogue } from "./catalog-epilogue-route";
import { finalPassedEventOf, lessonFinishedEventOf, lessonStartedEventOf } from "./catalog-events";
import { catalogJourneyFinalPlanFor } from "./catalog-journey-final";
import {
  catalogJudgedCountOf,
  catalogLessonPlanFor,
  catalogPassCriterion,
} from "./catalog-lesson-plan";
import { catalogLessonFinish } from "./catalog-lesson-finish";
import type { CatalogLessonFinish } from "./catalog-lesson-finish";
import type { CatalogReviewItem, CatalogReviewSummary } from "./catalog-review";
import type { CatalogFinishGuard } from "./catalog-finish-guard";
import type { NavAction } from "./nav-state";
import type { CatalogStartSource } from "../lib/catalog-learning-event.contract";

export type CatalogLessonWiring = CatalogLessonFinish & {
  /** `source`는 맵이 아닌 곳에서 열 때만 줍니다 — 결과 화면의 「다음 학습」(`result`). 시작 이벤트에 실립니다. */
  readonly onStartCatalogUnit: (
    episodeId: string,
    unitKey: CatalogUnitKey,
    source?: CatalogStartSource,
  ) => void;
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
  /** 엽전을 받은 유닛으로 적습니다(ADR-0116). 처음 끝낸 유닛에만 부릅니다. 넘기지 않으면 엽전이 없습니다. */
  readonly markCoinUnit?: (episodeId: string, unitKey: CatalogUnitKey) => void;
  /** 엽전을 이미 받은 유닛입니다(ADR-0116). 끝냄 기록이 없어도 여기 있으면 처음 통과가 아닙니다. */
  readonly coinUnits?: CatalogProgress;
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
    markCoinUnit,
    coinUnits = {},
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

  // 처음 끝내는가는 이 렌더의 진행(끝내기 전)으로 봅니다 — 결과 화면의 엽전 보상과 엽전 기록이 같은 답을 씁니다.
  // 끝냄 기록과 엽전 기록 중 하나라도 있으면 처음이 아닙니다 — 이미 받은 유닛에 「+ 10」 카드가 서지 않게.
  const firstClearOf = (episodeId: string, unitKey: CatalogUnitKey): boolean =>
    !isCatalogUnitDone(catalogProgress, episodeId, unitKey) &&
    !isCatalogUnitDone(coinUnits, episodeId, unitKey);

  const markDone = (episodeId: string, unitKey: CatalogUnitKey): void => {
    if (firstClearOf(episodeId, unitKey)) markCoinUnit?.(episodeId, unitKey);
    setCatalogProgress((progress) => markCatalogUnitDone(progress, episodeId, unitKey));
    // 맵이 돌아오면 이 유닛 → 다음 유닛 발자국이 찍히게(ADR-0100 D4).
    rememberMapCleared(episodeId, unitKey);
  };

  const showComplete = (
    action: "push" | "replace",
    episodeId: string,
    unitKey: CatalogUnitKey,
    results: readonly AnswerResult[],
    skippedCount: number,
    questionCount: number,
    review?: CatalogReviewSummary,
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
        firstClear: firstClearOf(episodeId, unitKey),
        ...(review === undefined ? {} : { review }),
      },
    });
  };

  const startLesson = (
    episodeId: string,
    unitKey: CatalogUnitKey,
    source?: CatalogStartSource,
  ): void => {
    const plan = catalogLessonPlanFor(episodeContent, episodeId, unitKey, learnerFill);
    if (plan === null) return;
    releaseFinish();
    clearSession();
    sink?.(lessonStartedEventOf(plan, "lesson", source));
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

  // 여정맵 파이널 — 이야기 파이널 원천이 있으면 이야기 턴, 없으면 RP 턴입니다.
  const finalPlanOf = (episodeId: string) =>
    catalogJourneyFinalPlanFor(episodeContent, catalogSections, episodeId, learnerFill);

  const startFinal = (
    episodeId: string,
    unitKey: CatalogUnitKey,
    source?: CatalogStartSource,
  ): void => {
    const plan = finalPlanOf(episodeId);
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
        source,
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
        return finalPlanOf(episodeId)?.turns.length ?? 0;
      }
      return (
        catalogLessonPlanFor(episodeContent, episodeId, unitKey, learnerFill)?.shownItemCount ?? 0
      );
    },
    onStartCatalogUnit: (episodeId, unitKey, source) => {
      if (!canStartCatalogUnit(catalogSections, episodeId, unitKey, catalogProgress)) return;
      const section = sectionOf(episodeId);
      if (section === null) return;
      if (catalogUnitRoleOf(section, unitKey) === "final") {
        startFinal(episodeId, unitKey, source);
      } else {
        startLesson(episodeId, unitKey, source);
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
      showComplete: (episodeId, unitKey, results, skippedCount, questionCount, review) =>
        showComplete("replace", episodeId, unitKey, results, skippedCount, questionCount, review),
    }),
    onFinishCatalogFinal: (episodeId, results) => {
      const plan = finalPlanOf(episodeId);
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
      if (
        catalogUnitCompleteLeadsToEpilogue(
          { episodeContent, catalogSections, learnerFill },
          episodeId,
          unitKey,
          verdict,
        )
      ) {
        dispatch({ type: "replace", screen: { name: "catalog-epilogue", episodeId } });
        return;
      }
      dispatch({ type: "backToRoot" });
    },
    onLeaveCatalogEpilogue: () => dispatch({ type: "backToRoot" }),
  };
}
