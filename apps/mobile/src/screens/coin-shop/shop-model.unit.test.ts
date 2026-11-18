import { describe, expect, test } from "vitest";

import type { CurrentPlan } from "../plans/plan-change";
import { catalogV1 } from "../plans/plans.test-support";
import { headerPlanChipOf, shopPromoOf } from "./shop-model";

// `unit` 계층(SM1 ~ SM3): 하나의 상점 — 엽전 탭 아래 요금제 한 줄 · 머리 요금제 칩(ADR-0160).

const plan = (id: CurrentPlan["id"]): CurrentPlan => ({
  id,
  period: "monthly",
  productId: "p",
  expiresAt: null,
  willRenew: true,
});

describe("SM1 엽전 탭 아래 한 줄", () => {
  test("구독이 없으면 Premium 줄(월 엽전은 서버 표), 대화 전송에서 열렸으면 Chat Plus 줄(하루 무료 메시지)", () => {
    expect(shopPromoOf(null, null, catalogV1)).toEqual({ plan: "premium", coins: 800 });
    expect(shopPromoOf("send", null, catalogV1)).toEqual({ plan: "chat_plus", perDay: 30 });
  });
  test("Chat Plus 구독자는 전송에서 열어도 Premium 올림 줄, Unlimited Tickets 구독자는 그대로", () => {
    expect(shopPromoOf("send", plan("chat_plus"), catalogV1)).toEqual({
      plan: "premium",
      coins: 800,
    });
    expect(shopPromoOf(null, plan("chat_plus"), catalogV1)).toEqual({ plan: "premium", coins: 800 });
    expect(shopPromoOf("send", plan("unlimited_tickets"), catalogV1)).toEqual({
      plan: "chat_plus",
      perDay: 30,
    });
  });
  test("Premium 구독자 · 표를 못 읽었으면 줄 없음", () => {
    expect(shopPromoOf(null, plan("premium"), catalogV1)).toBeNull();
    expect(shopPromoOf("send", plan("premium"), catalogV1)).toBeNull();
    expect(shopPromoOf(null, null, null)).toBeNull();
  });
  test("표에 그 요금제가 없거나 혜택 숫자가 없으면 줄 없음", () => {
    const noPremium = { ...catalogV1, plans: catalogV1.plans.filter((p) => p.id !== "premium") };
    expect(shopPromoOf(null, null, noPremium)).toBeNull();
    const noCoins = {
      ...catalogV1,
      plans: catalogV1.plans.map((p) => (p.id === "premium" ? { ...p, monthlyCoins: 0 } : p)),
    };
    expect(shopPromoOf(null, null, noCoins)).toBeNull();
  });
});

test("SM2 머리 요금제 칩 — 구독 없음 plans, 구독 중 그 요금제", () => {
  expect(headerPlanChipOf(null)).toBe("plans");
  expect(headerPlanChipOf(plan("premium"))).toBe("premium");
  expect(headerPlanChipOf(plan("chat_plus"))).toBe("chat_plus");
  expect(headerPlanChipOf(plan("unlimited_tickets"))).toBe("unlimited_tickets");
});
