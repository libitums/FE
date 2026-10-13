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
  _measure: AutoScrollMeasure,
  _placement: AutoScrollPlacement,
): number {
  return 0;
}

export function mapScrollBehaviorFor(_motion: Motion): MapScrollBehavior {
  return "smooth";
}

/** 구획들의 시작 자리와 스크롤 자리 → 지금 보는 구획의 index. 빈 목록이면 0. */
export function currentEpisodeIndexAt(_tops: readonly number[], _scrollTop: number): number {
  return 0;
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
  _action: AutoScrollAction,
): AutoScrollState {
  return state;
}

/** 늦게 온 측정 답을 써도 되는가 — 잠기지 않았고 그 대상을 아직 재는 중일 때만. */
export function canSettleAutoScroll(_state: AutoScrollState, _domId: string): boolean {
  return false;
}
