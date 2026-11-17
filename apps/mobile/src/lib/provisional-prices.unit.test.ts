import { describe, expect, test } from "vitest";

import {
  formatMoney,
  pricingRegionOf,
  provisionalPrice,
  yearlySavingPercent,
} from "./provisional-prices";

// `unit` 계층(PP-U1 ~ U4): 스토어 상품이 붙기 전 요금제 · 엽전 상점의 임시 가격(ADR-0144 추가 2026-11-17).

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
    const flat = { amount: 10, currency: "USD", text: "$10.00" } as const;
    expect(yearlySavingPercent(flat, { ...flat, amount: 120, text: "$120.00" })).toBeNull();
    expect(yearlySavingPercent(vnMonthly, usYearly)).toBeNull();
  });
});
