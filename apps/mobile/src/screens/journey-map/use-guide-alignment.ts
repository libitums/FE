// 첫 유닛 가이드와 지도 위치를 맞춥니다. 지도가 맨 위가 아닌 채(복원 · 사용자 스크롤) 가이드가 서면, 스크림 위로 들어
// 올린 튜토리얼 표지가 지도와 어긋나 「노드가 하나 더 있는 것처럼」 보였습니다(2026-11-05 Android 실기) — 들어 올린 표지는
// 스크롤을 따라가지 않아 맨 위(0)에서만 겹칩니다. 가이드가 서면 지도를 맨 위(표지 — 첫 구획)로 늘 즉시 옮기고, 알던 위치가
// 맨 위가 아니었으면 맨 위에 닿았다는 스크롤 소식이 오거나 잠시가 지나야 보이게 합니다.

import { useEffect, useRef, useState } from "@lynx-js/react";
import type { LayoutChangeEvent, ScrollEvent } from "@lynx-js/types";

import type { MapGlider } from "./use-map-glide";

/** 이만큼 위면 맨 위로 봅니다(px). */
const TOP_SLOP_PX = 2;
/** 맨 위 소식이 오지 않을 때 그래도 보이기까지(ms) — 가이드가 영영 안 서는 일을 막습니다. */
export const GUIDE_ALIGN_FALLBACK_MS = 600;

export type GuideAlignment = {
  /** 가이드를 보여도 되는가(맨 위에 닿음). */
  readonly aligned: boolean;
  readonly handleScroll: (event: ScrollEvent) => void;
  /** 지도 내용(스크롤 상자 안쪽)의 `bindlayoutchange`에 붙입니다. */
  readonly handleContentLayout: (event: LayoutChangeEvent) => void;
};

export function useGuideAlignment(input: {
  readonly visible: boolean;
  readonly initialScrollTop: number;
  readonly glider: MapGlider;
}): GuideAlignment {
  const { visible, initialScrollTop, glider } = input;
  const scrollTop = useRef(initialScrollTop);
  // 처음에는 맞지 않은 것으로 둡니다 — 가이드가 서는 첫 그림에서 이펙트가 맞추기 전에 스크림 · 가이드가 한 프레임 비치지
  // 않게 합니다(리뷰 반영). 가이드가 내려가면 다시 맞지 않은 것으로 돌립니다.
  const [aligned, setAligned] = useState(false);

  // 지도 내용이 놓였는가(높이 > 0)와, 가이드가 선 뒤 아직 맨 위로 옮기지 않았는가입니다. 내용이 놓이기 전에 옮기면
  // Lynx가 스크롤 범위를 「0 − 화면 높이」로 보고 0도 범위 밖이라며 오류를 냈습니다(DURU-ANDROID-F, 1.2.0 신규 설치).
  const contentLaidOut = useRef(false);
  const pendingTop = useRef(false);
  const moveToTop = () => {
    pendingTop.current = false;
    glider.stop();
    glider.glide(scrollTop.current, 0, 0);
  };

  useEffect(() => {
    if (!visible) return;
    // 알고 있는 위치가 맨 위여도 늘 옮깁니다 — 내용이 늘며 스크롤 소식 없이 밀린 위치는 알 수 없습니다(기기에서 확인).
    // 내용이 아직 놓이지 않았으면 놓인 첫 소식에 옮깁니다.
    if (contentLaidOut.current) moveToTop();
    else pendingTop.current = true;
    if (scrollTop.current <= TOP_SLOP_PX) {
      setAligned(true);
      return () => {
        pendingTop.current = false;
        setAligned(false);
      };
    }
    const fallback = setTimeout(() => setAligned(true), GUIDE_ALIGN_FALLBACK_MS);
    return () => {
      clearTimeout(fallback);
      pendingTop.current = false;
      setAligned(false);
    };
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
    handleContentLayout: (event) => {
      "background only";
      if (event.detail.height <= 0) return;
      contentLaidOut.current = true;
      if (pendingTop.current) moveToTop();
    },
  };
}
