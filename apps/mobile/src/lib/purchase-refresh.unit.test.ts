import { expect, test, vi } from "vitest";

import type { PlanEntitlements } from "./plans-api";
import {
  REFRESH_ATTEMPTS,
  refreshAfterPurchase,
  runWithServerRefresh,
  sameEntitlements,
  type PurchaseRefreshDeps,
} from "./purchase-refresh";

// `unit` 계층(PR-U1 ~ PR-U5, ADR-0144 2단계): 구매 · 복원 뒤 웹훅이 서버를 바꿀 때까지 권한 · 잔액을 잠깐 다시 읽는다.

const free: PlanEntitlements = { tier: "free", unlimitedTickets: false, entitlements: [] };
const premium: PlanEntitlements = {
  tier: "premium",
  unlimitedTickets: true,
  entitlements: [
    {
      id: "premium",
      productId: "duru.premium.monthly.v1",
      status: "active",
      willRenew: true,
      expiresAt: "2026-12-18T00:00:00Z",
    },
  ],
};

function deps(
  entitlements: readonly (PlanEntitlements | null)[],
  balances: readonly (number | null)[],
) {
  let e = 0;
  let b = 0;
  return {
    entitlements: vi.fn<PurchaseRefreshDeps["entitlements"]>(
      async () => entitlements[Math.min(e++, entitlements.length - 1)] ?? null,
    ),
    balance: vi.fn<PurchaseRefreshDeps["balance"]>(
      async () => balances[Math.min(b++, balances.length - 1)] ?? null,
    ),
    onEntitlements: vi.fn<PurchaseRefreshDeps["onEntitlements"]>(),
    onBalance: vi.fn<PurchaseRefreshDeps["onBalance"]>(),
    wait: vi.fn<PurchaseRefreshDeps["wait"]>(async () => {}),
  };
}

test("PR-U1 같은 권한 판정 — 등급 · 무제한 · 줄(상품 · 상태 · 만료)", () => {
  expect(sameEntitlements(free, { ...free })).toBe(true);
  expect(sameEntitlements(free, premium)).toBe(false);
  expect(sameEntitlements(null, null)).toBe(true);
  expect(sameEntitlements(free, null)).toBe(false);
  const later = {
    ...premium,
    entitlements: [{ ...premium.entitlements[0]!, expiresAt: "2027-01-18T00:00:00Z" }],
  };
  expect(sameEntitlements(premium, later)).toBe(false);
  // 내림 · 같은 수준 바꿈은 지금 줄에 pending만 붙습니다 — 그것도 바뀐 것으로 봐야 따라잡기가 멈춥니다.
  const pending = {
    ...premium,
    entitlements: [{ ...premium.entitlements[0]!, pendingProductId: "duru.tickets.monthly.v1" }],
  };
  expect(sameEntitlements(premium, pending)).toBe(false);
});

test("PR-U2 엽전 팩 — 잔액이 오르면 그 값을 알리고 바로 멈춘다", async () => {
  const d = deps([free], [100, 100, 600]);
  await refreshAfterPurchase(d, { entitlements: free, balance: 100 });
  expect(d.wait).toHaveBeenCalledTimes(3);
  expect(d.onBalance).toHaveBeenCalledWith(600);
  expect(d.onBalance).toHaveBeenCalledTimes(1);
  expect(d.onEntitlements).not.toHaveBeenCalled();
});

test("PR-U3 구독 — 권한이 바뀌면 권한 · 잔액(매달 엽전)을 알린다", async () => {
  const d = deps([free, premium], [100, 900]);
  await refreshAfterPurchase(d, { entitlements: free, balance: 100 });
  expect(d.onEntitlements).toHaveBeenCalledWith(premium);
  expect(d.onBalance).toHaveBeenCalledWith(900);
  expect(d.wait).toHaveBeenCalledTimes(2);
});

test("PR-U4 끝까지 그대로면 마지막 값을 한 번 알리고 끝낸다 · 읽기 실패는 던지지 않는다", async () => {
  const d = deps([free], [100]);
  d.balance = vi.fn<PurchaseRefreshDeps["balance"]>(async () => {
    throw new Error("network");
  });
  await refreshAfterPurchase(d, { entitlements: free, balance: 100 });
  expect(d.wait).toHaveBeenCalledTimes(REFRESH_ATTEMPTS);
  expect(d.onEntitlements).toHaveBeenCalledTimes(1);
  expect(d.onBalance).not.toHaveBeenCalled();
});

test("PR-U5 runWithServerRefresh — 결제를 못 열면 그냥 돌리고, 취소 · 실패는 다시 읽지 않는다", async () => {
  const off = deps([free], [100]);
  await expect(
    runWithServerRefresh({ ...off, available: false, current: free }, async () => ({
      kind: "unavailable" as const,
    })),
  ).resolves.toEqual({ kind: "unavailable" });
  expect(off.balance).not.toHaveBeenCalled();

  const cancelled = deps([free], [100]);
  await runWithServerRefresh({ ...cancelled, available: true, current: free }, async () => ({
    kind: "cancelled" as const,
  }));
  expect(cancelled.balance).toHaveBeenCalledTimes(1);
  expect(cancelled.wait).not.toHaveBeenCalled();

  const bought = deps([free], [100, 600]);
  const result = await runWithServerRefresh(
    { ...bought, available: true, current: free },
    async () => ({ kind: "purchased" as const, productId: "duru.coins.500.v1" }),
  );
  expect(result.kind).toBe("purchased");
  await vi.waitFor(() => expect(bought.onBalance).toHaveBeenCalledWith(600));
});

test("PR-U6 runWithServerRefresh — 잔액 읽기를 기다리지 않고 결제를 바로 연다", async () => {
  const slow = deps([free], [100, 600]);
  let release: () => void = () => {};
  slow.balance.mockImplementationOnce(
    () => new Promise<number | null>((resolve) => (release = () => resolve(100))),
  );
  const task = vi.fn(async () => ({ kind: "purchased" as const, productId: "duru.coins.500.v1" }));
  const running = runWithServerRefresh({ ...slow, available: true, current: free }, task);
  expect(task).toHaveBeenCalledTimes(1);
  await expect(running).resolves.toMatchObject({ kind: "purchased" });
  release();
  await vi.waitFor(() => expect(slow.onBalance).toHaveBeenCalledWith(600));
});
