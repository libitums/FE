import { expect, test, vi } from "vitest";
import { render, screen } from "@lynx-js/react/testing-library";

import { AppHeader } from "./AppHeader";

// `ui` 계층: 전역 머리도 트로피 수를 모르면(null) 칩을 그리지 않습니다.

test("TB1. AppHeader trophyCount가 null이면 트로피 칩이 없고 연속 칩은 있다", () => {
  render(
    <AppHeader streakDays={24} trophyCount={null} onOpenNotifications={vi.fn<() => void>()} />,
  );

  expect(screen.queryByTestId("top-bar-trophy")).not.toBeInTheDocument();
  expect(screen.getByTestId("top-bar-streak")).toBeInTheDocument();
});
