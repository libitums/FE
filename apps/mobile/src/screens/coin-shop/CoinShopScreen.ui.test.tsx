import { expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@lynx-js/react/testing-library";

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
    "Coin pouch, 140 coins, +20 bonus, $9.99, BEST VALUE, selected",
  );
  expect(screen.getByTestId("coin-shop-pack-bundle")).toHaveAttribute(
    "accessibility-label",
    "Coin bundle, 50 coins, $4.99",
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
