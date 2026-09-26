// 스텝 시트의 열림 상태 전이를 소유합니다 — `StepSheetState`·`StepSheetAction`·
// `initialStepSheetState`·`canOpenStep`·`stepSheetReducer`입니다.

import type { JourneyStepId, JourneyStepStatus } from "./journey-map-units";

export type StepSheetState = {
  readonly openStepId: JourneyStepId | null;
  /**
   * 말풍선이 설 세로 자리입니다 — 누른 유닛의 탭 좌표를 그대로 둡니다. 닫힌 동안은
   * 0이고, 그 값은 읽히지 않습니다(말풍선이 없습니다).
   */
  readonly anchorY: number;
};

export type StepSheetAction =
  | { readonly type: "openStep"; readonly stepId: JourneyStepId; readonly tapY: number }
  | { readonly type: "closeSheet" };

export const initialStepSheetState: StepSheetState = { openStepId: null, anchorY: 0 };

// "이 상태가 시트를 여는가"의 정본입니다 — export하지 않는 모듈 내부 상수입니다.
// 부등호 비교가 아니라 표를 쓰는 이유는 상태가 하나 늘면 tsc가 그 상태의 답을 쓰라고
// 강제하기 때문입니다.
const stepOpensSheet: Record<JourneyStepStatus, boolean> = {
  done: true,
  current: true,
  locked: false,
};

// 판정만 합니다 — 아무것도 막지 않습니다. 차단은 `JourneyStepNode`의 `bindtap`
// 핸들러가 집니다.
export function canOpenStep(status: JourneyStepStatus): boolean {
  return stepOpensSheet[status];
}

// 변화 없으면 같은 참조를 돌려줍니다 — `navReducer`의 `switchTab`·`enterApp`과 같은
// 규약입니다.
export function stepSheetReducer(state: StepSheetState, action: StepSheetAction): StepSheetState {
  switch (action.type) {
    case "openStep": {
      // 같은 스텝을 다시 눌러도 자리는 갱신합니다 — 스크롤 뒤 같은 유닛을 누르면
      // 그 유닛은 화면의 다른 높이에 있습니다.
      if (state.openStepId === action.stepId && state.anchorY === action.tapY) {
        return state;
      }
      return { openStepId: action.stepId, anchorY: action.tapY };
    }
    case "closeSheet": {
      if (state.openStepId === null) {
        return state;
      }
      return { openStepId: null, anchorY: 0 };
    }
  }
}

// 말풍선의 진행 줄 값입니다. 화면이 계산식을 들고 있지 않도록 여기서 뽑습니다.
export type StepSheetProgress = {
  readonly countLabel: string;
  readonly percentLabel: string;
  readonly fillPercent: number;
};

/**
 * 끝낸 활동 수와 전체 활동 수에서 진행 줄의 값 셋을 뽑습니다. 데이터 오류는 숨기지
 * 않고 던집니다 — 비어 있는 배정표나 음수 완료 수는 값으로 표현할 수 있는 상태가
 * 아닙니다.
 *
 * 백분율은 라벨과 막대가 **같은 수**에서 나옵니다. 디자인(Figma 79-5682)은 라벨이
 * `0%`인데 막대가 86% 차 있어 둘이 어긋나 있는데, 그 어긋남까지 옮기지 않습니다.
 */
export function stepSheetProgress(completed: number, total: number): StepSheetProgress {
  if (!Number.isInteger(total) || total <= 0) {
    throw new Error(`전체 활동 수는 1 이상의 정수여야 합니다: ${total}`);
  }
  if (!Number.isInteger(completed) || completed < 0) {
    throw new Error(`끝낸 활동 수는 0 이상의 정수여야 합니다: ${completed}`);
  }
  if (completed > total) {
    throw new Error(`끝낸 활동 수가 전체보다 많습니다: ${completed} / ${total}`);
  }
  return {
    countLabel: `${completed}/${total} 활동`,
    percentLabel: `${Math.round((completed / total) * 100)}%`,
    fillPercent: (completed / total) * 100,
  };
}
