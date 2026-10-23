// 단어 선택의 그림 제시 — 로드 상태의 타입과 순수 전이입니다. UI를 import하지 않습니다.

import { pictureLoadStateAfter, pictureLoadTimeoutMs } from "../../lib/picture-load";
import type { PictureLoadEvent, PictureLoadState } from "../../lib/picture-load";
import type { UiCopy } from "../../lib/ui-copy.contract";
import type { WordChoiceQuestion } from "./word-choice-questions";

export type WordChoicePictureState = PictureLoadState;

export type WordChoicePictureEvent = PictureLoadEvent;

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
  /** 이름표의 보이는 둘째 줄입니다 — 로마자가 있으면 뜻과 함께 한 줄로 잇습니다. */
  readonly answerSubline: (romanization: string | null, meaning: string) => string;
};

/** 그림 틀의 가로:세로 비율입니다 — 보기 한 행(2개)은 정사각, 두 행(3 ~ 4개)은 4:3입니다. */
export type WordChoicePictureRatio = "1-1" | "4-3";

export type WordChoicePictureProps = {
  readonly url: string;
  /** 틀 비율입니다. 없으면 4:3. */
  readonly ratio?: WordChoicePictureRatio;
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

/** 전이 · 시한의 정본은 `lib/picture-load.ts`입니다 — 옛 이름을 그대로 냅니다. */
export const wordChoicePictureTimeoutMs = pictureLoadTimeoutMs;

export const wordChoicePictureStateAfter = pictureLoadStateAfter;

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

/** 보기 수에서 그림 틀 비율을 정합니다 — 보기가 한 행이면 정사각, 두 행이면 4:3. */
export function wordChoicePictureRatioOf(choiceCount: number): WordChoicePictureRatio {
  return choiceCount <= 2 ? "1-1" : "4-3";
}
