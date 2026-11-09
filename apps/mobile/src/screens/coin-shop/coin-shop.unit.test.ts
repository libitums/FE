import { describe, expect, test } from "vitest";

import {
  coinPacks,
  findCoinPack,
  formatCoinCount,
  formatPrice,
  initialCoinPackId,
  totalCoinsOf,
} from "./coin-shop";

// `unit` 계층: 엽전 상점의 팩 · 숫자 규칙(ADR-0116).

describe("coinPacks", () => {
  test("[CS1] 엮음 · 주머니 · 큰 주머니 순이고 처음 고른 팩은 BEST VALUE 주머니다", () => {
    expect(coinPacks.map((pack) => pack.id)).toEqual(["bundle", "pouch", "big"]);
    expect(initialCoinPackId).toBe("pouch");
    expect(coinPacks.filter((pack) => pack.bestValue).map((pack) => pack.id)).toEqual(["pouch"]);
  });

  test("[CS2] 받는 엽전은 보너스를 합한다 — 50 · 140 · 360", () => {
    expect(coinPacks.map(totalCoinsOf)).toEqual([50, 140, 360]);
    expect(findCoinPack("big").bonusCoins).toBe(80);
  });
});

describe("formatCoinCount · formatPrice", () => {
  test("[CS3] 세 자리마다 쉼표, 음수 · 소수는 0 · 내림", () => {
    expect(formatCoinCount(1240)).toBe("1,240");
    expect(formatCoinCount(-3)).toBe("0");
    expect(formatCoinCount(9.9)).toBe("9");
  });

  test("[CS4] 센트를 달러 두 자리로", () => {
    expect(formatPrice(999)).toBe("$9.99");
    expect(formatPrice(1999)).toBe("$19.99");
  });
});
