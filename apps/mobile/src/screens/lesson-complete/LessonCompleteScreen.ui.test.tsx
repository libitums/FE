import { expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { LessonCompleteScreen } from "./LessonCompleteScreen";
import { lessonRewardPlaceholder } from "./lesson-complete";

// `ui` 계층: 컴포넌트 렌더와 상호작용 (ADR-0006 D4). testid로 질의합니다.

function fixture(overrides: Partial<Parameters<typeof LessonCompleteScreen>[0]> = {}) {
  return {
    results: ["correct", "correct", "correct"] as const,
    verdict: "passed" as const,
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

// ---------------------------------------------------------------- 미통과 (2026-09-28)
//
// 통과와 미통과가 **같은 화면**이 됐습니다. 그전에는 미통과가 옆의 평가 화면이라 같은
// 순간의 두 결과가 전혀 다르게 보였습니다. 아래 셋이 그 통일의 계약입니다: 틀은 같고,
// 표식 · 제목 · 보상만 갈립니다.

test("[LCS6] 미통과는 같은 틀에 FAILED 제목이 서고 보상 카드가 아예 없다", () => {
  render(
    <LessonCompleteScreen
      {...fixture({ verdict: "failed", results: ["incorrect", "incorrect", "correct"] })}
    />,
  );

  expect(screen.getByTestId("lesson-complete-screen-title")).toHaveTextContent("LESSON FAILED");
  expect(screen.getByTestId("lesson-complete-screen-subtitle")).toHaveTextContent(
    "YOU MADE 2 MISTAKES IN THIS LESSON",
  );
  // 틀은 같습니다 — 지표 칩은 그대로 섭니다.
  expect(screen.getByTestId("lesson-complete-screen-streak")).toBeInTheDocument();
  // 얻지 않은 것을 그리지 않습니다. 빈 상자도 두지 않습니다.
  expect(screen.queryByTestId("lesson-complete-screen-reward-diamond")).not.toBeInTheDocument();
  expect(screen.queryByTestId("lesson-complete-screen-reward-grade")).not.toBeInTheDocument();
});

// 색이 유일한 채널이 되지 않게 모양도 갈립니다(WCAG 1.4.1). `data-verdict`가 그 프로브입니다.
test("[LCS7] 표식이 판정마다 갈린다", () => {
  const { container, unmount } = render(<LessonCompleteScreen {...fixture()} />);
  expect(container.querySelector(".lesson-complete-screen-badge")).toHaveAttribute(
    "data-verdict",
    "passed",
  );
  unmount();

  const failed = render(<LessonCompleteScreen {...fixture({ verdict: "failed" })} />);
  expect(failed.container.querySelector(".lesson-complete-screen-badge")).toHaveAttribute(
    "data-verdict",
    "failed",
  );
});

// 나가는 수단은 어느 경우에도 하나입니다(ADR-0022 D1). 미통과의 `Try again`은 뒤로 가는
// 것이 아니라 새 세션을 여는 **나아가는** 수단이라 그 규칙과 부딪히지 않습니다.
test("[LCS8] 미통과에만 다시 풀기가 서고, 나가기는 두 경우 모두 하나다", () => {
  const onRetry = vi.fn();
  const onExit = vi.fn();

  const passed = render(<LessonCompleteScreen {...fixture({ onRetry, onExit })} />);
  expect(screen.queryByTestId("lesson-complete-screen-retry")).not.toBeInTheDocument();
  expect(screen.getByTestId("lesson-complete-screen-exit")).toBeInTheDocument();
  passed.unmount();

  render(<LessonCompleteScreen {...fixture({ verdict: "failed", onRetry, onExit })} />);
  expect(screen.getByTestId("lesson-complete-screen-retry")).toBeInTheDocument();
  expect(screen.getByTestId("lesson-complete-screen-exit")).toBeInTheDocument();

  // 탭 대상은 감싼 상자가 아니라 그 안의 버튼입니다(위 [LCS5]와 같은 형태입니다).
  const retryButton = screen
    .getByTestId("lesson-complete-screen-retry")
    .querySelector('[data-testid="ui-lynx-button"]');
  fireEvent.tap(retryButton as Element, {});

  expect(onRetry).toHaveBeenCalledTimes(1);
  expect(onExit).not.toHaveBeenCalled();
});
