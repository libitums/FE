import { describe, expect, test } from "vitest";

import type { StoryViewerItem } from "./friend-stories.contract";
import { story } from "./friend-stories.test-support";
import {
  CUBE_EDGE_RESIST,
  CUBE_SHADE_MAX,
  cubeAmountOf,
  cubeAxisOf,
  cubeDirectionOf,
  cubeFacesOf,
  cubeReleaseOf,
  cubeSettleMs,
} from "./story-cube";
import { cubeFaceStylesOf, cubeNeighborsOf } from "./story-cube-neighbors";

// `unit` 계층(FS-U26 ~ U32): 인물 넘김 큐브(ADR-0178 D4 개정 ⟨큐브⟩).

const W = 400;

describe("FS-U26. 손가락 방향 · 넘김 방향", () => {
  test("8px 안은 아직 모름, 가로가 세로보다 커야 가로", () => {
    expect(cubeAxisOf(5, 3)).toBe("undecided");
    expect(cubeAxisOf(-20, 6)).toBe("horizontal");
    expect(cubeAxisOf(10, 30)).toBe("vertical");
    expect(cubeAxisOf(12, 12)).toBe("vertical");
  });
  test("왼쪽으로 밀면 다음, 오른쪽이면 이전", () => {
    expect(cubeDirectionOf(-1)).toBe("next");
    expect(cubeDirectionOf(30)).toBe("prev");
  });
});

describe("FS-U27. 돈 몫 — 손가락 거리 / 화면 폭, 옆 인물이 없으면 조금만", () => {
  test("반을 밀면 0.5, 화면 폭을 넘으면 1", () => {
    expect(cubeAmountOf(-200, W, true)).toBe(0.5);
    expect(cubeAmountOf(900, W, true)).toBe(1);
  });
  test("옆 인물이 없으면 저항 몫만", () => {
    expect(cubeAmountOf(-200, W, false)).toBe(0.5 * CUBE_EDGE_RESIST);
  });
  test("폭을 모르면 0", () => {
    expect(cubeAmountOf(-200, 0, true)).toBe(0);
  });
});

describe("FS-U28. 두 면의 변환 — 지금 면 0 → ∓90°, 옆 면 ±90° → 0, 그늘", () => {
  test("다음 쪽 시작 — 지금 면은 그대로, 다음 면은 오른쪽 밖에서 90°", () => {
    const { leaving, entering } = cubeFacesOf(0, "next", W);
    expect(leaving).toEqual({
      transform: "translateX(0px) rotateY(0deg)",
      transformOrigin: "right center",
      shade: 0,
      opacity: 1,
    });
    // 다 돌아 옆에 있는 면은 보이지 않게(불투명도 0).
    expect(entering).toEqual({
      transform: "translateX(400px) rotateY(90deg)",
      transformOrigin: "left center",
      shade: CUBE_SHADE_MAX,
      opacity: 0,
    });
  });
  test("다음 쪽 반 — 맞닿은 모서리가 가운데, 지금 면 −45° · 다음 면 45°, 그늘은 반씩", () => {
    const { leaving, entering } = cubeFacesOf(0.5, "next", W);
    expect(leaving.transform).toBe("translateX(-200px) rotateY(-45deg)");
    expect(entering.transform).toBe("translateX(200px) rotateY(45deg)");
    expect(leaving.shade).toBe(CUBE_SHADE_MAX / 2);
    expect(entering.shade).toBe(CUBE_SHADE_MAX / 2);
    expect([leaving.opacity, entering.opacity]).toEqual([1, 1]);
  });
  test("다음 쪽 끝 — 지금 면은 왼쪽 밖 −90° · 어둡고, 다음 면이 제자리", () => {
    const { leaving, entering } = cubeFacesOf(1, "next", W);
    expect(leaving.transform).toBe("translateX(-400px) rotateY(-90deg)");
    expect(leaving.shade).toBe(CUBE_SHADE_MAX);
    expect(leaving.opacity).toBe(0);
    expect(entering).toEqual({
      transform: "translateX(0px) rotateY(0deg)",
      transformOrigin: "left center",
      shade: 0,
      opacity: 1,
    });
  });
  test("이전 쪽은 거울 반대 — 지금 면은 왼쪽 모서리 축으로 +, 이전 면은 오른쪽 모서리 축으로 −", () => {
    const { leaving, entering } = cubeFacesOf(0.25, "prev", W);
    expect(leaving).toEqual({
      transform: "translateX(100px) rotateY(22.5deg)",
      transformOrigin: "left center",
      shade: 0.13,
      opacity: 1,
    });
    expect(entering.transform).toBe("translateX(-300px) rotateY(-67.5deg)");
    expect(entering.transformOrigin).toBe("right center");
  });
  test("몫은 0 ~ 1로 자른다", () => {
    expect(cubeFacesOf(2, "next", W)).toEqual(cubeFacesOf(1, "next", W));
    expect(cubeFacesOf(-1, "prev", W)).toEqual(cubeFacesOf(0, "prev", W));
  });
});

describe("FS-U29. 놓았을 때 — 48px · 반 · 빠르게", () => {
  const release = (dx: number, velocity = 0, dy = 0) =>
    cubeReleaseOf({ dx, dy, velocity, width: W });
  test("48px 미만 · 세로가 더 크면 되돌아옴", () => {
    expect(release(-40, -2)).toBe("back");
    expect(release(-100, -2, 140)).toBe("back");
  });
  test("반 넘게 밀면 넘어감(느려도)", () => {
    expect(release(-200)).toBe("advance");
    expect(release(230, -0.1)).toBe("advance");
  });
  test("반이 안 되면 같은 방향으로 빠를 때만 넘어감", () => {
    expect(release(-120, -0.2)).toBe("back");
    expect(release(-120, -0.6)).toBe("advance");
    expect(release(120, 0.5)).toBe("advance");
    // 반대로 튕기면 되돌아옴.
    expect(release(-120, 0.9)).toBe("back");
  });
});

test("FS-U30. 남은 몫을 도는 시간 — 다 돌면 전체, 남은 만큼 짧게", () => {
  expect(cubeSettleMs(0, 1, 300)).toBe(300);
  expect(cubeSettleMs(0.6, 1, 300)).toBe(120);
  expect(cubeSettleMs(0.4, 0, 300)).toBe(120);
});

describe("FS-U31. 옆 인물 면에 그릴 장", () => {
  const item = (id: string, characterId: string): StoryViewerItem => ({
    story: story(characterId, { id }),
    name: characterId,
    avatarUrl: null,
    imageUrl: null,
    unmet: null,
  });
  // a 둘 · b 셋 · c 하나.
  const ITEMS = [
    item("a1", "a"),
    item("a2", "a"),
    item("b1", "b"),
    item("b2", "b"),
    item("b3", "b"),
    item("c1", "c"),
  ];
  test("가운데 인물 — 이전 인물의 첫 장 · 다음 인물의 첫 장", () => {
    expect(cubeNeighborsOf(ITEMS, 3, null)).toEqual({ prev: 0, next: 5 });
  });
  test("첫 인물엔 이전이 없고, 마지막 인물엔 다음이 없다", () => {
    expect(cubeNeighborsOf(ITEMS, 1, null)).toEqual({ prev: null, next: 2 });
    expect(cubeNeighborsOf(ITEMS, 5, null)).toEqual({ prev: 2, next: null });
  });
  test("탭으로 넘어온 전환이 도는 동안 — 접혀 나가는 면은 방금 보던 장", () => {
    expect(cubeNeighborsOf(ITEMS, 2, { id: 1, from: 1, direction: "next" })).toEqual({
      prev: 1,
      next: 5,
    });
    expect(cubeNeighborsOf(ITEMS, 4, { id: 2, from: 5, direction: "prev" })).toEqual({
      prev: 0,
      next: 5,
    });
  });
});

describe("FS-U32. 세 면의 쉬는 자리 · 전환 시작 자리 — 큐브가 다 돈 끝 값과 같다", () => {
  test("쉴 때 — 지금 면은 제자리, 옆 면은 모서리 밖 ±90° · 어둡다", () => {
    const rest = cubeFaceStylesOf(W, null);
    expect(rest.current.transform).toBe("translateX(0px) rotateY(0deg)");
    expect(rest.current.shade).toBe(0);
    // 옆 면은 쉬는 동안 보이지 않는다(불투명도 0).
    expect([rest.prev.opacity, rest.current.opacity, rest.next.opacity]).toEqual([0, 1, 0]);
    expect(rest.next).toEqual(cubeFacesOf(0, "next", W).entering);
    expect(rest.prev).toEqual(cubeFacesOf(0, "prev", W).entering);
    // 다음 쪽으로 다 돈 끝: 나간 면 = 이전 자리, 들어온 면 = 지금 자리.
    expect(cubeFacesOf(1, "next", W).leaving).toEqual(rest.prev);
    expect(cubeFacesOf(1, "prev", W).leaving).toEqual(rest.next);
    expect(cubeFacesOf(1, "prev", W).entering.transform).toBe(rest.current.transform);
  });
  test("다음 쪽 전환 시작 — 이전 자리 면(방금 인물)이 제자리, 지금 면이 오른쪽 밖", () => {
    const start = cubeFaceStylesOf(W, { id: 1, from: 1, direction: "next" });
    expect(start.prev.transform).toBe("translateX(0px) rotateY(0deg)");
    expect(start.current.transform).toBe("translateX(400px) rotateY(90deg)");
    expect(start.next).toEqual(cubeFaceStylesOf(W, null).next);
  });
  test("이전 쪽 전환 시작 — 다음 자리 면이 제자리, 지금 면이 왼쪽 밖", () => {
    const start = cubeFaceStylesOf(W, { id: 2, from: 2, direction: "prev" });
    expect(start.next.transform).toBe("translateX(0px) rotateY(0deg)");
    expect(start.current.transform).toBe("translateX(-400px) rotateY(-90deg)");
  });
});
