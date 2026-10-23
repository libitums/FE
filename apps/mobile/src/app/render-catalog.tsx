// 카탈로그 학습 route 넷(레슨 · 최종 테스트 · 결과 · 통과 뒤 컷)을 화면으로 옮깁니다. `render-screen.tsx`가
// 커서 떼어 둔 것이고, `render-catalog-cover.tsx`와 같은 갈래입니다.

import type { ReactNode } from "@lynx-js/react";

import type { LessonPosition } from "../screens/learning/activity-finish";
import { CatalogFinalScreen } from "../screens/catalog-final/CatalogFinalScreen";
import type {
  CatalogRoleplayTurn,
  CatalogRoleplayTurns,
} from "../screens/catalog-final/catalog-final.contract";
import { judgeAssessment } from "../screens/assessment/assessment";
import { LessonCompleteScreen } from "../screens/lesson-complete/LessonCompleteScreen";
import { lessonRewardPlaceholder } from "../screens/lesson-complete/lesson-complete";
import { catalogLessonOrdinalOf } from "../screens/journey-map/catalog-map";
import { CatalogEpilogueFlow } from "./CatalogCutsFlow";
import { renderCatalogActivity } from "./render-catalog-activity";
import { catalogEpilogueModelOf } from "./catalog-cover-wiring";
import { catalogFinalPlanFor } from "./catalog-final-model";
import { catalogResultNextOf } from "./catalog-next-unit";
import {
  catalogActivityPositionOf,
  catalogLessonCastOf,
  catalogLessonPlanFor,
  catalogPassCriterion,
} from "./catalog-lesson-plan";
import type { Screen } from "./nav-state";
import type { ScreenWiring } from "./screen-wiring";

type CatalogFlowScreen = Extract<
  Screen,
  { name: "catalog-lesson" | "catalog-final" | "catalog-unit-complete" | "catalog-epilogue" }
>;

function nonEmptyTurns(turns: readonly CatalogRoleplayTurn[]): CatalogRoleplayTurns | null {
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
      // 완료 카드의 `Lesson n` 칩은 맵 노드와 같은 순번입니다 — 계획은 구획을 모르므로 여기서 붙입니다.
      const ordinal = catalogLessonOrdinalOf(
        wiring.catalogSections,
        screen.episodeId,
        screen.unitKey,
      );
      const placed = ordinal === undefined ? lesson : { ...lesson, ordinal };
      // 활동이 쓰는 출연진(이름 · 그림)과 문항별 보고용 참조를 계획에서 꺼내 넘깁니다.
      return renderCatalogActivity(
        activity,
        placed,
        screen,
        wiring,
        catalogLessonCastOf(plan, wiring.learnerFill.name ?? ""),
        plan.itemRefs[screen.activityIndex] ?? [],
      );
    }
    case "catalog-final": {
      const { episodeId } = screen;
      const plan = catalogFinalPlanFor(
        wiring.episodeContent,
        wiring.catalogSections,
        episodeId,
        wiring.learnerFill,
      );
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
          onFinish={(results) => wiring.onFinishCatalogFinal(episodeId, results)}
          onExit={wiring.onExitCatalogSession}
        />
      );
    }
    // 레슨과 최종 테스트가 같은 결과 화면을 씁니다. 판정은 결선(기록)과 같은 함수 · 같은 상수로 다시 냅니다.
    case "catalog-unit-complete": {
      const { episodeId, unitKey } = screen;
      const verdict = judgeAssessment(screen.results, catalogPassCriterion(screen.questionCount));
      return (
        <LessonCompleteScreen
          key={`${episodeId}:${unitKey}:complete`}
          results={screen.results}
          skippedCount={screen.skippedCount}
          verdict={verdict}
          streakDays={wiring.streakDays}
          trophyCount={wiring.trophyCount}
          statBumps={wiring.statBumps}
          onStatBumped={wiring.onStatBumped}
          reward={lessonRewardPlaceholder}
          ticketsLeft={wiring.ticketsLeft}
          onExit={() => wiring.onExitCatalogUnitComplete(episodeId, unitKey, verdict)}
          onRetry={() => wiring.onStartCatalogUnit(episodeId, unitKey)}
          {...catalogResultNextOf(wiring, episodeId, unitKey)}
        />
      );
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
