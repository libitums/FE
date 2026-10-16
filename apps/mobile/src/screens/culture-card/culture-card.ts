// 문화 카드 활동의 순수 로직입니다. UI를 import하지 않습니다.
//
// 뼈대만 선 상태입니다 — 전이와 걸음 계산은 아직 채우지 않았습니다.

import type { LessonPosition } from "../learning/activity-finish";
import type {
  CultureCardSessionAction,
  CultureCardSessionState,
  CultureCardStep,
} from "./culture-card.contract";

export const initialCultureCardSessionState: CultureCardSessionState = { cardIndex: 0 };

export function cultureCardSessionReducer(
  state: CultureCardSessionState,
  _action: CultureCardSessionAction,
): CultureCardSessionState {
  return state;
}

export function cultureCardStepOf(
  _lesson: LessonPosition | undefined,
  _cardIndex: number,
  _total: number,
): CultureCardStep {
  return "finish";
}
