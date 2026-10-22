import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, render, screen } from "@lynx-js/react/testing-library";
import type { ReactNode } from "@lynx-js/react";

import { MotionProvider } from "@libitums/ui-lynx/motion";

import { StatChip, statChipDropDurationMs } from "./StatChip";
import { TopBar } from "./TopBar";

// `ui` 계층: 학습 티켓 칩의 줄어듦 재생(시안 E4). 사용자가 새 레슨을 시작한 순간 바로 한 번 재생하고, 끝나면
// 알립니다 — 부르는 쪽이 그때 학습을 엽니다.

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const chip = (props: Partial<Parameters<typeof StatChip>[0]> = {}) => (
  <StatChip tone="ticket" value={2} accessibilityLabel="2 tickets left" testId="chip" {...props} />
);
const reduced = (element: ReactNode) => <MotionProvider motion="reduced">{element}</MotionProvider>;
const advance = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });

test("SD1. 줄기 전 값이 있으면 바로 3 → 2로 굴리고 −1을 떨어뜨리며, 끝나면 지금 값과 함께 알린다", () => {
  const onDropped = vi.fn();
  render(chip({ dropFrom: 3, onDropped }));

  advance(0);
  expect(screen.getByTestId("chip-drop")).toHaveTextContent("32");
  const minus = screen.getByTestId("chip-minus");
  expect(minus).toHaveTextContent("−1");
  expect(minus).toHaveAttribute("accessibility-element", "false");
  expect(screen.getByTestId("chip")).toHaveClass("stat-chip-drop");
  expect(onDropped).not.toHaveBeenCalled();

  advance(statChipDropDurationMs.standard);
  expect(onDropped).toHaveBeenCalledTimes(1);
  expect(screen.queryByTestId("chip-drop")).not.toBeInTheDocument();
  expect(screen.queryByTestId("chip-minus")).not.toBeInTheDocument();
  expect(screen.getByTestId("chip")).toHaveTextContent("2");
});

test("SD2. 움직임 줄이기에서는 숫자 페이드만 하고, 그 길이 뒤에 알린다", () => {
  const onDropped = vi.fn();
  render(reduced(chip({ dropFrom: 3, onDropped })));

  advance(0);
  expect(screen.queryByTestId("chip-drop")).not.toBeInTheDocument();
  expect(screen.queryByTestId("chip-minus")).not.toBeInTheDocument();
  expect(screen.getByTestId("chip")).not.toHaveClass("stat-chip-drop");
  expect(screen.getByTestId("chip").querySelector(".stat-chip-value-fade")).toHaveTextContent("2");

  advance(statChipDropDurationMs.reduced);
  expect(onDropped).toHaveBeenCalledTimes(1);
});

test("SD3. 줄기 전 값이 지금 값보다 크지 않으면 굴리지 않고 바로 알린다", () => {
  const onDropped = vi.fn();
  render(chip({ dropFrom: 2, onDropped }));

  expect(onDropped).toHaveBeenCalledTimes(1);
  expect(screen.queryByTestId("chip-drop")).not.toBeInTheDocument();
  expect(screen.getByTestId("chip")).toHaveTextContent("2");
});

test("SD4. 이름은 처음부터 새 값이고, 오름 미룸(bumpHeld)과 상관없이 재생한다", () => {
  render(chip({ dropFrom: 3, bumpHeld: true }));

  expect(screen.getByTestId("chip")).toHaveAttribute("accessibility-label", "2 tickets left");
  advance(0);
  expect(screen.getByTestId("chip-drop")).toBeInTheDocument();
});

test("SD5. 상단 줄은 티켓 칩에 줄기 전 값을 넘기고, 끝나면 알린다", () => {
  const onTicketDropped = vi.fn();
  render(
    <TopBar
      streakDays={1}
      trophyCount={0}
      onOpenNotifications={vi.fn()}
      ticketCount={2}
      ticketDropFrom={3}
      onTicketDropped={onTicketDropped}
    />,
  );

  advance(0);
  expect(screen.getByTestId("top-bar-tickets-drop")).toHaveTextContent("32");
  advance(statChipDropDurationMs.standard);
  expect(onTicketDropped).toHaveBeenCalledTimes(1);
});

test("SD6. 한 번 줄어든 뒤 표식이 거둬지고 다시 쓰면, 옛 값에서 다시 굴린다", () => {
  const { rerender } = render(chip({ dropFrom: 3 }));
  advance(statChipDropDurationMs.standard);
  rerender(chip({ dropFrom: null }));
  advance(0);

  // 재생 전 첫 그림이 새 값(1)이면 깜빡임입니다. 테스트 렌더러는 effect까지 한 번에 비워 그 한 프레임을 볼 수
  // 없어, 여기서는 다시 굴리는 것만 봅니다(깜빡임은 표식이 거둬질 때 `waiting`으로 되돌려 막습니다).
  rerender(chip({ value: 1, dropFrom: 2 }));
  advance(0);
  expect(screen.getByTestId("chip-drop")).toHaveTextContent("21");
});
