// 단어 선택의 그림 제시 — 로드 상태의 타입과 순수 전이입니다. UI를 import하지 않습니다.

import type { UiCopy } from "../../lib/ui-copy.contract";
import type { WordChoiceQuestion } from "./word-choice-questions";

export type WordChoicePictureState = "loading" | "loaded" | "failed";

export type WordChoicePictureEvent = "load" | "error" | "timeout";

export type WordChoicePictureAnswer = {
  readonly word: string;
  readonly romanization: string | null;
};

export type WordChoicePictureCopy = {
  readonly picture: (meaning: string) => string;
  readonly loading: string;
  readonly unavailable: (meaning: string) => string;
  readonly unavailableCaption: string;
  readonly answer: (word: string, romanization: string | null, meaning: string) => string;
};

export type WordChoicePictureProps = {
  readonly url: string;
  readonly meaning: string;
  readonly state: WordChoicePictureState;
  /** 답한 뒤에만 섭니다(이름표). 답하기 전에는 `null`. */
  readonly answer: WordChoicePictureAnswer | null;
  readonly onLoad: () => void;
  readonly onError: () => void;
};

export type WordChoicePictureTestId =
  | "word-choice-picture"
  | "word-choice-picture-frame"
  | "word-choice-picture-image"
  | "word-choice-picture-fallback"
  | "word-choice-picture-caption"
  | "word-choice-picture-answer";

/** 그림이 이 시간 안에 끝 상태가 아니면 실패로 칩니다 — `binderror`가 오지 않는 실패를 끝냅니다. */
export const wordChoicePictureTimeoutMs = 6000;

export function wordChoicePictureStateAfter(
  state: WordChoicePictureState,
  event: WordChoicePictureEvent,
): WordChoicePictureState {
  if (state !== "loading") return state;
  return event === "load" ? "loaded" : "failed";
}

export function canAnswerWordChoice(
  question: WordChoiceQuestion,
  pictureState: WordChoicePictureState,
): boolean {
  return question.picture === undefined || pictureState !== "loading";
}

export function wordChoicePictureLabel(
  meaning: string,
  state: WordChoicePictureState,
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

export function wordChoicePictureAnswerOf(
  question: WordChoiceQuestion,
): WordChoicePictureAnswer | null {
  if (question.picture === undefined) return null;
  const word = question.choices[question.answerIndex];
  return word === undefined ? null : { word, romanization: question.picture.answerRomanization };
}
