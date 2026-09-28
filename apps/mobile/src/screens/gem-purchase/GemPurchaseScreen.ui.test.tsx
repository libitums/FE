import { expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { GemPurchaseScreen } from "./GemPurchaseScreen";

// `ui` 계층: 컴포넌트 렌더와 상호작용 (ADR-0006 D4). testid로 질의합니다.

function fixture() {
  return {
    gemBalance: 1240,
    onPurchase: vi.fn(),
    onChangePaymentMethod: vi.fn(),
    onClose: vi.fn(),
  };
}

function payButton() {
  return screen
    .getByTestId("gem-purchase-screen-pay")
    .querySelector('[data-testid="ui-lynx-button"]') as Element;
}

test("[GP1] 보유 젬을 쉼표로 끊어 보이고, 카드 하나로 낭독한다", () => {
  render(<GemPurchaseScreen {...fixture()} />);

  expect(screen.getByTestId("gem-purchase-screen-balance-value")).toHaveTextContent("1,240");
  expect(screen.getByTestId("gem-purchase-screen-balance")).toHaveAttribute(
    "accessibility-label",
    "보유 젬 1,240개",
  );
});

test("[GP2] 처음에는 가장 큰 팩이 골라져 있고 주문 요약이 그 팩을 따른다", () => {
  render(<GemPurchaseScreen {...fixture()} />);

  expect(screen.getByTestId("gem-purchase-pack-max")).toHaveAttribute("data-selected", "true");
  expect(screen.getByTestId("gem-purchase-pack-standard")).toHaveAttribute(
    "data-selected",
    "false",
  );
  expect(screen.getByTestId("gem-purchase-screen-total-gems")).toHaveTextContent("3,600 GEM");
  expect(screen.getByTestId("gem-purchase-screen-bonus")).toHaveTextContent(
    "Includes 800 bonus gems",
  );
  expect(screen.getByTestId("gem-purchase-screen-total-price")).toHaveTextContent("$19.99");
  expect(payButton()).toHaveTextContent("Pay $19.99");
});

test("[GP3] 팩 tap → 고름이 옮겨 가고 요약 · 버튼이 따라 바뀐다. 보너스 없는 팩은 보너스 줄이 없다", () => {
  render(<GemPurchaseScreen {...fixture()} />);

  fireEvent.tap(screen.getByTestId("gem-purchase-pack-standard"), {});

  expect(screen.getByTestId("gem-purchase-pack-standard")).toHaveAttribute("data-selected", "true");
  expect(screen.getByTestId("gem-purchase-pack-max")).toHaveAttribute("data-selected", "false");
  expect(screen.getByTestId("gem-purchase-screen-total-gems")).toHaveTextContent("500 GEM");
  expect(screen.queryByTestId("gem-purchase-screen-bonus")).toBeNull();
  expect(payButton()).toHaveTextContent("Pay $4.99");
});

test("[GP4] 팩 카드는 버튼이고, 이름에 젬 · 가격 · 배지 · 고름이 실린다", () => {
  render(<GemPurchaseScreen {...fixture()} />);

  const plus = screen.getByTestId("gem-purchase-pack-plus");
  expect(plus).toHaveAttribute("accessibility-traits", "button");
  expect(plus).toHaveAttribute("accessibility-label", "1,200 젬, + 200 bonus, $9.99, BEST VALUE");
  expect(screen.getByTestId("gem-purchase-pack-max")).toHaveAttribute(
    "accessibility-label",
    "2,800 젬, + 800 bonus, $19.99, 선택됨",
  );
});

test("[GP5] Pay → 고른 팩으로 onPurchase 1회", () => {
  const props = fixture();
  render(<GemPurchaseScreen {...props} />);

  fireEvent.tap(screen.getByTestId("gem-purchase-pack-plus"), {});
  fireEvent.tap(payButton(), {});

  expect(props.onPurchase).toHaveBeenCalledTimes(1);
  expect(props.onPurchase).toHaveBeenCalledWith(
    expect.objectContaining({ id: "plus", gems: 1200, bonusGems: 200 }),
  );
  expect(props.onClose).not.toHaveBeenCalled();
});

test("[GP6] 닫기 → onClose 1회, 구매는 없다", () => {
  const props = fixture();
  render(<GemPurchaseScreen {...props} />);

  const close = screen
    .getByTestId("gem-purchase-screen-close")
    .querySelector('[data-testid="ui-lynx-round-button"]') as Element;
  expect(close).toHaveAttribute("accessibility-label", "닫기");
  fireEvent.tap(close, {});

  expect(props.onClose).toHaveBeenCalledTimes(1);
  expect(props.onPurchase).not.toHaveBeenCalled();
});
