// 타자 입력 활동의 순수 로직입니다. UI를 import하지 않습니다.

import type { AnswerResult } from "../../lib/answer-result";
import type { UiCopy } from "../../lib/ui-copy.contract";
import type { TypingQuestion, TypingSessionAction, TypingSessionState } from "./typing.contract";

export const initialTypingSessionState: TypingSessionState = {
  questionIndex: 0,
  keys: [],
  shifted: false,
  phase: "typing",
  submitted: [],
};

export function typingSessionReducer(
  state: TypingSessionState,
  _action: TypingSessionAction,
): TypingSessionState {
  return state;
}

/** 누른 키의 열을 조합한 입력 문자열입니다. */
export function typedTextOf(_state: TypingSessionState): string {
  return "";
}

export function canCheckTyping(_state: TypingSessionState): boolean {
  return false;
}

export function judgeTyping(_question: TypingQuestion, _typed: string): AnswerResult {
  return "incorrect";
}

/** 확인 전이면 `null`, 확인 뒤면 그 문항의 판정입니다. */
export function typingResultAt(
  _question: TypingQuestion,
  _state: TypingSessionState,
): AnswerResult | null {
  return null;
}

export function isTypingSessionComplete(_state: TypingSessionState, _total: number): boolean {
  return false;
}

export function typingSessionResults(
  _questions: readonly TypingQuestion[],
  _submitted: readonly string[],
): readonly AnswerResult[] {
  return [];
}

export function typingCompletionAnnouncement(_nextActionLabel: string, _copy: UiCopy): string {
  return "";
}
