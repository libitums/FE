// 카탈로그 학습 측정 이벤트를 만듭니다(순수). 수는 10진 문자열입니다.

import type {
  CatalogUnitRole,
  EpisodeFinalPassedEvent,
  EpisodeLessonFinishedEvent,
  EpisodeLessonStartedEvent,
} from "../lib/catalog-learning-event.contract";
import type { AnswerResult } from "../lib/answer-result";
import type { AssessmentVerdict } from "../screens/assessment/assessment";

export function lessonStartedEventOf(
  start: {
    readonly episodeId: string;
    readonly unitKey: string;
    readonly questionCount: number;
    readonly skippedItemCount: number;
  },
  role: CatalogUnitRole,
): EpisodeLessonStartedEvent {
  return {
    name: "episode_lesson_started",
    episodeId: start.episodeId,
    unitKey: start.unitKey,
    unitRole: role,
    questionCount: "",
    skippedItemCount: "",
  };
}

export function lessonFinishedEventOf(
  episodeId: string,
  unitKey: string,
  role: CatalogUnitRole,
  _results: readonly AnswerResult[],
  _questionCount: number,
  verdict: AssessmentVerdict,
): EpisodeLessonFinishedEvent {
  return {
    name: "episode_lesson_finished",
    episodeId,
    unitKey,
    unitRole: role,
    verdict,
    correctCount: "",
    questionCount: "",
  };
}

export function finalPassedEventOf(
  episodeId: string,
  _results: readonly AnswerResult[],
  _turnCount: number,
): EpisodeFinalPassedEvent {
  return { name: "episode_final_passed", episodeId, correctCount: "", turnCount: "" };
}
