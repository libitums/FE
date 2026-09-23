// 스텝 시트의 열림 상태 전이를 소유합니다 — `StepSheetState`·`StepSheetAction`·
// `initialStepSheetState`·`canOpenStep`·`stepSheetReducer`입니다.

import type { JourneyStepId, JourneyStepStatus } from "./journey-map-units";

export type StepSheetState = {
  readonly openStepId: JourneyStepId | null;
};

export type StepSheetAction =
  | { readonly type: "openStep"; readonly stepId: JourneyStepId }
  | { readonly type: "closeSheet" };

export const initialStepSheetState: StepSheetState = { openStepId: null };

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
      if (state.openStepId === action.stepId) {
        return state;
      }
      return { openStepId: action.stepId };
    }
    case "closeSheet": {
      if (state.openStepId === null) {
        return state;
      }
      return { openStepId: null };
    }
  }
}
