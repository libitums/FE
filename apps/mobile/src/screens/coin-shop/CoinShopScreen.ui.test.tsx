import { expect, test, vi } from "vitest";
import { act, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import type { PurchaseResult } from "../../lib/purchase-bridge";
import { resetPurchaseContextForTests, setPurchaseContext } from "../../lib/purchase-intent";
import { lightStatusBarIcons } from "../../lib/status-bar-icons";
import { CoinShopScreen } from "./CoinShopScreen";

// `ui` 계층: 엽전 상점(ADR-0116) — 보유 · 팩 고르기 · 사기는 「결제 준비 중」 안내. testid로 질의합니다.

function fixture() {
  return { coinBalance: 1240, onClose: vi.fn() };
}

const buyButton = () =>
  screen
    .getByTestId("coin-shop-screen-buy")
    .querySelector('[data-testid="ui-lynx-button"]') as Element;

test("[CS-U1] 보유 엽전을 쉼표로 끊어 보이고 카드 하나로 낭독한다. 짙은 바탕이라 상태바 표지를 단다", () => {
  render(<CoinShopScreen {...fixture()} />);

  expect(screen.getByTestId("coin-shop-screen-balance-value")).toHaveTextContent("1,240");
  expect(screen.getByTestId("coin-shop-screen-balance")).toHaveAttribute(
    "accessibility-label",
    "You have 1,240 coins",
  );
  expect(screen.getByTestId("coin-shop-screen")).toHaveAttribute(
    "data-statusbar",
    lightStatusBarIcons,
  );
});

test("[CS-U2] 팩은 엮음 · 주머니 · 큰 주머니 순이고 처음에는 주머니가 골라져 있다 — 버튼이 그 가격이다", () => {
  render(<CoinShopScreen {...fixture()} />);

  const ids = Array.from(document.querySelectorAll("[data-testid^='coin-shop-pack-']")).map(
    (node) => node.getAttribute("data-testid"),
  );
  expect(ids).toEqual(["coin-shop-pack-bundle", "coin-shop-pack-pouch", "coin-shop-pack-big"]);
  expect(screen.getByTestId("coin-shop-pack-pouch")).toHaveAttribute("data-selected", "true");
  expect(screen.getByTestId("coin-shop-pack-pouch")).toHaveAttribute(
    "accessibility-label",
    "Coin pouch, 1,200 coins, +200 bonus, $9.99, BEST VALUE, selected",
  );
  expect(screen.getByTestId("coin-shop-pack-bundle")).toHaveAttribute(
    "accessibility-label",
    "Coin bundle, 500 coins, $4.99",
  );
  expect(buyButton()).toHaveTextContent("Buy for $9.99");
});

test("[CS-U3] 팩 tap → 고름이 옮겨 가고 버튼 가격이 따라 바뀐다", () => {
  render(<CoinShopScreen {...fixture()} />);

  fireEvent.tap(screen.getByTestId("coin-shop-pack-big"), {});

  expect(screen.getByTestId("coin-shop-pack-big")).toHaveAttribute("data-selected", "true");
  expect(screen.getByTestId("coin-shop-pack-pouch")).toHaveAttribute("data-selected", "false");
  expect(buyButton()).toHaveTextContent("Buy for $19.99");
});

test("[CS-U4] 사기 → 「결제 준비 중」 안내가 뜨고 뒤쪽은 낭독에서 빠진다. 확인하면 안내만 닫힌다", () => {
  const props = fixture();
  render(<CoinShopScreen {...props} />);

  fireEvent.tap(buyButton(), {});

  expect(screen.getByTestId("coin-shop-screen-notice")).toHaveTextContent("Payment coming soon");
  expect(screen.getByTestId("coin-shop-screen-close")).toHaveAttribute(
    "accessibility-elements-hidden",
    "true",
  );

  const ok = screen
    .getByTestId("coin-shop-screen-notice")
    .querySelector('[data-testid="ui-lynx-button"]') as Element;
  fireEvent.tap(ok, {});

  expect(screen.queryByTestId("coin-shop-screen-notice")).toBeNull();
  expect(props.onClose).not.toHaveBeenCalled();
});

test("[CS-PI1] 가격 지역 VN이면 팩 · 버튼이 임시 추천 가격(₫)이고, 사기는 안내와 함께 purchase_intent를 낸다", () => {
  const events: unknown[] = [];
  setPurchaseContext({ region: "VN", sink: (event) => events.push(event) });
  render(<CoinShopScreen {...fixture()} surface="chat" />);

  expect(screen.getByTestId("coin-shop-pack-bundle")).toHaveTextContent("79.000 ₫");
  expect(screen.getByTestId("coin-shop-screen-buy")).toHaveTextContent("149.000 ₫");
  fireEvent.tap(buyButton(), {});

  expect(screen.getByTestId("coin-shop-screen-notice")).toBeTruthy();
  expect(events).toEqual([
    expect.objectContaining({
      name: "purchase_intent",
      surface: "chat",
      placement: "coin_shop",
      kind: "pack",
      product: "duru.coins.1200.v1",
      period: "once",
      price: "149000",
      currency: "VND",
      country: "VN",
      preview: true,
    }),
  ]);
  resetPurchaseContextForTests();
});

test("[CS-B1] 결제를 열 수 있으면 사기 → 그 팩의 스토어 결제(로딩), 안내 없이 끝나고 의향은 preview 거짓", async () => {
  const events: unknown[] = [];
  let finish: (result: PurchaseResult) => void = () => {};
  const buy = vi.fn<(productId: string) => Promise<PurchaseResult>>(
    () =>
      new Promise<PurchaseResult>((resolve) => {
        finish = resolve;
      }),
  );
  setPurchaseContext({ region: "US", sink: (event) => events.push(event), canBuy: true, buy });
  render(<CoinShopScreen {...fixture()} />);

  await act(async () => {
    fireEvent.tap(buyButton(), {});
  });
  expect(buy).toHaveBeenCalledWith("duru.coins.1200.v1");
  expect(buyButton().getAttribute("data-loading")).toBe("true");
  // 도는 동안 다시 눌러도 한 번뿐입니다.
  await act(async () => {
    fireEvent.tap(buyButton(), {});
  });
  expect(buy).toHaveBeenCalledTimes(1);
  await act(async () => {
    finish({ kind: "purchased", productId: "duru.coins.1200.v1" });
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  expect(buyButton().getAttribute("data-loading")).toBe("false");
  expect(screen.queryByTestId("coin-shop-screen-notice")).toBeNull();
  expect(events).toEqual([expect.objectContaining({ name: "purchase_intent", preview: false })]);
  resetPurchaseContextForTests();
});

test("[CS-U5] 닫기 → onClose", () => {
  const props = fixture();
  render(<CoinShopScreen {...props} />);

  fireEvent.tap(
    screen
      .getByTestId("coin-shop-screen-close")
      .querySelector('[data-testid="ui-lynx-round-button"]') as Element,
    {},
  );

  expect(props.onClose).toHaveBeenCalledTimes(1);
});

test("[CS-B2] 결제가 실패하면 버튼 아래 짧은 안내(막지 않음) — 취소면 아무것도 없고, 다시 사면 안내가 걷힌다", async () => {
  const results: PurchaseResult[] = [
    { kind: "cancelled" },
    { kind: "failed" },
    { kind: "cancelled" },
  ];
  const buy = vi.fn<(productId: string) => Promise<PurchaseResult>>(
    async () => results.shift() ?? { kind: "cancelled" },
  );
  setPurchaseContext({ region: "US", sink: () => {}, canBuy: true, buy });
  render(<CoinShopScreen {...fixture()} />);
  const tapBuy = () =>
    act(async () => {
      fireEvent.tap(buyButton(), {});
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

  await tapBuy();
  expect(screen.queryByTestId("coin-shop-screen-failed")).toBeNull();
  await tapBuy();
  expect(screen.getByTestId("coin-shop-screen-failed")).toHaveTextContent(
    "The purchase didn't go through",
  );
  expect(screen.queryByTestId("coin-shop-screen-notice")).toBeNull();
  await tapBuy();
  expect(screen.queryByTestId("coin-shop-screen-failed")).toBeNull();
  resetPurchaseContextForTests();
});
