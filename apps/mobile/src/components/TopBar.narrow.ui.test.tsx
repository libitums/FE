import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@lynx-js/react/testing-library";

import { noStatBumps } from "../lib/stat-bump";
import { TopBar } from "./TopBar";

// `ui` 계층: 상단 바 칩 표시 규칙(ADR-0116 개정 2026-11-10) — 999+ · 360 미만 폭에서 엽전 「+」 없음.

type SystemInfoScope = {
  SystemInfo?: { pixelWidth: number; pixelRatio: number; pixelHeight: number };
};
const scope = globalThis as unknown as SystemInfoScope;
const previous = scope.SystemInfo;

afterEach(() => {
  cleanup();
  scope.SystemInfo = previous;
});

const mount = (props: { coinCount?: number; streakDays?: number; trophyCount?: number }) =>
  render(
    <TopBar
      streakDays={props.streakDays ?? 3}
      trophyCount={props.trophyCount ?? 1}
      ticketCount={2}
      coinCount={props.coinCount ?? 120}
      onOpenNotifications={vi.fn()}
      onOpenCoins={vi.fn()}
    />,
  );

test("TB-N1. 999를 넘는 수는 칩에 999+로 보이고, 이름은 실제 수를 읽는다", () => {
  mount({ coinCount: 1800, streakDays: 1200, trophyCount: 1000 });

  expect(screen.getByTestId("top-bar-coins")).toHaveTextContent("999+");
  expect(screen.getByTestId("top-bar-coins").getAttribute("accessibility-label")).toContain("1800");
  expect(screen.getByTestId("top-bar-streak")).toHaveTextContent("999+");
  expect(screen.getByTestId("top-bar-trophy")).toHaveTextContent("999+");
});

test("TB-N2. 360 미만 폭(340)에서는 엽전 칩에 「+」가 없고, 칩은 여전히 상점을 여는 버튼이다", () => {
  scope.SystemInfo = { pixelWidth: 1020, pixelRatio: 3, pixelHeight: 2200 };
  mount({});

  expect(screen.queryByTestId("top-bar-coins-plus")).toBeNull();
  expect(screen.getByTestId("top-bar-coins")).toHaveAttribute("accessibility-traits", "button");
});

test("TB-N3. 360 폭에서는 「+」가 있다", () => {
  scope.SystemInfo = { pixelWidth: 1080, pixelRatio: 3, pixelHeight: 2340 };
  mount({});

  expect(screen.getByTestId("top-bar-coins-plus")).not.toBeNull();
});

test("TB-N4. 오르는 움직임 중에도 999를 넘는 수는 999+로 보인다(연속 1000 → 1001)", () => {
  render(
    <TopBar
      streakDays={1001}
      trophyCount={1}
      ticketCount={2}
      coinCount={120}
      bumps={{ ...noStatBumps, streak: 1000 }}
      onOpenNotifications={vi.fn()}
      onOpenCoins={vi.fn()}
    />,
  );

  expect(screen.getByTestId("top-bar-streak").textContent ?? "").not.toMatch(/100\d/);
});

const statsClass = () => document.querySelector(".top-bar-stats")?.getAttribute("class");

test("TB-N5. 340 미만 폭(320)에서는 칩 줄이 촘촘하다(top-bar-stats-dense)", () => {
  scope.SystemInfo = { pixelWidth: 960, pixelRatio: 3, pixelHeight: 2079 };
  mount({});

  expect(statsClass()).toBe("top-bar-stats top-bar-stats-compact top-bar-stats-dense");
});

test("TB-N6. 340 폭에서는 촘촘하지 않다 — compact 그대로", () => {
  scope.SystemInfo = { pixelWidth: 1020, pixelRatio: 3, pixelHeight: 2200 };
  mount({});

  expect(statsClass()).toBe("top-bar-stats top-bar-stats-compact");
});
