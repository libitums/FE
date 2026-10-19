import { expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@lynx-js/react/testing-library";

import notification from "@libitums/icons/lynx/notification";
import notification03 from "@libitums/icons/lynx/notification-03";
import { color } from "@libitums/design-tokens";
import { MotionProvider } from "@libitums/ui-lynx/motion";

import { UiCopyContext } from "../lib/ui-copy";
import { markedUiCopy } from "../lib/ui-copy.test-support";
import { TopBar } from "./TopBar";
import { topBarNotificationsClassName } from "./top-bar-press";

// `ui` 계층: 컴포넌트 렌더 (ADR-0006 D4).

// 상단 바는 스크롤되는 내용 위에 겹쳐 떠 있습니다 — 칩 둘은 흰 면으로 서야 뒤로 지나가는
// 내용과 섞이지 않고, 알림 버튼과 같은 44 높이로 섭니다. 알림 버튼의 흰 면은 CSS가 집니다.
test("[TB1] 칩 둘은 흰 면 · 상단 줄 높이로 선다", () => {
  render(<TopBar streakDays={3} trophyCount={1} onOpenNotifications={vi.fn()} />);

  expect(screen.queryByTestId("top-bar-gem")).not.toBeInTheDocument();
  // 함수 결과가 아니라 실제 클래스 문자열을 고정합니다 — 함수가 틀려도 같이 틀리지 않게.
  for (const id of ["top-bar-streak", "top-bar-trophy"]) {
    expect(screen.getByTestId(id).getAttribute("class")).toBe(
      "stat-chip stat-chip-surface-white stat-chip-height-touch-target",
    );
  }
});

test("[TB2] 알림 아이콘은 선형 종 · fg.neutral 색이고 버튼의 자식이다", () => {
  render(<TopBar streakDays={3} trophyCount={1} onOpenNotifications={vi.fn()} />);

  const button = screen.getByTestId("top-bar-notifications");
  const icon = screen.getByTestId("top-bar-notifications-icon");
  expect(icon.parentElement).toBe(button);
  expect(icon.getAttribute("content")).toBe(notification03);
  expect(icon.getAttribute("content")).not.toBe(notification);
  expect(icon.getAttribute("current-color")).toBe(color.fg.neutral);
  expect(icon.getAttribute("class")).toBe("top-bar-notifications-icon");
});

test.each([
  ["Provider 없음", undefined],
  ["motion=standard", "standard" as const],
])("[TB3] standard(%s)는 표지도 막도 없다", (_name, motion) => {
  const bar = <TopBar streakDays={3} trophyCount={1} onOpenNotifications={vi.fn()} />;
  render(motion === undefined ? bar : <MotionProvider motion={motion}>{bar}</MotionProvider>);

  const button = screen.getByTestId("top-bar-notifications");
  expect(button.getAttribute("class")).toBe(topBarNotificationsClassName("standard"));
  expect(button).not.toHaveAttribute("data-motion");
  expect(screen.queryByTestId("top-bar-notifications-shade")).not.toBeInTheDocument();
  expect(Array.from(button.children)).toEqual([screen.getByTestId("top-bar-notifications-icon")]);
});

test("[TB4] reduced는 표지 · 첫 자식 막이 서고 막은 낭독되지 않는다", () => {
  render(
    <MotionProvider motion="reduced">
      <TopBar streakDays={3} trophyCount={1} onOpenNotifications={vi.fn()} />
    </MotionProvider>,
  );

  const button = screen.getByTestId("top-bar-notifications");
  const shade = screen.getByTestId("top-bar-notifications-shade");
  const icon = screen.getByTestId("top-bar-notifications-icon");
  expect(button.getAttribute("class")).toBe(topBarNotificationsClassName("reduced"));
  expect(button).toHaveAttribute("data-motion", "reduced");
  expect(button.firstElementChild).toBe(shade);
  // 바로 다음 형제가 아니라 「뒤에」를 봅니다 — 테스트 렌더러가 변수로 끼운 아이콘을 `<wrapper>`로 감쌉니다.
  expect(shade.compareDocumentPosition(icon) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  for (const { name } of Array.from(shade.attributes)) {
    expect(name.startsWith("accessibility-")).toBe(false);
  }
});

test.each([["standard" as const], ["reduced" as const]])(
  "[TB5] %s에서도 알림 버튼의 이름 · 특성 · tap이 그대로다",
  (motion) => {
    const onOpenNotifications = vi.fn();
    render(
      <MotionProvider motion={motion}>
        <TopBar streakDays={3} trophyCount={1} onOpenNotifications={onOpenNotifications} />
      </MotionProvider>,
    );

    const button = screen.getByTestId("top-bar-notifications");
    expect(button).toHaveAttribute("accessibility-element", "true");
    expect(button).toHaveAttribute("accessibility-label", "Notifications");
    expect(button).toHaveAttribute("accessibility-traits", "button");
    fireEvent.tap(button, {});
    expect(onOpenNotifications).toHaveBeenCalledTimes(1);

    if (motion === "reduced") {
      fireEvent.tap(screen.getByTestId("top-bar-notifications-shade"), {});
      expect(onOpenNotifications).toHaveBeenCalledTimes(2);
    }
  },
);

test("[TB6] 칩의 아이콘 · 숫자 색은 그대로다", () => {
  render(<TopBar streakDays={3} trophyCount={1} onOpenNotifications={vi.fn()} />);

  const streak = screen.getByTestId("top-bar-streak");
  const trophy = screen.getByTestId("top-bar-trophy");
  expect(streak.querySelector("svg")?.getAttribute("current-color")).toBe(color.brand.secondary);
  expect(trophy.querySelector("svg")?.getAttribute("current-color")).toBe(color.feedback.warning);
  expect(streak.querySelector(".stat-chip-value")?.getAttribute("class")).toBe(
    "stat-chip-value stat-chip-value-streak",
  );
  expect(trophy.querySelector(".stat-chip-value")?.getAttribute("class")).toBe(
    "stat-chip-value stat-chip-value-trophy",
  );
});

// SH2-E — 지표 이름은 영어이고 단수 · 복수를 지킨다(0 · 1 · 5).
test("[SH2-E] 칩 · 알림의 접근성 이름이 영어다 — 0 · 1은 단수 · 복수를 지킨다", () => {
  render(
    <TopBar
      streakDays={0}
      trophyCount={1}

      onOpenNotifications={vi.fn()}
    />,
  );

  expect(screen.getByTestId("top-bar-streak")).toHaveAttribute(
    "accessibility-label",
    "0-day streak",
  );
  expect(screen.getByTestId("top-bar-trophy")).toHaveAttribute("accessibility-label", "1 trophy");
  expect(screen.getByTestId("top-bar-notifications")).toHaveAttribute(
    "accessibility-label",
    "Notifications",
  );
});

test("[SH2-E] 트로피 0개는 복수다", () => {
  render(
    <TopBar
      streakDays={1}
      trophyCount={0}

      onOpenNotifications={vi.fn()}
    />,
  );

  expect(screen.getByTestId("top-bar-trophy")).toHaveAttribute("accessibility-label", "0 trophies");
});

test("[SH2-M] 문구표를 주입하면 이름이 표의 경로(인자 포함)로 나온다", () => {
  render(
    <UiCopyContext.Provider value={markedUiCopy}>
      <TopBar
        streakDays={3}
        trophyCount={1}

        onOpenNotifications={vi.fn()}
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
  expect(screen.getByTestId("top-bar-notifications")).toHaveAttribute(
    "accessibility-label",
    "⟦shell.notifications⟧",
  );
});
