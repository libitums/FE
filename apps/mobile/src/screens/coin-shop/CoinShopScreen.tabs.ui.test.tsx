import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { backHandlers } from "../../lib/back-handler";
import type { PlanEntitlements } from "../../lib/plans-api";
import { subscribedTo } from "../plans/plans-subscribed.test-support";
import { catalogV1, usdOffers } from "../plans/plans.test-support";
import { CoinShopScreen, type CoinShopScreenProps } from "./CoinShopScreen";
import { ShopPlansContext, type ShopPlans } from "./shop-plans";

// `ui` 계층(ST1 ~ ST9, ADR-0160): 하나의 상점 — 위 전환(Yeopjeon | Plans) · 오른쪽 위 칩 · 엽전 탭 아래 요금제 줄 · 입구가 정하는 첫 탭 ·
// Plans 탭(어두운 판). 요금제 결선이 없으면(플래그 꺼짐) 지금처럼 엽전만.

afterEach(() => {
  cleanup();
  while (backHandlers.runTop()) {
    /* 남은 핸들러를 비웁니다 */
  }
});

function plansWith(current: PlanEntitlements | null = null) {
  return {
    catalog: catalogV1,
    offers: usdOffers,
    current,
    onSelect: vi.fn<ShopPlans["onSelect"]>(async () => ({ kind: "unavailable" })),
    onRestore: vi.fn<ShopPlans["onRestore"]>(async () => ({ kind: "unavailable" })),
    onViewed: vi.fn<ShopPlans["onViewed"]>(),
    onTabSwitched: vi.fn<ShopPlans["onTabSwitched"]>(),
  };
}

function mount(
  plans: ReturnType<typeof plansWith> | undefined,
  over: Partial<CoinShopScreenProps> = {},
) {
  const onClose = vi.fn<() => void>();
  render(
    <ShopPlansContext.Provider value={plans}>
      <CoinShopScreen coinBalance={120} onClose={onClose} {...over} />
    </ShopPlansContext.Provider>,
  );
  return onClose;
}
const tap = (testId: string) => fireEvent.tap(screen.getByTestId(testId), {});
const present = (testId: string) => screen.queryByTestId(testId) !== null;

test("ST1 요금제 결선이 없으면 탭 · 요금제 줄이 없고 엽전 상점 그대로", () => {
  mount(undefined);
  expect(present("shop-tab-coins")).toBe(false);
  expect(present("shop-promo")).toBe(false);
  expect(present("coin-shop-screen-balance")).toBe(true);
  expect(present("coin-shop-pack-pouch")).toBe(true);
});

test("ST2 결선이 있으면 엽전 탭이 먼저 — You have 칩, 팩 아래 Premium 줄", () => {
  mount(plansWith());
  expect(screen.getByTestId("shop-tab-coins").getAttribute("data-selected")).toBe("true");
  expect(screen.getByTestId("shop-tab-plans").getAttribute("data-selected")).toBe("false");
  expect(screen.getByTestId("coin-shop-screen-balance")).toHaveTextContent("120");
  expect(screen.getByTestId("shop-promo")).toHaveTextContent(
    "Get 800 Yeopjeon every month with Premium",
  );
  expect(screen.getByTestId("shop-promo")).toHaveTextContent("Plans ›");
  expect(present("plans-card-premium")).toBe(false);
});

test("ST3 Plans 탭 → Your plan 칩(Free) · 카드 셋, 전환 · 보기 이벤트(coin_shop)", () => {
  const plans = plansWith();
  mount(plans);
  tap("shop-tab-plans");
  expect(present("plans-card-premium")).toBe(true);
  expect(screen.getByTestId("plans-your-plan")).toHaveTextContent("Free");
  expect(present("coin-shop-screen-balance")).toBe(false);
  expect(present("coin-shop-screen-buy")).toBe(false);
  expect(plans.onTabSwitched).toHaveBeenCalledWith("coins", "plans", "learning");
  expect(plans.onViewed).toHaveBeenCalledWith("coin_shop");
  tap("shop-tab-coins");
  expect(plans.onTabSwitched).toHaveBeenLastCalledWith("plans", "coins", "learning");
  expect(present("coin-shop-pack-pouch")).toBe(true);
});

test("ST4 요금제 줄 → Plans 탭, Premium을 고른 채", () => {
  const plans = plansWith();
  mount(plans);
  tap("shop-promo");
  expect(screen.getByTestId("plans-card-premium").getAttribute("data-selected")).toBe("true");
  expect(plans.onTabSwitched).toHaveBeenCalledWith("coins", "plans", "learning");
  expect(plans.onViewed).toHaveBeenCalledWith("coin_shop");
});

test("ST5 대화 전송에서 열리면 Chat Plus 줄 → Chat Plus를 고른 Plans 탭(chat_send · surface chat)", () => {
  const plans = plansWith();
  mount(plans, { from: "send", surface: "chat" });
  expect(screen.getByTestId("shop-promo")).toHaveTextContent(
    "Keep chatting — 30 free a day with Chat Plus",
  );
  tap("shop-promo");
  expect(screen.getByTestId("plans-card-chat_plus").getAttribute("data-selected")).toBe("true");
  expect(plans.onViewed).toHaveBeenCalledWith("chat_send");
  expect(plans.onTabSwitched).toHaveBeenCalledWith("coins", "plans", "chat");
});

test("ST6 Plans 탭으로 열리면(티켓 모달) Unlimited Tickets를 고르고 태그, 보기 이벤트 한 번", () => {
  const plans = plansWith();
  mount(plans, { initialTab: "plans", placement: "tickets_chip", focus: "unlimited_tickets" });
  expect(screen.getByTestId("shop-tab-plans").getAttribute("data-selected")).toBe("true");
  expect(screen.getByTestId("plans-card-unlimited_tickets").getAttribute("data-selected")).toBe(
    "true",
  );
  expect(screen.getByTestId("plans-tickets-tag")).toHaveTextContent(
    "Out of tickets? Learn without waiting",
  );
  expect(plans.onViewed.mock.calls).toEqual([["tickets_chip"]]);
  expect(plans.onTabSwitched).not.toHaveBeenCalled();
});

test("ST7 Premium 구독자는 줄이 없고, Plans 탭 칩은 Premium", () => {
  mount(plansWith(subscribedTo("premium")));
  expect(present("shop-promo")).toBe(false);
  tap("shop-tab-plans");
  expect(screen.getByTestId("plans-your-plan")).toHaveTextContent("Premium");
});

test("ST8 Plans 탭에서 구매가 끝나면(purchased) 상점이 닫히고, 선택은 자리를 실어 넘긴다", async () => {
  const plans = plansWith();
  plans.onSelect.mockResolvedValue({ kind: "purchased", productId: "duru.premium.monthly.v1" });
  const onClose = mount(plans, { initialTab: "plans", placement: "header_chip", focus: null });
  await act(async () => {
    tap("plans-continue");
  });
  expect(plans.onSelect).toHaveBeenCalledWith(
    "header_chip",
    "premium",
    "monthly",
    "duru.premium.monthly.v1",
  );
  expect(onClose).toHaveBeenCalledTimes(1);
});

test("ST9 탭 묶음은 낭독 이름이 있고 고른 탭은 selected로 읽힌다", () => {
  mount(plansWith());
  expect(screen.getByTestId("shop-tab-coins").getAttribute("accessibility-label")).toBe(
    "Yeopjeon, selected",
  );
  expect(screen.getByTestId("shop-tab-plans").getAttribute("accessibility-traits")).toBe("button");
});
