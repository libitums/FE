// 따라 읽기 활동의 순수 로직입니다. UI를 import하지 않습니다.
//
// 스캐폴드: 상태 전이 · 걸음 · 조작 표 · 문구는 import만 가능한 자리표시자입니다.

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

export function readAloudSessionReducer(
  state: ReadAloudSessionState,
  _action: ReadAloudSessionAction,
): ReadAloudSessionState {
  return state;
}

export function readAloudStepOf(
  _lesson: LessonPosition | undefined,
  _questionIndex: number,
  _total: number,
): ReadAloudStep {
  return "finish";
}

export function readAloudControlsOf(_phase: SpeechAttemptPhase): SpeechControls {
  return { primary: null, secondary: null };
}

export function readAloudMatchedCount(
  _question: ReadAloudQuestion,
  _phase: SpeechAttemptPhase,
): number {
  return 0;
}

export function readAloudHintOf(
  _question: ReadAloudQuestion,
  _phase: SpeechAttemptPhase,
  _copy: UiCopy,
): string | null {
  return null;
}

export function readAloudInstructionOf(_phase: SpeechAttemptPhase, _copy: UiCopy): string {
  return "";
}
