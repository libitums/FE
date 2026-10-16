// 그림 보고 낱말 말하기 활동의 순수 로직입니다. UI를 import하지 않습니다.

import type { AnswerResult } from "../../lib/answer-result";
import type { NonEmpty } from "../../lib/non-empty";
import type { PictureLoadState } from "../../lib/picture-load";
import { judgeSpeaking } from "../../lib/speaking-judge";
import { speechAvailabilityAfter, speechPhaseFor } from "../../lib/speech-attempt";
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

function nextQuestion(
  state: SpeakWordSessionState,
  heard: readonly (string | null)[],
): SpeakWordSessionState {
  return {
    questionIndex: state.questionIndex + 1,
    phase: speechPhaseFor(state.availability),
    availability: state.availability,
    heard,
  };
}

export function speakWordSessionReducer(
  state: SpeakWordSessionState,
  action: SpeakWordSessionAction,
): SpeakWordSessionState {
  const { phase } = state;
  switch (action.type) {
    case "start": {
      const startable =
        phase.kind === "ready" ||
        (phase.kind === "unavailable" && phase.reason === "dictation-off");
      return startable ? { ...state, phase: { kind: "listening" } } : state;
    }
    case "outcome": {
      if (phase.kind !== "listening") {
        return state;
      }
      const { outcome } = action;
      return {
        ...state,
        phase: outcome,
        availability: speechAvailabilityAfter(state.availability, outcome),
        heard: outcome.kind === "heard" ? [...state.heard, outcome.text] : state.heard,
      };
    }
    case "skip":
      return phase.kind === "ready" || phase.kind === "unavailable"
        ? nextQuestion(state, [...state.heard, null])
        : state;
    case "next":
      return phase.kind === "heard" ? nextQuestion(state, state.heard) : state;
  }
}

/** 정답 중 하나라도 맞게 말했으면 정답입니다(앞 낱말 일치 — 부호 · 뒤 낱말은 무시). */
export function judgeSpokenWord(answers: NonEmpty<string>, heard: string): AnswerResult {
  return answers.some((answer) => judgeSpeaking(answer, heard) === "correct")
    ? "correct"
    : "incorrect";
}

export function speakWordResultAt(
  question: SpeakWordQuestion,
  state: SpeakWordSessionState,
): AnswerResult | null {
  return state.phase.kind === "heard" ? judgeSpokenWord(question.answers, state.phase.text) : null;
}

export function speakWordSessionResults(
  questions: readonly SpeakWordQuestion[],
  heard: readonly (string | null)[],
): readonly AnswerResult[] {
  const results: AnswerResult[] = [];
  const length = Math.min(questions.length, heard.length);
  for (let index = 0; index < length; index += 1) {
    const question = questions[index];
    const text = heard[index];
    if (question !== undefined && text !== undefined && text !== null) {
      results.push(judgeSpokenWord(question.answers, text));
    }
  }
  return results;
}

export function speakWordSkippedCount(heard: readonly (string | null)[]): number {
  return heard.filter((text) => text === null).length;
}

export function isSpeakWordSessionComplete(state: SpeakWordSessionState, total: number): boolean {
  return state.questionIndex >= total;
}

/** 그림이 loading이 아니면 말할 수 있습니다(실패해도 대체 글자로 말합니다). */
export function canSpeakWord(pictureState: PictureLoadState): boolean {
  return pictureState !== "loading";
}

export function speakWordControlsOf(
  phase: SpeechAttemptPhase,
  pictureState: PictureLoadState,
): SpeechControls {
  switch (phase.kind) {
    case "ready":
      return { primary: canSpeakWord(pictureState) ? "speak" : null, secondary: "skip" };
    case "listening":
      return { primary: "stop", secondary: null };
    case "heard":
      return { primary: null, secondary: null };
    case "unavailable":
      return { primary: "skip", secondary: phase.reason === "dictation-off" ? "retry" : null };
  }
}

export function speakWordHintOf(phase: SpeechAttemptPhase, copy: UiCopy): string | null {
  if (phase.kind === "heard") {
    return copy.speaking.tapToContinue;
  }
  if (phase.kind === "unavailable" && phase.reason !== "dictation-off") {
    return copy.speakWord.recognitionUnavailable;
  }
  return null;
}

export function speakWordInstructionOf(
  question: SpeakWordQuestion,
  phase: SpeechAttemptPhase,
  copy: UiCopy,
): string {
  if (phase.kind === "unavailable" && phase.reason === "dictation-off") {
    return copy.speaking.dictationDisabled;
  }
  return question.instruction ?? copy.speakWord.instruction;
}

export function speakWordRevealText(question: SpeakWordQuestion, copy: UiCopy): string {
  const [first] = question.answers;
  return copy.typing.answerReveal(
    question.romanization === null ? first : `${first} · ${question.romanization}`,
  );
}

/** 그림이 실패하면 틀 안 대체 글자가 같은 뜻을 보이므로 뜻 줄은 숨깁니다. */
export function speakWordMeaningShown(pictureState: PictureLoadState): boolean {
  return pictureState !== "failed";
}

export function speakWordPictureLabel(
  meaning: string,
  state: PictureLoadState,
  copy: UiCopy,
): string {
  switch (state) {
    case "loading":
      return copy.wordChoicePicture.loading;
    case "loaded":
      return copy.wordChoicePicture.picture(meaning);
    case "failed":
      return copy.wordChoicePicture.unavailable(meaning);
  }
}

export function speakWordCompletionAnnouncement(nextActionLabel: string, copy: UiCopy): string {
  return `${copy.common.allQuestionsDone}, ${nextActionLabel}`;
}
