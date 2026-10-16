import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, render, screen } from "@lynx-js/react/testing-library";
import type { ReactNode } from "@lynx-js/react";
import { MotionProvider } from "@libitums/ui-lynx/motion";

import { LessonCompleteScreen } from "./LessonCompleteScreen";
import { lessonRewardPlaceholder } from "./lesson-complete";
import {
  lessonCompleteChipBumpDelayMs,
  lessonCompleteConfettiCount,
} from "./lesson-complete-reward";

// `ui` 계층: 학습 완료 화면의 폭죽 · 글 올라옴 · 칩 순서(ADR-0064 — 시안 ③ 「배지 뒤에」 · ④A 「사방 폭죽」).
// 곡선 · 첫 프레임은 e2e가 봅니다. 여기서는 어느 요소에 어떤 클래스가 서는가와 칩이 언제 굴리는가입니다.

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("NativeModules", {
    LynxAccessibilityModule: {
      accessibilityAnnounce: (_args: unknown, callback: (result: unknown) => void) =>
        callback("announced"),
    },
  });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function screenWith(overrides: Partial<Parameters<typeof LessonCompleteScreen>[0]> = {}) {
  return (
    <LessonCompleteScreen
      results={["correct"]}
      skippedCount={0}
      verdict="passed"
      streakDays={4}
      trophyCount={2}
      reward={lessonRewardPlaceholder}
      onExit={vi.fn()}
      {...overrides}
    />
  );
}
const reduced = (element: ReactNode) => <MotionProvider motion="reduced">{element}</MotionProvider>;
const confetti = () => screen.queryByTestId("lesson-complete-screen-confetti");
const summaryClass = (container: Element) =>
  container.querySelector(".lesson-complete-screen-summary")?.getAttribute("class") ?? "";

test("LCM1. 통과하면 배지 뒤에서 폭죽 조각 28개가 서고, 낭독에서 빠진다", () => {
  render(screenWith());

  const layer = confetti();
  expect(layer).toBeInTheDocument();
  expect(layer).toHaveAttribute("accessibility-elements-hidden", "true");
  expect(layer?.querySelectorAll(".lesson-complete-confetti-piece")).toHaveLength(
    lessonCompleteConfettiCount,
  );
  // 배지보다 먼저 그려 배지가 조각을 덮습니다.
  const badge = document.querySelector(".lesson-complete-screen-badge") as Element;
  expect(layer!.compareDocumentPosition(badge) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});

test("LCM2. 미통과 · 움직임 줄이기에는 폭죽이 없다", () => {
  render(screenWith({ verdict: "failed", onRetry: vi.fn() }));
  expect(confetti()).not.toBeInTheDocument();
  cleanup();

  render(reduced(screenWith()));
  expect(confetti()).not.toBeInTheDocument();
});

test("LCM3. 제목 묶음은 통과면 올라오고, 줄이기면 페이드, 미통과면 움직이지 않는다", () => {
  const passed = render(screenWith());
  expect(summaryClass(passed.container)).toBe(
    "lesson-complete-screen-summary lesson-complete-screen-rise lesson-complete-screen-rise-summary",
  );
  cleanup();

  const soft = render(reduced(screenWith()));
  expect(summaryClass(soft.container)).toBe(
    "lesson-complete-screen-summary lesson-complete-screen-rise-fade",
  );
  cleanup();

  const failed = render(screenWith({ verdict: "failed", onRetry: vi.fn() }));
  expect(summaryClass(failed.container)).toBe("lesson-complete-screen-summary");
});

test("LCM4. 머리 칩은 배지가 자리 잡은 뒤에 굴리고, 끝나면 그 칩을 알린다", () => {
  const onStatBumped = vi.fn();
  render(screenWith({ statBumps: { streak: 3, trophy: null }, onStatBumped }));
  const delay = lessonCompleteChipBumpDelayMs("expressive");

  expect(screen.getByTestId("lesson-complete-screen-streak")).toHaveTextContent("3");
  act(() => {
    vi.advanceTimersByTime(delay - 1);
  });
  expect(screen.queryByTestId("lesson-complete-screen-streak-roll")).not.toBeInTheDocument();
  act(() => {
    vi.advanceTimersByTime(1);
  });
  expect(screen.getByTestId("lesson-complete-screen-streak-roll")).toHaveTextContent("34");
  // 트로피는 표식이 없어 그대로입니다.
  expect(screen.queryByTestId("lesson-complete-screen-trophy-roll")).not.toBeInTheDocument();

  act(() => {
    vi.advanceTimersByTime(1_000);
  });
  expect(onStatBumped).toHaveBeenCalledWith("streak");
  expect(onStatBumped).toHaveBeenCalledTimes(1);
});
