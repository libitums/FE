import { describe, expect, test } from "vitest";

import { mapColumnsFor, mapSingleColumnFontScale, mapSingleColumnWidth } from "./journey-map-rows";

// `unit` 계층: 열 수 판정의 입출력만 봅니다.

describe("mapColumnsFor", () => {
  test("K1. 두 경계(배율 2, 폭 320)는 동시에 두 열이다", () => {
    expect(mapColumnsFor({ fontScale: 1, viewportWidth: 402 })).toBe(2);
    expect(mapColumnsFor({ fontScale: 2, viewportWidth: 320 })).toBe(2);
  });

  test.each([2.01, 2.35, 3.1])("K2. 배율 %s는 한 열이다", (fontScale) => {
    expect(mapColumnsFor({ fontScale, viewportWidth: 402 })).toBe(1);
  });

  test.each([319.9, 280])("K3. 폭 %s는 한 열이다", (viewportWidth) => {
    expect(mapColumnsFor({ fontScale: 1, viewportWidth })).toBe(1);
  });

  test("K4. 값이 없으면 두 열이다", () => {
    expect(mapColumnsFor({ fontScale: null, viewportWidth: null })).toBe(2);
    expect(mapColumnsFor({ fontScale: null, viewportWidth: 402 })).toBe(2);
    expect(mapColumnsFor({ fontScale: 1, viewportWidth: null })).toBe(2);
  });

  test("K5. 아는 쪽만으로 판정한다", () => {
    expect(mapColumnsFor({ fontScale: null, viewportWidth: 300 })).toBe(1);
    expect(mapColumnsFor({ fontScale: 2.5, viewportWidth: null })).toBe(1);
  });

  test("K6. 임계 상수", () => {
    expect(mapSingleColumnFontScale).toBe(2);
    expect(mapSingleColumnWidth).toBe(320);
  });
});
