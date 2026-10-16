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
import * as position from "./journey-map-scroll-position";
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

// 도착 뒤 보정(정정 2) — 새 심볼은 이름공간으로 읽어, 아직 없을 때도 파일 수집이 깨지지 않고 단언이 떨어집니다.
type CorrectionState =
  | { readonly phase: "idle" }
  | { readonly phase: "travelling"; readonly domId: string; readonly offset: number }
  | { readonly phase: "measuring"; readonly domId: string };

type CorrectionAction =
  | { readonly type: "sent"; readonly domId: string; readonly offset: number }
  | { readonly type: "scroll"; readonly scrollTop: number }
  | { readonly type: "cancel" }
  | { readonly type: "done"; readonly domId: string };

const exported = position as unknown as Record<string, unknown>;

function exportedFunction<T>(name: string): T {
  const value = exported[name];
  expect(typeof value, `${name}이 export되어 있다`).toBe("function");
  return value as T;
}

const correction = (measure: AutoScrollMeasure, tolerance = 1): number | null =>
  exportedFunction<
    (m: AutoScrollMeasure, p: AutoScrollPlacement, tolerance: number) => number | null
  >("autoScrollCorrection")(measure, placement, tolerance);

describe("autoScrollCorrection", () => {
  // 도착: 대상 위 모서리 252(정렬선 252 = 228 + 24)에서 카드가 30 커져 머리 카드 아래가 258이 된 뒤의 값입니다.
  const arrived: AutoScrollMeasure = {
    targetTop: 252,
    scrollViewTop: 0,
    scrollViewHeight: 812,
    headerBottom: 258,
    scrollTop: 648,
  };

  test("RC1. 카드가 30 커졌으면 30만큼 되돌린 목적지(618)를 낸다", () => {
    expect(correction(arrived)).toBe(618);
  });

  test("RC2. 대상이 정렬선 위에 정확히 서 있으면 null이다", () => {
    expect(correction({ ...arrived, headerBottom: 228 })).toBeNull();
  });

  test.each([281.4, 281])(
    "RC3. 정렬선과의 차가 허용오차 이내(targetTop %f)면 null이다",
    (targetTop) => {
      expect(correction({ ...arrived, targetTop })).toBeNull();
    },
  );

  test("RC4. 허용오차를 넘는 차(1.5)는 그만큼 되돌린 수를 낸다", () => {
    expect(correction({ ...arrived, targetTop: 280.5 })).toBeCloseTo(646.5, 9);
  });

  test("RC5. 대상이 정렬선보다 아래(끝에서 멈춤)면 아래로 밀지 않고 null이다", () => {
    expect(correction({ ...arrived, targetTop: 400 })).toBeNull();
  });

  test("RC6. 한계선이 이긴 경우(높이 616 · 카드 아래 478)는 다시 재도 같은 답이라 null이다", () => {
    expect(
      correction({
        targetTop: 424,
        scrollViewTop: 0,
        scrollViewHeight: 616,
        headerBottom: 478,
        scrollTop: 900 - 424,
      }),
    ).toBeNull();
  });

  test("RC7. 되돌릴 양이 스크롤 자리보다 크면 0 아래로 내려가지 않는다", () => {
    expect(correction({ ...arrived, scrollTop: 10 })).toBe(0);
  });

  test("RC8. 허용오차 상수는 1이다", () => {
    expect(exported["autoScrollTolerance"]).toBe(1);
  });

  test("RC9. 허용오차 인자를 따른다 — 0이면 0.6의 차도 고치고, 2면 1.5의 차는 안 고친다", () => {
    expect(correction({ ...arrived, targetTop: 281.4 }, 0)).toBeCloseTo(647.4, 9);
    expect(correction({ ...arrived, targetTop: 280.5 }, 2)).toBeNull();
  });
});

describe("autoScrollCorrectionReducer", () => {
  const reducer = (state: CorrectionState, action: CorrectionAction): CorrectionState =>
    exportedFunction<
      (s: CorrectionState, a: CorrectionAction, tolerance: number) => CorrectionState
    >("autoScrollCorrectionReducer")(state, action, 1);
  const reduce = (state: CorrectionState, ...actions: CorrectionAction[]) =>
    actions.reduce(reducer, state);
  const can = (state: CorrectionState, domId: string): boolean =>
    exportedFunction<(s: CorrectionState, id: string) => boolean>("canCorrectAutoScroll")(
      state,
      domId,
    );
  const idle = (): CorrectionState =>
    exported["initialAutoScrollCorrectionState"] as CorrectionState;
  const sentA = (): CorrectionState => reduce(idle(), { type: "sent", domId: "a", offset: 648 });
  const measuringA = (): CorrectionState => reduce(sentA(), { type: "scroll", scrollTop: 648 });

  test("RA1. 처음 상태는 idle이고, sent가 오면 그 목적지로 travelling이 된다", () => {
    expect(idle()).toEqual({ phase: "idle" });
    expect(sentA()).toEqual({ phase: "travelling", domId: "a", offset: 648 });
  });

  test("RA2. travelling 중 아직 먼 스크롤(409 · 646.9)은 같은 참조다", () => {
    const travelling = sentA();
    expect(travelling).toEqual({ phase: "travelling", domId: "a", offset: 648 });
    expect(reduce(travelling, { type: "scroll", scrollTop: 409 })).toBe(travelling);
    expect(reduce(travelling, { type: "scroll", scrollTop: 646.9 })).toBe(travelling);
  });

  test.each([647.6, 648, 648.9])(
    "RA3. 목적지와 허용오차 이내(scrollTop %f)면 measuring이고 그 대상만 보정해도 된다",
    (scrollTop) => {
      const state = reduce(sentA(), { type: "scroll", scrollTop });
      expect(state).toEqual({ phase: "measuring", domId: "a" });
      expect(can(state, "a")).toBe(true);
      expect(can(state, "b")).toBe(false);
    },
  );

  test("RA4. measuring 중의 스크롤은 도착이 아니다(같은 참조)", () => {
    const measuring = measuringA();
    expect(measuring).toEqual({ phase: "measuring", domId: "a" });
    expect(reduce(measuring, { type: "scroll", scrollTop: 618 })).toBe(measuring);
    expect(reduce(measuring, { type: "scroll", scrollTop: 648 })).toBe(measuring);
  });

  test("RA5. done 뒤에는 idle이고, 그 뒤 목적지의 스크롤도 도착으로 읽지 않는다", () => {
    const done = reduce(measuringA(), { type: "done", domId: "a" });
    expect(done).toEqual({ phase: "idle" });
    expect(reduce(done, { type: "scroll", scrollTop: 648 })).toBe(done);
  });

  test("RA6. cancel은 travelling · measuring을 idle로 돌리고, idle에서는 같은 참조다", () => {
    expect(reduce(sentA(), { type: "cancel" })).toEqual({ phase: "idle" });
    expect(reduce(measuringA(), { type: "cancel" })).toEqual({ phase: "idle" });
    expect(can(reduce(measuringA(), { type: "cancel" }), "a")).toBe(false);
    const idleState = idle();
    expect(reduce(idleState, { type: "cancel" })).toBe(idleState);
  });

  test("RA7. 남의 done은 같은 참조다", () => {
    const measuring = measuringA();
    expect(measuring).toEqual({ phase: "measuring", domId: "a" });
    expect(reduce(measuring, { type: "done", domId: "b" })).toBe(measuring);
  });

  test("RA8. 새 대상의 sent가 앞의 것을 덮고, 옛 대상의 done은 같은 참조다", () => {
    const next = reduce(measuringA(), { type: "sent", domId: "b", offset: 2000 });
    expect(next).toEqual({ phase: "travelling", domId: "b", offset: 2000 });
    expect(reduce(next, { type: "done", domId: "a" })).toBe(next);
  });

  test("RA9. idle에서의 scroll · done은 같은 참조다", () => {
    const idleState = idle();
    expect(idleState).toEqual({ phase: "idle" });
    expect(reduce(idleState, { type: "scroll", scrollTop: 648 })).toBe(idleState);
    expect(reduce(idleState, { type: "done", domId: "a" })).toBe(idleState);
  });

  test("RA10. travelling 중 done은 같은 참조다(아직 재는 중이 아니다)", () => {
    const travelling = sentA();
    expect(travelling).toEqual({ phase: "travelling", domId: "a", offset: 648 });
    expect(reduce(travelling, { type: "done", domId: "a" })).toBe(travelling);
    expect(can(travelling, "a")).toBe(false);
  });
});
