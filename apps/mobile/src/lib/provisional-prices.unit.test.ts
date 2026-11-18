import { describe, expect, test } from "vitest";

import {
  formatMoney,
  pricingRegionFor,
  pricingRegionOf,
  provisionalPrice,
  shownPriceFor,
  yearlySavingPercent,
} from "./provisional-prices";

// `unit` 계층(PP-U1 ~ U4 · U6 · U7): 요금제 · 엽전 상점의 보이는 가격 — 스토어 상품 가격이 이기고, 없으면 임시 추천 가격(ADR-0144).

describe("provisional prices", () => {
  test("PP-U1 학습자 나라 → 가격 지역: 동남아 다섯 나라는 그 나라, 그 밖 · 모름은 US", () => {
    expect(pricingRegionOf("VN")).toBe("VN");
    expect(pricingRegionOf("MY")).toBe("MY");
    expect(pricingRegionOf("KR")).toBe("US");
    expect(pricingRegionOf(null)).toBe("US");
    expect(pricingRegionOf(undefined)).toBe("US");
  });

  test("PP-U2 통화 표기 — 동 · 루피아는 「.」 묶음, 페소 · 바트는 정수, 링깃 · 달러는 소수 둘", () => {
    expect(formatMoney(49000, "VND")).toBe("49.000 ₫");
    expect(formatMoney(1490000, "VND")).toBe("1.490.000 ₫");
    expect(formatMoney(29000, "IDR")).toBe("Rp 29.000");
    expect(formatMoney(1690, "PHP")).toBe("₱1,690");
    expect(formatMoney(79, "THB")).toBe("฿79");
    expect(formatMoney(9.9, "MYR")).toBe("RM9.90");
    expect(formatMoney(3.99, "USD")).toBe("$3.99");
  });

  test("PP-U3 상품 id × 지역 → 승인된 추천 가격, 모르는 상품은 null", () => {
    expect(provisionalPrice("duru.premium.monthly.v1", "VN")).toEqual({
      amount: 179000,
      currency: "VND",
      text: "179.000 ₫",
      source: "provisional",
    });
    expect(provisionalPrice("duru.chatplus.yearly.v1", "ID")?.text).toBe("Rp 549.000");
    expect(provisionalPrice("duru.tickets.monthly.v1", "US")?.text).toBe("$3.99");
    expect(provisionalPrice("duru.coins.1200.v1", "TH")?.text).toBe("฿199");
    expect(provisionalPrice("duru.unknown.v1", "VN")).toBeNull();
  });

  test("PP-U4 연간 할인율 — 월 ×12 대비 정수 %, 없거나 싸지 않으면 null", () => {
    const vnMonthly = provisionalPrice("duru.tickets.monthly.v1", "VN");
    const vnYearly = provisionalPrice("duru.tickets.yearly.v1", "VN");
    expect(yearlySavingPercent(vnMonthly, vnYearly)).toBe(32);
    const usMonthly = provisionalPrice("duru.premium.monthly.v1", "US");
    const usYearly = provisionalPrice("duru.premium.yearly.v1", "US");
    expect(yearlySavingPercent(usMonthly, usYearly)).toBe(17);
    expect(yearlySavingPercent(null, vnYearly)).toBeNull();
    const flat = { amount: 10, currency: "USD", text: "$10.00", source: "provisional" } as const;
    expect(yearlySavingPercent(flat, { ...flat, amount: 120, text: "$120.00" })).toBeNull();
    expect(yearlySavingPercent(vnMonthly, usYearly)).toBeNull();
  });

  test("PP-U6 가격 지역 — 스토어 나라가 있으면 그것(표에 없으면 US), 없을 때만 프로필 나라", () => {
    expect(pricingRegionFor("VN", "PH")).toBe("VN");
    expect(pricingRegionFor("KR", "VN")).toBe("US");
    expect(pricingRegionFor(null, "ID")).toBe("ID");
    expect(pricingRegionFor(null, null)).toBe("US");
  });

  test("PP-U7 보이는 가격 — 스토어 상품이 있으면 스토어 글 · 금액, 없으면 그 지역 임시 가격", () => {
    const offers = [
      { productId: "duru.coins.500.v1", price: "79.000 ₫", amount: 79000, currency: "VND" },
    ];
    expect(shownPriceFor("duru.coins.500.v1", offers, "US")).toEqual({
      amount: 79000,
      currency: "VND",
      text: "79.000 ₫",
      source: "store",
    });
    expect(shownPriceFor("duru.coins.1200.v1", offers, "VN")).toEqual({
      amount: 149000,
      currency: "VND",
      text: "149.000 ₫",
      source: "provisional",
    });
    expect(shownPriceFor("duru.coins.1200.v1", null, "US")?.text).toBe("$9.99");
    expect(
      shownPriceFor(
        "duru.coins.500.v1",
        [{ productId: "duru.coins.500.v1", price: "$4.99" }],
        "VN",
      ),
    ).toEqual({ amount: null, currency: "", text: "$4.99", source: "store" });
  });
});
