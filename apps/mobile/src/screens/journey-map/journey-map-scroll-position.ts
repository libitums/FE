// 맵의 자동 스크롤이 어디로 가고 언제 움직이는지를 정하는 순수 모듈입니다.

import type { Motion } from "@libitums/ui-lynx/motion";
import type { MapScrollTarget } from "./journey-map-next-unit";
import type { MapScrollBehavior } from "./journey-map-scroll";
import { mapBottomInset, stepUnitSize } from "./journey-map-sheet";

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

/** 도착한 뒤 다시 잰 값 → 한 번 더 옮길 목적지. 대상이 설 자리보다 위에 있을 때만 수를 냅니다. */
export function autoScrollCorrection(
  measure: AutoScrollMeasure,
  placement: AutoScrollPlacement,
  tolerance: number,
): number | null {
  const next = autoScrollOffset(measure, placement);
  return measure.scrollTop - next > tolerance ? next : null;
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
