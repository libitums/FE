// 스토리 보기의 칸 이동(ADR-0178 D4 개정, 인스타 방식) — 탭 · 6초 넘김은 한 칸(인물을 넘어 이어 감), 가로 넘김은 인물 단위,
// 인물이 바뀌면 옆으로 미끄러지는 방향을 정합니다(모션 줄이기면 전환 없음). 판정은 `viewerStep` · `viewerJump`가 집니다.

import { useRef, useState } from "@lynx-js/react";

import type { StoryCloseReason, StoryViewerItem } from "./friend-stories.contract";
import { viewerJump, viewerStep } from "./friend-stories";

/** 가로 넘김으로 볼 최소 거리(px) — 탭의 작은 떨림과 가르는 값. */
const SWIPE_MIN = 48;

export type StorySlide = "none" | "next" | "prev";

type TouchDetail = { readonly detail?: { readonly x?: unknown; readonly y?: unknown } };

const pointOf = (event: TouchDetail): { x: number; y: number } | null => {
  const x = event.detail?.x;
  const y = event.detail?.y;
  return typeof x === "number" && typeof y === "number" ? { x, y } : null;
};

export type StoryNavigation = {
  readonly index: number;
  readonly slide: StorySlide;
  readonly step: (action: "next" | "prev" | "tick") => void;
  readonly touchStart: (event: TouchDetail) => void;
  /** 가로 넘김이면 인물을 넘기고 true — 그 뒤 따라오는 탭은 넘기지 않습니다. */
  readonly touchEnd: (event: TouchDetail) => boolean;
  /** 방금 가로로 넘겼는가(그 손가락의 탭을 걸러냄). */
  readonly consumeSwipe: () => boolean;
};

export function useStoryNavigation({
  items,
  start,
  reducedMotion,
  onClose,
  onSkip,
}: {
  readonly items: readonly StoryViewerItem[];
  readonly start: number;
  readonly reducedMotion: boolean;
  readonly onClose: (reason: StoryCloseReason) => void;
  readonly onSkip: (() => void) | undefined;
}): StoryNavigation {
  const [index, setIndex] = useState(Math.min(Math.max(0, start), items.length - 1));
  const [slide, setSlide] = useState<StorySlide>("none");
  const touch = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);

  const go = (next: number) => {
    const from = items[index]?.story.characterId;
    const to = items[next]?.story.characterId;
    if (from !== to) setSlide(reducedMotion ? "none" : next > index ? "next" : "prev");
    setIndex(next);
  };

  const step = (action: "next" | "prev" | "tick") => {
    const next = viewerStep({ index, count: items.length }, action);
    if (next === "close") return onClose("completed");
    // 끝내는 탭은 건너뜀이 아닙니다(다 본 것) — 다음 장으로 넘긴 탭만 셉니다.
    if (action === "next") onSkip?.();
    go(next.index);
  };

  return {
    index,
    slide,
    step,
    touchStart: (event) => {
      touch.current = pointOf(event);
      swiped.current = false;
    },
    touchEnd: (event) => {
      const from = touch.current;
      const to = pointOf(event);
      touch.current = null;
      if (from === null || to === null) return false;
      const dx = to.x - from.x;
      if (Math.abs(dx) < SWIPE_MIN || Math.abs(dx) <= Math.abs(to.y - from.y)) return false;
      swiped.current = true;
      // 왼쪽으로 밀면 다음 인물, 오른쪽이면 이전 인물.
      const next = viewerJump(items, index, dx < 0 ? "next" : "prev");
      if (next === "close") onClose("completed");
      else if (next !== index) go(next);
      return true;
    },
    consumeSwipe: () => {
      const was = swiped.current;
      swiped.current = false;
      return was;
    },
  };
}
