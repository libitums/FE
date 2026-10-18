import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

import { mapContentInsets } from "./journey-map-insets";
import { autoScrollOffset, autoScrollPlacement } from "./journey-map-scroll-position";
import {
  bottomMargin,
  mapBottomInset,
  sheetGap,
  sheetHeight,
  stepSheetPlacement,
  stepSheetPlacementBelowHeader,
  stepUnitSize,
} from "./journey-map-sheet";

// `unit` 계층: 맵 내용의 위 · 아래 여백 — 값의 출처, CSS와의 일치, 그리고 그 여백이면 맨 아래 · 맨 위
// 유닛도 말풍선 · 자동 스크롤이 원하는 자리로 옮길 수 있다는 성질을 봅니다.

// 기기 하나(874 높이)의 배치입니다. 스크롤 상자는 화면 전체이고 머리 띠는 64에서 110 높이로 섭니다.
const screenHeight = 874;
const bandTop = 64;
const bandHeight = 110;

describe("mapContentInsets", () => {
  test("IN1. 위는 띠 아래 모서리 + 맞춤 간격 이상, 아래는 말풍선 · 바텀 내비 · 여유 · 간격의 합이다", () => {
    expect(mapContentInsets.top).toBeGreaterThanOrEqual(
      bandTop + bandHeight + autoScrollPlacement.gap,
    );
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

  test("IN4. 내용 맨 위 유닛도 자동 스크롤 · 말풍선 목적지가 0 이상이고 띠 아래에 선다", () => {
    const unitTop = mapContentInsets.top;
    const headerBottom = bandTop + bandHeight;
    const auto = autoScrollOffset(
      {
        targetTop: unitTop,
        scrollViewTop: 0,
        scrollViewHeight: screenHeight,
        headerBottom,
        scrollTop: 0,
      },
      autoScrollPlacement,
    );
    expect(unitTop - auto).toBeGreaterThanOrEqual(headerBottom + autoScrollPlacement.gap);

    const sheet = stepSheetPlacementBelowHeader(
      {
        unitTop,
        scrollViewTop: 0,
        scrollViewHeight: screenHeight,
        screenTop: 0,
        screenHeight,
        scrollTop: 0,
      },
      195,
      { bottom: headerBottom, left: 16, width: 358 },
      autoScrollPlacement.gap,
    );
    expect(unitTop - sheet.targetScrollTop).toBeGreaterThanOrEqual(
      headerBottom + autoScrollPlacement.gap,
    );
  });
});
