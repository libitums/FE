import { describe, expect, test } from "vitest";

import { mapBottomInset, stepUnitSize } from "./journey-map-sheet";
import {
  autoScrollOffset,
  autoScrollPlacement,
  autoScrollReducer,
  canSettleAutoScroll,
  currentEpisodeIndexAt,
  initialAutoScrollState,
  mapScrollBehaviorFor,
} from "./journey-map-scroll-position";
import type {
  AutoScrollAction,
  AutoScrollMeasure,
  AutoScrollPlacement,
  AutoScrollState,
} from "./journey-map-scroll-position";

// `unit` 계층: 스크롤 목적지 · 자동 스크롤 전이 · 현재 에피소드 판정의 입출력만 봅니다.

const placement: AutoScrollPlacement = { gap: 24, bottomInset: 68, unitSize: 100 };

const base: AutoScrollMeasure = {
  targetTop: 900,
  scrollViewTop: 0,
  scrollViewHeight: 812,
  headerBottom: 228,
  scrollTop: 0,
};

describe("autoScrollOffset", () => {
  test("P1. 대상 위 모서리가 머리 카드 아래 + 24(252)에 서는 목적지다", () => {
    expect(autoScrollOffset(base, placement)).toBe(648);
  });

  test("P2. 스크롤 자리와 무관하게 같은 유닛이면 같은 목적지다", () => {
    expect(autoScrollOffset({ ...base, scrollTop: 300, targetTop: 600 }, placement)).toBe(648);
  });

  test("P3. 정렬선보다 위에 있는 대상은 0 아래로 내려가지 않는다", () => {
    expect(autoScrollOffset({ ...base, targetTop: 200 }, placement)).toBe(0);
  });

  test("P4. 큰 글자로 정렬선이 한계선을 넘으면 한계선(424)에 선다", () => {
    const tall = { ...base, scrollViewHeight: 616, headerBottom: 478 };
    expect(autoScrollOffset(tall, placement)).toBe(900 - 424);
    // 스크롤 상자 위가 0이 아니어도 같은 식이다.
    expect(autoScrollOffset({ ...tall, scrollViewTop: 50, scrollViewHeight: 566 }, placement)).toBe(
      900 - 424,
    );
  });

  test("P5. 정렬선 = 한계선인 경계에서 두 식의 값이 같고 그 양쪽은 작은 쪽을 따른다", () => {
    // 한계선 = 812 − 68 − 24 − 100 = 620, 정렬선 = headerBottom + 24.
    expect(autoScrollOffset({ ...base, headerBottom: 596 }, placement)).toBe(900 - 620);
    expect(autoScrollOffset({ ...base, headerBottom: 595 }, placement)).toBe(900 - 619);
    expect(autoScrollOffset({ ...base, headerBottom: 597 }, placement)).toBe(900 - 620);
  });

  test("P6. 실제 상수는 gap 24와 시트의 두 상수를 그대로 읽는다", () => {
    expect(autoScrollPlacement).toEqual({
      gap: 24,
      bottomInset: mapBottomInset,
      unitSize: stepUnitSize,
    });
    expect(autoScrollPlacement).toEqual(placement);
  });
});

describe("mapScrollBehaviorFor", () => {
  test("B1. standard는 smooth, reduced는 instant다", () => {
    expect(mapScrollBehaviorFor("standard")).toBe("smooth");
    expect(mapScrollBehaviorFor("reduced")).toBe("instant");
  });
});

describe("currentEpisodeIndexAt", () => {
  test("C1. 빈 목록은 0이다", () => {
    expect(currentEpisodeIndexAt([], 500)).toBe(0);
  });

  test.each([
    [0, 0],
    [799, 0],
    [800, 1],
    [1599, 1],
    [1600, 2],
    [9999, 2],
  ])("C2. scrollTop %i → 구획 %i", (scrollTop, index) => {
    expect(currentEpisodeIndexAt([100, 900, 1700], scrollTop)).toBe(index);
  });

  test.each([
    [0, 0],
    [799, 0],
    [800, 1],
    [1599, 1],
    [1600, 2],
    [9999, 2],
  ])("C3. 원점을 옮겨도(+250) scrollTop %i → 구획 %i", (scrollTop, index) => {
    expect(currentEpisodeIndexAt([350, 1150, 1950], scrollTop)).toBe(index);
  });

  test("C4. 음수 scrollTop(당겨 내림)은 0이다", () => {
    expect(currentEpisodeIndexAt([100, 900, 1700], -40)).toBe(0);
  });
});

describe("autoScrollReducer", () => {
  const init = initialAutoScrollState;
  const unitTarget = (domId: string): AutoScrollAction => ({
    type: "target",
    target: { kind: "unit", domId },
  });
  const reduce = (state: AutoScrollState, ...actions: AutoScrollAction[]) =>
    actions.reduce(autoScrollReducer, state);

  const pendingA = reduce(init, unitTarget("a"));
  const settledA = reduce(pendingA, { type: "settle", domId: "a" });
  const locked = reduce(init, { type: "interact" });

  test("초기 상태", () => {
    expect(init).toEqual({ locked: false, pendingDomId: null, settledDomId: null });
  });

  test("A1. 처음에 유닛 대상이 오면 그 id를 재는 중이 된다", () => {
    expect(pendingA).toEqual({ locked: false, pendingDomId: "a", settledDomId: null });
  });

  test("A2. top 대상은 상태를 바꾸지 않는다(같은 참조)", () => {
    expect(reduce(init, { type: "target", target: { kind: "top" } })).toBe(init);
  });

  test("A3. 옮기고 나면 settled가 되고 pending이 비며, 옮기기 전에는 settle해도 된다", () => {
    expect(canSettleAutoScroll(pendingA, "a")).toBe(true);
    expect(settledA).toEqual({ locked: false, pendingDomId: null, settledDomId: "a" });
    expect(canSettleAutoScroll(settledA, "a")).toBe(false);
  });

  test("A4. 같은 대상은 다시 재지 않는다(같은 참조)", () => {
    expect(settledA.settledDomId).toBe("a");
    expect(reduce(settledA, unitTarget("a"))).toBe(settledA);
    expect(reduce(pendingA, unitTarget("a"))).toBe(pendingA);
  });

  test("A5. 대상이 바뀌면 다시 잰다", () => {
    const next = reduce(settledA, unitTarget("b"));
    expect(next.pendingDomId).toBe("b");
    expect(next.locked).toBe(false);
  });

  test("A6. 손댄 뒤에는 답을 버린다", () => {
    const touched = reduce(pendingA, { type: "interact" });
    expect(touched).toEqual({ locked: true, pendingDomId: null, settledDomId: null });
    expect(canSettleAutoScroll(touched, "a")).toBe(false);
    expect(reduce(touched, { type: "settle", domId: "a" })).toBe(touched);
  });

  test("A7. 옮기기 전에 사용자가 먼저 스크롤하면 잠기고 이후 대상은 무시된다", () => {
    const scrolled = reduce(init, { type: "scroll", scrollTop: 120 });
    expect(scrolled).toEqual({ locked: true, pendingDomId: null, settledDomId: null });
    expect(reduce(scrolled, unitTarget("a"))).toBe(scrolled);
    // 재는 중에 스크롤이 와도 잠긴다.
    expect(reduce(pendingA, { type: "scroll", scrollTop: 120 })).toEqual({
      locked: true,
      pendingDomId: null,
      settledDomId: null,
    });
  });

  test("A8. 자리 0의 스크롤 이벤트는 손길이 아니다(같은 참조)", () => {
    expect(reduce(init, { type: "scroll", scrollTop: 0 })).toBe(init);
    expect(reduce(pendingA, { type: "scroll", scrollTop: 0 })).toBe(pendingA);
  });

  test("A9. 옮긴 뒤의 스크롤 이벤트는 잠그지 않는다", () => {
    const afterScroll = reduce(settledA, { type: "scroll", scrollTop: 500 });
    expect(afterScroll.locked).toBe(false);
    expect(reduce(afterScroll, unitTarget("b")).pendingDomId).toBe("b");
  });

  test("A10. 재는 중에 대상이 바뀌면 옛 대상의 답은 버린다", () => {
    const changed = reduce(pendingA, unitTarget("b"));
    expect(changed.pendingDomId).toBe("b");
    expect(canSettleAutoScroll(changed, "a")).toBe(false);
    expect(canSettleAutoScroll(changed, "b")).toBe(true);
    expect(reduce(changed, { type: "settle", domId: "a" })).toBe(changed);
  });

  test("A11. 잠긴 뒤에는 어떤 사건에도 같은 참조다", () => {
    expect(locked.locked).toBe(true);
    for (const action of [
      unitTarget("a"),
      { type: "scroll", scrollTop: 300 },
      { type: "settle", domId: "a" },
      { type: "interact" },
    ] as const) {
      expect(reduce(locked, action)).toBe(locked);
    }
  });
});
