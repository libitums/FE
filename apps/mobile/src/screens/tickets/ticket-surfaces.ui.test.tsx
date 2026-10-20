import { expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { TopBar } from "../../components/TopBar";
import { StepSheet } from "../journey-map/StepSheet";
import { LessonCompleteScreen } from "../lesson-complete/LessonCompleteScreen";
import { lessonRewardPlaceholder } from "../lesson-complete/lesson-complete";

// `ui` 계층: 티켓이 기존 화면에 붙는 자리 셋 — 머리 칩(E1 진입) · 말풍선 Start 태그(E3) · 결과 줄(E5).

function sheet(ticketCost: 0 | 1 | undefined) {
  return (
    <StepSheet
      caretOffset={0}
      title="Ordering"
      top={0}
      lessonOrdinal={3}
      completedActivityCount={0}
      totalActivityCount={4}
      ticketCost={ticketCost}
      onStart={() => {}}
      onClose={() => {}}
    />
  );
}

test("[TS1] 새 레슨 말풍선의 Start에 티켓 1 태그가 서고, Start 낭독에 비용이 붙는다", () => {
  render(sheet(1));
  expect(screen.getByTestId("step-sheet-ticket-cost")).toHaveTextContent("1");
  expect(screen.getByTestId("step-sheet-start").getAttribute("accessibility-label")).toBe(
    "Start. Uses 1 ticket",
  );
});

test("[TS2] 다시 하기(비용 0)와 비용을 넘기지 않으면 태그가 없다", () => {
  render(sheet(0));
  expect(screen.queryByTestId("step-sheet-ticket-cost")).not.toBeInTheDocument();
  expect(screen.getByTestId("step-sheet-start").getAttribute("accessibility-label")).toBe("Start");
});

test("[TS3] 결과 화면에 남은 장수 한 줄 — 복수 · 단수", () => {
  const base = {
    results: ["correct"] as const,
    skippedCount: 0,
    verdict: "passed" as const,
    streakDays: 1,
    trophyCount: 0,
    reward: lessonRewardPlaceholder,
    onExit: vi.fn(),
  };
  const { unmount } = render(<LessonCompleteScreen {...base} ticketsLeft={2} />);
  expect(screen.getByTestId("lesson-complete-tickets")).toHaveTextContent("2 tickets left");
  unmount();
  render(<LessonCompleteScreen {...base} ticketsLeft={1} />);
  expect(screen.getByTestId("lesson-complete-tickets")).toHaveTextContent("1 ticket left");
});

test("[TS4] 결과 화면에 장수를 넘기지 않으면 줄이 없다", () => {
  render(
    <LessonCompleteScreen
      results={["correct"]}
      skippedCount={0}
      verdict="passed"
      streakDays={1}
      trophyCount={0}
      reward={lessonRewardPlaceholder}
      onExit={vi.fn()}
    />,
  );
  expect(screen.queryByTestId("lesson-complete-tickets")).not.toBeInTheDocument();
});

test("[TS5] 머리 칩 — 숫자만 서고 이름은 「N tickets left」, 누르면 onOpenTickets", () => {
  const onOpenTickets = vi.fn();
  render(
    <TopBar
      streakDays={3}
      trophyCount={1}
      ticketCount={2}
      onOpenTickets={onOpenTickets}
      onOpenNotifications={vi.fn()}
    />,
  );
  const chip = screen.getByTestId("top-bar-tickets");
  expect(chip).toHaveTextContent("2");
  expect(chip.getAttribute("accessibility-label")).toBe("2 tickets left");
  expect(chip.getAttribute("accessibility-traits")).toBe("button");
  fireEvent.tap(chip);
  expect(onOpenTickets).toHaveBeenCalledTimes(1);
});

test("[TS6] 장수를 모르면(넘기지 않으면) 티켓 칩이 없다", () => {
  render(<TopBar streakDays={3} trophyCount={1} onOpenNotifications={vi.fn()} />);
  expect(screen.queryByTestId("top-bar-tickets")).not.toBeInTheDocument();
});
