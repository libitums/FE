import { expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { TopBar } from "./TopBar";

// `ui` 계층: 지도 상단 바의 엽전 칩(ADR-0116).

test("TB-C1. 보유 엽전을 넘기면 티켓 다음에 엽전 칩이 서고, 상점을 넘기지 않으면 읽기 전용이며 이름은 「N coins」다", () => {
  render(
    <TopBar
      streakDays={3}
      trophyCount={1}
      ticketCount={2}
      coinCount={120}
      onOpenNotifications={vi.fn()}
    />,
  );

  const coins = screen.getByTestId("top-bar-coins");
  expect(coins).toHaveTextContent("120");
  expect(coins).toHaveAttribute("accessibility-label", "120 coins");
  expect(coins).not.toHaveAttribute("accessibility-traits");
  expect(screen.queryByTestId("top-bar-coins-plus")).toBeNull();
  const ids = Array.from(document.querySelectorAll("[data-testid^='top-bar-']"))
    .map((node) => node.getAttribute("data-testid"))
    .filter((id) => id === "top-bar-tickets" || id === "top-bar-coins");
  expect(ids).toEqual(["top-bar-tickets", "top-bar-coins"]);
});

test("TB-C2. null(불러오는 중)이거나 넘기지 않으면 엽전 칩이 없다", () => {
  const { unmount } = render(
    <TopBar streakDays={3} trophyCount={1} coinCount={null} onOpenNotifications={vi.fn()} />,
  );
  expect(screen.queryByTestId("top-bar-coins")).toBeNull();
  unmount();
  render(<TopBar streakDays={3} trophyCount={1} onOpenNotifications={vi.fn()} />);
  expect(screen.queryByTestId("top-bar-coins")).toBeNull();
});

test("TB-C3. 엽전 칩이 서면 칩 줄이 조밀해진다(칩 넷 + 알림이 360 폭에 들게) — 없으면 그대로다", () => {
  const { unmount } = render(
    <TopBar
      streakDays={3}
      trophyCount={1}
      ticketCount={2}
      coinCount={120}
      onOpenNotifications={vi.fn()}
    />,
  );
  const stats = () => document.querySelector(".top-bar-stats");
  expect(stats()?.getAttribute("class")).toBe("top-bar-stats top-bar-stats-compact");
  unmount();
  render(<TopBar streakDays={3} trophyCount={1} ticketCount={2} onOpenNotifications={vi.fn()} />);
  expect(stats()?.getAttribute("class")).toBe("top-bar-stats");
});

test("TB-C4. 상점을 열 수 있으면 엽전 칩이 「+」를 단 버튼이 되고, 누르면 상점을 연다", () => {
  const onOpenCoins = vi.fn();
  render(
    <TopBar
      streakDays={3}
      trophyCount={1}
      coinCount={120}
      onOpenCoins={onOpenCoins}
      onOpenNotifications={vi.fn()}
    />,
  );

  const coins = screen.getByTestId("top-bar-coins");
  expect(coins).toHaveAttribute("accessibility-traits", "button");
  expect(coins).toHaveAttribute("accessibility-label", "120 coins, get more");
  expect(screen.getByTestId("top-bar-coins-plus")).toHaveAttribute(
    "accessibility-elements-hidden",
    "true",
  );

  fireEvent.tap(coins, {});
  expect(onOpenCoins).toHaveBeenCalledTimes(1);
});
