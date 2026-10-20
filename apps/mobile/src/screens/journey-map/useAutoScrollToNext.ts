import { useEffect, useRef, useState } from "@lynx-js/react";
import type { ScrollEvent } from "@lynx-js/types";

import { useMotion } from "@libitums/ui-lynx/motion";
import type { MapScrollTarget } from "./journey-map-next-unit";
import { mapScrollDurationMs } from "./journey-map-scroll-animation";
import type { MapGlider } from "./use-map-glide";
import {
  headerCardId,
  measureRects,
  scrollId,
  scrollMapTo,
  scrollNodeIntoView,
} from "./journey-map-scroll";
import {
  autoScrollCorrection,
  autoScrollCorrectionReducer,
  autoScrollOffset,
  autoScrollPlacement,
  autoScrollReducer,
  autoScrollTolerance,
  canCorrectAutoScroll,
  canSettleAutoScroll,
  initialAutoScrollCorrectionState,
  initialAutoScrollState,
  mapScrollBehaviorFor,
  type AutoScrollAction,
  type AutoScrollCorrectionAction,
  type AutoScrollMeasure,
} from "./journey-map-scroll-position";

export type AutoScrollToNextInput = {
  readonly target: MapScrollTarget;
  /** 말풍선이 열려 있거나 첫 유닛 가이드가 떠 있습니다 — 그동안은 옮기지 않고, 이 마운트에서 잠급니다. */
  readonly blocked: boolean;
  /** 스택에 있던 맵으로 돌아와 마지막 자리에서 열렸습니다 — 이 마운트에서는 옮기지 않습니다. 값은 그 자리입니다. */
  readonly restoredScrollTop: number | null;
  /** 부드러운 이동을 main thread에서 돌리는 손잡이입니다(`useMapGlide`). */
  readonly glider: MapGlider;
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
 *
 * 도착한 뒤에는 한 번 바로잡습니다 — 잰 순간의 카드가 도착한 자리의 카드와 다를 수 있어서(제목이 한
 * 줄에서 두 줄이 되는 식) 대상이 정렬선보다 위로 숨을 수 있습니다. 도착은 스크롤 이벤트의 자리가
 * 보낸 목적지와 맞는 것으로 알고, 다시 재는 일은 도착을 적은 상태가 커밋된 **뒤의** effect가 합니다.
 */
export function useAutoScrollToNext({
  target,
  blocked,
  restoredScrollTop,
  glider,
}: AutoScrollToNextInput): AutoScrollToNextControls {
  const behavior = mapScrollBehaviorFor(useMotion());
  // 돌아온 맵은 손댄 것처럼 처음부터 잠급니다 — 기억한 자리에서 움직이지 않습니다.
  const state = useRef(
    restoredScrollTop === null
      ? initialAutoScrollState
      : autoScrollReducer(initialAutoScrollState, { type: "interact" }),
  );
  // 스크롤 이벤트로 따라가는 지금 자리입니다 — 호스트에 「지금 자리」를 묻는 길이 없습니다.
  const scrollTop = useRef(restoredScrollTop ?? 0);
  // 부드러우면 main thread가 프레임마다 옮기고, 동작 줄이기면 한 번에 옮깁니다.
  const moveTo = (offset: number, durationMs?: number): void => {
    if (behavior !== "smooth") {
      scrollMapTo(offset, "instant");
      return;
    }
    glider.glide(
      scrollTop.current,
      offset,
      durationMs ?? mapScrollDurationMs(offset - scrollTop.current),
    );
  };
  // 대상 객체는 매 렌더 새로 만들어지므로 effect는 DOM id 문자열에 겁니다.
  const targetDomId = target.kind === "unit" ? target.domId : null;

  const correction = useRef(initialAutoScrollCorrectionState);
  // 맵이 내려간 뒤 늦게 온 측정 답이 새로 선 맵(같은 스크롤 상자 id)을 옮기지 않게 합니다.
  const mounted = useRef(true);
  // 목적지에 닿은 대상의 DOM id입니다 — 다시 재는 effect를 커밋 뒤로 미루는 신호입니다.
  const [arrivedDomId, setArrivedDomId] = useState<string | null>(null);

  const dispatch = (action: AutoScrollAction): void => {
    // oxlint-disable-next-line react/immutability
    state.current = autoScrollReducer(state.current, action);
  };

  const dispatchCorrection = (action: AutoScrollCorrectionAction): void => {
    // oxlint-disable-next-line react/immutability
    correction.current = autoScrollCorrectionReducer(
      correction.current,
      action,
      autoScrollTolerance,
    );
  };

  const cancelCorrection = (): void => {
    dispatchCorrection({ type: "cancel" });
    setArrivedDomId(null);
  };

  useEffect(() => {
    // oxlint-disable-next-line react/immutability
    mounted.current = true;
    return () => {
      // oxlint-disable-next-line react/immutability
      mounted.current = false;
      glider.stop();
    };
  }, []);

  useEffect(() => {
    // 새 대상(또는 대상 없음)의 이동이 앞의 보정을 덮습니다.
    cancelCorrection();
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
      // 재는 사이에 맵이 내려갔거나 사용자가 손댔거나 대상이 바뀌었으면 늦게 온 답을 버립니다.
      if (!mounted.current || !canSettleAutoScroll(state.current, pending)) {
        return;
      }
      // 먼저 정착으로 적습니다 — 옮기는 순간 오는 스크롤 이벤트가 사용자의 손길로 읽히지 않게.
      dispatch({ type: "settle", domId: pending });
      const [unit, scroll, header] = rects ?? [];
      if (unit === undefined || scroll === undefined || header === undefined) {
        scrollNodeIntoView(pending, behavior);
        return;
      }
      const offset = autoScrollOffset(
        {
          targetTop: unit.top,
          scrollViewTop: scroll.top,
          scrollViewHeight: scroll.height,
          headerBottom: header.top + header.height,
          scrollTop: scrollTop.current,
        },
        autoScrollPlacement,
      );
      dispatchCorrection({ type: "sent", domId: pending, offset });
      moveTo(offset);
    });
  }, [targetDomId, blocked]);

  // 도착한 뒤 카드와 대상을 다시 재서, 대상이 정렬선보다 위로 숨었으면 한 번 옮깁니다.
  useEffect(() => {
    if (arrivedDomId === null) {
      return;
    }
    const domId = arrivedDomId;
    measureRects([domId, scrollId, headerCardId], (rects) => {
      // 재는 사이에 맵이 내려갔거나 손댔거나 대상이 바뀌었으면 버립니다.
      if (!mounted.current || !canCorrectAutoScroll(correction.current, domId)) {
        return;
      }
      dispatchCorrection({ type: "done", domId });
      const [unit, scroll, header] = rects ?? [];
      if (
        state.current.locked ||
        unit === undefined ||
        scroll === undefined ||
        header === undefined
      ) {
        return;
      }
      const measure: AutoScrollMeasure = {
        targetTop: unit.top,
        scrollViewTop: scroll.top,
        scrollViewHeight: scroll.height,
        headerBottom: header.top + header.height,
        scrollTop: scrollTop.current,
      };
      const next = autoScrollCorrection(measure, autoScrollPlacement, autoScrollTolerance);
      // 보정은 본 이동이 **끝난 뒤** 짧게 이어 옮깁니다. 호스트 부드러운 스크롤일 때는 본 이동의 끝과 겹쳐 반동이
      // 보여 즉시로 옮겼지만(E-C1), 이제 본 이동을 앱이 직접 끝까지 옮기므로 겹칠 것이 없습니다.
      if (next !== null) {
        moveTo(next, 250);
      }
    });
  }, [arrivedDomId]);

  const handleScroll = (event: ScrollEvent): void => {
    "background only";
    // oxlint-disable-next-line react/immutability
    scrollTop.current = event.detail.scrollTop;
    dispatch({ type: "scroll", scrollTop: event.detail.scrollTop });
    dispatchCorrection({ type: "scroll", scrollTop: event.detail.scrollTop });
    if (correction.current.phase === "measuring") {
      setArrivedDomId(correction.current.domId);
    }
  };

  const handleTouchStart = (): void => {
    "background only";
    glider.stop();
    dispatch({ type: "interact" });
    cancelCorrection();
  };

  return { handleScroll, handleTouchStart };
}
