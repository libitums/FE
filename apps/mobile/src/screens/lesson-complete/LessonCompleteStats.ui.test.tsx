import { expect, test } from "vitest";
import { render, screen } from "@lynx-js/react/testing-library";

import { noStatBumps } from "../../lib/stat-bump";
import { LessonCompleteStats } from "./LessonCompleteStats";

// `ui` 계층: 결과 화면 머리 — 맵 머리와 같은 칩 셋(연속 학습 · 트로피 · 티켓). 티켓 값이 없으면 티켓 칩이 없습니다.

function mount(ticketChip?: { count: number; unlimited: boolean }) {
  render(
    <LessonCompleteStats
      streakDays={4}
      trophyCount={2}
      ticketChip={ticketChip}
      statBumps={noStatBumps}
      bumpDelayMs={0}
      onStatBumped={undefined}
    />,
  );
}

test("LS1. 티켓 값이 있으면 남은 장수 칩이 선다", () => {
  mount({ count: 3, unlimited: false });
  expect(screen.getByTestId("lesson-complete-screen-tickets-chip")).toHaveAttribute(
    "accessibility-label",
    "3 tickets left",
  );
});

test("LS2. 시험 계정은 무제한 칩(무한 기호 그림)으로 서고 누를 수 없다", () => {
  mount({ count: 0, unlimited: true });
  const chip = screen.getByTestId("lesson-complete-screen-tickets-chip");
  expect(chip).toHaveAttribute("accessibility-label", "Unlimited tickets");
  expect(screen.getByTestId("lesson-complete-screen-tickets-chip-infinity")).toBeInTheDocument();
  expect(chip).not.toHaveTextContent("∞");
  expect(chip).not.toHaveAttribute("accessibility-traits", "button");
});

test("LS3. 티켓 값이 없으면 연속 학습 · 트로피 칩만 선다", () => {
  mount();
  expect(screen.getByTestId("lesson-complete-screen-streak")).toBeInTheDocument();
  expect(screen.queryByTestId("lesson-complete-screen-tickets-chip")).not.toBeInTheDocument();
});
