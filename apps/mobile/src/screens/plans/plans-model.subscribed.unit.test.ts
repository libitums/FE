import { describe, expect, test } from "vitest";

import type { CurrentPlan } from "./plan-change";
import {
  initialPlanSelection,
  isCurrentCard,
  planBenefitsOf,
  planCardLinesOf,
  planCardsFor,
  plansForPlacement,
  priceSizeOf,
} from "./plans-model";
import { catalogV1, usdOffers } from "./plans.test-support";

// `unit` 계층(PM1 ~ PM5): 구독 중 Plans · 긴 통화 · 카드 줄 · 상점 입구 자리(ADR-0160).

const cards = planCardsFor(catalogV1, "settings", "monthly", usdOffers);
const plan = (id: CurrentPlan["id"], period: CurrentPlan["period"] = "monthly"): CurrentPlan => ({
  id,
  period,
  productId: "p",
  expiresAt: null,
  willRenew: true,
});
const benefitsOf = (id: string) => planBenefitsOf(catalogV1.plans.find((p) => p.id === id)!);

describe("PM1 처음 고름 — 구독 중", () => {
  test("Chat Plus · Unlimited Tickets 구독자는 위 등급 Premium", () => {
    expect(initialPlanSelection(cards, null, plan("chat_plus"))).toBe("premium");
    expect(initialPlanSelection(cards, null, plan("unlimited_tickets"))).toBe("premium");
  });
  test("Premium 구독자는 아무것도 고르지 않는다(CTA 막힘)", () => {
    expect(initialPlanSelection(cards, null, plan("premium"))).toBeNull();
  });
  test("focus가 지금 카드가 아니면 focus, 지금 카드면 무시", () => {
    expect(initialPlanSelection(cards, "unlimited_tickets", plan("premium"))).toBe(
      "unlimited_tickets",
    );
    expect(initialPlanSelection(cards, "premium", plan("premium"))).toBeNull();
  });
  test("구독이 없으면 지금 그대로 — focus, BEST", () => {
    expect(initialPlanSelection(cards, null, null)).toBe("premium");
    expect(initialPlanSelection(cards, "unlimited_tickets", null)).toBe("unlimited_tickets");
  });
});

test("PM2 지금 카드 — 같은 요금제 · 같은 기간만(다른 기간은 바꿀 수 있음)", () => {
  expect(isCurrentCard("chat_plus", "monthly", plan("chat_plus", "monthly"))).toBe(true);
  expect(isCurrentCard("chat_plus", "yearly", plan("chat_plus", "monthly"))).toBe(false);
  expect(isCurrentCard("premium", "monthly", plan("chat_plus", "monthly"))).toBe(false);
  expect(isCurrentCard("premium", "monthly", null)).toBe(false);
});

test("PM3 긴 통화는 한 단계 작게 — 글은 그대로 보고 길이만 잰다", () => {
  expect(priceSizeOf("1.490.000 ₫")).toBe("compact");
  expect(priceSizeOf("Rp 990.000")).toBe("compact");
  expect(priceSizeOf("₱2,890")).toBe("regular");
  expect(priceSizeOf("$119.99")).toBe("regular");
  expect(priceSizeOf(null)).toBe("regular");
});

describe("PM4 카드 제목 · 세부 줄(시안 S2)", () => {
  test("Unlimited Tickets — 기다리지 않고 배움 · 모든 유닛", () => {
    expect(planCardLinesOf(benefitsOf("unlimited_tickets"))).toEqual({
      headline: { kind: "learn" },
      details: [{ kind: "every-unit" }],
    });
  });
  test("Chat Plus — 하루 30 · 모든 친구 · 월 엽전", () => {
    expect(planCardLinesOf(benefitsOf("chat_plus"))).toEqual({
      headline: { kind: "chats", perDay: 30 },
      details: [{ kind: "all-friends" }, { kind: "coins", coins: 300 }],
    });
  });
  test("Premium — 모두 무제한 · 월 엽전", () => {
    expect(planCardLinesOf(benefitsOf("premium"))).toEqual({
      headline: { kind: "everything" },
      details: [{ kind: "coins", coins: 800 }],
    });
  });
  test("티켓 없이 대화만 무제한이면 unlimited-chat", () => {
    expect(planCardLinesOf([{ kind: "unlimited-chat", fairUse: null }])).toEqual({
      headline: { kind: "unlimited-chat" },
      details: [],
    });
  });
});

test("PM5 상점 입구 자리는 설정과 같은 세 장", () => {
  for (const placement of ["header_chip", "coin_shop", "chat_send", "tickets_chip"] as const)
    expect(plansForPlacement(catalogV1, placement).map((p) => p.id)).toEqual([
      "unlimited_tickets",
      "chat_plus",
      "premium",
    ]);
});
