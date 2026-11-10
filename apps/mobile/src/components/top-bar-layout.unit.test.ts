import { describe, expect, test } from "vitest";

import { coinPlusShownAt, screenWidthFrom, statChipText } from "./top-bar-layout";

// `unit` 계층: 상단 바 칩 표시 규칙(ADR-0116 개정 2026-11-10, 사용자 결정). 320 · 340 폭 실측에서 알림 버튼이 엽전 칩을
// 덮었다 — 999를 넘는 수는 「999+」로 줄이고, 360 미만 폭에서는 엽전 칩의 「+」를 뺀다.

describe("statChipText", () => {
  test("TBL1. 999까지는 그대로, 999를 넘으면 999+", () => {
    expect(statChipText(0)).toBe("0");
    expect(statChipText(365)).toBe("365");
    expect(statChipText(999)).toBe("999");
    expect(statChipText(1000)).toBe("999+");
    expect(statChipText(12_345)).toBe("999+");
  });

  test("TBL2. 수가 아니거나 음수면 0", () => {
    expect(statChipText(Number.NaN)).toBe("0");
    expect(statChipText(-3)).toBe("0");
  });
});

describe("screenWidthFrom", () => {
  test("TBL3. 픽셀 폭 ÷ 배율 = pt, 모르면 NaN", () => {
    expect(screenWidthFrom({ pixelWidth: 1080, pixelRatio: 3 })).toBe(360);
    expect(screenWidthFrom({ pixelWidth: 640, pixelRatio: 2 })).toBe(320);
    expect(screenWidthFrom(undefined)).toBeNaN();
    expect(screenWidthFrom({ pixelWidth: 1080, pixelRatio: 0 })).toBeNaN();
  });
});

describe("coinPlusShownAt", () => {
  test("TBL4. 360 미만이면 「+」를 빼고, 360 이상이면 둔다", () => {
    expect(coinPlusShownAt(320)).toBe(false);
    expect(coinPlusShownAt(359.5)).toBe(false);
    expect(coinPlusShownAt(360)).toBe(true);
    expect(coinPlusShownAt(430)).toBe(true);
  });

  test("TBL5. 폭을 모르면 「+」를 둔다 — 기기에는 늘 SystemInfo가 있고, 모를 때 버튼 모양을 지우지 않는다", () => {
    expect(coinPlusShownAt(Number.NaN)).toBe(true);
  });
});
