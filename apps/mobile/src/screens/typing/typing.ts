// 타자 입력 활동의 순수 로직입니다. UI를 import하지 않습니다.

import type { AnswerResult } from "../../lib/answer-result";
import type { KeyboardDockBottom } from "../../lib/keyboard-dock";
import { composeHangul, isTypedAnswerAccepted, shiftedKeys } from "../../lib/hangul-keyboard";
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
  action: TypingSessionAction,
): TypingSessionState {
  switch (action.type) {
    case "press": {
      if (state.phase !== "typing") return state;
      const key = state.shifted ? (shiftedKeys[action.key] ?? action.key) : action.key;
      return { ...state, keys: [...state.keys, key], shifted: false };
    }
    case "backspace":
      if (state.phase !== "typing") return state;
      return { ...state, keys: state.keys.slice(0, -1), shifted: false };
    case "shift":
      if (state.phase !== "typing") return state;
      return { ...state, shifted: !state.shifted };
    case "check": {
      if (!canCheckTyping(state)) return state;
      return {
        ...state,
        shifted: false,
        phase: "checked",
        submitted: [...state.submitted, typedTextOf(state)],
      };
    }
    case "nextQuestion":
      if (state.phase !== "checked") return state;
      return {
        ...state,
        questionIndex: state.questionIndex + 1,
        keys: [],
        shifted: false,
        phase: "typing",
      };
  }
}

/** 누른 키의 열을 조합한 입력 문자열입니다. */
export function typedTextOf(state: TypingSessionState): string {
  return composeHangul(state.keys);
}

export function canCheckTyping(state: TypingSessionState): boolean {
  return state.phase === "typing" && typedTextOf(state).trim().length > 0;
}

export function judgeTyping(question: TypingQuestion, typed: string): AnswerResult {
  return isTypedAnswerAccepted(typed, question.answers) ? "correct" : "incorrect";
}

/** 확인 전이면 `null`, 확인 뒤면 그 문항의 판정입니다. */
export function typingResultAt(
  question: TypingQuestion,
  state: TypingSessionState,
): AnswerResult | null {
  if (state.phase !== "checked") return null;
  return judgeTyping(question, state.submitted[state.questionIndex] ?? "");
}

export function isTypingSessionComplete(state: TypingSessionState, total: number): boolean {
  return state.questionIndex >= total;
}

/** 자판이 아래 가장자리를 지는지 정합니다. */
export function typingKeyboardDock(
  state: TypingSessionState,
  questionCount: number,
): KeyboardDockBottom {
  return isTypingSessionComplete(state, questionCount) || state.phase === "checked"
    ? "body"
    : "keyboard";
}

export function typingSessionResults(
  questions: readonly TypingQuestion[],
  submitted: readonly string[],
): readonly AnswerResult[] {
  return questions.flatMap((question, index) => {
    const typed = submitted[index];
    return typed === undefined ? [] : [judgeTyping(question, typed)];
  });
}

export function typingCompletionAnnouncement(nextActionLabel: string, copy: UiCopy): string {
  return `${copy.common.allQuestionsDone}, ${nextActionLabel}`;
}
