import { expect, test, vi } from "vitest";
import { render, screen } from "@lynx-js/react/testing-library";

import { UiCopyContext } from "../lib/ui-copy";
import { markedUiCopy } from "../lib/ui-copy.test-support";
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

// SH2-E — 지표 이름은 영어이고 단수 · 복수를 지킨다(0 · 1 · 5).
test("[SH2-E] 칩 · 알림의 접근성 이름이 영어다 — 0 · 1은 단수 · 복수를 지킨다", () => {
  render(
    <TopBar
      streakDays={0}
      trophyCount={1}
      gemCount={5}
      onOpenNotifications={vi.fn()}
      onOpenGem={vi.fn()}
    />,
  );

  expect(screen.getByTestId("top-bar-streak")).toHaveAttribute(
    "accessibility-label",
    "0-day streak",
  );
  expect(screen.getByTestId("top-bar-trophy")).toHaveAttribute("accessibility-label", "1 trophy");
  expect(screen.getByTestId("top-bar-gem")).toHaveAttribute("accessibility-label", "5 gems");
  expect(screen.getByTestId("top-bar-notifications")).toHaveAttribute(
    "accessibility-label",
    "Notifications",
  );
});

test("[SH2-E] 트로피 0개 · 젬 1개는 복수 · 단수다", () => {
  render(
    <TopBar
      streakDays={1}
      trophyCount={0}
      gemCount={1}
      onOpenNotifications={vi.fn()}
      onOpenGem={vi.fn()}
    />,
  );

  expect(screen.getByTestId("top-bar-trophy")).toHaveAttribute("accessibility-label", "0 trophies");
  expect(screen.getByTestId("top-bar-gem")).toHaveAttribute("accessibility-label", "1 gem");
});

test("[SH2-M] 문구표를 주입하면 이름이 표의 경로(인자 포함)로 나온다", () => {
  render(
    <UiCopyContext.Provider value={markedUiCopy}>
      <TopBar
        streakDays={3}
        trophyCount={1}
        gemCount={5}
        onOpenNotifications={vi.fn()}
        onOpenGem={vi.fn()}
      />
    </UiCopyContext.Provider>,
  );

  expect(screen.getByTestId("top-bar-streak")).toHaveAttribute(
    "accessibility-label",
    "⟦common.count.streakDays⟧(3)",
  );
  expect(screen.getByTestId("top-bar-trophy")).toHaveAttribute(
    "accessibility-label",
    "⟦common.count.trophies⟧(1)",
  );
  expect(screen.getByTestId("top-bar-gem")).toHaveAttribute(
    "accessibility-label",
    "⟦common.count.gems⟧(5)",
  );
  expect(screen.getByTestId("top-bar-notifications")).toHaveAttribute(
    "accessibility-label",
    "⟦shell.notifications⟧",
  );
});
