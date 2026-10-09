import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { AppNavigator } from "./AppNavigator";

// `ui` 계층: 탭 바 묶음이 바닥 면을 그리는가를 컴포넌트 단위로 봅니다. 계산된 스타일은
// jsdom이 계산하지 않으므로 인라인 `height` 속성과 CSS 문자열만 단언합니다.
// 바닥 면은 `queryByTestId` 뒤 `expect`로 단언해, red가 던짐이 아니라 단언 실패로 섭니다.

const NAVIGATOR = "app-navigator";
const FLOOR = "app-navigator-floor";
const BAR = "ui-lynx-bottom-navigator";

function props(overrides: Partial<Parameters<typeof AppNavigator>[0]> = {}) {
  return {
    tab: "journey" as const,
    onSelectTab: vi.fn(),
    obscured: false,
    floorHeight: 0,
    ...overrides,
  };
}

function childTestIds(el: HTMLElement): (string | null)[] {
  return Array.from(el.children).map((child) => child.getAttribute("data-testid"));
}

function cssRule(css: string, selector: string): string | null {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(`(?:^|\\})\\s*${escaped}\\s*\\{([^}]*)\\}`).exec(css);
  return match ? match[1] : null;
}

test("[UA1] floorHeight 48 → 바닥 면이 하나 서고 height 48px, 탭 바 다음 순서", () => {
  render(<AppNavigator {...props({ floorHeight: 48 })} />);

  const floors = screen.queryAllByTestId(FLOOR);
  expect(floors).toHaveLength(1);
  expect(floors[0].getAttribute("style") ?? "").toMatch(/height:\s*48px/);
  expect(childTestIds(screen.getByTestId(NAVIGATOR))).toEqual([BAR, FLOOR]);
});

test("[UA2] floorHeight 0 → 바닥 면이 없고 묶음의 자식은 탭 바 하나", () => {
  render(<AppNavigator {...props({ floorHeight: 0 })} />);

  expect(screen.queryByTestId(FLOOR)).toBeNull();
  expect(childTestIds(screen.getByTestId(NAVIGATOR))).toEqual([BAR]);
});

test("[UA3] app.css: .app-navigator-floor는 기본 배경색 · 모서리 없음, .app-navigator에는 배경 없음", () => {
  const css = readFileSync(resolve(process.cwd(), "src/app/app.css"), "utf8");

  const floor = cssRule(css, ".app-navigator-floor");
  expect(floor).not.toBeNull();
  expect(floor ?? "").toMatch(/background:\s*var\(--libitum-color-background-primary\)/);
  expect(floor ?? "").not.toMatch(/border-radius/);

  const navigator = cssRule(css, ".app-navigator");
  expect(navigator).not.toBeNull();
  expect(navigator ?? "").not.toMatch(/background/);
});

test("[UA4] roleplay 탭 tap → onSelectTab('roleplay') 1회, 선택 표시는 journey 그대로", () => {
  const p = props({ tab: "journey" });
  render(<AppNavigator {...p} />);

  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-roleplay"), {});

  expect(p.onSelectTab).toHaveBeenCalledTimes(1);
  expect(p.onSelectTab).toHaveBeenCalledWith("roleplay");
  expect(screen.getByTestId("ui-lynx-bottom-navigator-item-journey")).toHaveAttribute(
    "data-selected",
    "true",
  );
  expect(screen.getByTestId("ui-lynx-bottom-navigator-item-roleplay")).toHaveAttribute(
    "data-selected",
    "false",
  );
});

test("[UA5] obscured 값이 묶음의 accessibility-elements-hidden으로 간다", () => {
  const { unmount } = render(<AppNavigator {...props({ obscured: true })} />);
  expect(screen.getByTestId(NAVIGATOR)).toHaveAttribute("accessibility-elements-hidden", "true");
  unmount();

  render(<AppNavigator {...props({ obscured: false })} />);
  expect(screen.getByTestId(NAVIGATOR)).toHaveAttribute("accessibility-elements-hidden", "false");
});

test("[UA6] floorHeight 0 → 48 → 0 다시 렌더 → 바닥 면이 생겼다 사라지고 탭 바는 그대로", () => {
  const { rerender } = render(<AppNavigator {...props({ floorHeight: 0 })} />);
  const bar = screen.getByTestId(BAR);
  expect(screen.queryByTestId(FLOOR)).toBeNull();

  rerender(<AppNavigator {...props({ floorHeight: 48 })} />);
  expect(screen.queryByTestId(FLOOR)).not.toBeNull();
  expect(screen.getByTestId(BAR)).toBe(bar);

  rerender(<AppNavigator {...props({ floorHeight: 0 })} />);
  expect(screen.queryByTestId(FLOOR)).toBeNull();
  expect(screen.getByTestId(BAR)).toBe(bar);
});

test("[UA7] floorHeight 48 + obscured true → 바닥 면이 가림 속성을 단 묶음의 자손이다", () => {
  render(<AppNavigator {...props({ floorHeight: 48, obscured: true })} />);

  const navigator = screen.getByTestId(NAVIGATOR);
  expect(navigator).toHaveAttribute("accessibility-elements-hidden", "true");
  expect(navigator.contains(screen.getByTestId(FLOOR))).toBe(true);
});
