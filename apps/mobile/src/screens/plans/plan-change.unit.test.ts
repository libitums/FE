import { describe, expect, test } from "vitest";

import type { PlanEntitlement, PlanEntitlements } from "../../lib/plans-api";
import {
  currentPlanOf,
  dateParts,
  newlyActivePlan,
  periodOfProduct,
  planChangeKind,
  planChangeOf,
  type CurrentPlan,
} from "./plan-change";

// `unit` 계층(PC1 ~ PC7): 지금 요금제 · 바꿈 규칙(ADR-0160).

const row = (id: PlanEntitlement["id"], productId: string, expiresAt: string | null = null) =>
  ({ id, productId, status: "active", willRenew: true, expiresAt }) as const;
const owned = (...rows: PlanEntitlement[]): PlanEntitlements => ({
  tier: "free",
  unlimitedTickets: false,
  entitlements: rows,
});
const plan = (id: CurrentPlan["id"], period: CurrentPlan["period"] = "monthly"): CurrentPlan => ({
  id,
  period,
  productId: `duru.x.${period}.v1`,
  expiresAt: null,
  willRenew: true,
});

test("PC1 상품 id의 기간 — .yearly.면 연간, 아니면 월간(Play 기본요금제 꼬리 포함)", () => {
  expect(periodOfProduct("duru.premium.yearly.v1")).toBe("yearly");
  expect(periodOfProduct("duru.premium.monthly.v1:monthly")).toBe("monthly");
  expect(periodOfProduct("duru.chatplus.yearly.v1:yearly")).toBe("yearly");
});

describe("PC2 지금 요금제", () => {
  test("권한이 없으면 null", () => {
    expect(currentPlanOf(null)).toBeNull();
    expect(currentPlanOf(owned())).toBeNull();
  });
  test("여럿이면 등급 높은 것 — premium이 이기고, 같은 수준이면 chat_plus가 먼저", () => {
    const both = owned(
      row("unlimited_tickets", "duru.tickets.monthly.v1"),
      row("premium", "duru.premium.yearly.v1", "2026-12-18T09:00:00Z"),
    );
    expect(currentPlanOf(both)).toEqual({
      id: "premium",
      period: "yearly",
      productId: "duru.premium.yearly.v1",
      expiresAt: "2026-12-18T09:00:00Z",
      willRenew: true,
    });
    const level = owned(
      row("unlimited_tickets", "duru.tickets.monthly.v1"),
      row("chat_plus", "duru.chatplus.monthly.v1"),
    );
    expect(currentPlanOf(level)?.id).toBe("chat_plus");
  });
});

describe("PC3 바꿈의 종류", () => {
  test("구독이 없으면 new", () => {
    expect(planChangeOf(null, "premium", "monthly")).toBe("new");
  });
  test("Premium으로 가면 upgrade, Premium에서 내려가면 downgrade", () => {
    expect(planChangeOf(plan("chat_plus"), "premium", "monthly")).toBe("upgrade");
    expect(planChangeOf(plan("unlimited_tickets"), "premium", "yearly")).toBe("upgrade");
    expect(planChangeOf(plan("premium"), "chat_plus", "monthly")).toBe("downgrade");
    expect(planChangeOf(plan("premium"), "unlimited_tickets", "monthly")).toBe("downgrade");
  });
  test("Unlimited Tickets ↔ Chat Plus는 crossgrade, 같은 요금제 다른 기간은 period, 같으면 same", () => {
    expect(planChangeOf(plan("unlimited_tickets"), "chat_plus", "monthly")).toBe("crossgrade");
    expect(planChangeOf(plan("chat_plus"), "unlimited_tickets", "yearly")).toBe("crossgrade");
    expect(planChangeOf(plan("chat_plus", "monthly"), "chat_plus", "yearly")).toBe("period");
    expect(planChangeOf(plan("premium", "yearly"), "premium", "yearly")).toBe("same");
  });
});

test("PC4 이벤트 kind — period · same은 crossgrade로 묶는다", () => {
  expect(planChangeKind("new")).toBe("new");
  expect(planChangeKind("upgrade")).toBe("upgrade");
  expect(planChangeKind("downgrade")).toBe("downgrade");
  expect(planChangeKind("crossgrade")).toBe("crossgrade");
  expect(planChangeKind("period")).toBe("crossgrade");
  expect(planChangeKind("same")).toBe("crossgrade");
});

test("PC5 날짜 조각 — 기기 시각의 달(0부터) · 날, 없거나 틀리면 null", () => {
  const iso = new Date(2026, 11, 18, 12, 0, 0).toISOString();
  expect(dateParts(iso)).toEqual({ month: 11, day: 18 });
  expect(dateParts(null)).toBeNull();
  expect(dateParts("not a date")).toBeNull();
});

describe("PC6 새로 켜진 요금제", () => {
  test("after에만 있는 요금제 — 여럿이면 등급 높은 것", () => {
    expect(newlyActivePlan(null, owned(row("unlimited_tickets", "a")))).toBe("unlimited_tickets");
    expect(
      newlyActivePlan(
        owned(row("unlimited_tickets", "a")),
        owned(row("unlimited_tickets", "a"), row("premium", "b")),
      ),
    ).toBe("premium");
  });
  test("바뀐 것이 없거나 줄었으면 null", () => {
    const one = owned(row("chat_plus", "a"));
    expect(newlyActivePlan(one, one)).toBeNull();
    expect(newlyActivePlan(one, owned())).toBeNull();
    expect(newlyActivePlan(one, null)).toBeNull();
  });
});
