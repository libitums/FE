import { describe, expect, test } from "vitest";

import type { MeasuredRect } from "./journey-map-scroll";
import {
  autoScrollCorrection,
  autoScrollDestination,
  autoScrollTolerance,
} from "./journey-map-scroll-position";
import type { MapUnitMeasure } from "./journey-map-scroll-position";

// `unit` 계층: 도착한 뒤 다시 잰 값 → 한 번 더 옮길 목적지 판정의 입출력만 봅니다.

function rect(top: number, height: number, horizontal: Partial<MeasuredRect> = {}): MeasuredRect {
  return { top, height, centerX: null, left: null, width: null, ...horizontal };
}

// 목적지 290에 선 뒤 다시 잰 값입니다(대상 위 모서리 410).
const arrivedUi: MapUnitMeasure = {
  unit: rect(410, 100),
  scroll: rect(60, 800),
  screen: rect(0, 900),
  band: rect(64, 0),
  scrollTop: 290,
};

function withUnitTop(top: number): MapUnitMeasure {
  return { ...arrivedUi, unit: rect(top, 100) };
}

describe("autoScrollCorrection", () => {
  test("RC1. 대상이 30 위로 밀렸으면 같은 규칙의 목적지(260)를 낸다", () => {
    expect(autoScrollCorrection(withUnitTop(380), 1)).toBe(260);
  });

  test("RC2. 제자리면 null이다", () => {
    expect(autoScrollDestination(arrivedUi)).toBe(290);
    expect(autoScrollCorrection(arrivedUi, 1)).toBeNull();
  });

  test.each([409.4, 410.6, 411])("RC3. 차가 허용오차 이내(대상 %f)면 null이다", (top) => {
    expect(autoScrollDestination(withUnitTop(top))).toBeGreaterThan(0);
    expect(autoScrollCorrection(withUnitTop(top), 1)).toBeNull();
  });

  test("RC4. 허용오차를 넘는 차(1.5)는 그 목적지를 낸다", () => {
    expect(autoScrollCorrection(withUnitTop(408.5), 1)).toBeCloseTo(288.5, 9);
  });

  test("RC5. 대상이 30 아래면 아래로도 바로잡는다(양방향)", () => {
    expect(autoScrollCorrection(withUnitTop(440), 1)).toBe(320);
  });

  test("RC6. 띠 피하기가 이긴 도착은 다시 재도 같은 답이라 null이다", () => {
    const shortArrived: MapUnitMeasure = {
      unit: rect(240, 100, { centerX: 102 }),
      scroll: rect(60, 400),
      screen: rect(0, 800),
      band: rect(104, 0, { left: 16, width: 360 }),
      scrollTop: 460,
    };
    expect(autoScrollDestination(shortArrived)).toBe(460);
    expect(autoScrollCorrection(shortArrived, 1)).toBeNull();
  });

  test("RC7. 되돌릴 양이 스크롤 자리보다 크면 0 아래로 내려가지 않는다", () => {
    expect(autoScrollCorrection({ ...withUnitTop(380), scrollTop: 10 }, 1)).toBe(0);
  });

  test("RC8. 허용오차 상수는 1이다", () => {
    expect(autoScrollTolerance).toBe(1);
  });

  test("RC9. 허용오차 인자를 따른다 — 0이면 0.6의 차도 고치고, 2면 1.5의 차는 안 고친다", () => {
    expect(autoScrollCorrection(withUnitTop(409.4), 0)).toBeCloseTo(289.4, 9);
    expect(autoScrollDestination(withUnitTop(408.5))).toBeCloseTo(288.5, 9);
    expect(autoScrollCorrection(withUnitTop(408.5), 2)).toBeNull();
  });

  test("RC10. 띠 손잡이를 못 쟀어도(band null) 같은 규칙으로 판정한다", () => {
    const noBand: MapUnitMeasure = { ...arrivedUi, band: null };
    expect(autoScrollDestination(noBand)).toBe(290);
    expect(autoScrollCorrection(noBand, 1)).toBeNull();
  });
});
