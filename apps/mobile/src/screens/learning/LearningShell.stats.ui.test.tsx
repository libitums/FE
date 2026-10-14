import { afterEach, expect, test } from "vitest";
import { cleanup, render, screen } from "@lynx-js/react/testing-library";

import { LearningShell } from "./LearningShell";
import { LearningStatsContext } from "./LearningTopBar";

// `ui` 계층: 학습 화면 머리 칩이 앱이 공급한 연속 학습 · 트로피를 보이는지만 봅니다.
afterEach(cleanup);

function shell(overrides: Partial<Parameters<typeof LearningShell>[0]> = {}) {
  return (
    <LearningShell
      form="listening"
      questionIndex={0}
      questionCount={4}
      instruction="대화를 완성하세요"
      onExit={() => {}}
      card={<text>카드 안</text>}
      actionLabel="Check"
      onAction={() => {}}
      {...overrides}
    />
  );
}

test("공급된 연속 학습 · 트로피가 머리 칩에 선다", () => {
  render(
    <LearningStatsContext.Provider value={{ streakDays: 5, trophyCount: 2 }}>
      {shell()}
    </LearningStatsContext.Provider>,
  );

  expect(screen.getByTestId("top-bar-streak")).toHaveTextContent("5");
  expect(screen.getByTestId("top-bar-trophy")).toHaveTextContent("2");
});

test("prop으로 준 값이 공급된 값보다 먼저다", () => {
  render(
    <LearningStatsContext.Provider value={{ streakDays: 5, trophyCount: 2 }}>
      {shell({ streakDays: 9, trophyCount: 7 })}
    </LearningStatsContext.Provider>,
  );

  expect(screen.getByTestId("top-bar-streak")).toHaveTextContent("9");
  expect(screen.getByTestId("top-bar-trophy")).toHaveTextContent("7");
});

test("공급이 없으면 0이다", () => {
  render(shell());

  expect(screen.getByTestId("top-bar-streak")).toHaveTextContent("0");
  expect(screen.getByTestId("top-bar-trophy")).toHaveTextContent("0");
});
