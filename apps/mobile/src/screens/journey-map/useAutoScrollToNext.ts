import type { ScrollEvent } from "@lynx-js/types";

import type { MapScrollTarget } from "./journey-map-next-unit";

export type AutoScrollToNextInput = {
  readonly target: MapScrollTarget;
  /** 말풍선이 열려 있거나 첫 유닛 가이드가 떠 있습니다 — 그동안은 옮기지 않고, 이 마운트에서 잠급니다. */
  readonly blocked: boolean;
};

export type AutoScrollToNextControls = {
  readonly handleScroll: (event: ScrollEvent) => void;
  readonly handleTouchStart: () => void;
};

const noop = (): void => {};

// 껍데기입니다 — 대상을 재고 옮기는 일은 구현 단계에서 채웁니다.
export function useAutoScrollToNext(_input: AutoScrollToNextInput): AutoScrollToNextControls {
  return { handleScroll: noop, handleTouchStart: noop };
}
