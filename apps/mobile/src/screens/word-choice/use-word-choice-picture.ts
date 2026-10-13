// 그림 문항의 로드 상태를 문항마다 들고 있는 훅입니다. 지금은 늘 「로드됨」인 뼈대입니다.

import type { WordChoicePictureState } from "./word-choice-picture";
import type { WordChoiceQuestion } from "./word-choice-questions";

const noop = (): void => undefined;

export function useWordChoicePicture(
  _question: WordChoiceQuestion | null | undefined,
  _questionIndex: number,
): {
  readonly state: WordChoicePictureState;
  readonly onLoad: () => void;
  readonly onError: () => void;
} {
  return { state: "loaded", onLoad: noop, onError: noop };
}
