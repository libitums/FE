// 따라 읽기 활동의 순수 로직입니다. UI를 import하지 않습니다.

import { matchedWordCount, speakingWords } from "../../lib/speaking-judge";
import { speechAvailabilityAfter, speechPhaseFor } from "../../lib/speech-attempt";
import type { SpeechAttemptPhase, SpeechControls } from "../../lib/speech-attempt";
import type { UiCopy } from "../../lib/ui-copy.contract";
import type { LessonPosition } from "../learning/activity-finish";
import type {
  ReadAloudQuestion,
  ReadAloudSessionAction,
  ReadAloudSessionState,
  ReadAloudStep,
} from "./read-aloud.contract";

export const initialReadAloudSessionState: ReadAloudSessionState = {
  questionIndex: 0,
  phase: { kind: "ready" },
  availability: "open",
  skippedCount: 0,
};

function nextQuestion(state: ReadAloudSessionState, skipped: number): ReadAloudSessionState {
  return {
    questionIndex: state.questionIndex + 1,
    phase: speechPhaseFor(state.availability),
    availability: state.availability,
    skippedCount: state.skippedCount + skipped,
  };
}

export function readAloudSessionReducer(
  state: ReadAloudSessionState,
  action: ReadAloudSessionAction,
): ReadAloudSessionState {
  const { phase } = state;
  switch (action.type) {
    case "start": {
      const startable =
        phase.kind === "ready" ||
        phase.kind === "heard" ||
        (phase.kind === "unavailable" && phase.reason === "dictation-off");
      return startable ? { ...state, phase: { kind: "listening" } } : state;
    }
    case "outcome":
      return phase.kind === "listening"
        ? {
            ...state,
            phase: action.outcome,
            availability: speechAvailabilityAfter(state.availability, action.outcome),
          }
        : state;
    case "next":
      return phase.kind === "ready" || phase.kind === "heard" ? nextQuestion(state, 0) : state;
    case "skip":
      return phase.kind === "unavailable" ? nextQuestion(state, 1) : state;
  }
}

export function readAloudStepOf(
  lesson: LessonPosition | undefined,
  questionIndex: number,
  total: number,
): ReadAloudStep {
  if (questionIndex < total - 1) {
    return "advance";
  }
  return lesson !== undefined && !lesson.last ? "hand-off" : "finish";
}

export function readAloudControlsOf(phase: SpeechAttemptPhase): SpeechControls {
  switch (phase.kind) {
    case "ready":
      return { primary: "speak", secondary: "next" };
    case "listening":
      return { primary: "stop", secondary: null };
    case "heard":
      return { primary: "next", secondary: "retry" };
    case "unavailable":
      return { primary: "skip", secondary: phase.reason === "dictation-off" ? "retry" : null };
  }
}

export function readAloudMatchedCount(
  question: ReadAloudQuestion,
  phase: SpeechAttemptPhase,
): number {
  return phase.kind === "heard" ? matchedWordCount(question.sentence, phase.text) : 0;
}

export function readAloudHintOf(
  question: ReadAloudQuestion,
  phase: SpeechAttemptPhase,
  copy: UiCopy,
): string | null {
  if (phase.kind === "heard") {
    return copy.readAloud.matched(
      matchedWordCount(question.sentence, phase.text),
      speakingWords(question.sentence).length,
    );
  }
  if (phase.kind === "unavailable" && phase.reason !== "dictation-off") {
    return copy.speaking.recognitionUnavailable;
  }
  return null;
}

export function readAloudInstructionOf(phase: SpeechAttemptPhase, copy: UiCopy): string {
  return phase.kind === "unavailable" && phase.reason === "dictation-off"
    ? copy.speaking.dictationDisabled
    : copy.speaking.instruction;
}
