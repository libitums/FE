// 스토리 보기의 칸 이동(ADR-0178 D4 개정, 인스타 방식) — 탭 · 6초 넘김은 한 칸(인물을 넘어 이어 감), 가로 넘김은 인물 단위.
// 탭 · 6초 넘김으로 인물이 바뀌면 큐브가 한 번 돌게 전환(`turn`)을 남깁니다(모션 줄이기면 없음). 가로 넘김은 손가락을 따라
// 이미 돌았으므로(`use-story-cube`) 전환 없이 바로 바꿉니다. 판정은 `viewerStep` · `viewerJump`가 집니다.

import { useRef, useState } from "@lynx-js/react";

import type { StoryCloseReason, StoryViewerItem } from "./friend-stories.contract";
import { viewerJump, viewerStep } from "./friend-stories";
import type { CubeDirection } from "./story-cube";
import type { CubeTurn } from "./story-cube-neighbors";

export type StoryNavigation = {
  readonly index: number;
  /** 탭 · 6초 넘김으로 인물이 바뀐 뒤 큐브가 도는 동안의 전환. 다 돌면 `endTurn`. */
  readonly turn: CubeTurn | null;
  /** 가로로 끄는 중(진행 막대 · 6초 넘김 멈춤). */
  readonly dragging: boolean;
  readonly step: (action: "next" | "prev" | "tick") => void;
  /** 가로 넘김을 놓아 넘어갈 때 — 다음 인물의 첫 장(마지막이면 닫힘) · 이전 인물의 첫 장. */
  readonly swipe: (direction: CubeDirection) => void;
  /** 손가락이 닿음 — 지난 손가락의 넘김 표시를 지웁니다. */
  readonly touch: () => void;
  /** 손가락이 가로로 잡힘(true) · 놓음(false). 잡힌 손가락의 탭은 넘기지 않습니다. */
  readonly drag: (on: boolean) => void;
  readonly endTurn: (id: number) => void;
  /** 방금 가로로 끌었는가(그 손가락의 탭을 걸러냄). */
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
  const [turn, setTurn] = useState<CubeTurn | null>(null);
  const [dragging, setDragging] = useState(false);
  const turns = useRef(0);
  const swiped = useRef(false);

  // 칸을 옮기는 함수는 누름 · 타이머 · 효과에서만 부릅니다 — 메인 스레드 번들에서 빠집니다(ADR-0149).
  const go = (next: number, animate: boolean) => {
    "background only";
    const from = items[index]?.story.characterId;
    const to = items[next]?.story.characterId;
    if (from === to) setTurn(null);
    else if (!animate || reducedMotion) setTurn(null);
    else {
      turns.current += 1;
      setTurn({ id: turns.current, from: index, direction: next > index ? "next" : "prev" });
    }
    setIndex(next);
  };

  const step = (action: "next" | "prev" | "tick") => {
    "background only";
    const next = viewerStep({ index, count: items.length }, action);
    if (next === "close") return onClose("completed");
    // 끝내는 탭은 건너뜀이 아닙니다(다 본 것) — 다음 장으로 넘긴 탭만 셉니다.
    if (action === "next") onSkip?.();
    go(next.index, true);
  };

  return {
    index,
    turn,
    dragging,
    step,
    swipe: (direction) => {
      "background only";
      const next = viewerJump(items, index, direction);
      if (next === "close") onClose("completed");
      else if (next !== index) go(next, false);
    },
    touch: () => {
      "background only";
      swiped.current = false;
    },
    drag: (on) => {
      "background only";
      swiped.current = true;
      setDragging(on);
    },
    endTurn: (id) => {
      "background only";
      setTurn((now) => (now !== null && now.id === id ? null : now));
    },
    consumeSwipe: () => {
      "background only";
      const was = swiped.current;
      swiped.current = false;
      return was;
    },
  };
}
