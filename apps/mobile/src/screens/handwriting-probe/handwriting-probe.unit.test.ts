import { expect, test } from "vitest";

import { probeStrokeWidth, probeSurfaceSize } from "./handwriting-probe";

// 좌표 → SVG 문서의 케이스(PD · SD)는 함수와 함께 `lib/stroke-svg.unit.test.ts`로 옮겼습니다.
// 여기 남은 것은 탐침의 값입니다.

// SZ1
test("표면 크기는 정사각이고 굵기와 함께 양수다", () => {
  expect(probeSurfaceSize.width).toBe(probeSurfaceSize.height);
  expect(probeSurfaceSize.width).toBeGreaterThan(0);
  expect(probeStrokeWidth).toBeGreaterThan(0);
});
