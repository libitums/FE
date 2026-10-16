import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, render, screen } from "@lynx-js/react/testing-library";
import type { ReactNode } from "@lynx-js/react";

import { MotionProvider } from "@libitums/ui-lynx/motion";

import { StatChip, statChipBumpDurationMs } from "./StatChip";

// `ui` 계층: 지표 칩의 오름 재생(ADR-0064 — 시안 ①D). 재생 요소는 재생하는 동안만 서고, 타이머로 걷힙니다.

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const chip = (props: Partial<Parameters<typeof StatChip>[0]> = {}) => (
  <StatChip tone="streak" value={4} accessibilityLabel="연속 학습 4일" testId="chip" {...props} />
);
const reduced = (element: ReactNode) => <MotionProvider motion="reduced">{element}</MotionProvider>;
const advance = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });

test("SCB1. 표식이 없으면 재생 요소가 없고 지금 값만 보인다", () => {
  render(chip());

  expect(screen.getByTestId("chip")).toHaveTextContent("4");
  expect(screen.queryByTestId("chip-roll")).not.toBeInTheDocument();
  expect(screen.queryAllByTestId("chip-spark")).toHaveLength(0);
});

test("SCB2. 표식이 있으면 옛 값을 보이다가 굴리고(빛 · 알갱이 여섯), 끝나면 지금 값과 함께 알린다", () => {
  const onBumped = vi.fn();
  render(chip({ bumpFrom: 3, onBumped }));
  const node = screen.getByTestId("chip");

  // 이름은 처음부터 새 값입니다 — 굴림은 보이는 것만 늦춥니다.
  expect(node).toHaveAttribute("accessibility-label", "연속 학습 4일");
  expect(node).toHaveTextContent("3");

  advance(0);
  expect(screen.getByTestId("chip-roll")).toHaveTextContent("34");
  expect(screen.getByTestId("chip-sheen")).toBeInTheDocument();
  expect(screen.getAllByTestId("chip-spark")).toHaveLength(6);
  expect(onBumped).not.toHaveBeenCalled();

  advance(statChipBumpDurationMs.standard);
  expect(onBumped).toHaveBeenCalledTimes(1);
});

test("SCB3. 미루는 동안(bumpHeld)은 옛 값 그대로이고, 풀리면 그때 재생한다", () => {
  const onBumped = vi.fn();
  const { rerender } = render(chip({ bumpFrom: 3, bumpHeld: true, onBumped }));

  advance(statChipBumpDurationMs.standard * 3);
  expect(screen.getByTestId("chip")).toHaveTextContent("3");
  expect(screen.queryByTestId("chip-roll")).not.toBeInTheDocument();
  expect(onBumped).not.toHaveBeenCalled();

  rerender(chip({ bumpFrom: 3, bumpHeld: false, onBumped }));
  advance(0);
  expect(screen.getByTestId("chip-roll")).toBeInTheDocument();
  advance(statChipBumpDurationMs.standard);
  expect(onBumped).toHaveBeenCalledTimes(1);
});

test("SCB4. 기다림(bumpDelayMs)이 지나야 굴리기 시작한다", () => {
  render(chip({ bumpFrom: 3, bumpDelayMs: 600 }));

  advance(599);
  expect(screen.queryByTestId("chip-roll")).not.toBeInTheDocument();
  advance(1);
  expect(screen.getByTestId("chip-roll")).toBeInTheDocument();
});

test("SCB5. 표식이 지금 값보다 작지 않으면 굴리지 않고 바로 지운다", () => {
  const onBumped = vi.fn();
  render(chip({ bumpFrom: 4, onBumped }));

  expect(onBumped).toHaveBeenCalledTimes(1);
  expect(screen.getByTestId("chip")).toHaveTextContent("4");
});

test("SCB6. 움직임 줄이기에서는 굴림 · 빛 · 알갱이 없이 숫자만 페이드로 바뀐다", () => {
  const onBumped = vi.fn();
  render(reduced(chip({ bumpFrom: 3, onBumped })));

  advance(0);
  expect(screen.queryByTestId("chip-roll")).not.toBeInTheDocument();
  expect(screen.queryByTestId("chip-sheen")).not.toBeInTheDocument();
  expect(screen.queryAllByTestId("chip-spark")).toHaveLength(0);
  const value = screen.getByTestId("chip").querySelector(".stat-chip-value-fade");
  expect(value).toHaveTextContent("4");

  advance(statChipBumpDurationMs.reduced);
  expect(onBumped).toHaveBeenCalledTimes(1);
});
