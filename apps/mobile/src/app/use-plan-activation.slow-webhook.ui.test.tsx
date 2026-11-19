import { afterEach, expect, test } from "vitest";
import { act, cleanup, render } from "@lynx-js/react/testing-library";
import { useState } from "@lynx-js/react";

import type { PlanEntitlements } from "../lib/plans-api";
import { refreshAfterPurchase } from "../lib/purchase-refresh";
import type { PlanActivation } from "../screens/plans/plan-change";
import { subscribedTo } from "../screens/plans/plans-subscribed.test-support";
import { usePlanActivation } from "./use-plan-activation";

// `ui` 계층(SW-1 · SW-2, ADR-0163 D1): 구독 성공 알림 창은 서버 따라잡기 일정(60초)과 같은 기한이다. 2026-11-19 기기에서 내림의
// PRODUCT_CHANGE 웹훅이 옛 창(약 12초)보다 늦게 닿아 알림이 뜨지 않았다. 시계는 따라잡기의 기다림이 앞당깁니다(주입).

afterEach(() => {
  cleanup();
});

// 2026-11-19 기기의 모양(올림 뒤 내림, `App.shop` SH-I8과 같음) — 옛 Tickets 줄이 남은 Premium에 내림의 pending이 붙습니다.
const subscribed = subscribedTo("premium");
const staleTickets = {
  ...subscribedTo("unlimited_tickets").entitlements[0]!,
  pendingProductId: "duru.premium.monthly.v1",
};
const premiumRow = subscribed.entitlements[0]!;
const premium: PlanEntitlements = { ...subscribed, entitlements: [staleTickets, premiumRow] };
const premiumThenTickets: PlanEntitlements = {
  ...subscribed,
  entitlements: [staleTickets, { ...premiumRow, pendingProductId: "duru.tickets.monthly.v1" }],
};

type Probe = {
  arm: () => void;
  observe: (next: PlanEntitlements) => void;
  activated: PlanActivation | null;
};

function harness(clock: { now: number }) {
  const probe: { current: Probe | null } = { current: null };
  function Harness() {
    const [entitlements, setEntitlements] = useState<PlanEntitlements | null>(premium);
    const activation = usePlanActivation(entitlements, () => clock.now);
    probe.current = {
      arm: activation.arm,
      observe: (next) => {
        activation.observe(next);
        setEntitlements(next);
      },
      activated: activation.activated,
    };
    return <view />;
  }
  render(<Harness />);
  return probe;
}

async function catchUp(
  clock: { now: number },
  probe: { current: Probe | null },
  serverAt: (now: number) => PlanEntitlements,
  before: PlanEntitlements = premium,
) {
  await act(async () => {
    await refreshAfterPurchase(
      {
        entitlements: async () => serverAt(clock.now),
        balance: async () => 100,
        onEntitlements: (next) => probe.current?.observe(next),
        onBalance: () => {},
        wait: async (ms) => {
          clock.now += ms;
        },
        settle: "entitlements",
      },
      { entitlements: before, balance: 100 },
    );
  });
}

test("SW-1 웹훅이 25초에 닿아도(미뤄진 내림) 알림이 뜬다 — 「Unlimited Tickets starts …」", async () => {
  const clock = { now: 0 };
  const probe = harness(clock);
  act(() => probe.current?.arm());
  await catchUp(clock, probe, (now) => (now >= 25_000 ? premiumThenTickets : premium));
  expect(clock.now).toBeGreaterThanOrEqual(25_000);
  expect(clock.now).toBeLessThan(60_000);
  expect(probe.current?.activated).toEqual(
    expect.objectContaining({ plan: "unlimited_tickets", scheduled: expect.anything() }),
  );
});

test("SW-2 이미 미뤄진 내림을 또 사서 웹훅이 없으면 60초 기한에 조용히 끝난다(알림 없음)", async () => {
  const clock = { now: 0 };
  const probe = harness(clock);
  act(() => probe.current?.observe(premiumThenTickets));
  act(() => probe.current?.arm());
  await catchUp(clock, probe, () => premiumThenTickets, premiumThenTickets);
  expect(clock.now).toBe(60_000);
  expect(probe.current?.activated).toBeNull();
});
