import { expect, test, vi } from "vitest";
import { render, screen } from "@lynx-js/react/testing-library";

import { TopBar } from "./TopBar";

// `ui` 계층: 컴포넌트 렌더 (ADR-0006 D4).

// 상단 바는 스크롤되는 내용 위에 겹쳐 떠 있습니다 — 칩 셋은 흰 면으로 서야 뒤로 지나가는
// 내용과 섞이지 않습니다. 알림 버튼의 흰 면은 CSS(`.top-bar-notifications`)가 집니다.
test("[TB1] 칩 셋은 모두 흰 면으로 선다", () => {
  render(
    <TopBar
      streakDays={3}
      trophyCount={1}
      gemCount={0}
      onOpenNotifications={vi.fn()}
      onOpenGem={vi.fn()}
    />,
  );

  for (const id of ["top-bar-streak", "top-bar-trophy", "top-bar-gem"]) {
    expect(screen.getByTestId(id).getAttribute("class")).toBe("stat-chip stat-chip-surface-white");
  }
});
