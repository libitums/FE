import { describe, expect, test } from "vitest";

import { disabledPurchaseBridge } from "../../lib/purchase-bridge";
import {
  initialPlanSelection,
  planBenefitsOf,
  planCardsFor,
  plansForPlacement,
} from "./plans-model";
import { catalogV1, usdOffers } from "./plans.test-support";

// `unit` 계층(SB-U3 ~ SB-U6): 요금제 카드 순수 모델 · 꺼진 구매 다리(ADR-0144).

const ids = (plans: readonly { id: string }[]) => plans.map((plan) => plan.id);

describe("SB-U3 자리마다 요금제", () => {
  test("설정은 셋(sortOrder), 티켓은 학습 전용 하나, 메신저는 대화 둘", () => {
    expect(ids(plansForPlacement(catalogV1, "settings"))).toEqual([
      "unlimited_tickets",
      "chat_plus",
      "premium",
    ]);
    expect(ids(plansForPlacement(catalogV1, "tickets"))).toEqual(["unlimited_tickets"]);
    expect(ids(plansForPlacement(catalogV1, "messenger"))).toEqual(["chat_plus", "premium"]);
  });

  test("순서는 서버 sortOrder를 따른다(앱 업데이트 없이 바꿈)", () => {
    const swapped = {
      ...catalogV1,
      plans: catalogV1.plans.map((plan) =>
        plan.id === "premium" ? { ...plan, sortOrder: 0 } : plan,
      ),
    };
    expect(ids(plansForPlacement(swapped, "settings"))[0]).toBe("premium");
    expect(ids(plansForPlacement(swapped, "messenger"))).toEqual(["premium", "chat_plus"]);
  });
});

describe("SB-U4 카드", () => {
  test("혜택 줄 — 서버 숫자 그대로", () => {
    const [tickets, chatPlus, premium] = catalogV1.plans;
    expect(planBenefitsOf(tickets!)).toEqual([{ kind: "unlimited-lessons" }]);
    expect(planBenefitsOf(chatPlus!)).toEqual([
      { kind: "free-messages", perDay: 30 },
      { kind: "monthly-coins", coins: 300 },
      { kind: "all-characters" },
    ]);
    expect(planBenefitsOf(premium!)).toEqual([
      { kind: "unlimited-lessons" },
      { kind: "unlimited-chat", fairUse: 200 },
      { kind: "monthly-coins", coins: 800 },
    ]);
  });

  test("가격은 그 기간 상품의 스토어 가격, 다리가 없으면 임시 추천 가격 · BEST는 서버 highlight", () => {
    const yearly = planCardsFor(catalogV1, "messenger", "yearly", usdOffers);
    expect(yearly.map((card) => [card.id, card.productId, card.price, card.best])).toEqual([
      ["chat_plus", "duru.chatplus.yearly.v1", "$69.90", false],
      ["premium", "duru.premium.yearly.v1", "$119.90", true],
    ]);
    const unpriced = planCardsFor(catalogV1, "tickets", "monthly", null);
    expect(unpriced).toEqual([
      {
        id: "unlimited_tickets",
        best: false,
        productId: "duru.tickets.monthly.v1",
        price: "$3.99",
        shown: { amount: 3.99, currency: "USD", text: "$3.99", source: "provisional" },
        benefits: [{ kind: "unlimited-lessons" }],
      },
    ]);
    // 가격 목록에 그 상품이 없으면(스토어에서 아직 승인 전 등) 임시 추천 가격으로 물러선다(ADR-0144 2단계 2026-11-17).
    expect(planCardsFor(catalogV1, "tickets", "monthly", [])[0]?.price).toBe("$3.99");
  });
});

describe("SB-U5 처음 고름", () => {
  const cards = planCardsFor(catalogV1, "settings", "monthly", null);
  test("focus가 카드에 있으면 그것, 없으면 BEST, 카드가 없으면 null", () => {
    expect(initialPlanSelection(cards, "chat_plus")).toBe("chat_plus");
    expect(initialPlanSelection(cards, null)).toBe("premium");
    expect(
      initialPlanSelection(planCardsFor(catalogV1, "tickets", "monthly", null), "premium"),
    ).toBe("unlimited_tickets");
    expect(initialPlanSelection([], null)).toBeNull();
  });
});

test("SB-U6 꺼진 구매 다리 — 열 수 없음, 가격 없음, 구매 · 복원은 unavailable", async () => {
  expect(disabledPurchaseBridge.available).toBe(false);
  expect(await disabledPurchaseBridge.configure("00000000-0000-4000-8000-000000000001")).toBe(
    false,
  );
  expect(await disabledPurchaseBridge.offerings()).toBeNull();
  expect(await disabledPurchaseBridge.purchase("duru.premium.monthly.v1")).toEqual({
    kind: "unavailable",
  });
  expect(await disabledPurchaseBridge.restore()).toEqual({ kind: "unavailable" });
});

describe("PP-U5 스토어 가격이 없으면 임시 추천 가격(ADR-0144 추가 2026-11-17)", () => {
  test("스토어 가격이 없으면 지역 임시 가격을 보이고 금액 · 통화를 싣는다", () => {
    const [tickets] = planCardsFor(catalogV1, "tickets", "monthly", null, "VN");
    expect(tickets?.price).toBe("49.000 ₫");
    expect(tickets?.shown).toEqual({
      amount: 49000,
      currency: "VND",
      text: "49.000 ₫",
      source: "provisional",
    });
    const yearly = planCardsFor(catalogV1, "messenger", "yearly", null, "ID");
    expect(yearly.map((card) => card.price)).toEqual(["Rp 549.000", "Rp 990.000"]);
  });

  test("스토어 가격이 있으면 언제나 스토어가 이긴다(출처 store, 글은 스토어 값)", () => {
    const [tickets] = planCardsFor(catalogV1, "tickets", "monthly", usdOffers, "VN");
    const store = usdOffers.find((offer) => offer.productId === tickets?.productId);
    expect(tickets?.price).toBe(store?.price);
    expect(tickets?.shown?.source).toBe("store");
    expect(tickets?.shown?.text).toBe(store?.price);
  });

  test("지역을 주지 않으면 미국 달러", () => {
    const [tickets] = planCardsFor(catalogV1, "tickets", "monthly", null);
    expect(tickets?.price).toBe("$3.99");
  });
});
