import { expect, vi } from "vitest";
import { act, fireEvent, screen } from "@lynx-js/react/testing-library";

import { unitSelector } from "./JourneyMapScreen.autoscroll-support";
import type { HostStub } from "./JourneyMapScreen.test-support";
import { sheetEntranceClasses } from "./journey-map-sheet-motion";

// 말풍선 등장 모션 화면 ui 테스트 둘이 함께 쓰는 도우미입니다. 대역 호스트 표는 자동 스크롤 ui의 표를 그대로 씁니다 —
// 누르는 유닛은 카탈로그 첫 구획(u01)의 레슨 S4이고, 셀 `R(700, 100)`이면 목적지 290, `R(5410, 100)`이면 5000입니다.

const targetTestId = "ui-lynx-learning-unit-catalog-unit-u01-water-S4";

/** 누를 유닛(u01 S4)의 셀을 `top`에 둡니다 — 자동 스크롤과 말풍선이 같은 셀을 잽니다. */
export function placeTarget(host: HostStub, top: number): void {
  host.rects[unitSelector] = { top, height: 100 };
}

export function tapTarget(): void {
  act(() => {
    fireEvent.tap(screen.getByTestId(targetTestId), { detail: { y: 300 } });
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
export const nodePop = (): HTMLElement | null => screen.getByTestId(targetTestId).parentElement;
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
  // 대기 중에도 말풍선은 탭을 받습니다 — Lynx는 끈 요소의 탭을 형제(가림막)로 넘기지 않아(ADR-0055 D6) 말풍선이 직접 닫습니다.
  expect(sheetPop()).not.toHaveAttribute("user-interaction-enabled");
  expect(burstCount()).toBe(entrance === "expressive" ? 1 : 0);
}

/** 말풍선 · 띠 · 열린 노드의 등장 표시가 모두 걷혔는지 봅니다. */
export function expectNothingEntering(): void {
  expect(screen.queryByTestId("step-sheet-pop")).not.toBeInTheDocument();
  expect(screen.queryByTestId("ui-lynx-episode-header")).not.toBeInTheDocument();
  expect(document.querySelectorAll(".journey-step-node-pop-enter")).toHaveLength(0);
  expect(burstCount()).toBe(0);
}
