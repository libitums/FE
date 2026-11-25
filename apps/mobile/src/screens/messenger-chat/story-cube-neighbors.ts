// 스토리 보기의 인물 넘김 큐브(ADR-0178 D4 개정 ⟨큐브⟩) — 옆 인물 면에 그릴 장(순수).

import type { StoryViewerItem } from "./friend-stories.contract";
import { viewerGroupOf, viewerJump } from "./friend-stories";
import { cubeFacesOf, type CubeDirection, type CubeFaceStyle } from "./story-cube";

/** 지난 인물 전환 — 탭 · 6초 넘김으로 인물이 바뀌면 그 앞 장(`from`)이 접혀 나가는 면에 남습니다. */
export type CubeTurn = {
  readonly id: number;
  readonly from: number;
  readonly direction: CubeDirection;
};

/**
 * 옆 인물 면에 그릴 장 — 가로로 밀면 갈 곳(`viewerJump`)이고, 없으면(첫 인물의 이전 · 마지막 인물의 다음) null.
 * 인물 전환이 도는 동안에는 접혀 나가는 쪽 면에 방금까지 보던 장(`turn.from`)을 그립니다.
 */
export function cubeNeighborsOf(
  items: readonly StoryViewerItem[],
  index: number,
  turn: CubeTurn | null,
): { readonly prev: number | null; readonly next: number | null } {
  const group = viewerGroupOf(items, index);
  const nextJump = viewerJump(items, index, "next");
  let next = nextJump === "close" ? null : nextJump;
  let prev = group.start === 0 ? null : viewerGroupOf(items, group.start - 1).start;
  if (turn !== null && turn.from >= 0 && turn.from < items.length) {
    if (turn.direction === "next" && prev !== null) prev = turn.from;
    if (turn.direction === "prev" && next !== null) next = turn.from;
  }
  return { prev, next };
}

/**
 * 세 면의 쉬는 자리 — 지금 면은 제자리, 옆 면은 맞닿은 모서리 밖에서 90° 돌아 있고(보이지 않음) 어둡습니다. 인물 전환이 도는 동안에는
 * 들어오는 지금 면이 옆 자리에서, 접혀 나가는 면이 제자리에서 시작합니다. 큐브가 다 돈 끝 값과 같아서 손을 떼거나 돌기를 마쳐도 튀지 않습니다.
 */
export function cubeFaceStylesOf(
  width: number,
  turn: CubeTurn | null,
): { readonly prev: CubeFaceStyle; readonly current: CubeFaceStyle; readonly next: CubeFaceStyle } {
  const prev = cubeFacesOf(0, "prev", width).entering;
  const next = cubeFacesOf(0, "next", width).entering;
  const current = cubeFacesOf(1, "next", width).entering;
  if (turn === null) return { prev, current, next };
  const start = cubeFacesOf(0, turn.direction, width);
  return turn.direction === "next"
    ? { prev: start.leaving, current: start.entering, next }
    : { prev, current: start.entering, next: start.leaving };
}
