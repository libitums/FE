import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { statChipBumpDurationMs } from "../components/StatChip";
import { AppHeader } from "./AppHeader";

// `ui` 계층: 머리 칩의 오름 재생 순서(ADR-0064). 레이어(연속 모달)가 덮고 있거나 곧 열릴 참이면 미루고, 닫힌 뒤
// 한 번 굴립니다 — 모달이 「4 day streak」을 말하고, 닫으면 칩이 3 → 4로 오릅니다.

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const base = { streakDays: 4, trophyCount: 2, onOpenNotifications: vi.fn(), todayWeekday: 1 };
const advance = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });
function closeModal(): void {
  const container = screen.getByTestId("journey-stat-modal-back");
  fireEvent.tap(container.querySelector('[data-testid="ui-lynx-round-button"]')!, {});
}

test("AHB1. 레이어가 없으면 표식이 선 칩만 바로 굴리고, 끝나면 그 칩을 알린다", () => {
  const onStatBumped = vi.fn();
  render(
    <AppHeader {...base} statBump={{ statBumps: { streak: null, trophy: 1 }, onStatBumped }} />,
  );

  advance(0);
  expect(screen.getByTestId("top-bar-trophy-roll")).toHaveTextContent("12");
  expect(screen.queryByTestId("top-bar-streak-roll")).not.toBeInTheDocument();
  advance(statChipBumpDurationMs.standard);
  expect(onStatBumped).toHaveBeenCalledWith("trophy");
  expect(onStatBumped).toHaveBeenCalledTimes(1);
});

test("AHB2. 연속 모달이 뜨는 동안은 옛 값으로 미루고, 닫으면 그때 굴린다", () => {
  const onStatBumped = vi.fn();
  const { rerender } = render(
    <AppHeader
      {...base}
      celebrateStreak={true}
      statBump={{ statBumps: { streak: 3, trophy: null }, onStatBumped }}
    />,
  );
  expect(screen.getByTestId("journey-stat-modal-streak")).toBeInTheDocument();
  // 축하를 알린 뒤 부모가 플래그를 내립니다. 모달은 그대로 떠 있습니다.
  rerender(
    <AppHeader {...base} statBump={{ statBumps: { streak: 3, trophy: null }, onStatBumped }} />,
  );

  advance(statChipBumpDurationMs.standard * 3);
  expect(screen.getByTestId("top-bar-streak")).toHaveTextContent("3");
  expect(onStatBumped).not.toHaveBeenCalled();

  closeModal();
  advance(0);
  expect(screen.getByTestId("top-bar-streak-roll")).toHaveTextContent("34");
  advance(statChipBumpDurationMs.standard);
  expect(onStatBumped).toHaveBeenCalledWith("streak");
});

test("AHB3. 화면 쪽 레이어가 덮고 있으면(obscured) 미룬다", () => {
  render(
    <AppHeader
      {...base}
      obscured={true}
      statBump={{ statBumps: { streak: 3, trophy: null }, onStatBumped: vi.fn() }}
    />,
  );

  advance(statChipBumpDurationMs.standard * 3);
  expect(screen.queryByTestId("top-bar-streak-roll")).not.toBeInTheDocument();
  expect(screen.getByTestId("top-bar-streak")).toHaveTextContent("3");
});
