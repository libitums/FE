import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";
import type { ReactNode } from "@lynx-js/react";

import { MotionProvider } from "@libitums/ui-lynx/motion";

import { backHandlers } from "../../lib/back-handler";
import type { PurchaseWait } from "../../lib/purchase-wait";
import { catalogV1, usdOffers } from "../plans/plans.test-support";
import { CoinShopScreen, type CoinShopScreenProps } from "./CoinShopScreen";
import { ShopPlansContext, type ShopPlans } from "./shop-plans";

// `ui` 계층(CP-1 ~ CP-6, ADR-0163 D3): 상점의 구매 뒤 확인 대기 — 위 알약 · 바뀔 칩 스켈레톤 · 산 팩 「Adding」 · 잔액 오름 ·
// 구독이 서버에 닿으면 상점 닫힘(그래야 머리 아래 구독 성공 알림이 곧바로 뜸).

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  while (backHandlers.runTop()) {
    /* 남은 핸들러를 비웁니다 */
  }
});

function plansWith(wait: PurchaseWait): ShopPlans {
  return {
    catalog: catalogV1,
    offers: usdOffers,
    current: null,
    wait,
    onSelect: vi.fn<ShopPlans["onSelect"]>(async () => ({
      kind: "purchased",
      productId: "duru.premium.monthly.v1",
    })),
    onRestore: vi.fn<ShopPlans["onRestore"]>(async () => ({ kind: "unavailable" })),
    onViewed: vi.fn<ShopPlans["onViewed"]>(),
    onTabSwitched: vi.fn<ShopPlans["onTabSwitched"]>(),
  };
}

const shop = (
  wait: PurchaseWait,
  over: Partial<CoinShopScreenProps> = {},
  onClose: () => void = () => {},
): ReactNode => (
  <ShopPlansContext.Provider value={plansWith(wait)}>
    <CoinShopScreen coinBalance={120} onClose={onClose} {...over} />
  </ShopPlansContext.Provider>
);
const present = (testId: string) => screen.queryByTestId(testId) !== null;
const coinsWaiting: PurchaseWait = {
  phase: "waiting",
  target: "coins",
  productId: "duru.coins.1200.v1",
};
const planWaiting: PurchaseWait = {
  phase: "waiting",
  target: "plan",
  productId: "duru.premium.monthly.v1",
};

test("CP-1 엽전 대기 — 알약 「Confirming」 · 「You have」 값이 스켈레톤(이름 Updating) · 산 팩만 「Adding to your wallet」", () => {
  render(shop(coinsWaiting));
  expect(screen.getByTestId("purchase-pill")).toHaveTextContent("Confirming your purchase…");
  expect(present("coin-shop-screen-balance-updating")).toBe(true);
  expect(present("coin-shop-screen-balance-value")).toBe(false);
  expect(screen.getByTestId("coin-shop-screen-balance").getAttribute("accessibility-label")).toBe(
    "Updating, You have 120 coins",
  );
  expect(screen.getByTestId("coin-shop-pack-pouch-adding")).toHaveTextContent(
    "Adding to your wallet",
  );
  expect(present("coin-shop-pack-bundle-adding")).toBe(false);
  expect(screen.getByTestId("coin-shop-pack-pouch").getAttribute("accessibility-label")).toContain(
    "Adding to your wallet",
  );
});

test("CP-2 idle이면 알약 · 스켈레톤 · Adding 없음(지금 그대로)", () => {
  render(shop({ phase: "idle" }));
  expect(present("purchase-pill")).toBe(false);
  expect(present("coin-shop-screen-balance-updating")).toBe(false);
  expect(screen.getByTestId("coin-shop-screen-balance-value")).toHaveTextContent("120");
  expect(present("coin-shop-pack-pouch-adding")).toBe(false);
});

test("CP-3 구독 대기 — Plans 탭 「Your plan」 값이 스켈레톤, 엽전 칩은 그대로", () => {
  render(shop(planWaiting, { initialTab: "plans" }));
  expect(screen.getByTestId("purchase-pill")).toHaveTextContent("Confirming your purchase…");
  expect(present("plans-your-plan-updating")).toBe(true);
  expect(screen.getByTestId("plans-your-plan").getAttribute("accessibility-label")).toBe(
    "Updating, Your plan: Free",
  );
});

test("CP-4 서버가 엽전을 넣으면 「You have」가 옛 값에서 새 값까지 오르고 「+1,200 coins added」", () => {
  vi.useFakeTimers();
  const view = render(shop(coinsWaiting));
  view.rerender(shop({ phase: "done", target: "coins", coins: 1200 }, { coinBalance: 1320 }));
  const value = () => screen.getByTestId("coin-shop-screen-balance-value").textContent;
  expect(value()).toBe("120");
  expect(screen.getByTestId("purchase-pill")).toHaveTextContent("+1,200 coins added");
  act(() => {
    vi.advanceTimersByTime(300);
  });
  expect(value()).not.toBe("120");
  expect(value()).not.toBe("1,320");
  act(() => {
    vi.advanceTimersByTime(400);
  });
  expect(value()).toBe("1,320");
  expect(screen.getByTestId("coin-shop-screen-balance").getAttribute("accessibility-label")).toBe(
    "You have 1,320 coins",
  );
});

test("CP-5 움직임 줄이기 — 새 값이 곧바로", () => {
  const view = render(
    <MotionProvider motion="reduced">{shop(coinsWaiting)}</MotionProvider>,
  );
  view.rerender(
    <MotionProvider motion="reduced">
      {shop({ phase: "done", target: "coins", coins: 1200 }, { coinBalance: 1320 })}
    </MotionProvider>,
  );
  expect(screen.getByTestId("coin-shop-screen-balance-value")).toHaveTextContent("1,320");
});

const buyPlan = async () => {
  await act(async () => {
    fireEvent.tap(screen.getByTestId("plans-continue"), {});
  });
};

test("CP-6 이 상점에서 산 구독이 서버에 닿으면(done plan) 닫히고, 늦으면(late) 열린 채 조용한 안내", async () => {
  const onClose = vi.fn<() => void>();
  const plans = { initialTab: "plans" as const };
  // 결선은 결제가 끝나면 먼저 대기(waiting)로 두고, 그 뒤 화면이 결과(purchased)를 받습니다.
  const view = render(shop(planWaiting, plans, onClose));
  await buyPlan();
  view.rerender(shop({ phase: "late", target: "plan" }, plans, onClose));
  expect(onClose).not.toHaveBeenCalled();
  expect(screen.getByTestId("purchase-pill")).toHaveTextContent(
    "Your purchase is safe. It'll appear shortly.",
  );
  expect(present("plans-your-plan-updating")).toBe(false);
  view.rerender(shop(planWaiting, plans, onClose));
  await buyPlan();
  // 웹훅이 이미 닿아 그리는 사이 곧바로 done이어도 닫힙니다.
  view.rerender(shop({ phase: "done", target: "plan", coins: null }, plans, onClose));
  expect(onClose).toHaveBeenCalledTimes(1);
  expect(present("purchase-pill")).toBe(false);
});

test("CP-6b 다른 자리(설정)의 구독 대기가 끝나도, 이 상점에서 산 것이 아니면 닫히지 않는다", () => {
  const onClose = vi.fn<() => void>();
  const plans = { initialTab: "plans" as const };
  const view = render(shop(planWaiting, plans, onClose));
  view.rerender(shop({ phase: "done", target: "plan", coins: null }, plans, onClose));
  expect(onClose).not.toHaveBeenCalled();
});

test("CP-7 엽전 탭에서 산 팩이 끝나도(done coins) 상점은 열려 있다", () => {
  const onClose = vi.fn<() => void>();
  const view = render(shop(coinsWaiting, {}, onClose));
  view.rerender(shop({ phase: "done", target: "coins", coins: 1200 }, { coinBalance: 1320 }, onClose));
  fireEvent.tap(screen.getByTestId("coin-shop-pack-big"), {});
  expect(onClose).not.toHaveBeenCalled();
});
