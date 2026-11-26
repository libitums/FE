// 스토리 보기의 큐브 결선(ADR-0178 D4 개정 ⟨큐브⟩) — 창 폭 · 옆 인물 면에 그릴 장 · 세 면의 쉬는 자리 · 손가락(`useStoryCube`).

import { motion } from "@libitums/design-tokens";
import { motionDurationMs } from "@libitums/ui-lynx/motion";

import { screenWidthFrom } from "../../components/top-bar-layout";
import type { StoryViewerItem } from "./friend-stories.contract";
import { cubeFaceStylesOf, cubeNeighborsOf } from "./story-cube-neighbors";
import { useStoryCube, type StoryCube } from "./use-story-cube";
import type { StoryNavigation } from "./use-story-navigation";

/** 큐브 한 면을 다 돌리는 시간 — page 토큰(ADR-0053). */
const CUBE_TURN_MS = motionDurationMs(motion.duration.page);
/** 창 폭을 모를 때(테스트 · 옛 호스트) 쓰는 폭(pt) — 시안 폭. */
const FALLBACK_WIDTH = 390;

/** 스토리 보기의 큐브 결선 — 창 폭 · 옆 인물 면에 그릴 장 · 세 면의 쉬는 자리 · 손가락. */
export function useViewerCube(
  items: readonly StoryViewerItem[],
  nav: StoryNavigation,
  reducedMotion: boolean,
  locked: boolean,
): {
  readonly cube: StoryCube;
  readonly sides: ReturnType<typeof cubeNeighborsOf>;
  readonly rest: ReturnType<typeof cubeFaceStylesOf>;
  /** 창 폭(pt) — 탭 자리의 가운데 경계(`storyTapOf`). */
  readonly width: number;
} {
  const measured = screenWidthFrom(typeof SystemInfo === "undefined" ? undefined : SystemInfo);
  const width = measured > 0 ? measured : FALLBACK_WIDTH;
  const sides = cubeNeighborsOf(items, nav.index, nav.turn);
  const rest = cubeFaceStylesOf(width, nav.turn);
  const cube = useStoryCube({
    width,
    still: reducedMotion,
    locked,
    hasPrev: sides.prev !== null,
    hasNext: sides.next !== null,
    turn: nav.turn,
    fullMs: CUBE_TURN_MS,
    onTouch: nav.touch,
    onDrag: nav.drag,
    onSwipe: nav.swipe,
    onTurnEnd: nav.endTurn,
  });
  return { cube, sides, rest, width };
}
