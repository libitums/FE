// 카탈로그 레슨의 틀린 문제 다시 풀기 화면입니다(ADR-0058 ⟨2026-10-30⟩) — 줄 머리 문항 하나를 원래 학습형 화면 그대로 세웁니다.
// `render-catalog.tsx`가 `screen.review`가 있을 때 부릅니다.

import type { ReactNode } from "@lynx-js/react";

import type { ConversationCast } from "../lib/conversation-cast";
import type { LessonPosition } from "../screens/learning/activity-finish";
import { LearningReviewContext } from "../screens/learning/learning-review";
import { LessonReviewIntroGate } from "../screens/learning/LessonReviewIntroGate";
import type { LearningReview } from "../screens/learning/learning-review";
import { renderCatalogActivity } from "./render-catalog-activity";
import type { CatalogLessonPlan } from "./catalog-lesson-types";
import { catalogReviewActivityOf, catalogReviewCounterOf } from "./catalog-review";
import type { CatalogReview } from "./catalog-review";
import type { Screen } from "./nav-state";
import type { ScreenWiring } from "./screen-wiring";

type ReviewScreen = Extract<Screen, { name: "catalog-lesson" }> & { review: CatalogReview };

// 문항 하나짜리 활동의 자리입니다. 마지막 활동이 아니라고 적어(`last: false`) 문항을 마치면 완료 카드 없이 곧바로 결과를
// 올립니다 — 다음 다시 풀기 문항이나 결과 화면으로 넘어갑니다. 셸 카운터는 이 값 대신 `Review i / k`를 씁니다.
const reviewPosition: LessonPosition = { offset: 0, total: 1, last: false };

export function renderCatalogReview(
  plan: CatalogLessonPlan,
  screen: ReviewScreen,
  wiring: ScreenWiring,
  cast: ConversationCast,
): ReactNode {
  const { review } = screen;
  const head = review.queue[0];
  const source = plan.activities[head.activityIndex];
  const activity =
    source === undefined ? null : catalogReviewActivityOf(source, head.questionIndex);
  if (activity === null) {
    throw new Error(
      `Catalog review has no question: ${screen.episodeId}/${screen.unitKey}/${head.activityIndex}/${head.questionIndex}`,
    );
  }
  const value: LearningReview = catalogReviewCounterOf(review);
  // 첫 다시 도전 문항 앞에서만 시작 알약을 먼저 재생합니다.
  const introCount = review.outcomes.length === 0 ? review.queue.length : null;
  // 다시 푼 답은 문항 이벤트를 내지 않습니다(판정 · 기록 · 이벤트는 첫 시도만) — 문항 참조를 비워 넘깁니다.
  return (
    <LessonReviewIntroGate count={introCount}>
      <LearningReviewContext.Provider value={value}>
        {renderCatalogActivity(activity, reviewPosition, screen, wiring, cast, [])}
      </LearningReviewContext.Provider>
    </LessonReviewIntroGate>
  );
}
