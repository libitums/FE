// 카탈로그 학습 route 넷(레슨 · 최종 테스트 · 결과 · 통과 뒤 컷)을 화면으로 옮깁니다. `render-screen.tsx`가
// 커서 떼어 둔 것이고, `render-catalog-cover.tsx`와 같은 갈래입니다.

import type { ReactNode } from "@lynx-js/react";

import type { LessonPosition } from "../screens/learning/activity-finish";
import { CatalogFinalScreen } from "../screens/catalog-final/CatalogFinalScreen";
import { CatalogStoryFinalScreen } from "../screens/catalog-story-final/CatalogStoryFinalScreen";
import type { AnswerResult } from "../lib/answer-result";
import type { NonEmpty } from "../lib/non-empty";
import { judgeAssessment } from "../screens/assessment/assessment";
import { LessonCompleteScreen } from "../screens/lesson-complete/LessonCompleteScreen";
import { lessonRewardPlaceholder } from "../screens/lesson-complete/lesson-complete";
import { lessonCoinReward } from "../lib/coins";
import { catalogLessonOrdinalOf } from "../screens/journey-map/catalog-map";
import { CatalogEpilogueFlow } from "./CatalogCutsFlow";
import { renderCatalogActivity } from "./render-catalog-activity";
import { renderCatalogReview } from "./render-catalog-review";
import { catalogEpilogueModelOf } from "./catalog-cover-wiring";
import { catalogUnitCompleteLeadsToEpilogue } from "./catalog-epilogue-route";
import { catalogJourneyFinalPlanFor } from "./catalog-journey-final";
import { catalogResultNextOf } from "./catalog-next-unit";
import {
  catalogActivityPositionOf,
  catalogLessonCastOf,
  catalogLessonPlanFor,
  catalogPassCriterion,
} from "./catalog-lesson-plan";
import type { Screen } from "./nav-state";
import { withNewFriendLayer } from "./render-new-friend";
import type { ScreenWiring } from "./screen-wiring";

type CatalogFlowScreen = Extract<
  Screen,
  { name: "catalog-lesson" | "catalog-final" | "catalog-unit-complete" | "catalog-epilogue" }
>;

function nonEmptyTurns<T>(turns: readonly T[]): NonEmpty<T> | null {
  const [first, ...rest] = turns;
  return first === undefined ? null : [first, ...rest];
}

// 시작 가드와 세션 고정이 아래 모델이 없는 경우를 막으므로 여기 닿으면 결함입니다 — 에러 경계가 받습니다.
export function renderCatalogFlow(screen: CatalogFlowScreen, wiring: ScreenWiring): ReactNode {
  switch (screen.name) {
    case "catalog-lesson": {
      const plan = catalogLessonPlanFor(
        wiring.episodeContent,
        screen.episodeId,
        screen.unitKey,
        wiring.learnerFill,
      );
      const activity = plan?.activities[screen.activityIndex];
      const lesson = plan === null ? null : catalogActivityPositionOf(plan, screen.activityIndex);
      if (plan === null || activity === undefined || lesson === null) {
        throw new Error(
          `Catalog lesson has no activity: ${screen.episodeId}/${screen.unitKey}/${screen.activityIndex}`,
        );
      }
      const cast = catalogLessonCastOf(plan, wiring.learnerFill.name ?? "");
      // 틀린 문제 다시 풀기 국면이면 줄 머리 문항 하나를 원래 학습형 화면으로 세웁니다.
      if (screen.review !== undefined) {
        return renderCatalogReview(plan, { ...screen, review: screen.review }, wiring, cast);
      }
      // 완료 카드의 `Lesson n` 칩은 맵 노드와 같은 순번입니다 — 계획은 구획을 모르므로 여기서 붙입니다.
      const ordinal = catalogLessonOrdinalOf(
        wiring.catalogSections,
        screen.episodeId,
        screen.unitKey,
      );
      // ⟨2026-10-30⟩ 레슨은 완료 카드 없이 끝납니다 — 마지막 활동도 마지막 문항 뒤 곧바로 결과를 올리고, 결선이 틀린 문항
      // 다시 도전 또는 결과 화면으로 잇습니다(사용자 결정: 일반 학습 → 다시 도전 → 결과, ADR-0058).
      const placed: LessonPosition = {
        ...lesson,
        last: false,
        ...(ordinal === undefined ? {} : { ordinal }),
      };
      // 활동이 쓰는 출연진(이름 · 그림)과 문항별 보고용 참조를 계획에서 꺼내 넘깁니다.
      return renderCatalogActivity(
        activity,
        placed,
        screen,
        wiring,
        cast,
        plan.itemRefs[screen.activityIndex] ?? [],
      );
    }
    case "catalog-final": {
      const { episodeId } = screen;
      const plan = catalogJourneyFinalPlanFor(
        wiring.episodeContent,
        wiring.catalogSections,
        episodeId,
        wiring.learnerFill,
      );
      const finish = (results: readonly AnswerResult[]) =>
        wiring.onFinishCatalogFinal(episodeId, results);
      // 이야기 파이널(level-3 S8)이면 그 화면, 옛 콘텐츠면 RP 턴 화면입니다.
      if (plan?.kind === "story") {
        const turns = nonEmptyTurns(plan.turns);
        if (turns === null)
          throw new Error(`Catalog final test has no playable turns: ${episodeId}`);
        return (
          <CatalogStoryFinalScreen
            key={episodeId}
            insets={wiring.safeAreaInsets}
            ordinal={plan.ordinal}
            turns={turns}
            onFinish={finish}
            onExit={wiring.onExitCatalogSession}
          />
        );
      }
      const turns = plan === null ? null : nonEmptyTurns(plan.turns);
      if (plan === null || turns === null) {
        throw new Error(`Catalog final test has no playable turns: ${episodeId}`);
      }
      return (
        <CatalogFinalScreen
          key={episodeId}
          insets={wiring.safeAreaInsets}
          ordinal={plan.ordinal}
          counterpartName={plan.counterpartName}
          turns={turns}
          onFinish={finish}
          onExit={wiring.onExitCatalogSession}
        />
      );
    }
    // 레슨과 최종 테스트가 같은 결과 화면을 씁니다. 판정은 결선(기록)과 같은 함수 · 같은 상수로 다시 냅니다.
    case "catalog-unit-complete": {
      const { episodeId, unitKey } = screen;
      const verdict = judgeAssessment(screen.results, catalogPassCriterion(screen.questionCount));
      const exitResult = () => wiring.onExitCatalogUnitComplete(episodeId, unitKey, verdict);
      const result = (
        <LessonCompleteScreen
          key={`${episodeId}:${unitKey}:complete`}
          results={screen.results}
          skippedCount={screen.skippedCount}
          verdict={verdict}
          streakDays={wiring.streakDays}
          trophyCount={wiring.trophyCount}
          statBumps={wiring.statBumps}
          onStatBumped={wiring.onStatBumped}
          reward={{
            ...lessonRewardPlaceholder,
            coinAmount: lessonCoinReward(verdict, screen.firstClear === true),
          }}
          {...(wiring.coinCount === undefined ? {} : { coinCount: wiring.coinCount })}
          ticketsLeft={wiring.ticketsLeft}
          ticketChip={wiring.ticketChip}
          continuesStory={catalogUnitCompleteLeadsToEpilogue(wiring, episodeId, unitKey, verdict)}
          onExit={exitResult}
          onRetry={() => wiring.onStartCatalogUnit(episodeId, unitKey)}
          {...catalogResultNextOf(wiring, episodeId, unitKey)}
          {...(screen.review === undefined ? {} : { review: screen.review })}
        />
      );
      return withNewFriendLayer(result, screen.newFriend, wiring, exitResult);
    }
    case "catalog-epilogue": {
      const { episodeId } = screen;
      const model = catalogEpilogueModelOf(
        wiring.episodeContent,
        wiring.catalogSections,
        episodeId,
        wiring.learnerFill,
      );
      if (model === null) {
        throw new Error(`Catalog epilogue has no playable cuts: ${episodeId}`);
      }
      return (
        <CatalogEpilogueFlow
          key={`${episodeId}:epilogue`}
          insets={wiring.safeAreaInsets}
          ordinal={model.ordinal}
          cuts={model.cuts}
          onExit={wiring.onLeaveCatalogEpilogue}
          onClose={wiring.onLeaveCatalogEpilogue}
        />
      );
    }
    default: {
      const exhaustive: never = screen;
      return exhaustive;
    }
  }
}
