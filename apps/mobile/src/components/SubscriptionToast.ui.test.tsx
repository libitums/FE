import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, render, screen } from "@lynx-js/react/testing-library";

import { SubscriptionToast, subscriptionToastMs } from "./SubscriptionToast";

// `ui` 계층(STO1 ~ STO2, ADR-0160 · 시안 T6b): 구독 성공 알림 — 한 번, 4초 뒤 사라짐.

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

test("STO1 요금제 이름 · 혜택 한 줄을 보이고 한 요소로 낭독(실시간 알림)한다", () => {
  render(<SubscriptionToast plan="unlimited_tickets" onDone={() => {}} />);
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
  render(<SubscriptionToast plan="premium" onDone={onDone} />);
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
