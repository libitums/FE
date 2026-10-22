import { describe, expect, test } from "vitest";

import type { MeasuredRect } from "./journey-map-scroll";
import {
  autoScrollDestination,
  autoScrollTolerance,
  headerBandCard,
  headerBandGap,
  headerBandHeightEstimate,
  mapUnitPlacement,
} from "./journey-map-scroll-position";
import type { MapUnitMeasure } from "./journey-map-scroll-position";
import { stepSheetPlacementBelowHeader } from "./journey-map-sheet";

// `unit` 계층: 유닛 탭과 자동 스크롤이 함께 쓰는 자리 규칙(띠 카드 · 배치 입력 옮기기 · 목적지)의 입출력만 봅니다.

type Horizontal = { readonly centerX?: number; readonly left?: number; readonly width?: number };

function rect(top: number, height: number, horizontal: Horizontal = {}): MeasuredRect {
  return {
    top,
    height,
    centerX: horizontal.centerX ?? null,
    left: horizontal.left ?? null,
    width: horizontal.width ?? null,
  };
}

const bandStrip: Horizontal = { left: 16, width: 360 };

const fUi: MapUnitMeasure = {
  unit: rect(700, 100),
  scroll: rect(60, 800),
  screen: rect(0, 900),
  band: rect(60, 168),
  scrollTop: 0,
};
const fUiBandAtChips: MapUnitMeasure = { ...fUi, band: rect(64, 0) };
const fUiNoBand: MapUnitMeasure = { ...fUi, band: null };
const fUiCenterX: MapUnitMeasure = { ...fUi, unit: rect(700, 100, { centerX: 102 }) };
const fShort: MapUnitMeasure = {
  unit: rect(700, 100, { centerX: 102 }),
  scroll: rect(60, 400),
  screen: rect(0, 800),
  band: rect(104, 0, bandStrip),
  scrollTop: 0,
};
const fShortNoBand: MapUnitMeasure = { ...fShort, band: null };
const f392: MapUnitMeasure = {
  unit: rect(1600, 100, { centerX: 102.4 }),
  scroll: rect(24, 827),
  screen: rect(24, 827),
  band: rect(88, 0, { left: 16, width: 360.7 }),
  scrollTop: 0,
};
const fTop: MapUnitMeasure = {
  unit: rect(200, 100, { centerX: 195 }),
  scroll: rect(0, 874),
  screen: rect(0, 874),
  band: rect(64, 0, { left: 16, width: 358 }),
  scrollTop: 0,
};

// 도착한 뒤 값입니다 — 유닛 위 모서리가 d만큼 올라가 있고, 스크롤 자리는 d, 띠 손잡이 높이는 h.
function arrived(m: MapUnitMeasure, d: number, h: number): MapUnitMeasure {
  return {
    ...m,
    unit: { ...m.unit, top: m.unit.top - d },
    scrollTop: d,
    band: m.band && { ...m.band, height: h },
  };
}

function reference(m: MapUnitMeasure): ReturnType<typeof stepSheetPlacementBelowHeader> {
  return stepSheetPlacementBelowHeader(
    {
      unitTop: m.unit.top,
      scrollViewTop: m.scroll.top,
      scrollViewHeight: m.scroll.height,
      screenTop: m.screen.top,
      screenHeight: m.screen.height,
      scrollTop: m.scrollTop,
    },
    m.unit.centerX,
    headerBandCard(m.band, 112),
    24,
  );
}

const fixtures: ReadonlyArray<readonly [string, MapUnitMeasure]> = [
  ["F-ui (band 168)", fUi],
  ["F-ui (band 0)", fUiBandAtChips],
  ["F-ui (band null)", fUiNoBand],
  ["F-ui (centerX)", fUiCenterX],
  ["F-short", fShort],
  ["F-short (band null)", fShortNoBand],
  ["F-392", f392],
  ["F-top", fTop],
];

describe("headerBandCard", () => {
  test("MP1. 손잡이의 위 모서리 + max(잰 높이, 어림)이 띠 아래 모서리다", () => {
    expect(headerBandCard(null, 112)).toBeNull();
    expect(headerBandCard(rect(64, 0, { left: 16, width: 360 }), 112)).toEqual({
      bottom: 176,
      left: 16,
      width: 360,
    });
    expect(headerBandCard(rect(64, 112), 112)?.bottom).toBe(176);
    expect(headerBandCard(rect(64, 150), 112)?.bottom).toBe(214);
    expect(headerBandCard(rect(64, 0), 112)).toEqual({ bottom: 176, left: null, width: null });
    expect(headerBandCard(rect(64, 0), 0)?.bottom).toBe(64);
  });
});

describe("상수", () => {
  test("MP2. 띠 간격은 24, 띠 높이 어림은 112다", () => {
    expect(headerBandGap).toBe(24);
    expect(headerBandHeightEstimate).toBe(112);
  });
});

describe("mapUnitPlacement", () => {
  test.each(fixtures)("MP3. %s — 탭 배치 함수에 옮긴 입력을 그대로 넣은 답과 같다", (_name, m) => {
    expect(mapUnitPlacement(m)).toEqual(reference(m));
  });

  test.each(fixtures)("MP4. %s — (AC1) 자동 스크롤 목적지 = 탭 목적지", (_name, m) => {
    const expected = reference(m).targetScrollTop;
    expect(autoScrollDestination(m)).toBe(expected);
    expect(mapUnitPlacement(m).targetScrollTop).toBe(expected);
  });
});

describe("autoScrollDestination", () => {
  test.each([
    { name: "F-ui band 168", m: fUi, expected: 290 },
    { name: "F-ui band 0", m: fUiBandAtChips, expected: 290 },
    { name: "F-ui band null", m: fUiNoBand, expected: 290 },
    { name: "F-ui 대상 900", m: { ...fUi, unit: rect(900, 100) }, expected: 490 },
    { name: "F-ui 대상 5000", m: { ...fUi, unit: rect(5000, 100) }, expected: 4590 },
    { name: "F-ui 대상 6200", m: { ...fUi, unit: rect(6200, 100) }, expected: 5790 },
    { name: "F-short", m: fShort, expected: 460 },
    { name: "F-short band null", m: fShortNoBand, expected: 490 },
    { name: "F-392", m: f392, expected: 1212.5 },
    { name: "F-top", m: fTop, expected: 0 },
    {
      name: "F-ui 스크롤 300 · 대상 400",
      m: { ...fUi, scrollTop: 300, unit: rect(400, 100) },
      expected: 290,
    },
  ])("MP5. $name → $expected", ({ m, expected }) => {
    expect(autoScrollDestination(m)).toBeCloseTo(expected, 9);
  });
});

describe("도착 뒤 탭", () => {
  test.each([
    { name: "F-392", m: f392, h: 0 },
    { name: "F-392", m: f392, h: 112 },
    { name: "F-392", m: f392, h: 150 },
    { name: "F-short", m: fShort, h: 0 },
    { name: "F-short", m: fShort, h: 112 },
    { name: "F-ui", m: fUi, h: 0 },
    { name: "F-ui", m: fUi, h: 168 },
  ])("MP6. $name 띠 손잡이 높이 $h — (AC2) 도착 값에서 탭이 움직이지 않는다", ({ m, h }) => {
    const d = autoScrollDestination(m);
    expect(d).toBeGreaterThan(0);
    const tap = mapUnitPlacement(arrived(m, d, h)).targetScrollTop;
    expect(Math.abs(tap - d)).toBeLessThanOrEqual(autoScrollTolerance);
  });

  test("MP7. 한계 L1 — 띠가 어림보다 크면 탭이 그 차(12)만큼 더 내린다", () => {
    // 띠가 어림(112)보다 크고 가운데 자리가 띠에 걸리는 낮은 화면만 해당한다(D-2 · U-10 보류 영역).
    const d = autoScrollDestination(fShort);
    expect(d).toBe(460);
    expect(mapUnitPlacement(arrived(fShort, d, 124)).targetScrollTop).toBe(448);
  });
});
