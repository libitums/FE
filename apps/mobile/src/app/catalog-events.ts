// 카탈로그 학습 측정 이벤트를 만듭니다(순수). 수는 10진 문자열입니다.

import type {
  CatalogUnitRole,
  EpisodeFinalPassedEvent,
  EpisodeLessonFinishedEvent,
  EpisodeLessonStartedEvent,
  EpisodeListenItemAnsweredEvent,
} from "../lib/catalog-learning-event.contract";
import type { CatalogUnitKey } from "../lib/catalog-progress";
import type { ListenItemReport } from "../lib/question-audio";
import type { AnswerResult } from "../lib/answer-result";
import type { AssessmentVerdict } from "../screens/assessment/assessment";

const correctCountOf = (results: readonly AnswerResult[]): string =>
  String(results.filter((result) => result === "correct").length);

export function lessonStartedEventOf(
  start: {
    readonly episodeId: string;
    readonly unitKey: string;
    readonly questionCount: number;
    readonly shownItemCount: number;
    readonly skippedItemCount: number;
  },
  role: CatalogUnitRole,
): EpisodeLessonStartedEvent {
  return {
    name: "episode_lesson_started",
    episodeId: start.episodeId,
    unitKey: start.unitKey,
    unitRole: role,
    questionCount: String(start.questionCount),
    shownItemCount: String(start.shownItemCount),
    skippedItemCount: String(start.skippedItemCount),
  };
}

export function lessonFinishedEventOf(
  episodeId: string,
  unitKey: string,
  role: CatalogUnitRole,
  results: readonly AnswerResult[],
  questionCount: number,
  verdict: AssessmentVerdict,
  skippedCount: number,
): EpisodeLessonFinishedEvent {
  return {
    name: "episode_lesson_finished",
    episodeId,
    unitKey,
    unitRole: role,
    verdict,
    correctCount: correctCountOf(results),
    questionCount: String(questionCount),
    skippedCount: String(skippedCount),
  };
}

export function finalPassedEventOf(
  episodeId: string,
  results: readonly AnswerResult[],
  turnCount: number,
): EpisodeFinalPassedEvent {
  return {
    name: "episode_final_passed",
    episodeId,
    correctCount: correctCountOf(results),
    turnCount: String(turnCount),
  };
}

export function listenItemAnsweredEventOf(
  episodeId: string,
  unitKey: CatalogUnitKey,
  report: ListenItemReport,
): EpisodeListenItemAnsweredEvent {
  return {
    name: "episode_listen_item_answered",
    episodeId,
    unitKey,
    itemId: report.ref.itemId,
    itemType: report.ref.itemType,
    result: report.result,
    pace: report.pace,
    slowTurnedOn: report.slowTurnedOn,
    replayCount: String(report.replayCount),
    slowReplayCount: String(report.slowReplayCount),
  };
}
