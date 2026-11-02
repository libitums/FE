import { afterEach, expect, test, vi } from "vitest";
import { render, screen, within } from "@lynx-js/react/testing-library";

import { LessonCompleteScreen } from "./LessonCompleteScreen";
import { lessonRewardPlaceholder } from "./lesson-complete";
import type { LessonCompleteScreenProps } from "./lesson-complete-screen-props";

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubAnnounce(): string[] {
  const contents: string[] = [];
  vi.stubGlobal("NativeModules", {
    LynxAccessibilityModule: {
      accessibilityAnnounce: (args: { content: string }, callback: (result: unknown) => void) => {
        contents.push(args.content);
        callback("announced");
      },
    },
  });
  return contents;
}

// `ui` 계층: 틀린 문제를 다시 풀고 온 결과 화면(ADR-0058 ⟨2026-10-30⟩, 시안 F6 · F7) — 제목 · 고친 수 줄 · 점 줄 ·
// 모자란 수 줄을 봅니다. 요약이 없으면 지금 결과 화면 그대로입니다.

function fixture(overrides: Partial<LessonCompleteScreenProps> = {}): LessonCompleteScreenProps {
  return {
    results: ["correct", "correct", "correct", "correct", "correct", "incorrect", "correct"],
    skippedCount: 0,
    verdict: "passed",
    streakDays: 4,
    trophyCount: 12,
    reward: lessonRewardPlaceholder,
    onExit: vi.fn(),
    onRetry: vi.fn(),
    ...overrides,
  };
}

test("LCR1. 다시 풀어 통과하면 LESSON COMPLETE! · YOU FIXED 2 OF 3 · 점 줄(푼 순서) · 보상이 선다", () => {
  render(
    <LessonCompleteScreen
      {...fixture({ review: { outcomes: ["fixed", "missed", "fixed"], remainingToPass: 0 } })}
    />,
  );
  expect(screen.getByTestId("lesson-complete-screen-title")).toHaveTextContent("LESSON COMPLETE!");
  expect(screen.getByTestId("lesson-complete-screen-subtitle")).toHaveTextContent(
    "YOU FIXED 2 OF 3 MISTAKES",
  );
  const dots = screen.getByTestId("lesson-complete-review-dots");
  expect(dots).toHaveAttribute("accessibility-label", "Fixed 2 of 3 mistakes");
  expect(
    within(dots)
      .getAllByTestId("lesson-complete-review-dot")
      .map((dot) => dot.getAttribute("data-outcome")),
  ).toEqual(["fixed", "missed", "fixed"]);
  expect(screen.queryByTestId("lesson-complete-review-needed")).not.toBeInTheDocument();
  expect(screen.getByTestId("lesson-complete-screen-reward-diamond")).toBeInTheDocument();
});

test("LCR2. 다 고쳐 실수가 없어도 만점(PERFECT) 제목은 아니다", () => {
  render(
    <LessonCompleteScreen
      {...fixture({
        results: ["correct", "correct", "correct"],
        review: { outcomes: ["fixed"], remainingToPass: 0 },
      })}
    />,
  );
  expect(screen.getByTestId("lesson-complete-screen-title")).toHaveTextContent("LESSON COMPLETE!");
  expect(screen.getByTestId("lesson-complete-screen-subtitle")).toHaveTextContent(
    "YOU FIXED 1 OF 1 MISTAKE",
  );
});

test("LCR3. 다시 풀고도 모자라면 SO CLOSE! · 모자란 수 줄 · Try again이 선다", () => {
  render(
    <LessonCompleteScreen
      {...fixture({
        verdict: "failed",
        results: ["correct", "incorrect", "incorrect", "incorrect"],
        review: { outcomes: ["missed", "missed", "missed"], remainingToPass: 1 },
      })}
    />,
  );
  expect(screen.getByTestId("lesson-complete-screen-title")).toHaveTextContent("SO CLOSE!");
  expect(screen.getByTestId("lesson-complete-screen-subtitle")).toHaveTextContent(
    "YOU FIXED 0 OF 3 MISTAKES",
  );
  expect(screen.getByTestId("lesson-complete-review-needed")).toHaveTextContent(
    "You needed 1 more right.",
  );
  expect(screen.getByTestId("lesson-complete-screen-retry")).toBeInTheDocument();
});

test("LCR4. 요약이 없으면 지금 결과 화면 그대로다(LESSON FAILED · 실수 줄 · 점 줄 없음)", () => {
  render(
    <LessonCompleteScreen
      {...fixture({ verdict: "failed", results: ["correct", "incorrect", "incorrect"] })}
    />,
  );
  expect(screen.getByTestId("lesson-complete-screen-title")).toHaveTextContent("LESSON FAILED");
  expect(screen.getByTestId("lesson-complete-screen-subtitle")).toHaveTextContent(
    "YOU MADE 2 MISTAKES IN THIS LESSON",
  );
  expect(screen.queryByTestId("lesson-complete-review-dots")).not.toBeInTheDocument();
});

test("LCR5. 점은 한 행에 10개까지이고 넘으면 다음 행으로 끊는다(순서 그대로)", () => {
  const outcomes = Array.from({ length: 14 }, (_, index): "fixed" | "missed" =>
    index % 3 === 0 ? "fixed" : "missed",
  );
  render(
    <LessonCompleteScreen
      {...fixture({ verdict: "failed", review: { outcomes, remainingToPass: 5 } })}
    />,
  );
  const rows = screen.getAllByTestId("lesson-complete-review-dots-row");
  expect(
    rows.map((row) => within(row).getAllByTestId("lesson-complete-review-dot").length),
  ).toEqual([10, 4]);
  expect(
    screen
      .getAllByTestId("lesson-complete-review-dot")
      .map((dot) => dot.getAttribute("data-outcome")),
  ).toEqual(outcomes);
});

test("LCR6. 다시 도전 결과의 낭독은 보이는 셋(판정 · 고친 수 · 모자란 수)과 같다", () => {
  const announced = stubAnnounce();
  render(
    <LessonCompleteScreen
      {...fixture({
        verdict: "failed",
        results: ["correct", "incorrect", "incorrect", "incorrect"],
        review: { outcomes: ["fixed", "missed", "missed"], remainingToPass: 1 },
      })}
    />,
  );
  expect(announced).toEqual([
    "Lesson not passed. Fixed 1 of 3 mistakes. You needed 1 more right. Try the lesson again \u2014 it\u2019ll feel easier now.",
  ]);
});
