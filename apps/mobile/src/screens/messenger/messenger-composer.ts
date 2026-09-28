// 메신저 답장 입력창의 순수 상태 전이입니다. 조합 · 채점 규칙은 `hangul-keyboard.ts`가
// 집니다 — 여기는 어떤 키가 언제 먹히는지만 정합니다.

import type { MessengerComposerAction, MessengerComposerState } from "./messenger.contract";
import { composeHangul, isTypedAnswerCorrect, shiftedKeys } from "./hangul-keyboard";

/** 맞힌 뒤 답장이 대화에 서기까지의 틈(밀리초)입니다 — 판정 배지를 읽을 시간입니다. */
export const messengerCorrectDelayMs = 1200;

export const initialMessengerComposerState: MessengerComposerState = {
  keys: [],
  shifted: false,
  verdict: "typing",
};

export function messengerComposerReducer(
  state: MessengerComposerState,
  action: MessengerComposerAction,
): MessengerComposerState {
  if (action.type === "clear") return initialMessengerComposerState;
  if (action.type === "retry") {
    return state.verdict === "incorrect" ? initialMessengerComposerState : state;
  }
  // 판정이 난 뒤에는 자판이 먹지 않습니다 — 맞힌 답은 곧 대화에 서고, 틀린 답은
  // `Try Again`으로만 되돌립니다.
  if (state.verdict !== "typing") return state;

  switch (action.type) {
    case "press": {
      const key = state.shifted ? (shiftedKeys[action.key] ?? action.key) : action.key;
      return { ...state, keys: [...state.keys, key], shifted: false };
    }
    case "backspace":
      return { ...state, keys: state.keys.slice(0, -1), shifted: false };
    case "shift":
      return { ...state, shifted: !state.shifted };
    case "submit": {
      const typed = composedText(state);
      if (typed.trim().length === 0) return state;
      return {
        ...state,
        shifted: false,
        verdict: isTypedAnswerCorrect(typed, action.answer) ? "correct" : "incorrect",
      };
    }
  }
}

/** 입력창에 보이는 글자입니다. */
export const composedText = (state: MessengerComposerState): string => composeHangul(state.keys);
