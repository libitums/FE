import { expect, test, vi } from "vitest";
import { fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { GemPurchaseScreen } from "./GemPurchaseScreen";
import { UiCopyContext } from "../../lib/ui-copy";
import { uiCopyEn } from "../../lib/ui-copy-en";
import { markedUiCopy } from "../../lib/ui-copy.test-support";

// `ui` 계층: 컴포넌트 렌더와 상호작용 (ADR-0006 D4). testid로 질의합니다.

function fixture() {
  return {
    gemBalance: 1240,
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
    "You have 1,240 gems",
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

test("[GP4] 팩 카드는 버튼이고, 이름에 젬 · 가격 · 젬 하나 값 · 배지 · 고름이 실린다", () => {
  render(<GemPurchaseScreen {...fixture()} />);

  const plus = screen.getByTestId("gem-purchase-pack-plus");
  expect(plus).toHaveAttribute("accessibility-traits", "button");
  expect(plus).toHaveAttribute(
    "accessibility-label",
    "1,200 gems, + 200 bonus, $9.99, $0.0071 per gem, BEST VALUE",
  );
  expect(screen.getByTestId("gem-purchase-pack-max")).toHaveAttribute(
    "accessibility-label",
    "2,800 gems, + 800 bonus, $19.99, $0.0056 per gem, selected",
  );
});

// 결제 서비스가 아직 없습니다 — `Pay`는 안내를 띄울 뿐 아무것도 사지 않습니다.
test("[GP5] Pay → 결제 준비 중 안내가 뜨고, 뒤쪽은 낭독에서 가려진다", () => {
  render(<GemPurchaseScreen {...fixture()} />);
  expect(screen.queryByTestId("gem-purchase-screen-notice")).toBeNull();

  fireEvent.tap(payButton(), {});

  const notice = screen.getByTestId("gem-purchase-screen-notice");
  expect(within(notice).getByTestId("ui-lynx-dialog-title")).toHaveTextContent(
    uiCopyEn.gemPurchase.notice.title,
  );
  expect(within(notice).getByTestId("ui-lynx-dialog-description")).toHaveTextContent(
    "Gem payments aren't available yet. Please check back soon.",
  );
  expect(screen.getByTestId("gem-purchase-screen-close")).toHaveAttribute(
    "accessibility-elements-hidden",
    "true",
  );
});

test("[GP5-1] 결제 수단 줄 tap → 같은 안내가 뜬다", () => {
  render(<GemPurchaseScreen {...fixture()} />);

  fireEvent.tap(screen.getByTestId("ui-lynx-settings-cell"), {});

  expect(screen.getByTestId("gem-purchase-screen-notice")).toBeInTheDocument();
});

test("[GP5-2] 안내의 확인 → 안내만 닫히고 구매 화면은 남는다", () => {
  const props = fixture();
  render(<GemPurchaseScreen {...props} />);
  fireEvent.tap(payButton(), {});

  fireEvent.tap(
    within(screen.getByTestId("ui-lynx-dialog-action-close")).getByTestId("ui-lynx-button"),
    {},
  );

  expect(screen.queryByTestId("gem-purchase-screen-notice")).toBeNull();
  expect(screen.getByTestId("gem-purchase-screen-close")).toHaveAttribute(
    "accessibility-elements-hidden",
    "false",
  );
  expect(props.onClose).not.toHaveBeenCalled();
});

test("[GP6] 닫기 → onClose 1회", () => {
  const props = fixture();
  render(<GemPurchaseScreen {...props} />);

  const close = screen
    .getByTestId("gem-purchase-screen-close")
    .querySelector('[data-testid="ui-lynx-round-button"]') as Element;
  expect(close).toHaveAttribute("accessibility-label", "Close");
  fireEvent.tap(close, {});

  expect(props.onClose).toHaveBeenCalledTimes(1);
});

test("[AC4u-E] 결제 수단 묶음 이름 · 안내 제목 · 확인 버튼이 영어다", () => {
  render(<GemPurchaseScreen {...fixture()} />);

  expect(screen.getByTestId("ui-lynx-settings-group")).toHaveAttribute(
    "accessibility-label",
    "Payment method",
  );
  fireEvent.tap(payButton(), {});
  const notice = screen.getByTestId("gem-purchase-screen-notice");
  expect(within(notice).getByTestId("ui-lynx-dialog-title")).toHaveTextContent(
    "Payment coming soon",
  );
  expect(within(notice).getByTestId("ui-lynx-dialog-action-close")).toHaveTextContent("OK");
});

test("[AC4u-M] 닫기 · 잔액 · 팩 이름 · 결제 수단 이름이 문구표에서 온다", () => {
  const { container } = render(
    <UiCopyContext.Provider value={markedUiCopy}>
      <GemPurchaseScreen {...fixture()} />
    </UiCopyContext.Provider>,
  );

  const close = screen
    .getByTestId("gem-purchase-screen-close")
    .querySelector('[data-testid="ui-lynx-round-button"]') as Element;
  expect(close).toHaveAttribute("accessibility-label", "⟦common.close⟧");
  expect(
    screen.getByTestId("gem-purchase-screen-balance").getAttribute("accessibility-label"),
  ).toContain("⟦gemPurchase.balance⟧");
  const plusLabel = screen
    .getByTestId("gem-purchase-pack-plus")
    .getAttribute("accessibility-label");
  expect(plusLabel).toContain("⟦gemPurchase.packAmount⟧");
  const maxLabel = screen.getByTestId("gem-purchase-pack-max").getAttribute("accessibility-label");
  expect(maxLabel).toContain("⟦common.selected⟧");
  expect(screen.getByTestId("ui-lynx-settings-group")).toHaveAttribute(
    "accessibility-label",
    "⟦gemPurchase.paymentMethod⟧",
  );

  fireEvent.tap(payButton(), {});
  const notice = screen.getByTestId("gem-purchase-screen-notice");
  expect(within(notice).getByTestId("ui-lynx-dialog-title")).toHaveTextContent(
    "⟦gemPurchase.notice.title⟧",
  );
  expect(within(notice).getByTestId("ui-lynx-dialog-description")).toHaveTextContent(
    "⟦gemPurchase.notice.description⟧",
  );
  expect(within(notice).getByTestId("ui-lynx-dialog-action-close")).toHaveTextContent(
    "⟦common.ok⟧",
  );
  expect(container.textContent).not.toMatch(/[가-힣]/);
});
