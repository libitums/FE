import { describe, expect, test } from "vitest";

import type { PlanEntitlement, PlanEntitlements } from "../../lib/plans-api";
import { catalogV1 } from "./plans.test-support";
import {
  currentPlanOf,
  dateParts,
  newlyActivePlan,
  periodOfProduct,
  planActivationOf,
  scheduledChangeOf,
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

// 2026-11-19 샌드박스 실측: Premium → Unlimited Tickets 내림은 Premium 기간 끝(07:28:45)으로 미뤄지고, Premium 줄에
// pendingProductId가 붙고 Tickets 줄은 그 시각부터 시작하는 활성 줄로 먼저 생깼다.
const boundary = "2026-11-19T07:28:45.000Z";
const pendingPremium = {
  ...row("premium", "duru.premium.monthly.v1", boundary),
  pendingProductId: "duru.tickets.monthly.v1",
};
const ticketsNext = row("unlimited_tickets", "duru.tickets.monthly.v1", "2026-11-19T07:33:45.000Z");

describe("PC7 미뤄진 바꿈", () => {
  test("지금 요금제 줄의 pending — 권한 줄에서 요금제를 찾는다", () => {
    expect(scheduledChangeOf(owned(pendingPremium, ticketsNext))).toEqual({
      from: "premium",
      to: "unlimited_tickets",
      period: "monthly",
      at: boundary,
    });
  });
  test("다음 요금제 줄이 아직 없으면(웹훅 전) 요금표의 상품으로 찾는다 · Play 기본요금제 꼬리도", () => {
    expect(scheduledChangeOf(owned(pendingPremium), catalogV1)?.to).toBe("unlimited_tickets");
    const play = { ...pendingPremium, pendingProductId: "duru.chatplus.yearly.v1:yearly" };
    expect(scheduledChangeOf(owned(play), catalogV1)).toEqual({
      from: "premium",
      to: "chat_plus",
      period: "yearly",
      at: boundary,
    });
  });
  test("같은 요금제의 기간 바꿈", () => {
    const yearly = { ...pendingPremium, pendingProductId: "duru.premium.yearly.v1" };
    expect(scheduledChangeOf(owned(yearly), catalogV1)).toEqual({
      from: "premium",
      to: "premium",
      period: "yearly",
      at: boundary,
    });
  });
  test("pending이 없거나(옛 서버) · 지금 상품과 같거나 · 모르는 상품이면 null", () => {
    expect(scheduledChangeOf(null, catalogV1)).toBeNull();
    expect(
      scheduledChangeOf(owned(row("premium", "duru.premium.monthly.v1")), catalogV1),
    ).toBeNull();
    const same = { ...pendingPremium, pendingProductId: "duru.premium.monthly.v1" };
    expect(scheduledChangeOf(owned(same), catalogV1)).toBeNull();
    const unknown = { ...pendingPremium, pendingProductId: "duru.gold.monthly.v1" };
    expect(scheduledChangeOf(owned(unknown), catalogV1)).toBeNull();
    expect(scheduledChangeOf(owned(pendingPremium), null)).toBeNull();
  });
  test("올림은 미뤄지지 않는다 — 옛 줄(Chat Plus)의 pending은 지금 요금제(Premium)가 아니라 보지 않는다", () => {
    const oldChat = {
      ...row("chat_plus", "duru.chatplus.monthly.v1", boundary),
      pendingProductId: "duru.premium.monthly.v1",
    };
    expect(
      scheduledChangeOf(owned(oldChat, row("premium", "duru.premium.monthly.v1")), catalogV1),
    ).toBeNull();
  });
});

describe("PC8 구독 성공 알림의 대상", () => {
  test("새 요금제가 지금 요금제의 미뤄진 바꿈이면 그 바꿈을 함께 — 「켜짐」이 아니라 「언제부터」", () => {
    expect(planActivationOf(owned(pendingPremium), owned(pendingPremium, ticketsNext))).toEqual({
      plan: "unlimited_tickets",
      scheduled: { from: "premium", to: "unlimited_tickets", period: "monthly", at: boundary },
    });
  });
  test("곧바로 켜진 요금제(올림 · 새 구독)는 scheduled null", () => {
    expect(planActivationOf(null, owned(row("premium", "b")))).toEqual({
      plan: "premium",
      scheduled: null,
    });
    const oldChat = {
      ...row("chat_plus", "c", boundary),
      pendingProductId: "duru.premium.monthly.v1",
    };
    expect(
      planActivationOf(owned(oldChat), owned(oldChat, row("premium", "duru.premium.monthly.v1"))),
    ).toEqual({ plan: "premium", scheduled: null });
  });
  test("새 요금제가 없으면 null", () => {
    expect(planActivationOf(owned(pendingPremium), owned(pendingPremium))).toBeNull();
  });
});

// 2026-11-19 07:53 기기 확인: Unlimited Tickets → Premium 올림(곧바로) 뒤 Premium → Tickets 내림(미뤄짐). Tickets 줄은 올림 전부터 활성이라
// 내림 뒤 「새로 생긴 요금제」가 없었고, 옛 Tickets 줄에는 올림의 pending(=Premium)이 남아 있었다.
const premiumNow = row("premium", "duru.premium.monthly.v1", boundary);
const staleTickets = {
  ...row("unlimited_tickets", "duru.tickets.monthly.v1", boundary),
  pendingProductId: "duru.premium.monthly.v1",
};

describe("PC9 올림 뒤 내림(새 줄 없이 pending만 생김)", () => {
  test("지금 요금제에 미뤄진 바꿈이 새로 생기면 그 바꿈으로 알림 — 새 요금제 줄이 없어도", () => {
    expect(
      planActivationOf(owned(staleTickets, premiumNow), owned(staleTickets, pendingPremium)),
    ).toEqual({
      plan: "unlimited_tickets",
      scheduled: { from: "premium", to: "unlimited_tickets", period: "monthly", at: boundary },
    });
  });
  test("같은 미뤄진 바꿈이 이미 있었으면 다시 알리지 않는다", () => {
    expect(
      planActivationOf(owned(staleTickets, pendingPremium), owned(staleTickets, pendingPremium)),
    ).toBeNull();
  });
  test("지금보다 위 등급으로의 pending(곧바로 바뀌는 올림의 흔적)은 미뤄진 바꿈이 아니다", () => {
    const chatToPremium = {
      ...row("chat_plus", "duru.chatplus.monthly.v1", boundary),
      pendingProductId: "duru.premium.monthly.v1",
    };
    expect(scheduledChangeOf(owned(chatToPremium), catalogV1)).toBeNull();
    // 옛 Tickets 줄의 pending(=Premium, 지금 요금제)은 보지 않는다.
    expect(scheduledChangeOf(owned(staleTickets, premiumNow), catalogV1)).toBeNull();
  });
});
