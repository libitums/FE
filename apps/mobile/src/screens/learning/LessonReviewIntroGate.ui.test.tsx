import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { backHandlers } from "../../lib/back-handler";

import { LessonReviewIntroGate } from "./LessonReviewIntroGate";
import { lessonReviewBadgeGoneAtMs } from "./LessonReviewBadge";

// `ui` 계층: 다시 도전 시작 게이트(ADR-0058 ⟨2026-10-30⟩) — 문항보다 알약이 먼저 재생되고, 다 걷히거나 화면을 누르면
// 문항 화면이 섭니다. 첫 화면이 아니면 게이트가 없습니다.

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  if (backHandlers.runTop()) throw new Error("뒤로가기 핸들러가 정리되지 않았습니다");
});

const question = <view data-testid="fixture-question" />;

test("RG1. 첫 화면이면 알약만 서고 문항은 아직 없다 — 다 재생하면 문항이 선다", () => {
  vi.useFakeTimers();
  render(<LessonReviewIntroGate count={3}>{question}</LessonReviewIntroGate>);
  expect(screen.getByTestId("lesson-review-badge")).toHaveTextContent("Let\u2019s fix 3 mistakes");
  expect(screen.queryByTestId("fixture-question")).not.toBeInTheDocument();
  act(() => {
    vi.advanceTimersByTime(lessonReviewBadgeGoneAtMs);
  });
  expect(screen.queryByTestId("lesson-review-gate")).not.toBeInTheDocument();
  expect(screen.getByTestId("fixture-question")).toBeInTheDocument();
});

test("RG2. 화면을 누르면 기다리지 않고 바로 문항이 선다", () => {
  render(<LessonReviewIntroGate count={1}>{question}</LessonReviewIntroGate>);
  expect(screen.getByTestId("lesson-review-badge")).toHaveTextContent("Let\u2019s fix 1 mistake");
  fireEvent.tap(screen.getByTestId("lesson-review-gate"), {});
  expect(screen.getByTestId("fixture-question")).toBeInTheDocument();
});

test("RG3. 첫 화면이 아니면(count null) 게이트 없이 곧바로 문항이다", () => {
  render(<LessonReviewIntroGate count={null}>{question}</LessonReviewIntroGate>);
  expect(screen.queryByTestId("lesson-review-gate")).not.toBeInTheDocument();
  expect(screen.getByTestId("fixture-question")).toBeInTheDocument();
});

test("RG4. 게이트 동안 시스템 뒤로는 건너뛰기다 — 앱을 내리지 않고 문항이 선다", () => {
  render(<LessonReviewIntroGate count={2}>{question}</LessonReviewIntroGate>);
  let handled = false;
  act(() => {
    handled = backHandlers.runTop();
  });
  expect(handled).toBe(true);
  expect(screen.getByTestId("fixture-question")).toBeInTheDocument();
});

test("RG5. 게이트는 알약과 같은 낭독 이름을 가진 버튼이다", () => {
  render(<LessonReviewIntroGate count={2}>{question}</LessonReviewIntroGate>);
  const gate = screen.getByTestId("lesson-review-gate");
  expect(gate).toHaveAttribute("accessibility-label", "Let\u2019s fix 2 mistakes");
  expect(gate).toHaveAttribute("accessibility-traits", "button");
});
