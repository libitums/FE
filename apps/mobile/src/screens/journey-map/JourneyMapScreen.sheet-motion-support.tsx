import { expect, vi } from "vitest";
import { act, fireEvent, screen } from "@lynx-js/react/testing-library";

import { nodeSelector, unitSelector } from "./JourneyMapScreen.autoscroll-support";
import type { HostStub } from "./JourneyMapScreen.test-support";
import { sheetEntranceClasses } from "./journey-map-sheet-motion";

// 말풍선 등장 모션 화면 ui 테스트 둘이 함께 쓰는 도우미입니다. 대역 호스트 표는 자동 스크롤 ui의 표를 그대로 씁니다 —
// 노드 `R(700, 100)`이면 목적지 290, `R(5410, 100)`이면 5000입니다.

/** 튜토리얼 `ordering` 노드(와 그 유닛 상자)를 `top`에 둡니다. */
export function placeOrdering(host: HostStub, top: number): void {
  const rect = { top, height: 100 };
  host.rects[unitSelector] = rect;
  host.rects[nodeSelector] = rect;
}

export function tapOrdering(): void {
  act(() => {
    fireEvent.tap(screen.getByTestId("ui-lynx-learning-unit-ordering"), { detail: { y: 300 } });
  });
}

export function advance(ms: number): void {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

export const sheetPop = (): HTMLElement => screen.getByTestId("step-sheet-pop");
export const bandWrapper = (): HTMLElement | null =>
  screen.getByTestId("ui-lynx-episode-header").parentElement;
export const nodePop = (): HTMLElement | null =>
  screen.getByTestId("ui-lynx-learning-unit-ordering").parentElement;
export const burstCount = (): number =>
  document.querySelectorAll(".journey-step-node-burst").length;

/** 말풍선 · 띠 · 열린 노드의 튕김이 `entrance` 종류의 묶음대로 서 있는지 봅니다. */
export function expectEntrance(entrance: "awaiting" | "expressive"): void {
  const classes = sheetEntranceClasses(entrance);
  expect(sheetPop().getAttribute("class")).toBe(classes.bubble);
  expect(bandWrapper()?.getAttribute("class")).toBe(classes.band);
  expect(nodePop()?.getAttribute("class")).toBe(
    "journey-step-node-pop journey-step-node-pop-enter",
  );
  if (classes.bubbleInteractive) {
    expect(sheetPop()).not.toHaveAttribute("user-interaction-enabled");
  } else {
    expect(sheetPop()).toHaveAttribute("user-interaction-enabled", "false");
  }
  expect(burstCount()).toBe(entrance === "expressive" ? 1 : 0);
}

/** 말풍선 · 띠 · 열린 노드의 등장 표시가 모두 걷혔는지 봅니다. */
export function expectNothingEntering(): void {
  expect(screen.queryByTestId("step-sheet-pop")).not.toBeInTheDocument();
  expect(screen.queryByTestId("ui-lynx-episode-header")).not.toBeInTheDocument();
  expect(document.querySelectorAll(".journey-step-node-pop-enter")).toHaveLength(0);
  expect(burstCount()).toBe(0);
}
