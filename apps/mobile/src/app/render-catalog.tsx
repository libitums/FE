// 카탈로그 학습 route 넷(레슨 · 최종 테스트 · 결과 · 통과 뒤 컷)을 화면으로 옮깁니다. `render-screen.tsx`가
// 커서 떼어 둔 것이고, `render-catalog-cover.tsx`와 같은 갈래입니다.

import type { ReactNode } from "@lynx-js/react";

import type { AnswerResult } from "../lib/answer-result";
import type { LessonPosition } from "../screens/learning/activity-finish";
import { CatalogFinalScreen } from "../screens/catalog-final/CatalogFinalScreen";
import type {
  CatalogRoleplayTurn,
  CatalogRoleplayTurns,
} from "../screens/catalog-final/catalog-final.contract";
import { CultureCardActivity } from "../screens/culture-card/CultureCardActivity";
import { judgeAssessment } from "../screens/assessment/assessment";
import { LessonCompleteScreen } from "../screens/lesson-complete/LessonCompleteScreen";
import { lessonRewardPlaceholder } from "../screens/lesson-complete/lesson-complete";
import { ListeningActivity } from "../screens/listening/ListeningScreen";
import { PairMatchActivity } from "../screens/pair-match/PairMatchActivity";
import { SentenceOrderActivity } from "../screens/sentence-order/SentenceOrderScreen";
import { SyllableBuildActivity } from "../screens/syllable-build/SyllableBuildActivity";
import { TypingActivity } from "../screens/typing/TypingActivity";
import { VocabCardActivity } from "../screens/vocab-card/VocabCardActivity";
import { WordChoiceActivity } from "../screens/word-choice/WordChoiceScreen";
import { CatalogEpilogueFlow } from "./CatalogCutsFlow";
import { catalogEpilogueModelOf } from "./catalog-cover-wiring";
import { catalogFinalPlanFor } from "./catalog-final-model";
import {
  catalogActivityPositionOf,
  catalogLessonPlanFor,
  catalogPassCriterion,
} from "./catalog-lesson-plan";
import type { CatalogActivity } from "./catalog-lesson-plan";
import type { Screen } from "./nav-state";
import type { ScreenWiring } from "./screen-wiring";

type CatalogFlowScreen = Extract<
  Screen,
  { name: "catalog-lesson" | "catalog-final" | "catalog-unit-complete" | "catalog-epilogue" }
>;
type LessonScreen = Extract<CatalogFlowScreen, { name: "catalog-lesson" }>;

function nonEmptyTurns(turns: readonly CatalogRoleplayTurn[]): CatalogRoleplayTurns | null {
  const [first, ...rest] = turns;
  return first === undefined ? null : [first, ...rest];
}

// 활동 하나를 그 학습형의 화면으로 그립니다. 망라 `switch`가 새 학습형을 컴파일 타임에 강제합니다.
function renderActivity(
  activity: CatalogActivity,
  lesson: LessonPosition,
  screen: LessonScreen,
  wiring: ScreenWiring,
): ReactNode {
  const { episodeId, unitKey, activityIndex } = screen;
  const key = `${episodeId}:${unitKey}:${activityIndex}`;
  const onFinish = (results: readonly AnswerResult[], skippedCount: number) =>
    wiring.onFinishCatalogActivity(episodeId, unitKey, activityIndex, results, skippedCount);
  const onExit = wiring.onExitCatalogSession;
  switch (activity.form) {
    case "listening":
      return (
        <ListeningActivity
          key={key}
          questions={activity.questions}
          onExit={onExit}
          onFinish={onFinish}
          sessionOptions={wiring.sessionOptions}
          gemCount={wiring.gemCount}
          lesson={lesson}
        />
      );
    case "sentence-order":
      return (
        <SentenceOrderActivity
          key={key}
          questions={activity.questions}
          gemCount={wiring.gemCount}
          onExit={onExit}
          onFinish={onFinish}
          lesson={lesson}
        />
      );
    case "word-choice":
      return (
        <WordChoiceActivity
          key={key}
          questions={activity.questions}
          onExit={onExit}
          onFinish={onFinish}
          lesson={lesson}
        />
      );
    case "typing":
      return (
        <TypingActivity
          key={key}
          questions={activity.questions}
          gemCount={wiring.gemCount}
          onExit={onExit}
          onFinish={onFinish}
          lesson={lesson}
        />
      );
    case "vocab-card":
      return (
        <VocabCardActivity
          key={key}
          questions={activity.questions}
          gemCount={wiring.gemCount}
          onExit={onExit}
          onFinish={onFinish}
          lesson={lesson}
        />
      );
    case "pair-match":
      return (
        <PairMatchActivity
          key={key}
          questions={activity.questions}
          gemCount={wiring.gemCount}
          onExit={onExit}
          onFinish={onFinish}
          lesson={lesson}
        />
      );
    case "culture-card":
      return (
        <CultureCardActivity
          key={key}
          questions={activity.questions}
          gemCount={wiring.gemCount}
          onExit={onExit}
          onFinish={onFinish}
          lesson={lesson}
        />
      );
    case "syllable-build":
      return (
        <SyllableBuildActivity
          key={key}
          questions={activity.questions}
          gemCount={wiring.gemCount}
          onExit={onExit}
          onFinish={onFinish}
          lesson={lesson}
        />
      );
    default: {
      const exhaustive: never = activity;
      return exhaustive;
    }
  }
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
      if (activity === undefined || lesson === null) {
        throw new Error(
          `Catalog lesson has no activity: ${screen.episodeId}/${screen.unitKey}/${screen.activityIndex}`,
        );
      }
      return renderActivity(activity, lesson, screen, wiring);
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
          reward={lessonRewardPlaceholder}
          onExit={() => wiring.onExitCatalogUnitComplete(episodeId, unitKey, verdict)}
          onRetry={() => wiring.onStartCatalogUnit(episodeId, unitKey)}
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
