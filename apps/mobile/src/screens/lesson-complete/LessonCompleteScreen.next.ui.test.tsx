import { expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { LessonCompleteScreen } from "./LessonCompleteScreen";
import { lessonRewardPlaceholder } from "./lesson-complete";
import type { LessonCompleteNext } from "./LessonCompleteNextActions";

// `ui` 계층: 통과 결과 화면의 「다음 학습」(시안 D) — 지도 버튼 + 주황 버튼, 티켓 태그, 최종 테스트, 미통과 · 다음 없음.

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
const nextOf = (overrides: Partial<LessonCompleteNext> = {}): LessonCompleteNext => ({
  kind: "lesson",
  ticketCost: 1,
  onStart: vi.fn<() => void>(),
  ...overrides,
});

test("[LCN1] 다음이 있으면 지도 버튼 + 「Next lesson」이 서고, 각각 맵 · 다음 유닛을 연다", () => {
  const props = fixture({ next: nextOf() });
  render(<LessonCompleteScreen {...props} />);

  const start = screen.getByTestId("lesson-complete-screen-next");
  expect(start).toHaveTextContent("Next lesson");
  expect(start).toHaveAttribute("accessibility-label", "Next lesson. Uses 1 ticket");
  expect(screen.getByTestId("lesson-complete-screen-next-ticket")).toBeInTheDocument();
  const map = screen.getByTestId("lesson-complete-screen-exit");
  expect(map).toHaveAttribute("accessibility-label", "Back to map");

  fireEvent.tap(start, {});
  expect(props.next?.onStart).toHaveBeenCalledTimes(1);
  fireEvent.tap(map, {});
  expect(props.onExit).toHaveBeenCalledTimes(1);
});

test("[LCN2] 티켓이 들지 않는 다음(이미 연 · 끝낸 유닛)은 태그가 없다", () => {
  render(<LessonCompleteScreen {...fixture({ next: nextOf({ ticketCost: 0 }) })} />);

  expect(screen.queryAllByTestId("lesson-complete-screen-next-ticket").length).toBe(0);
  expect(screen.getByTestId("lesson-complete-screen-next")).toHaveAttribute(
    "accessibility-label",
    "Next lesson",
  );
});

test("[LCN3] 다음이 최종 테스트면 「Final test」로 선다", () => {
  render(<LessonCompleteScreen {...fixture({ next: nextOf({ kind: "final" }) })} />);

  expect(screen.getByTestId("lesson-complete-screen-next")).toHaveTextContent("Final test");
});

test("[LCN4] 미통과에서는 다음이 있어도 지금처럼 Try again · Back to map이다", () => {
  render(
    <LessonCompleteScreen
      {...fixture({
        results: ["incorrect", "incorrect", "incorrect"],
        verdict: "failed",
        onRetry: vi.fn<() => void>(),
        next: nextOf(),
      })}
    />,
  );

  expect(screen.queryAllByTestId("lesson-complete-screen-next").length).toBe(0);
  expect(screen.getByTestId("lesson-complete-screen-retry")).toBeInTheDocument();
});

test("[LCN5] 다음이 없으면 맵으로 가는 버튼 하나다", () => {
  render(<LessonCompleteScreen {...fixture()} />);

  expect(screen.queryAllByTestId("lesson-complete-screen-next-actions").length).toBe(0);
  expect(screen.getByTestId("lesson-complete-screen-exit")).toHaveTextContent("Back to map");
});
