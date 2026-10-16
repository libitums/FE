import { expect, test, vi } from "vitest";
import { render, screen } from "@lynx-js/react/testing-library";

import { TopBar } from "./TopBar";

// `ui` 계층: 트로피 수를 아직 모르면(null) 0을 보이지 않고 칩을 그리지 않습니다.

test("TB1. trophyCount가 null이면 트로피 칩이 없고 연속 칩은 있다", () => {
  render(<TopBar streakDays={3} trophyCount={null} onOpenNotifications={vi.fn<() => void>()} />);

  expect(screen.queryByTestId("top-bar-trophy")).not.toBeInTheDocument();
  expect(screen.getByTestId("top-bar-streak")).toBeInTheDocument();
  expect(screen.getByTestId("top-bar-notifications")).toBeInTheDocument();
});

test("TB1. null → 숫자로 바뀌면 트로피 칩이 선다", () => {
  const { rerender } = render(
    <TopBar streakDays={3} trophyCount={null} onOpenNotifications={vi.fn<() => void>()} />,
  );

  rerender(<TopBar streakDays={3} trophyCount={0} onOpenNotifications={vi.fn<() => void>()} />);

  expect(screen.getByTestId("top-bar-trophy")).toHaveAttribute("accessibility-label", "0 trophies");
});
