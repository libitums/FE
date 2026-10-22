import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import type { Motion } from "@libitums/ui-lynx/motion";
import { describe, expect, test } from "vitest";

import type { SheetTargetId } from "./catalog-map.contract";
import {
  mapUnitBurstRayAngles,
  mapUnitBurstRayCount,
  mapUnitPopClassName,
  mapUnitStageMotionOf,
  noMapUnitEntrance,
  sheetEntranceClasses,
  sheetEntranceMotionFor,
  sheetPercentCountUpTokens,
  stepSheetBubbleOrigin,
  stepSheetPanelWidth,
  type SheetEntranceClasses,
  type SheetEntranceMotion,
} from "./journey-map-sheet-motion";

// `unit` 계층: 순수 함수의 입출력만 봅니다 (ADR-0006 D4).

const A: SheetTargetId = "catalog:u01-water:S1";
const B: SheetTargetId = "catalog:u01-water:S2";

describe("sheetEntranceMotionFor", () => {
  test.each([
    { phase: "waiting", motion: "standard", expected: "awaiting" },
    { phase: "entering", motion: "standard", expected: "expressive" },
    { phase: "waiting", motion: "reduced", expected: "fade" },
    { phase: "entering", motion: "reduced", expected: "fade" },
  ] as const)("SMC1. ($phase, $motion) → $expected", ({ phase, motion, expected }) => {
    const policy: Motion = motion;
    expect(sheetEntranceMotionFor(phase, policy)).toBe(expected);
  });
});

const band = "journey-map-screen-episode-header";
const expectedClasses: Record<SheetEntranceMotion, SheetEntranceClasses> = {
  none: {
    band,
    bandProgress: "none",
    bubble: "step-sheet-pop",
    bubbleInteractive: true,
    fill: "step-sheet-progress-fill",
    startGlow: false,
    motionReduced: false,
  },
  awaiting: {
    band: `${band} ${band}-awaiting`,
    bandProgress: "none",
    bubble: "step-sheet-pop step-sheet-pop-awaiting",
    bubbleInteractive: false,
    fill: "step-sheet-progress-fill",
    startGlow: false,
    motionReduced: false,
  },
  expressive: {
    band: `${band} ${band}-enter`,
    bandProgress: "fill",
    bubble: "step-sheet-pop step-sheet-pop-enter",
    bubbleInteractive: true,
    fill: "step-sheet-progress-fill step-sheet-progress-fill-enter",
    startGlow: true,
    motionReduced: false,
  },
  fade: {
    band: `${band} ${band}-motion-reduced`,
    bandProgress: "none",
    bubble: "step-sheet-pop step-sheet-pop-motion-reduced",
    bubbleInteractive: true,
    fill: "step-sheet-progress-fill",
    startGlow: false,
    motionReduced: true,
  },
};
const entrances: readonly SheetEntranceMotion[] = ["none", "awaiting", "expressive", "fade"];

describe("sheetEntranceClasses", () => {
  test.each(entrances)("SMC2-a. %s — 일곱 필드가 표와 같다", (entrance) => {
    expect(sheetEntranceClasses(entrance)).toEqual(expectedClasses[entrance]);
  });

  test("SMC2-b. fade는 등장 클래스 · 숨쉬기 · 띠 채움 모션이 없다", () => {
    const fade = sheetEntranceClasses("fade");
    // 가드: fade 행이 실제로 reduced 표식을 가진다.
    expect(fade.motionReduced).toBe(true);
    expect(fade.band).not.toContain("-enter");
    expect(fade.band).not.toContain("-awaiting");
    expect(fade.bubble).not.toContain("-enter");
    expect(fade.bubble).not.toContain("-awaiting");
    expect(fade.startGlow).toBe(false);
    expect(fade.bandProgress).toBe("none");
  });

  test.each(entrances)("SMC4. %s — base 클래스가 첫 토큰이다", (entrance) => {
    const classes = sheetEntranceClasses(entrance);
    // 가드: 스텁(none 행 고정)이 아닌 실제 파생이어야 한다.
    expect(classes).toEqual(expectedClasses[entrance]);
    expect(classes.band.split(" ")[0]).toBe(band);
    expect(classes.bubble.split(" ")[0]).toBe("step-sheet-pop");
    expect(classes.fill.split(" ")[0]).toBe("step-sheet-progress-fill");
  });
});

describe("말풍선 기준점", () => {
  test("SMC3. 폭 250이고 기준점은 폭의 절반 + 꼬리 치우침(px)이다", () => {
    expect(stepSheetPanelWidth).toBe(250);
    expect(stepSheetBubbleOrigin(0)).toBe("125px 0px");
    expect(stepSheetBubbleOrigin(-105)).toBe("20px 0px");
    expect(stepSheetBubbleOrigin(105)).toBe("230px 0px");
    expect(stepSheetBubbleOrigin(32.5)).toBe("157.5px 0px");
  });
});

describe("JS ↔ CSS 같은 토큰", () => {
  test("SMC5. 카운트업 토큰은 말풍선 막대 채움 CSS와 같은 토큰이다", () => {
    expect(sheetPercentCountUpTokens).toEqual({
      delay: "d6",
      duration: "d8",
      interval: "d1",
      easing: "enter",
    });
    const path = resolve(process.cwd(), "src/screens/journey-map/step-sheet-motion.css");
    const css = existsSync(path) ? readFileSync(path, "utf8").replace(/\/\*[\s\S]*?\*\//g, "") : "";
    const rule = /\.step-sheet-progress-fill-enter\s*\{([^}]*)\}/.exec(css)?.[1] ?? "";
    const { delay, duration, easing } = sheetPercentCountUpTokens;
    expect(rule).toContain(`var(--libitum-motion-duration-${duration})`);
    expect(rule).toContain(`var(--libitum-motion-duration-${delay})`);
    expect(rule).toContain(`var(--libitum-motion-easing-${easing})`);
  });
});

describe("노드 단계", () => {
  test("SMU1. 열린 노드만 튕기고 expressive에서만 반짝인다", () => {
    expect(mapUnitStageMotionOf({ targetId: A, entrance: "awaiting" }, A)).toBe("pop");
    expect(mapUnitStageMotionOf({ targetId: A, entrance: "awaiting" }, B)).toBe("none");
    expect(mapUnitStageMotionOf({ targetId: A, entrance: "awaiting" }, null)).toBe("none");
    expect(mapUnitStageMotionOf({ targetId: A, entrance: "expressive" }, A)).toBe("pop-burst");
    expect(mapUnitStageMotionOf({ targetId: A, entrance: "fade" }, A)).toBe("none");
    expect(mapUnitStageMotionOf({ targetId: null, entrance: "expressive" }, null)).toBe("none");
  });

  test("SMU2. 튕김 래퍼 클래스 — pop과 pop-burst는 같은 문자열이다", () => {
    expect(mapUnitPopClassName("none")).toBe("journey-step-node-pop");
    const popped = "journey-step-node-pop journey-step-node-pop-enter";
    expect(mapUnitPopClassName("pop")).toBe(popped);
    expect(mapUnitPopClassName("pop-burst")).toBe(popped);
  });

  test("SMU3. 반짝임 축은 8개이고 각도는 360/개수 간격이다", () => {
    expect(mapUnitBurstRayCount).toBe(8);
    expect(mapUnitBurstRayAngles(8)).toEqual([0, 45, 90, 135, 180, 225, 270, 315]);
    expect(mapUnitBurstRayAngles(4)).toEqual([0, 90, 180, 270]);
    expect(mapUnitBurstRayAngles(0)).toEqual([]);
  });

  test("SMU4. 다른 에피소드의 같은 유닛 키가 섞이지 않는다 (u00 튜토리얼 S1과 u01 S1)", () => {
    const tutorial: SheetTargetId = "catalog:u00-tutorial:S1";
    // 가드: 같은 키끼리는 맞는다.
    expect(mapUnitStageMotionOf({ targetId: tutorial, entrance: "expressive" }, tutorial)).toBe(
      "pop-burst",
    );
    expect(mapUnitStageMotionOf({ targetId: A, entrance: "expressive" }, tutorial)).toBe("none");
    expect(mapUnitStageMotionOf({ targetId: tutorial, entrance: "expressive" }, A)).toBe("none");
  });

  test("SMU5. Provider 밖 기본값은 아무 노드도 가리키지 않는다", () => {
    // 가드: 상수와 별개로 실제 파생이 있어야 이 테스트가 공허하지 않다.
    expect(mapUnitStageMotionOf({ targetId: A, entrance: "awaiting" }, A)).toBe("pop");
    expect(noMapUnitEntrance).toEqual({ targetId: null, entrance: "none" });
    expect(mapUnitStageMotionOf(noMapUnitEntrance, A)).toBe("none");
    expect(mapUnitStageMotionOf(noMapUnitEntrance, null)).toBe("none");
  });
});
