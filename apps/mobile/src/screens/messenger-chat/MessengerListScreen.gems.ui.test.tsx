import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import {
  clearBackHandlers,
  fixtureRoom,
  makeSource,
  seedOf,
  systemBack,
} from "./chat-ui.test-support";
import { messengerListTestIds as ids } from "./messenger-chat.contract";
import { MessengerListScreen } from "./MessengerListScreen";

// `ui` 계층(MC-UI10): 목록 머리의 젬 칩 — 값 = 앱 잔액 · 탭 → 엽전 상점 · onLayerChange(true) ·
// 닫기 / 시스템 뒤로 → 닫힘 · onLayerChange(false).

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  cleanup();
  clearBackHandlers();
  vi.useRealTimers();
});

function mount(gemBalance = 120) {
  const handlers = {
    onOpenRoom: vi.fn<(id: string) => void>(),
    onGoToJourney: vi.fn<() => void>(),
    onLayerChange: vi.fn<(open: boolean) => void>(),
  };
  render(
    <MessengerListScreen
      source={makeSource(seedOf(fixtureRoom("mina")))}
      gemBalance={gemBalance}
      {...handlers}
    />,
  );
  return handlers;
}

test("MC-UI10. 젬 칩의 값은 앱이 준 잔액이고 낭독은 잔액 + get more이다", () => {
  mount(120);

  const chip = screen.getByTestId(ids.gem);
  expect(chip.textContent).toContain("120");
  expect(chip.getAttribute("accessibility-label")).toBe("120 coins, get more");
  expect(chip.getAttribute("accessibility-traits")).toBe("button");
});

test("MC-UI10. 잔액이 0이어도 칩은 0을 보인다", () => {
  mount(0);

  expect(screen.getByTestId(ids.gem).textContent).toContain("0");
});

test("MC-UI10. 칩을 탭하면 엽전 상점이 열리고 onLayerChange(true)가 한 번 불린다", () => {
  const { onLayerChange } = mount(120);
  expect(screen.queryByTestId("coin-shop-screen")).toBeNull();

  fireEvent.tap(screen.getByTestId(ids.gem), {});

  expect(screen.getByTestId("coin-shop-screen")).toBeTruthy();
  expect(onLayerChange).toHaveBeenCalledTimes(1);
  expect(onLayerChange).toHaveBeenLastCalledWith(true);
});

test("MC-UI10. 엽전 상점의 닫기 단추가 닫고 onLayerChange(false)를 부른다", () => {
  const { onLayerChange } = mount(120);
  fireEvent.tap(screen.getByTestId(ids.gem), {});

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
  fireEvent.tap(screen.getByTestId(ids.gem), {});

  const handled = systemBack();

  expect(handled).toBe(true);
  expect(screen.queryByTestId("coin-shop-screen")).toBeNull();
  expect(onLayerChange).toHaveBeenLastCalledWith(false);
});

test("MC-UI10. 엽전 상점이 열려도 목록은 그대로 남는다", () => {
  mount(120);
  fireEvent.tap(screen.getByTestId(ids.gem), {});

  expect(screen.getByTestId(ids.screen)).toBeTruthy();
  expect(screen.getByTestId(ids.row("mina"))).toBeTruthy();
});
