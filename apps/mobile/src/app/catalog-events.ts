// 카탈로그 학습 측정 이벤트를 만듭니다(순수). 수는 10진 문자열입니다.

import type {
  CatalogStartSource,
  ChoiceChipSoundPlayedEvent,
  ReplayStoryStage,
  SentenceAudioReplayedEvent,
  CatalogUnitRole,
  EpisodeFinalPassedEvent,
  EpisodeItemAnsweredEvent,
  EpisodeLessonFinishedEvent,
  EpisodeLessonStartedEvent,
  EpisodeListenItemAnsweredEvent,
} from "../lib/catalog-learning-event.contract";
import type { CatalogUnitKey } from "../lib/catalog-progress";
import { scoredItemTypeOf, type ItemAnswerReport } from "../lib/item-answer";
import type { ListenItemReport } from "../lib/question-audio";
import type { LessonSoundUse } from "../lib/sentence-replay";
import type { AnswerResult } from "../lib/answer-result";
import type { AssessmentVerdict } from "../screens/assessment/assessment";
import type { CatalogItemRef } from "./catalog-lesson-types";

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
  source?: CatalogStartSource,
): EpisodeLessonStartedEvent {
  return {
    name: "episode_lesson_started",
    episodeId: start.episodeId,
    unitKey: start.unitKey,
    unitRole: role,
    questionCount: String(start.questionCount),
    shownItemCount: String(start.shownItemCount),
    skippedItemCount: String(start.skippedItemCount),
    ...(source === undefined ? {} : { startSource: source }),
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

/** 문항을 낸 판의 정보입니다. */
export type ItemAnswerContent = {
  readonly version: string;
  readonly source: "bundled" | "remote";
  readonly level?: number;
};

/** 채점 문항의 첫 판정 이벤트입니다. 채점 유형이 아니면 `null`입니다. */
export function itemAnsweredEventOf(
  episodeId: string,
  unitKey: CatalogUnitKey,
  ref: CatalogItemRef,
  report: ItemAnswerReport,
  content?: ItemAnswerContent,
): EpisodeItemAnsweredEvent | null {
  const itemType = scoredItemTypeOf(ref.itemType);
  if (itemType === null) return null;
  return {
    name: "episode_item_answered",
    episodeId,
    unitKey,
    itemId: ref.itemId,
    itemType,
    result: report.outcome,
    density: report.density,
    ...(content === undefined
      ? {}
      : { contentVersion: content.version, contentSource: content.source }),
    ...(content?.level === undefined ? {} : { contentLevel: String(content.level) }),
    ...(report.selectedAnswer === undefined ? {} : { selectedAnswer: report.selectedAnswer }),
    ...(report.outcome === "skipped" && report.skipReason !== undefined
      ? { skipReason: report.skipReason }
      : {}),
    ...(report.hintUsed === undefined ? {} : { hintUsed: report.hintUsed }),
    ...(report.speech === undefined
      ? {}
      : {
          speechErrorCode: String(report.speech.errorCode),
          speechFallback: report.speech.fallback,
          speechKoreanPack: report.speech.koreanPack,
        }),
  };
}

/** 이야기 컷에서 대사를 다시 들은 이벤트입니다(ADR-0188). */
export function storySentenceReplayedEventOf(
  episodeId: string,
  stage: ReplayStoryStage,
): SentenceAudioReplayedEvent {
  return { name: "sentence_audio_replayed", episodeId, surface: "story_cut", stage };
}

/** 레슨이 알린 소리 사용을 이벤트로 바꿉니다(ADR-0188) — 다시 듣기 또는 칩 소리. */
export function lessonSoundUsedEventOf(
  episodeId: string,
  unitKey: CatalogUnitKey,
  use: LessonSoundUse,
): SentenceAudioReplayedEvent | ChoiceChipSoundPlayedEvent {
  if (use.kind === "chip-sound") {
    return { name: "choice_chip_sound_played", episodeId, unitKey, surface: use.surface };
  }
  return { name: "sentence_audio_replayed", episodeId, surface: "lesson_answer", unitKey };
}
