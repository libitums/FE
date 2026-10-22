// 카탈로그 학습(레슨 · 최종 테스트) 측정 이벤트의 타입 전용 계약입니다.
// 이벤트는 `EpisodeIntroEventSink`로 나갑니다 — 수는 10진 문자열입니다(ADR-0029).

import type { AssessmentVerdict } from "../screens/assessment/assessment";
import type { ItemAnswerOutcome, ScoredItemType } from "./item-answer";
import type { LearningDensity } from "./learning-density";
import type { ListenPace } from "./listen-pace";
import type { ListenItemResult, ListenItemType } from "./question-audio";

export type CatalogUnitRole = "lesson" | "final";

export type EpisodeLessonStartedEvent = {
  readonly name: "episode_lesson_started";
  readonly episodeId: string;
  readonly unitKey: string;
  readonly unitRole: CatalogUnitRole;
  /** 채점 문항 수입니다. */
  readonly questionCount: string;
  /** 표시 문항 수입니다(채점 문항 + 단어 카드). */
  readonly shownItemCount: string;
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
  /** 그 레슨에서 말하기를 건너뛴 문항 수입니다(읽기의 불가 Skip + 낱말의 Skip). 최종 테스트 · 0개 경로는 "0". */
  readonly skippedCount: string;
};

export type EpisodeFinalPassedEvent = {
  readonly name: "episode_final_passed";
  readonly episodeId: string;
  readonly correctCount: string;
  readonly turnCount: string;
};

export type EpisodeListenItemAnsweredEvent = {
  readonly name: "episode_listen_item_answered";
  readonly episodeId: string;
  readonly unitKey: string;
  readonly itemId: string;
  readonly itemType: ListenItemType;
  readonly result: ListenItemResult;
  /** 판정 순간의 속도입니다. */
  readonly pace: ListenPace;
  /** 이 문항에서 「천천히」를 켰는가입니다. */
  readonly slowTurnedOn: boolean;
  /** 1.0일 때 누른 다시 듣기 수입니다(10진 문자열). */
  readonly replayCount: string;
  /** 0.85일 때 누른 다시 듣기 수입니다(10진 문자열). */
  readonly slowReplayCount: string;
};

/**
 * 채점 문항이 처음 판정되는 순간 문항당 한 번 나는 이벤트입니다(유형별 정답률 · 밀도별 비교).
 * 아직 `CatalogLearningEvent` 합집합에 들어가지 않았습니다 — 이름 목록과 함께 들어갑니다.
 */
export type EpisodeItemAnsweredEvent = {
  readonly name: "episode_item_answered";
  readonly episodeId: string;
  readonly unitKey: string;
  readonly itemId: string;
  readonly itemType: ScoredItemType;
  readonly result: ItemAnswerOutcome;
  readonly density: LearningDensity;
};

export type CatalogLearningEvent =
  | EpisodeLessonStartedEvent
  | EpisodeLessonFinishedEvent
  | EpisodeFinalPassedEvent
  | EpisodeListenItemAnsweredEvent;
