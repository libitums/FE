import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { backHandlers } from "../lib/back-handler";
import { AppHeader, type HeaderPlans } from "./AppHeader";
import type { TicketHeaderWiring } from "./use-learning-tickets";

// `ui` 계층(AHP1 ~ AHP5, ADR-0160): 머리의 상점 입구 — 엽전 칩 → 엽전 탭, 둘째 줄 요금제 칩 → Plans 탭, 티켓 모달 Go unlimited →
// Unlimited Tickets, 구독 성공 알림 · 칩 반짝임. 상점은 세션 층이 그립니다(머리는 요청만).

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  while (backHandlers.runTop()) {
    /* 남은 핸들러를 비웁니다 */
  }
});

const tickets: TicketHeaderWiring = {
  status: { available: 2, slots: [], nextInMs: null },
  more: null,
  onGetMore: vi.fn<() => void>(),
  onModalChange: vi.fn<(open: boolean) => void>(),
  dropFrom: null,
  onDropped: vi.fn<() => void>(),
};

function mount(plans?: Partial<HeaderPlans>) {
  const onOpenShop = vi.fn();
  const onActivatedShown = vi.fn<() => void>();
  render(
    <AppHeader
      streakDays={1}
      trophyCount={0}
      coinCount={120}
      onOpenNotifications={() => {}}
      tickets={tickets}
      onOpenShop={onOpenShop}
      {...(plans === undefined
        ? {}
        : {
            plans: {
              chip: "plans",
              goUnlimited: { price: "$3.99" },
              activated: null,
              onActivatedShown,
              ...plans,
            },
          })}
    />,
  );
  return { onOpenShop, onActivatedShown };
}

test("AHP1 엽전 칩 → 상점 엽전 탭 요청(머리는 상점을 그리지 않음)", () => {
  const { onOpenShop } = mount();
  fireEvent.tap(screen.getByTestId("top-bar-coins"), {});
  expect(onOpenShop).toHaveBeenCalledWith({ tab: "coins", placement: "coin_shop", focus: null });
  expect(screen.queryByTestId("coin-shop-screen")).toBeNull();
});

test("AHP2 요금제 결선이 없으면 둘째 줄이 없고, 있으면 종 아래 칩 → Plans 탭(header_chip)", () => {
  mount();
  expect(screen.queryByTestId("app-header-plan-row")).toBeNull();
  cleanup();
  const { onOpenShop } = mount({ chip: "premium" });
  expect(screen.getByTestId("header-plan-chip")).toHaveTextContent("PREMIUM");
  fireEvent.tap(screen.getByTestId("header-plan-chip"), {});
  expect(onOpenShop).toHaveBeenCalledWith({ tab: "plans", placement: "header_chip", focus: null });
});

test("AHP3 칩이 null(지도 밖 탭)이면 둘째 줄이 없다", () => {
  mount({ chip: null });
  expect(screen.queryByTestId("app-header-plan-row")).toBeNull();
});

test("AHP4 티켓 모달의 Go unlimited → 모달이 닫히고 Unlimited Tickets를 고른 Plans 탭(tickets_chip)", () => {
  const { onOpenShop } = mount({});
  fireEvent.tap(screen.getByTestId("top-bar-tickets"), {});
  expect(screen.getByTestId("ticket-modal-go-unlimited")).toHaveTextContent("$3.99/mo");
  fireEvent.tap(screen.getByTestId("ticket-modal-go-unlimited"), {});
  expect(screen.queryByTestId("ticket-modal")).toBeNull();
  expect(onOpenShop).toHaveBeenCalledWith({
    tab: "plans",
    placement: "tickets_chip",
    focus: "unlimited_tickets",
  });
});

test("AHP5 구독 성공 — 둘째 줄 아래 알림 · 칩 반짝임, 4초 뒤 onActivatedShown", () => {
  vi.useFakeTimers();
  const { onActivatedShown } = mount({ chip: "unlimited_tickets", activated: "unlimited_tickets" });
  expect(screen.getByTestId("subscription-toast")).toHaveTextContent("Unlimited Tickets is on");
  expect(screen.getByTestId("header-plan-chip").getAttribute("data-pulse")).toBe("true");
  act(() => {
    vi.advanceTimersByTime(4000);
  });
  expect(onActivatedShown).toHaveBeenCalledTimes(1);
});
