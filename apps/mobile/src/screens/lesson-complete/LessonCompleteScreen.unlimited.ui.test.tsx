import { expect, test, vi } from "vitest";
import { render, screen } from "@lynx-js/react/testing-library";

import { LessonCompleteScreen } from "./LessonCompleteScreen";
import { lessonRewardPlaceholder } from "./lesson-complete";

// `ui` 계층: 무제한 계정의 결과 화면(ADR-0115) — 「N tickets left」 줄 자리에 「No ticket used · Unlimited」 알약,
// 「Next lesson」 버튼에 숫자 대신 무한 기호 태그.

function fixture(overrides: Partial<Parameters<typeof LessonCompleteScreen>[0]> = {}) {
  return {
    results: ["correct", "correct", "correct"] as const,
    skippedCount: 0,
    verdict: "passed" as const,
    streakDays: 1,
    trophyCount: 0,
    reward: lessonRewardPlaceholder,
    onExit: vi.fn<() => void>(),
    ...overrides,
  };
}

test("LU1. 무제한이면 알약이 서고 남은 장수 줄은 없다", () => {
  render(<LessonCompleteScreen {...fixture({ ticketChip: { count: 0, unlimited: true } })} />);

  const line = screen.getByTestId("lesson-complete-unlimited");
  expect(line).toHaveTextContent("No ticket used · Unlimited");
  expect(line).toHaveAttribute("accessibility-label", "No ticket used · Unlimited");
  expect(screen.queryByTestId("lesson-complete-tickets")).not.toBeInTheDocument();
});

test("LU2. 일반 계정은 알약이 없고 남은 장수 줄은 그대로다", () => {
  render(
    <LessonCompleteScreen
      {...fixture({ ticketsLeft: 2, ticketChip: { count: 2, unlimited: false } })}
    />,
  );

  expect(screen.queryByTestId("lesson-complete-unlimited")).not.toBeInTheDocument();
  expect(screen.getByTestId("lesson-complete-tickets")).toHaveTextContent("2 tickets left");
});

test("LU3. 다음 비용이 unlimited면 무한 기호 태그 · 「No ticket needed」 낭독 · 숫자 태그 없음", () => {
  render(
    <LessonCompleteScreen
      {...fixture({
        ticketChip: { count: 0, unlimited: true },
        next: { kind: "lesson", ticketCost: "unlimited", onStart: vi.fn<() => void>() },
      })}
    />,
  );

  expect(screen.getByTestId("lesson-complete-screen-next-unlimited")).toBeInTheDocument();
  expect(screen.queryByTestId("lesson-complete-screen-next-ticket")).not.toBeInTheDocument();
  expect(screen.getByTestId("lesson-complete-screen-next")).toHaveAttribute(
    "accessibility-label",
    "Next lesson. No ticket needed",
  );
});

test("LU4. 다음이 최종 테스트여도 무제한이면 무한 태그 · 「Final test. No ticket needed」", () => {
  render(
    <LessonCompleteScreen
      {...fixture({
        ticketChip: { count: 0, unlimited: true },
        next: { kind: "final", ticketCost: "unlimited", onStart: vi.fn<() => void>() },
      })}
    />,
  );

  expect(screen.getByTestId("lesson-complete-screen-next-unlimited")).toBeInTheDocument();
  expect(screen.getByTestId("lesson-complete-screen-next")).toHaveAttribute(
    "accessibility-label",
    "Final test. No ticket needed",
  );
});
