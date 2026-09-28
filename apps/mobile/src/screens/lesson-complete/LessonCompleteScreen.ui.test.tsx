import { expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { LessonCompleteScreen } from "./LessonCompleteScreen";
import { lessonRewardPlaceholder } from "./lesson-complete";

// `ui` 계층: 컴포넌트 렌더와 상호작용 (ADR-0006 D4). testid로 질의합니다.

function fixture(overrides: Partial<Parameters<typeof LessonCompleteScreen>[0]> = {}) {
  return {
    results: ["correct", "correct", "correct"] as const,
    streakDays: 1,
    trophyCount: 0,
    diamondCount: 0,
    reward: lessonRewardPlaceholder,
    onExit: vi.fn(),
    ...overrides,
  };
}

test("[LCS1] 실수가 없으면 PERFECT 제목과 설명이 서고, 제목은 header로 낭독된다", () => {
  render(<LessonCompleteScreen {...fixture()} />);

  const title = screen.getByTestId("lesson-complete-screen-title");
  expect(title).toHaveTextContent("PERFECT LESSON!");
  expect(title).toHaveAttribute("accessibility-traits", "header");
  expect(screen.getByTestId("lesson-complete-screen-subtitle")).toHaveTextContent(
    "YOU MADE NO MISTAKES IN THIS LESSON",
  );
});

test("[LCS2] 실수가 있으면 같은 틀에 제목 · 설명만 바뀐다", () => {
  render(<LessonCompleteScreen {...fixture({ results: ["correct", "incorrect", "correct"] })} />);

  expect(screen.getByTestId("lesson-complete-screen-title")).toHaveTextContent("LESSON COMPLETE!");
  expect(screen.getByTestId("lesson-complete-screen-subtitle")).toHaveTextContent(
    "YOU MADE 1 MISTAKE IN THIS LESSON",
  );
  expect(screen.getByTestId("lesson-complete-screen-reward-diamond")).toBeInTheDocument();
});

test("[LCS3] 지표 칩 셋은 읽기 전용이고 이름을 단다", () => {
  render(<LessonCompleteScreen {...fixture({ streakDays: 3, trophyCount: 2, diamondCount: 5 })} />);

  const expected = [
    ["lesson-complete-screen-streak", "연속 학습 3일"],
    ["lesson-complete-screen-trophy", "트로피 2개"],
    ["lesson-complete-screen-diamond", "다이아 5개"],
  ] as const;
  for (const [id, label] of expected) {
    const chip = screen.getByTestId(id);
    expect(chip).toHaveAttribute("accessibility-label", label);
    expect(chip).not.toHaveAttribute("accessibility-traits", "button");
  }
});

test("[LCS4] 연속 알약은 연속이 있을 때만 선다", () => {
  const { unmount } = render(<LessonCompleteScreen {...fixture({ streakDays: 1 })} />);
  expect(screen.getByTestId("lesson-complete-screen-streak-pill")).toHaveTextContent(
    "1 Day Streak",
  );
  unmount();

  render(<LessonCompleteScreen {...fixture({ streakDays: 0 })} />);
  expect(screen.queryByTestId("lesson-complete-screen-streak-pill")).toBeNull();
});

test("[LCS5] 보상 카드 둘이 받은 보상을 그리고 이름을 단다", () => {
  render(<LessonCompleteScreen {...fixture({ reward: { diamondAmount: 7, grade: "GREAT" } })} />);

  const diamond = screen.getByTestId("lesson-complete-screen-reward-diamond");
  expect(diamond).toHaveTextContent("+ 7 REWARD");
  expect(diamond).toHaveAttribute("accessibility-label", "보상 다이아 7개");
  const grade = screen.getByTestId("lesson-complete-screen-reward-grade");
  expect(grade).toHaveTextContent("GREAT");
  expect(grade).toHaveAttribute("accessibility-label", "등급 GREAT");
});

test("[LCS6] Check tap → onExit 정확히 1회", () => {
  const onExit = vi.fn();
  render(<LessonCompleteScreen {...fixture({ onExit })} />);

  const button = screen
    .getByTestId("lesson-complete-screen-exit")
    .querySelector('[data-testid="ui-lynx-button"]');
  expect(button).not.toBeNull();
  expect(button).toHaveAttribute("accessibility-label", "Check →");
  fireEvent.tap(button as Element, {});

  expect(onExit).toHaveBeenCalledTimes(1);
});
