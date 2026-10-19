// 맵의 자동 스크롤이 어디로 가고 언제 움직이는지를 정하는 순수 모듈입니다.

import type { Motion } from "@libitums/ui-lynx/motion";
import type { MapScrollTarget } from "./journey-map-next-unit";
import type { MapScrollBehavior, MeasuredRect } from "./journey-map-scroll";
import {
  mapBottomInset,
  stepUnitSize,
  type StepHeaderCard,
  type StepPlacement,
} from "./journey-map-sheet";

export type AutoScrollPlacement = {
  /** 머리 카드 아래 모서리와 대상 사이, 그리고 대상과 바텀 네비게이션 사이에 남길 여백입니다. */
  readonly gap: number;
  /** 스크롤 상자 아래를 덮는 바텀 네비게이션의 높이입니다. */
  readonly bottomInset: number;
  /** 유닛 표식의 높이입니다 — 한계선이 표식 하나가 온전히 보이는 자리를 지킵니다. */
  readonly unitSize: number;
};

export const autoScrollPlacement: AutoScrollPlacement = {
  gap: 24,
  bottomInset: mapBottomInset,
  unitSize: stepUnitSize,
};

/** 세로 좌표는 모두 같은 기준(LynxView)입니다. */
export type AutoScrollMeasure = {
  /** 대상 셀의 위 모서리입니다. */
  readonly targetTop: number;
  readonly scrollViewTop: number;
  readonly scrollViewHeight: number;
  /** 머리 카드의 아래 모서리입니다(`top + height`). */
  readonly headerBottom: number;
  /** 잰 순간의 스크롤 자리입니다. */
  readonly scrollTop: number;
};

/** 0 이상의 스크롤 목적지입니다. 던지지 않습니다. */
export function autoScrollOffset(
  measure: AutoScrollMeasure,
  placement: AutoScrollPlacement,
): number {
  // 대상 위 모서리가 설 자리입니다 — 머리 카드 아래 + 여백이되, 표식 하나가 바텀 네비게이션에
  // 가리지 않고 온전히 보이는 한계선을 넘지 않습니다(큰 글자에서 카드가 커질 때).
  const alignLine = measure.headerBottom + placement.gap;
  const limitLine =
    measure.scrollViewTop +
    measure.scrollViewHeight -
    placement.bottomInset -
    placement.gap -
    placement.unitSize;
  return Math.max(0, measure.scrollTop + (measure.targetTop - Math.min(alignLine, limitLine)));
}

/** 띠 아래 모서리와 유닛 위 모서리 사이입니다(유닛 탭 · 자동 스크롤 · 맵 위 여백이 같이 씁니다). */
export const headerBandGap = 0;

/** 띠 높이의 어림입니다(두 줄 제목 · 진행 줄). 띠가 서기 전에 재면 손잡이 높이가 0이라 이 값을 씁니다. */
export const headerBandHeightEstimate = 0;

/** 띠 손잡이의 잰 상자 → 띠가 섰을 때의 카드입니다. 못 쟀으면 null. 던지지 않습니다. */
export function headerBandCard(
  _anchor: MeasuredRect | null,
  _heightEstimate: number,
): StepHeaderCard | null {
  return null;
}

/** 유닛 하나를 맵의 제자리에 세우는 데 잰 값입니다. 세로 좌표는 모두 같은 기준(LynxView)입니다. */
export type MapUnitMeasure = {
  /** 유닛 상자입니다(위 모서리 · 가로 중심). */
  readonly unit: MeasuredRect;
  readonly scroll: MeasuredRect;
  readonly screen: MeasuredRect;
  /** 띠 손잡이입니다. 못 쟀으면 null. */
  readonly band: MeasuredRect | null;
  /** 잰 순간의 스크롤 자리입니다. */
  readonly scrollTop: number;
};

/** 유닛 탭과 자동 스크롤이 함께 쓰는 자리 규칙입니다. 던지지 않습니다. */
export function mapUnitPlacement(_measure: MapUnitMeasure): StepPlacement {
  return { targetScrollTop: -1, anchorY: 0, anchorLimit: 0 };
}

/** 자동 스크롤의 목적지입니다. 0 이상. */
export function autoScrollDestination(_measure: MapUnitMeasure): number {
  return -1;
}

export function mapScrollBehaviorFor(motion: Motion): MapScrollBehavior {
  return motion === "reduced" ? "instant" : "smooth";
}

/** 구획들의 시작 자리와 스크롤 자리 → 지금 보는 구획의 index. 빈 목록이면 0. */
export function currentEpisodeIndexAt(tops: readonly number[], scrollTop: number): number {
  // 첫 구획의 자리를 원점으로 삼습니다 — 잰 값이 화면 좌표라 스크롤 양과 자릿수가 다릅니다.
  // 두 구획의 **차이**만 쓰면 원점이 어디든 같은 답이 나옵니다.
  const origin = tops[0] ?? 0;
  let next = 0;
  for (let i = 1; i < tops.length; i += 1) {
    if (scrollTop >= (tops[i] ?? 0) - origin) {
      next = i;
    }
  }
  return next;
}

export type AutoScrollState = {
  readonly locked: boolean;
  readonly pendingDomId: string | null;
  readonly settledDomId: string | null;
};

export type AutoScrollAction =
  | { readonly type: "target"; readonly target: MapScrollTarget }
  | { readonly type: "interact" }
  | { readonly type: "scroll"; readonly scrollTop: number }
  | { readonly type: "settle"; readonly domId: string };

export const initialAutoScrollState: AutoScrollState = {
  locked: false,
  pendingDomId: null,
  settledDomId: null,
};

/** 변화가 없으면 같은 참조를 돌려줍니다. */
export function autoScrollReducer(
  state: AutoScrollState,
  action: AutoScrollAction,
): AutoScrollState {
  // 손댄 뒤에는 어떤 사건에도 움직이지 않습니다.
  if (state.locked) return state;
  switch (action.type) {
    case "target": {
      const { target } = action;
      if (target.kind === "top") {
        return state.pendingDomId === null ? state : { ...state, pendingDomId: null };
      }
      if (target.domId === state.settledDomId || target.domId === state.pendingDomId) return state;
      return { ...state, pendingDomId: target.domId };
    }
    case "interact":
      return { ...state, locked: true, pendingDomId: null };
    case "scroll":
      // 옮기기 전의 스크롤만 사용자의 손길입니다 — 옮긴 뒤의 이벤트는 우리 것과 가를 수 없습니다.
      if (state.settledDomId !== null || action.scrollTop === 0) return state;
      return { ...state, locked: true, pendingDomId: null };
    case "settle":
      return canSettleAutoScroll(state, action.domId)
        ? { ...state, pendingDomId: null, settledDomId: action.domId }
        : state;
  }
}

/** 늦게 온 측정 답을 써도 되는가 — 잠기지 않았고 그 대상을 아직 재는 중일 때만. */
export function canSettleAutoScroll(state: AutoScrollState, domId: string): boolean {
  return !state.locked && state.pendingDomId === domId;
}

/** 도착 판정과 「보정이 필요 없다」에 같이 쓰는 허용오차(dp · pt)입니다 — 요청과 이벤트의 차가 0.2 ~ 0.7로 관찰됩니다. */
export const autoScrollTolerance = 1;

/** 도착한 뒤 다시 잰 값 → 한 번 더 옮길 목적지. 지금 자리와 차가 tolerance를 넘으면 그 목적지, 아니면 null. */
export function autoScrollCorrection(_measure: MapUnitMeasure, _tolerance: number): number | null {
  return null;
}

export type AutoScrollCorrectionState =
  | { readonly phase: "idle" }
  /** 계산한 목적지로 보냈고, 그 자리에 닿기를 기다립니다. */
  | { readonly phase: "travelling"; readonly domId: string; readonly offset: number }
  /** 닿았고, 머리 카드와 대상을 다시 재는 중입니다. */
  | { readonly phase: "measuring"; readonly domId: string };

export type AutoScrollCorrectionAction =
  | { readonly type: "sent"; readonly domId: string; readonly offset: number }
  | { readonly type: "scroll"; readonly scrollTop: number }
  | { readonly type: "cancel" }
  | { readonly type: "done"; readonly domId: string };

export const initialAutoScrollCorrectionState: AutoScrollCorrectionState = { phase: "idle" };

/** 변화가 없으면 같은 참조를 돌려줍니다. */
export function autoScrollCorrectionReducer(
  state: AutoScrollCorrectionState,
  action: AutoScrollCorrectionAction,
  tolerance: number,
): AutoScrollCorrectionState {
  switch (action.type) {
    case "sent":
      return { phase: "travelling", domId: action.domId, offset: action.offset };
    case "scroll":
      return state.phase === "travelling" && Math.abs(action.scrollTop - state.offset) <= tolerance
        ? { phase: "measuring", domId: state.domId }
        : state;
    case "cancel":
      return state.phase === "idle" ? state : initialAutoScrollCorrectionState;
    case "done":
      return state.phase === "measuring" && state.domId === action.domId
        ? initialAutoScrollCorrectionState
        : state;
  }
}

/** 다시 잰 답을 써도 되는가 — 아직 그 대상을 재는 중일 때만. */
export function canCorrectAutoScroll(state: AutoScrollCorrectionState, domId: string): boolean {
  return state.phase === "measuring" && state.domId === domId;
}
