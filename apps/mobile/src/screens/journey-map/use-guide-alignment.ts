// 첫 유닛 가이드와 지도 위치를 맞춥니다. 지도가 맨 위가 아닌 채(복원 · 사용자 스크롤) 가이드가 서면, 스크림 위로 들어
// 올린 튜토리얼 표지가 지도와 어긋나 「노드가 하나 더 있는 것처럼」 보였습니다(2026-11-05 Android 실기). 가이드가 서면
// 지도를 맨 위(표지 — 첫 구획)로 즉시 옮기고, 맨 위에 닿았다는 스크롤 소식이 오거나 잠시가 지나야 보이게 합니다.

import { useEffect, useRef, useState } from "@lynx-js/react";
import type { ScrollEvent } from "@lynx-js/types";

import type { MapGlider } from "./use-map-glide";

/** 이만큼 위면 맨 위로 봅니다(px). */
const TOP_SLOP_PX = 2;
/** 맨 위 소식이 오지 않을 때 그래도 보이기까지(ms) — 가이드가 영영 안 서는 일을 막습니다. */
export const GUIDE_ALIGN_FALLBACK_MS = 600;

export type GuideAlignment = {
  /** 가이드를 보여도 되는가(맨 위에 닿음). */
  readonly aligned: boolean;
  readonly handleScroll: (event: ScrollEvent) => void;
};

export function useGuideAlignment(input: {
  readonly visible: boolean;
  readonly initialScrollTop: number;
  readonly glider: MapGlider;
}): GuideAlignment {
  const { visible, initialScrollTop, glider } = input;
  const scrollTop = useRef(initialScrollTop);
  const [aligned, setAligned] = useState(initialScrollTop <= TOP_SLOP_PX);

  useEffect(() => {
    if (!visible) return;
    if (scrollTop.current <= TOP_SLOP_PX) {
      setAligned(true);
      return;
    }
    setAligned(false);
    glider.stop();
    glider.glide(scrollTop.current, 0, 0);
    const fallback = setTimeout(() => setAligned(true), GUIDE_ALIGN_FALLBACK_MS);
    return () => clearTimeout(fallback);
    // 가이드가 설 때만 맞춥니다 — 스크롤마다 다시 옮기지 않습니다.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  return {
    aligned,
    handleScroll: (event) => {
      "background only";
      scrollTop.current = event.detail.scrollTop;
      if (visible && event.detail.scrollTop <= TOP_SLOP_PX) setAligned(true);
    },
  };
}
