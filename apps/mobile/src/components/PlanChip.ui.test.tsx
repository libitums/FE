import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { PlanChip } from "./PlanChip";

// `ui` 계층(PCH1 ~ PCH3, ADR-0160 · 시안 A3 ~ A6): 머리 둘째 줄 요금제 칩.

afterEach(cleanup);

test("PCH1 구독이 없으면 흰 PLANS 칩(주황 왕관), 이름은 Plans, 누르면 onPress", () => {
  const onPress = vi.fn<() => void>();
  render(<PlanChip plan="plans" pulse={false} onPress={onPress} />);
  const chip = screen.getByTestId("header-plan-chip");
  expect(chip.getAttribute("data-plan")).toBe("plans");
  expect(chip.getAttribute("data-subscribed")).toBe("false");
  expect(chip).toHaveTextContent("PLANS");
  expect(chip.getAttribute("accessibility-label")).toBe("Plans");
  expect(chip.getAttribute("accessibility-traits")).toBe("button");
  fireEvent.tap(chip, {});
  expect(onPress).toHaveBeenCalledTimes(1);
});

test("PCH2 구독 중이면 주황 칩 — PREMIUM · CHAT+ · TICKETS, 이름은 Your plan: …", () => {
  render(<PlanChip plan="premium" pulse={false} onPress={() => {}} />);
  expect(screen.getByTestId("header-plan-chip")).toHaveTextContent("PREMIUM");
  expect(screen.getByTestId("header-plan-chip").getAttribute("data-subscribed")).toBe("true");
  expect(screen.getByTestId("header-plan-chip").getAttribute("accessibility-label")).toBe(
    "Your plan: Premium",
  );
  cleanup();
  render(<PlanChip plan="chat_plus" pulse={false} onPress={() => {}} />);
  expect(screen.getByTestId("header-plan-chip")).toHaveTextContent("CHAT+");
  cleanup();
  render(<PlanChip plan="unlimited_tickets" pulse={false} onPress={() => {}} />);
  expect(screen.getByTestId("header-plan-chip")).toHaveTextContent("TICKETS");
  expect(screen.getByTestId("header-plan-chip").getAttribute("accessibility-label")).toBe(
    "Your plan: Tickets ∞",
  );
});

test("PCH3 구독 성공 직후엔 한 번 반짝임(data-pulse)", () => {
  render(<PlanChip plan="premium" pulse={true} onPress={() => {}} />);
  expect(screen.getByTestId("header-plan-chip").getAttribute("data-pulse")).toBe("true");
});
