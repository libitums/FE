// 그림 보고 낱말 말하기 활동의 순수 로직입니다. UI를 import하지 않습니다.
//
// 스캐폴드: 상태 전이 · 판정 · 조작 표 · 문구는 import만 가능한 자리표시자입니다.

import type { AnswerResult } from "../../lib/answer-result";
import type { NonEmpty } from "../../lib/non-empty";
import type { PictureLoadState } from "../../lib/picture-load";
import type { SpeechAttemptPhase, SpeechControls } from "../../lib/speech-attempt";
import type { UiCopy } from "../../lib/ui-copy.contract";
import type {
  SpeakWordQuestion,
  SpeakWordSessionAction,
  SpeakWordSessionState,
} from "./speak-word.contract";

export const initialSpeakWordSessionState: SpeakWordSessionState = {
  questionIndex: 0,
  phase: { kind: "ready" },
  availability: "open",
  heard: [],
};

export function speakWordSessionReducer(
  state: SpeakWordSessionState,
  _action: SpeakWordSessionAction,
): SpeakWordSessionState {
  return state;
}

export function judgeSpokenWord(_answers: NonEmpty<string>, _heard: string): AnswerResult {
  return "incorrect";
}

export function speakWordResultAt(
  _question: SpeakWordQuestion,
  _state: SpeakWordSessionState,
): AnswerResult | null {
  return null;
}

export function speakWordSessionResults(
  _questions: readonly SpeakWordQuestion[],
  _heard: readonly (string | null)[],
): readonly AnswerResult[] {
  return [];
}

export function speakWordSkippedCount(_heard: readonly (string | null)[]): number {
  return 0;
}

export function isSpeakWordSessionComplete(_state: SpeakWordSessionState, _total: number): boolean {
  return false;
}

export function canSpeakWord(_pictureState: PictureLoadState): boolean {
  return false;
}

export function speakWordControlsOf(
  _phase: SpeechAttemptPhase,
  _pictureState: PictureLoadState,
): SpeechControls {
  return { primary: null, secondary: null };
}

export function speakWordHintOf(_phase: SpeechAttemptPhase, _copy: UiCopy): string | null {
  return null;
}

export function speakWordInstructionOf(
  _question: SpeakWordQuestion,
  _phase: SpeechAttemptPhase,
  _copy: UiCopy,
): string {
  return "";
}

export function speakWordRevealText(_question: SpeakWordQuestion, _copy: UiCopy): string {
  return "";
}

export function speakWordMeaningShown(_pictureState: PictureLoadState): boolean {
  return false;
}

export function speakWordPictureLabel(
  _meaning: string,
  _state: PictureLoadState,
  _copy: UiCopy,
): string {
  return "";
}

export function speakWordCompletionAnnouncement(_nextActionLabel: string, _copy: UiCopy): string {
  return "";
}
