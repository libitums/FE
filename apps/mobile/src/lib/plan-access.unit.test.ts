import { afterEach, expect, test } from "vitest";

import type { PlanEntitlement, PlanEntitlements } from "./plans-api";
import {
  currentPlanIds,
  planChatTier,
  planUnlimitedTickets,
  setPlanAccess,
  subscriptionUnlimitedPass,
} from "./plan-access";

// `unit` 계층(PA1 ~ PA4, ADR-0144 D2 · 2단계 후속): 서버 권한(정본)을 앱의 티켓 · 대화 등급 · 현재 요금제 · 무제한 판으로.

afterEach(() => setPlanAccess(null));

const label = (plan: string) => (plan === "premium" ? "Premium" : plan);

const premiumRow: PlanEntitlement = {
  id: "premium",
  productId: "duru.premium.monthly.v1",
  status: "active",
  willRenew: true,
  expiresAt: "2026-12-18T00:00:00Z",
};
const premium: PlanEntitlements = {
  tier: "premium",
  unlimitedTickets: true,
  entitlements: [premiumRow],
};
const chatPlus: PlanEntitlements = {
  tier: "chat_plus",
  unlimitedTickets: false,
  entitlements: [
    {
      id: "chat_plus",
      productId: "duru.chatplus.yearly.v1:base",
      status: "cancelled",
      willRenew: false,
      expiresAt: "2027-11-18T00:00:00Z",
    },
  ],
};

test("PA1 권한이 없거나 무료면 무제한 티켓 아님 · 등급 free — 지금과 같다", () => {
  expect(planUnlimitedTickets()).toBe(false);
  expect(planChatTier()).toBe("free");
  setPlanAccess({ tier: "free", unlimitedTickets: false, entitlements: [] });
  expect(planUnlimitedTickets()).toBe(false);
  expect(planChatTier()).toBe("free");
});

test("PA2 서버 권한을 그대로 따른다 — 무제한 티켓 · 대화 등급", () => {
  setPlanAccess(premium);
  expect(planUnlimitedTickets()).toBe(true);
  expect(planChatTier()).toBe("premium");
  setPlanAccess(chatPlus);
  expect(planUnlimitedTickets()).toBe(false);
  expect(planChatTier()).toBe("chat_plus");
  setPlanAccess(null);
  expect(planUnlimitedTickets()).toBe(false);
});

test("PA3 현재 요금제 — 권한 줄의 요금제 id와 그 상품", () => {
  expect(currentPlanIds(null)).toEqual([]);
  expect(currentPlanIds(premium)).toEqual([
    { id: "premium", productId: "duru.premium.monthly.v1" },
  ]);
  expect(currentPlanIds(chatPlus)).toEqual([
    { id: "chat_plus", productId: "duru.chatplus.yearly.v1:base" },
  ]);
});

test("PA4 무제한 판 — 티켓 무제한 권한의 만료 · 갱신으로 구독 판을 만들고, 시작은 기간(월 30일 · 연 365일)만큼 앞", () => {
  const pass = subscriptionUnlimitedPass(premium, label);
  expect(pass).toEqual({
    kind: "subscription",
    startedAtMs: Date.parse("2026-12-18T00:00:00Z") - 30 * 86_400_000,
    endsAtMs: Date.parse("2026-12-18T00:00:00Z"),
    autoRenews: true,
    planLabel: "Premium",
    productId: "duru.premium.monthly.v1",
  });
  expect(subscriptionUnlimitedPass(chatPlus, label)).toBeUndefined();
  expect(subscriptionUnlimitedPass(null, label)).toBeUndefined();
  const noExpiry: PlanEntitlements = {
    ...premium,
    entitlements: [{ ...premiumRow, expiresAt: null }],
  };
  expect(subscriptionUnlimitedPass(noExpiry, label)).toBeUndefined();
});
