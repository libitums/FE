// 단어 카드 활동의 순수 로직입니다. UI를 import하지 않습니다.

import type { UiCopy } from "../../lib/ui-copy.contract";
import type { LessonPosition } from "../learning/activity-finish";
import type {
  VocabCardExample,
  VocabCardSessionAction,
  VocabCardSessionState,
  VocabCardStep,
} from "./vocab-card.contract";

export const initialVocabCardSessionState: VocabCardSessionState = { cardIndex: 0 };

export function vocabCardSessionReducer(
  state: VocabCardSessionState,
  _action: VocabCardSessionAction,
): VocabCardSessionState {
  return state;
}

export function vocabCardStepOf(
  _lesson: LessonPosition | undefined,
  _cardIndex: number,
  _total: number,
): VocabCardStep {
  return "advance";
}

export function vocabCardExampleSupportLabel(
  _example: VocabCardExample,
  _copy: UiCopy,
): string | null {
  return null;
}
