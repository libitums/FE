import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, render, screen } from "@lynx-js/react/testing-library";

import type { PlanId } from "../lib/plans-api";
import type { PlanActivation } from "../screens/plans/plan-change";
import { SubscriptionToast, subscriptionToastMs } from "./SubscriptionToast";

// `ui` 계층(STO1 ~ STO3, ADR-0160 · 시안 T6b): 구독 성공 알림 — 한 번, 4초 뒤 사라짐. 미뤄진 내림은 「언제부터」.

const on = (plan: PlanId): PlanActivation => ({ plan, scheduled: null });

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

test("STO1 요금제 이름 · 혜택 한 줄을 보이고 한 요소로 낭독(실시간 알림)한다", () => {
  render(<SubscriptionToast activation={on("unlimited_tickets")} onDone={() => {}} />);
  const toast = screen.getByTestId("subscription-toast");
  expect(toast).toHaveTextContent("Unlimited Tickets is on");
  expect(toast).toHaveTextContent("Start any lesson without a ticket");
  expect(toast.getAttribute("accessibility-label")).toBe(
    "Unlimited Tickets is on, Start any lesson without a ticket",
  );
});

test("STO2 4초 뒤 onDone 한 번", () => {
  vi.useFakeTimers();
  const onDone = vi.fn<() => void>();
  render(<SubscriptionToast activation={on("premium")} onDone={onDone} />);
  expect(subscriptionToastMs).toBe(4000);
  act(() => {
    vi.advanceTimersByTime(3999);
  });
  expect(onDone).not.toHaveBeenCalled();
  act(() => {
    vi.advanceTimersByTime(1);
  });
  expect(onDone).toHaveBeenCalledTimes(1);
});

test("STO3 미뤄진 내림(2026-11-19 Premium → Unlimited Tickets) — 「켜짐」이 아니라 시작 날짜와 지금 요금제를 쓴다", () => {
  const at = new Date(2026, 11, 18, 12, 0, 0).toISOString();
  const activation: PlanActivation = {
    plan: "unlimited_tickets",
    scheduled: { from: "premium", to: "unlimited_tickets", period: "monthly", at },
  };
  render(<SubscriptionToast activation={activation} onDone={() => {}} />);
  const toast = screen.getByTestId("subscription-toast");
  expect(toast).not.toHaveTextContent("is on");
  expect(toast).toHaveTextContent("Unlimited Tickets starts Dec 18");
  expect(toast).toHaveTextContent("You keep Premium until then");
  expect(toast.getAttribute("accessibility-label")).toBe(
    "Unlimited Tickets starts Dec 18, You keep Premium until then",
  );
});
