import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

import { mapContentInsets, mapTopLayout } from "./journey-map-insets";
import {
  autoScrollDestination,
  headerBandCard,
  headerBandGap,
  headerBandHeightEstimate,
  mapUnitPlacement,
} from "./journey-map-scroll-position";
import type { MapUnitMeasure } from "./journey-map-scroll-position";
import {
  bottomMargin,
  mapBottomInset,
  sheetGap,
  sheetHeight,
  specialUnitSize,
  stepSheetPlacement,
  stepUnitSize,
} from "./journey-map-sheet";

// `unit` 계층: 맵 내용의 위 · 아래 여백 — 값의 출처, CSS와의 일치, 그리고 그 여백이면 맨 아래 · 맨 위
// 유닛도 말풍선 · 자동 스크롤이 원하는 자리로 옮길 수 있다는 성질을 봅니다.

// 기기 하나(874 높이)의 배치입니다. 스크롤 상자는 화면 전체이고 머리 띠는 64에서 110 높이로 섭니다.
const screenHeight = 874;
const bandTop = 64;
const chipRowBottom = 12 + 44;
// 말풍선이 열리는 맨 위 유닛은 표지 줄(표식 + 틈 4 + 줄 사이 24) 아래입니다 — 라벨 · 그림은 빼고 가장 낮게 잡습니다.
const coverRowAtLeast = specialUnitSize + 4 + 24;

describe("mapContentInsets", () => {
  test("IN1. 위는 칩 줄 + 간격 8(64), 아래는 말풍선 · 바텀 내비 · 여유 · 간격의 합이다", () => {
    // 칩 줄은 12에서 44 높이입니다. 띠 몫(112 + 24)을 위에 비워 두지 않습니다(사용자 결정 2026-11-22).
    expect(mapContentInsets.top).toBe(chipRowBottom + 8);
    expect(mapContentInsets.bottom).toBe(sheetHeight + mapBottomInset + bottomMargin + sheetGap);
  });

  test("IN2. 맵 상자의 CSS 위 · 아래 패딩이 그 값이다", () => {
    const css = readFileSync(
      resolve(process.cwd(), "src/screens/journey-map/journey-map-screen.css"),
      "utf8",
    ).replace(/\/\*[\s\S]*?\*\//g, "");
    const body = /\.journey-map-screen-map\s*\{([^}]*)\}/.exec(css)?.[1] ?? "";
    expect(body).toMatch(new RegExp(`padding-top:\\s*${String(mapContentInsets.top)}px`));
    expect(body).toMatch(new RegExp(`padding-bottom:\\s*${String(mapContentInsets.bottom)}px`));
  });

  test("IN3. 내용 맨 아래 유닛도 스크롤이 끝에 닿은 자리에서 말풍선이 가둬지지 않고 유닛에 붙는다", () => {
    const contentHeight = 3000;
    const maxScrollTop = contentHeight - screenHeight;
    // 맨 아래 유닛의 아래 모서리가 내용 끝에서 아래 여백만큼 위에 있습니다. 스크롤은 처음에 맨 위입니다.
    const unitBottomInContent = contentHeight - mapContentInsets.bottom;
    const unitTop = unitBottomInContent - stepUnitSize;
    const placement = stepSheetPlacement({
      unitTop,
      scrollViewTop: 0,
      scrollViewHeight: screenHeight,
      screenTop: 0,
      screenHeight,
      scrollTop: 0,
    });
    // 호스트는 목적지를 내용 끝에서 멈춥니다. 그 자리의 유닛 아래 모서리 + 간격이 말풍선 한계 안입니다.
    const landed = Math.min(placement.targetScrollTop, maxScrollTop);
    const unitBottomOnScreen = unitTop + stepUnitSize - landed;
    expect(unitBottomOnScreen + sheetGap).toBeLessThanOrEqual(placement.anchorLimit);
    // 여백이 모자라면(아래 여백 − 1) 같은 자리에서 한계를 넘습니다 — 값이 최소입니다.
    expect(unitBottomOnScreen + 1 + sheetGap).toBeGreaterThan(placement.anchorLimit);
  });

  test.each([0, 110])(
    "IN4. 말풍선이 열리는 맨 위 유닛도 목적지가 0 이상이고 띠(손잡이 높이 %i) 아래에 선다",
    (bandMeasuredHeight) => {
      const unitTop = mapContentInsets.top + coverRowAtLeast;
      const band = {
        top: bandTop,
        height: bandMeasuredHeight,
        centerX: null,
        left: 16,
        width: 358,
      };
      const m: MapUnitMeasure = {
        unit: { top: unitTop, height: stepUnitSize, centerX: 195, left: null, width: null },
        scroll: { top: 0, height: screenHeight, centerX: null, left: null, width: null },
        screen: { top: 0, height: screenHeight, centerX: null, left: null, width: null },
        band,
        scrollTop: 0,
      };
      const bandBottom = headerBandCard(band, headerBandHeightEstimate)?.bottom ?? Number.NaN;
      for (const target of [autoScrollDestination(m), mapUnitPlacement(m).targetScrollTop]) {
        expect(target).toBeGreaterThanOrEqual(0);
        expect(unitTop - target).toBeGreaterThanOrEqual(bandBottom + headerBandGap);
      }
    },
  );

  // 표지는 말풍선 없이 바로 시작하므로 띠를 피할 일이 없습니다 — 자동 스크롤은 맨 위에서 멈춥니다.
  test("IN5. 맨 위 표지로 자동 스크롤해도 목적지는 0이다", () => {
    const target = autoScrollDestination({
      unit: { top: mapContentInsets.top, height: 160, centerX: 195, left: null, width: null },
      scroll: { top: 0, height: screenHeight, centerX: null, left: null, width: null },
      screen: { top: 0, height: screenHeight, centerX: null, left: null, width: null },
      band: { top: bandTop, height: 0, centerX: null, left: 16, width: 358 },
      scrollTop: 0,
    });
    expect(target).toBe(0);
  });
});

// ⟨2026-10-19⟩ 맵은 상태 표시줄 뒤까지 스크롤한다(사용자 결정) — 셸이 위 안전 영역을 칠하지 않고, 맵이 그 높이를
// 스스로 안쪽에 더한다. ⟨2026-11-22⟩ 첫 내용은 칩 줄 바로 아래에서 선다(사용자 결정 — 위 여백 제거).
describe("mapTopLayout", () => {
  test("TL1. 안전 영역이 없으면 첫 내용은 칩 줄 + 간격 8(64)에서 선다", () => {
    expect(mapTopLayout(0)).toEqual({
      screenPaddingTop: 0,
      mapPaddingTop: 64,
      bandTop: 64,
      progressRowTop: 72,
      headerTop: 12,
    });
  });

  test("TL2. 안전 영역만큼 칩 · 띠 · 로딩 줄 · 첫 내용이 함께 내려온다", () => {
    const inset = 47;
    const base = mapTopLayout(0);
    const shifted = mapTopLayout(inset);
    expect(shifted.screenPaddingTop).toBe(0);
    expect(shifted.mapPaddingTop - base.mapPaddingTop).toBe(inset);
    expect(shifted.bandTop - base.bandTop).toBe(inset);
    expect(shifted.progressRowTop - base.progressRowTop).toBe(inset);
    expect(shifted.headerTop - base.headerTop).toBe(inset);
  });

  test.each([0, 20, 59])("TL3. 안전 영역 %i에서 첫 내용과 칩 줄 사이는 8뿐이다", (inset) => {
    const layout = mapTopLayout(inset);
    const chipsBottom = layout.headerTop + 44;
    expect(layout.screenPaddingTop + layout.mapPaddingTop - chipsBottom).toBe(8);
  });
});
