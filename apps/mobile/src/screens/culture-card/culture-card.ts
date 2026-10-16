// 문화 카드 활동의 순수 로직입니다. UI를 import하지 않습니다.

import type { LessonPosition } from "../learning/activity-finish";
import type {
  CultureCardSessionAction,
  CultureCardSessionState,
  CultureCardStep,
} from "./culture-card.contract";

export const initialCultureCardSessionState: CultureCardSessionState = { cardIndex: 0 };

/** `nextCard`는 카드 번호를 하나 올립니다. 상한은 화면이 지킵니다. */
export function cultureCardSessionReducer(
  state: CultureCardSessionState,
  action: CultureCardSessionAction,
): CultureCardSessionState {
  switch (action.type) {
    case "nextCard":
      return { cardIndex: state.cardIndex + 1 };
  }
}

/** 마지막 카드 전은 advance, 마지막이면 레슨 중간은 hand-off, 그 밖은 finish입니다. */
export function cultureCardStepOf(
  lesson: LessonPosition | undefined,
  cardIndex: number,
  total: number,
): CultureCardStep {
  if (cardIndex < total - 1) return "advance";
  return lesson !== undefined && !lesson.last ? "hand-off" : "finish";
}
