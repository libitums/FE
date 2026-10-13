// 카탈로그 학습(레슨 · 최종 테스트) 측정 이벤트의 타입 전용 계약입니다.
// 이벤트는 `EpisodeIntroEventSink`로 나갑니다 — 수는 10진 문자열입니다(ADR-0029).

import type { AssessmentVerdict } from "../screens/assessment/assessment";

export type CatalogUnitRole = "lesson" | "final";

export type EpisodeLessonStartedEvent = {
  readonly name: "episode_lesson_started";
  readonly episodeId: string;
  readonly unitKey: string;
  readonly unitRole: CatalogUnitRole;
  readonly questionCount: string;
  readonly skippedItemCount: string;
};

export type EpisodeLessonFinishedEvent = {
  readonly name: "episode_lesson_finished";
  readonly episodeId: string;
  readonly unitKey: string;
  readonly unitRole: CatalogUnitRole;
  readonly verdict: AssessmentVerdict;
  readonly correctCount: string;
  readonly questionCount: string;
};

export type EpisodeFinalPassedEvent = {
  readonly name: "episode_final_passed";
  readonly episodeId: string;
  readonly correctCount: string;
  readonly turnCount: string;
};

export type CatalogLearningEvent =
  | EpisodeLessonStartedEvent
  | EpisodeLessonFinishedEvent
  | EpisodeFinalPassedEvent;
