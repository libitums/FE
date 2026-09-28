// 스텝 시트의 열림 상태 전이를 소유합니다 — `StepSheetState`·`StepSheetAction`·
// `initialStepSheetState`·`canOpenStep`·`stepSheetReducer`입니다.

import type { JourneyStepId, JourneyStepStatus } from "./journey-map-units";

export type StepSheetState = {
  readonly openStepId: JourneyStepId | null;
  /**
   * 누른 유닛의 **아래 모서리**입니다(화면 상자 기준). 말풍선은 이 바로 아래에 섭니다.
   * 닫힌 동안은 0이고, 그 값은 읽히지 않습니다(말풍선이 없습니다).
   */
  readonly anchorY: number;
  /**
   * `anchorY`를 잰 순간의 스크롤 자리입니다. 말풍선은 `anchorY`에 그 뒤의 스크롤
   * 변화량을 더해 자리를 냅니다 — 유닛을 가운데로 옮기는 동안 말풍선이 그 유닛에 붙어
   * 따라갑니다.
   */
  readonly anchorScrollTop: number;
  /**
   * 말풍선 꼭대기가 내려갈 수 있는 끝입니다. 화면 높이를 재기 전에는 `null`이고, 그때는
   * 가두지 않습니다 — 모르는 값으로 자리를 옮기는 것보다 유닛 곁에 두는 편이 낫습니다.
   */
  readonly anchorLimit: number | null;
};

export type StepSheetAction =
  | {
      readonly type: "openStep";
      readonly stepId: JourneyStepId;
      readonly anchorY: number;
      readonly scrollTop: number;
    }
  // 열린 뒤 유닛을 실제로 재서 자리를 바로잡습니다. 여는 동작이 아닙니다 — 재는 사이에
  // 닫혔거나 다른 스텝으로 바뀌었으면 아무것도 하지 않습니다.
  | {
      readonly type: "anchorStep";
      readonly stepId: JourneyStepId;
      readonly anchorY: number;
      readonly scrollTop: number;
      readonly anchorLimit: number;
    }
  | { readonly type: "closeSheet" };

export const initialStepSheetState: StepSheetState = {
  openStepId: null,
  anchorY: 0,
  anchorScrollTop: 0,
  anchorLimit: null,
};

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
      if (state.openStepId === action.stepId && state.anchorY === action.anchorY) {
        return state;
      }
      return {
        openStepId: action.stepId,
        anchorY: action.anchorY,
        anchorScrollTop: action.scrollTop,
        anchorLimit: null,
      };
    }
    case "anchorStep": {
      if (state.openStepId !== action.stepId) {
        return state;
      }
      return {
        openStepId: action.stepId,
        anchorY: action.anchorY,
        anchorScrollTop: action.scrollTop,
        anchorLimit: action.anchorLimit,
      };
    }
    case "closeSheet": {
      if (state.openStepId === null) {
        return state;
      }
      return initialStepSheetState;
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

/**
 * 유닛 표식의 지름입니다 — ui-lynx `LearningUnit`의 기하값(100)과 같아야 합니다. 그
 * 컴포넌트가 치수를 내보내지 않아 여기 한 번 더 적습니다.
 */
export const stepUnitSize = 100;

/** 유닛 아래 모서리와 말풍선 사이입니다. 꼬리 끝(상자 위로 약 4)이 유닛에 닿지 않습니다. */
const sheetGap = 8;

/**
 * 말풍선의 높이 어림값입니다(꼬리 포함). 안이 고정 구성(제목 한 줄 · 진행 줄 · 막대 ·
 * 버튼)이라 값이 거의 흔들리지 않습니다. **넉넉한 쪽으로** 잡습니다 — 모자라면 잘리고,
 * 남으면 유닛이 조금 높이 설 뿐입니다.
 */
const sheetHeight = 250;

/** 화면 아래를 덮는 바텀 네비게이션의 높이입니다(`.journey-map-screen-map`의 아래 여백). */
const bottomInset = 68;

/** 말풍선과 바텀 네비게이션 사이에 남길 여백입니다. */
const bottomMargin = 16;

/** 탭 순간에 잰 자리들입니다. 세로 좌표는 모두 같은 기준(LynxView)입니다. */
export type StepMeasure = {
  readonly unitTop: number;
  readonly scrollViewTop: number;
  readonly scrollViewHeight: number;
  readonly screenTop: number;
  readonly screenHeight: number;
  readonly scrollTop: number;
};

export type StepPlacement = {
  /** 유닛을 제자리로 옮기는 스크롤 목적지입니다. */
  readonly targetScrollTop: number;
  readonly anchorY: number;
  readonly anchorLimit: number;
};

/**
 * 잰 값에서 스크롤 목적지와 말풍선 자리를 냅니다.
 *
 * 유닛은 스크롤 상자의 **가운데**로 갑니다. 다만 화면이 낮아 그 자리에서 말풍선이
 * 바텀 네비게이션에 걸리면, 걸리지 않을 만큼만 위로 올립니다 — 가운데를 지키다 말풍선이
 * 잘리는 것보다 유닛이 조금 높이 서는 편이 낫습니다.
 *
 * 목적지는 0 아래로 내려가지 않습니다. 위쪽 끝은 모릅니다(내용 높이를 재지 않습니다) —
 * 넘치는 값은 스크롤 상자가 스스로 끝에서 멈춥니다. 말풍선은 목적지가 아니라 **실제
 * 스크롤**을 따라가므로 그때도 유닛에 붙어 있습니다.
 */
export function stepSheetPlacement(measure: StepMeasure): StepPlacement {
  const radius = stepUnitSize / 2;
  const anchorLimit = Math.max(0, measure.screenHeight - bottomInset - bottomMargin - sheetHeight);
  // 유닛 중심이 설 자리입니다(LynxView 기준). 말풍선이 들어가는 가장 낮은 자리와
  // 가운데 중 높은 쪽이고, 스크롤 상자 꼭대기보다 위로는 가지 않습니다.
  const center = measure.scrollViewTop + measure.scrollViewHeight / 2;
  const lowest = measure.screenTop + anchorLimit - sheetGap - radius;
  const wanted = Math.max(measure.scrollViewTop + radius, Math.min(center, lowest));
  const unitCenter = measure.unitTop + radius;
  return {
    targetScrollTop: Math.max(0, measure.scrollTop + (unitCenter - wanted)),
    anchorY: measure.unitTop + stepUnitSize - measure.screenTop,
    anchorLimit,
  };
}

/**
 * 말풍선 꼭대기의 세로 자리입니다. 잰 자리에 그 뒤의 스크롤 변화량을 더해 유닛을
 * 따라가고, 화면 아래로 넘치지 않게 가둡니다.
 *
 * 가둔 자리에서는 꼬리가 유닛에서 떨어집니다. 스크롤이 끝에 닿아 유닛을 더 올릴 수 없는
 * 마지막 유닛들에서만 생기는 일이고, 그때는 가리키는 곳이 조금 틀린 것이 읽을 수 없는
 * 것보다 낫습니다.
 */
export function stepSheetTop(state: StepSheetState, scrollTop: number): number {
  const top = state.anchorY + sheetGap + (state.anchorScrollTop - scrollTop);
  return state.anchorLimit === null ? top : Math.min(top, state.anchorLimit);
}
