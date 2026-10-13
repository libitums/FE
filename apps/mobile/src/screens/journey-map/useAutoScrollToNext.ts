import { useEffect, useRef } from "@lynx-js/react";
import type { ScrollEvent } from "@lynx-js/types";

import { useMotion } from "@libitums/ui-lynx/motion";
import type { MapScrollTarget } from "./journey-map-next-unit";
import {
  headerCardId,
  measureRects,
  scrollId,
  scrollMapTo,
  scrollNodeIntoView,
} from "./journey-map-scroll";
import {
  autoScrollOffset,
  autoScrollPlacement,
  autoScrollReducer,
  canSettleAutoScroll,
  initialAutoScrollState,
  mapScrollBehaviorFor,
  type AutoScrollAction,
} from "./journey-map-scroll-position";

export type AutoScrollToNextInput = {
  readonly target: MapScrollTarget;
  /** 말풍선이 열려 있거나 첫 유닛 가이드가 떠 있습니다 — 그동안은 옮기지 않고, 이 마운트에서 잠급니다. */
  readonly blocked: boolean;
};

export type AutoScrollToNextControls = {
  readonly handleScroll: (event: ScrollEvent) => void;
  readonly handleTouchStart: () => void;
};

/**
 * 맵이 서면 다음에 풀 유닛을 눈앞으로 스크롤합니다. 전이는 순수 리듀서(`autoScrollReducer`)가
 * 하고, 이 훅은 그것을 호스트(자리 재기 · 스크롤)와 잇습니다. 상태는 ref에 둡니다 — 다시 그릴
 * 이유가 없습니다.
 *
 * 맵은 다른 화면이 서면 언마운트되고 돌아오면 다시 마운트되므로, 입장과 복귀가 같은 규칙을
 * 탑니다. 진행은 마운트 **뒤에** 올 수 있어서(콜드 스타트) 「대상(DOM id)당 한 번, 사용자가
 * 손대기 전까지」입니다.
 */
export function useAutoScrollToNext({
  target,
  blocked,
}: AutoScrollToNextInput): AutoScrollToNextControls {
  const behavior = mapScrollBehaviorFor(useMotion());
  const state = useRef(initialAutoScrollState);
  // 스크롤 이벤트로 따라가는 지금 자리입니다 — 호스트에 「지금 자리」를 묻는 길이 없습니다.
  const scrollTop = useRef(0);
  // 대상 객체는 매 렌더 새로 만들어지므로 effect는 DOM id 문자열에 겁니다.
  const targetDomId = target.kind === "unit" ? target.domId : null;

  const dispatch = (action: AutoScrollAction): void => {
    // oxlint-disable-next-line react/immutability
    state.current = autoScrollReducer(state.current, action);
  };

  useEffect(() => {
    // 말풍선 · 가이드가 이깁니다 — 손이 닿은 것으로 치고 이 마운트에서 잠급니다.
    if (blocked) {
      dispatch({ type: "interact" });
      return;
    }
    const before = state.current.pendingDomId;
    dispatch({
      type: "target",
      target: targetDomId === null ? { kind: "top" } : { kind: "unit", domId: targetDomId },
    });
    const pending = state.current.pendingDomId;
    if (pending === null || pending === before) {
      return;
    }
    measureRects([pending, scrollId, headerCardId], (rects) => {
      // 재는 사이에 사용자가 손댔거나 대상이 바뀌었으면 늦게 온 답을 버립니다.
      if (!canSettleAutoScroll(state.current, pending)) {
        return;
      }
      // 먼저 정착으로 적습니다 — 옮기는 순간 오는 스크롤 이벤트가 사용자의 손길로 읽히지 않게.
      dispatch({ type: "settle", domId: pending });
      const [unit, scroll, header] = rects ?? [];
      if (unit === undefined || scroll === undefined || header === undefined) {
        scrollNodeIntoView(pending, behavior);
        return;
      }
      scrollMapTo(
        autoScrollOffset(
          {
            targetTop: unit.top,
            scrollViewTop: scroll.top,
            scrollViewHeight: scroll.height,
            headerBottom: header.top + header.height,
            scrollTop: scrollTop.current,
          },
          autoScrollPlacement,
        ),
        behavior,
      );
    });
  }, [targetDomId, blocked]);

  const handleScroll = (event: ScrollEvent): void => {
    "background only";
    // oxlint-disable-next-line react/immutability
    scrollTop.current = event.detail.scrollTop;
    dispatch({ type: "scroll", scrollTop: event.detail.scrollTop });
  };

  const handleTouchStart = (): void => {
    "background only";
    dispatch({ type: "interact" });
  };

  return { handleScroll, handleTouchStart };
}
