import { motion } from "@libitums/design-tokens";
import { motionDurationMs } from "@libitums/ui-lynx/motion";
import { describe, expect, test } from "vitest";

import { uiCopyEn } from "../../lib/ui-copy-en";
import { stepSheetProgress } from "./journey-map-sheet";
import {
  cubicBezierEase,
  sheetPercentCountUpFor,
  sheetPercentCountUpFrames,
  sheetPercentLabel,
  sheetPercentOf,
  sheetPercentView,
  type CubicBezier,
} from "./journey-map-sheet-motion";

// `unit` 계층: 순수 함수의 입출력만 봅니다 (ADR-0006 D4).

const enter: CubicBezier = motion.easing.enter;
const linear: CubicBezier = [0, 0, 1, 1];
const pop = "step-sheet-progress-percent-pop";

function isMonotonic(values: readonly number[]): boolean {
  return values.every((value, index) => index === 0 || value >= (values[index - 1] ?? 0));
}

describe("cubicBezierEase", () => {
  test("SMP1. 양 끝은 0 · 1이고 범위 밖 t는 가둔다", () => {
    expect(cubicBezierEase(enter, 0)).toBe(0);
    expect(cubicBezierEase(enter, 1)).toBe(1);
    expect(cubicBezierEase(enter, -1)).toBe(0);
    expect(cubicBezierEase(enter, 2)).toBe(1);
  });

  test("SMP1-b. 값 두 점과 단조", () => {
    expect(cubicBezierEase(linear, 0.25)).toBeCloseTo(0.25, 5);
    expect(Math.abs(cubicBezierEase(enter, 0.5) - 0.854)).toBeLessThan(0.01);
    const samples = Array.from({ length: 21 }, (_, index) => cubicBezierEase(enter, index * 0.05));
    expect(isMonotonic(samples)).toBe(true);
  });
});

describe("sheetPercentCountUpFrames", () => {
  test("SMP2. 100을 12칸으로 — 13칸, 0에서 100, 가운데 85 안팎, 단조 정수", () => {
    const frames = sheetPercentCountUpFrames(100, enter, 12);
    expect(frames).toHaveLength(13);
    expect(frames[0]).toBe(0);
    expect(frames[12]).toBe(100);
    expect(frames[6]).toBeGreaterThanOrEqual(84);
    expect(frames[6]).toBeLessThanOrEqual(86);
    expect(isMonotonic(frames)).toBe(true);
    expect(frames.every((value) => Number.isInteger(value))).toBe(true);
  });

  test("SMP3. 경계 — 0 이하 · stepCount 0 · 작은 값", () => {
    expect(sheetPercentCountUpFrames(0, enter, 12)).toEqual([0]);
    expect(sheetPercentCountUpFrames(-5, enter, 12)).toEqual([0]);
    expect(sheetPercentCountUpFrames(37, enter, 0)).toEqual([37]);
    const small = sheetPercentCountUpFrames(3, enter, 12);
    expect(small[small.length - 1]).toBe(3);
    expect(isMonotonic(small)).toBe(true);
  });
});

describe("sheetPercentCountUpFor", () => {
  test("SMP4. expressive · 100 — 토큰에서 낸 일정이다", () => {
    const countUp = sheetPercentCountUpFor("expressive", 100);
    expect(countUp).not.toBeNull();
    expect(countUp?.frames).toEqual(sheetPercentCountUpFrames(100, enter, 12));
    expect(countUp?.startDelayMs).toBe(motionDurationMs(motion.duration.d6));
    expect(countUp?.stepMs).toBe(motionDurationMs(motion.duration.d1));
    const stepCount = (countUp?.frames.length ?? 0) - 1;
    expect(stepCount).toBe(
      motionDurationMs(motion.duration.d8) / motionDurationMs(motion.duration.d1),
    );
  });

  test.each([
    { entrance: "expressive", percent: 0 },
    { entrance: "fade", percent: 100 },
    { entrance: "awaiting", percent: 100 },
    { entrance: "none", percent: 100 },
  ] as const)("SMP4-b. ($entrance, $percent)는 카운트업이 없다", ({ entrance, percent }) => {
    // 가드: 같은 함수가 expressive · 100에서는 일정을 낸다.
    expect(sheetPercentCountUpFor("expressive", 100)).not.toBeNull();
    expect(sheetPercentCountUpFor(entrance, percent)).toBeNull();
  });
});

describe("끝값이 기존 라벨과 같다", () => {
  test.each([
    [0, 4],
    [1, 4],
    [1, 3],
    [2, 3],
    [16, 16],
    [1, 7],
    [5, 7],
  ])("SMP5. (%i, %i)", (completed, total) => {
    const progress = stepSheetProgress(completed, total, uiCopyEn);
    const percent = sheetPercentOf(progress.fillPercent);
    expect(sheetPercentLabel(percent)).toBe(progress.percentLabel);
    const countUp = sheetPercentCountUpFor("expressive", percent);
    if (percent > 0) {
      expect(countUp).not.toBeNull();
    }
    if (countUp !== null) {
      const last = countUp.frames[countUp.frames.length - 1] ?? -1;
      expect(sheetPercentLabel(last)).toBe(progress.percentLabel);
    }
  });
});

describe("sheetPercentView", () => {
  const countUp = sheetPercentCountUpFor("expressive", 100);

  test("SMP6. 칸마다 라벨 · 마지막 칸에만 pop 클래스, 범위 밖은 가둔다", () => {
    expect(countUp).not.toBeNull();
    const frames = countUp?.frames ?? [];
    expect(sheetPercentView(countUp, 100, 0)).toEqual({ label: "0%", className: pop });
    expect(sheetPercentView(countUp, 100, 5)).toEqual({
      label: `${frames[5]}%`,
      className: pop,
    });
    const settled = { label: "100%", className: `${pop} ${pop}-enter` };
    expect(sheetPercentView(countUp, 100, 12)).toEqual(settled);
    expect(sheetPercentView(countUp, 100, 99)).toEqual(settled);
    expect(sheetPercentView(countUp, 100, -3)).toEqual({ label: "0%", className: pop });
  });

  test("SMP7. 카운트업이 없으면 최종 라벨 · pop 없음 — 0 %도 튀지 않는다", () => {
    // 가드: 라벨 서식 자체는 맞아야 한다.
    expect(sheetPercentLabel(100)).toBe("100%");
    expect(sheetPercentView(null, 100, 0)).toEqual({ label: "100%", className: pop });
    expect(sheetPercentView(null, 0, 12)).toEqual({ label: "0%", className: pop });
  });
});
