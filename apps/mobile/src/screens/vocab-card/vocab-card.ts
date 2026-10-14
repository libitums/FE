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
  action: VocabCardSessionAction,
): VocabCardSessionState {
  switch (action.type) {
    case "nextCard":
      return { cardIndex: state.cardIndex + 1 };
  }
}

export function vocabCardStepOf(
  lesson: LessonPosition | undefined,
  cardIndex: number,
  total: number,
): VocabCardStep {
  if (cardIndex < total - 1) return "advance";
  return lesson !== undefined && !lesson.last ? "hand-off" : "finish";
}

export function vocabCardExampleSupportLabel(
  example: VocabCardExample,
  copy: UiCopy,
): string | null {
  const parts: string[] = [];
  if (example.romanization !== null) parts.push(copy.vocabCard.pronunciation(example.romanization));
  if (example.translation !== null) parts.push(copy.vocabCard.meaning(example.translation));
  return parts.length === 0 ? null : parts.join(" ");
}
