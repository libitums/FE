// 단어 카드 활동의 순수 로직입니다. UI를 import하지 않습니다.

import type { UiCopy } from "../../lib/ui-copy.contract";
import type { LessonPosition } from "../learning/activity-finish";
import type { LearningRunProgress } from "../learning/learning-shell.contract";
import type {
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

/**
 * 카드 진행 막대의 값입니다 — 지난 카드는 `done`, 지금 카드는 `current`, 남은 카드는 `upcoming`이고,
 * 이름은 캡션과 접근성 이름에 함께 쓰는 순번(`Word 4 of 7`)입니다. 카드가 0장이면 셀 것이 없으므로
 * 칸도 이름도 없습니다.
 */
export function vocabCardRunProgress(
  cardIndex: number,
  total: number,
  copy: UiCopy,
): LearningRunProgress {
  if (total <= 0) return { segments: [], label: "" };
  const current = Math.min(Math.max(0, cardIndex), total - 1);
  return {
    segments: Array.from({ length: total }, (_, index) =>
      index < current ? "done" : index === current ? "current" : "upcoming",
    ),
    label: copy.vocabCard.runLabel(current + 1, total),
  };
}
