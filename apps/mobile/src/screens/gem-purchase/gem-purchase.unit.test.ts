import { describe, expect, test } from "vitest";

import {
  bonusSummary,
  findGemPack,
  formatGemCount,
  formatPrice,
  formatPricePerGem,
  gemPacks,
  initialGemPackId,
  packCaption,
  totalGemsOf,
} from "./gem-purchase";

// `unit` 계층: 순수 함수의 입출력 (ADR-0006 D4). 기대값은 디자인 표기(Figma 597-992)입니다.

describe("formatGemCount", () => {
  test.each([
    [0, "0"],
    [500, "500"],
    [1240, "1,240"],
    [1234567, "1,234,567"],
  ])("%d → %s", (count, expected) => {
    expect(formatGemCount(count)).toBe(expected);
  });

  test("음수와 소수는 0 이상의 정수로 끊는다", () => {
    expect(formatGemCount(-3)).toBe("0");
    expect(formatGemCount(12.9)).toBe("12");
  });
});

test("formatPrice는 센트를 달러 두 자리로 적는다", () => {
  expect(formatPrice(499)).toBe("$4.99");
  expect(formatPrice(1999)).toBe("$19.99");
  expect(formatPrice(1000)).toBe("$10.00");
});

test("팩 셋의 젬 하나 값은 보너스까지 나눈 값을 유효 숫자 둘로 적는다", () => {
  expect(gemPacks.map(formatPricePerGem)).toEqual([
    "$0.010 per gem",
    "$0.0071 per gem",
    "$0.0056 per gem",
  ]);
});

test("팩 카드 둘째 줄 — 보너스가 있으면 보너스, 없으면 팩 이름", () => {
  expect(gemPacks.map(packCaption)).toEqual(["Standard pack", "+ 200 bonus", "+ 800 bonus"]);
});

test("주문 요약 — 총 젬은 보너스를 더하고, 보너스 줄은 보너스가 있을 때만 선다", () => {
  const max = findGemPack("max");
  expect(totalGemsOf(max)).toBe(3600);
  expect(bonusSummary(max)).toBe("Includes 800 bonus gems");
  expect(bonusSummary(findGemPack("standard"))).toBeUndefined();
});

test("처음 고른 팩은 가장 큰 팩이다", () => {
  expect(findGemPack(initialGemPackId).gems).toBe(2800);
});
