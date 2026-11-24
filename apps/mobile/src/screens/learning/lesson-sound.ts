// 레슨 활동이 함께 쓰는 칩 소리 · 판정 뒤 다시 듣기 결선입니다(ADR-0189). 판정 · 점수 · 문항 보고와는 닿지 않고,
// 재생 모듈과 측정 알림(`LessonAudio.onSoundUsed`)만 부릅니다.

import { playAudio } from "../../lib/audio";
import { answerEchoCueOf } from "../../lib/question-audio";
import type { ChipSoundSurface, LessonAudio, QuestionAudio } from "../../lib/question-audio";
import { answerReplayOf, chipSoundAt } from "../../lib/sentence-replay";
import type { VerdictReplay } from "./learning-shell-props";

const noop = (): void => {};

/** 칩 `index`의 낱말 소리를 냅니다 — 소리가 없으면 아무 일도 하지 않습니다(알림도 없음). */
export function playChipSound(
  chipAudio: readonly (string | null)[] | undefined,
  index: number,
  lesson: LessonAudio,
  surface: ChipSoundSurface,
): void {
  // 자동 재생을 끈 사람에게는 칩 소리도 내지 않습니다 — 판정 효과음 · 화면낭독과 겹치는 소리를 끌 길이 이것뿐입니다(ADR-0189 D3).
  if (lesson.autoPlay === "off") return;
  const source = chipSoundAt(chipAudio, index);
  if (source === null) return;
  playAudio(source, noop);
  lesson.onSoundUsed?.({ kind: "chip-sound", surface });
}

/**
 * 단어 고르기 보기의 낱말 소리입니다 — 누름이 곧 판정이라, 판정 뒤 정답 음성(틈 0.8초)이 **같은 소리**면 칩 소리를 내지 않습니다
 * (정답 보기를 누르면 같은 문장이 두 번 나지 않게). 틀린 보기는 그 낱말 → 정답 음성 순으로 들립니다(ADR-0189 D3).
 */
export function playChoiceSound(
  choiceAudio: readonly (string | null)[] | undefined,
  index: number,
  audio: QuestionAudio | null | undefined,
  lesson: LessonAudio,
): void {
  const echo = answerEchoCueOf("choice", audio, true, lesson.autoPlay)?.source;
  if (echo !== undefined && chipSoundAt(choiceAudio, index) === echo) return;
  playChipSound(choiceAudio, index, lesson, "word_choice");
}

/** 판정 배지 옆 다시 듣기입니다 — 판정 전이면 없습니다(`answerReplayOf`). */
export function lessonVerdictReplayOf(
  audio: QuestionAudio | null | undefined,
  judged: boolean,
  lesson: LessonAudio,
): VerdictReplay | undefined {
  const replay = answerReplayOf(audio, judged);
  if (replay === null) return undefined;
  return { replay, onReplayed: () => lesson.onSoundUsed?.({ kind: "answer-replayed" }) };
}
