import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import {
  clearBackHandlers,
  fixtureRoom,
  makeSource,
  seedOf,
  systemBack,
} from "./chat-ui.test-support";
import { createCoinWallet } from "./coin-wallet";
import { messengerListTestIds as ids } from "./messenger-chat.contract";
import { MessengerListScreen } from "./MessengerListScreen";

// `ui` 계층(MC-UI10 · MC2-UI11): 목록 머리의 엽전 칩 — 값 = 지갑 잔액(쓰면 다시 그림) · 탭 → 엽전 상점 · onLayerChange(true) ·
// 닫기 / 시스템 뒤로 → 닫힘 · onLayerChange(false). 화면 props는 spec §7.2의 `wallet`(옛 coinBalance 대체).

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  cleanup();
  clearBackHandlers();
  vi.useRealTimers();
});

function mount(coinBalance = 120) {
  const handlers = {
    onOpenRoom: vi.fn<(id: string) => void>(),
    onGoToJourney: vi.fn<() => void>(),
    onLayerChange: vi.fn<(open: boolean) => void>(),
    notice: null,
    onNoticeShown: vi.fn<() => void>(),
  };
  const wallet = createCoinWallet({ earned: coinBalance });
  // 옛 coinBalance와 새 wallet이 한 객체에 함께 든다(스프레드라 어느 쪽 props 모양이든 받는다).
  const props = {
    source: makeSource(seedOf(fixtureRoom("mina"))),
    coinBalance,
    wallet,
    ...handlers,
  };
  render(<MessengerListScreen {...props} />);
  return { ...handlers, wallet };
}

test("MC-UI10. 엽전 칩의 값은 앱이 준 잔액이고 낭독은 잔액 + get more이다", () => {
  mount(120);

  const chip = screen.getByTestId(ids.coins);
  expect(chip.textContent).toContain("120");
  expect(chip.getAttribute("accessibility-label")).toBe("120 coins, get more");
  expect(chip.getAttribute("accessibility-traits")).toBe("button");
});

test("MC-UI10. 잔액이 0이어도 칩은 0을 보인다", () => {
  mount(0);

  expect(screen.getByTestId(ids.coins).textContent).toContain("0");
});

test("MC-UI10. 칩을 탭하면 엽전 상점이 열리고 onLayerChange(true)가 한 번 불린다", () => {
  const { onLayerChange } = mount(120);
  expect(screen.queryByTestId("coin-shop-screen")).toBeNull();

  fireEvent.tap(screen.getByTestId(ids.coins), {});

  expect(screen.getByTestId("coin-shop-screen")).toBeTruthy();
  expect(onLayerChange).toHaveBeenCalledTimes(1);
  expect(onLayerChange).toHaveBeenLastCalledWith(true);
});

test("MC-UI10. 엽전 상점의 닫기 단추가 닫고 onLayerChange(false)를 부른다", () => {
  const { onLayerChange } = mount(120);
  fireEvent.tap(screen.getByTestId(ids.coins), {});

  fireEvent.tap(
    within(screen.getByTestId("coin-shop-screen-close")).getByTestId("ui-lynx-round-button"),
    {},
  );

  expect(screen.queryByTestId("coin-shop-screen")).toBeNull();
  expect(onLayerChange).toHaveBeenLastCalledWith(false);
  expect(onLayerChange).toHaveBeenCalledTimes(2);
});

test("MC-UI10. 시스템 뒤로가기도 엽전 상점을 닫고 onLayerChange(false)를 부른다", () => {
  const { onLayerChange } = mount(120);
  fireEvent.tap(screen.getByTestId(ids.coins), {});

  const handled = systemBack();

  expect(handled).toBe(true);
  expect(screen.queryByTestId("coin-shop-screen")).toBeNull();
  expect(onLayerChange).toHaveBeenLastCalledWith(false);
});

test("MC-UI10. 엽전 상점이 열려도 목록은 그대로 남는다", () => {
  mount(120);
  fireEvent.tap(screen.getByTestId(ids.coins), {});

  expect(screen.getByTestId(ids.screen)).toBeTruthy();
  expect(screen.getByTestId(ids.row("mina"))).toBeTruthy();
});

test("MC2-UI11. 지갑에서 엽전을 쓰면 칩 값과 낭독이 새 잔액으로 다시 그려진다", () => {
  const { wallet } = mount(120);
  expect(screen.getByTestId(ids.coins).textContent).toContain("120");

  act(() => {
    wallet.spend(60, "photo");
  });

  const chip = screen.getByTestId(ids.coins);
  expect(chip.textContent).toContain("60");
  expect(chip.textContent).not.toContain("120");
  expect(chip.getAttribute("accessibility-label")).toBe("60 coins, get more");
});

test("MC2-UI11. 번 엽전이 바뀌어도(syncEarned) 칩이 따라간다", () => {
  const { wallet } = mount(120);

  act(() => {
    wallet.syncEarned(150);
  });

  expect(screen.getByTestId(ids.coins).textContent).toContain("150");
});
