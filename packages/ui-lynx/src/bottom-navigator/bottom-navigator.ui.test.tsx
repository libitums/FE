import { fireEvent, render, screen } from "@lynx-js/react/testing-library";
import { color } from "@libitums/design-tokens";
import house from "@libitums/icons/lynx/house";
import map from "@libitums/icons/lynx/map";
import settings from "@libitums/icons/lynx/settings";
import userGroup from "@libitums/icons/lynx/user-group";
import { describe, expect, test, vi } from "vitest";

import { BottomNavigator } from "./index";
import type { BottomNavigatorItem } from "./index";

const items: readonly BottomNavigatorItem[] = [
  { id: "home", accessibilityLabel: "홈", icon: house },
  {
    id: "journey",
    accessibilityLabel: "여정",
    icon: map,
    badge: { kind: "dot", accessibilityLabel: "새 소식 있음" },
  },
  {
    id: "roleplay",
    accessibilityLabel: "롤플레이",
    icon: userGroup,
    badge: { kind: "count", count: 108 },
  },
  {
    id: "settings",
    accessibilityLabel: "설정",
    icon: settings,
    availability: "disabled",
    disabledReason: "로그인 후 사용 가능",
  },
];

describe("BottomNavigator", () => {
  test("모든 항목과 controlled 선택 상태를 안정적인 data 속성으로 렌더한다", () => {
    render(<BottomNavigator items={items} selectedId="journey" />);

    const navigator = screen.getByTestId("ui-lynx-bottom-navigator");
    expect(navigator).toHaveAttribute("data-count", "4");
    expect(navigator.firstElementChild).toHaveClass("ui-lynx-bottom-navigator-items-4");
    for (const item of items) {
      expect(screen.getByTestId(`ui-lynx-bottom-navigator-item-${item.id}`)).toHaveAttribute(
        "data-selected",
        item.id === "journey" ? "true" : "false",
      );
    }
  });

  test("선택·비선택·disabled 항목이 이름과 trait를 각각 노출한다", () => {
    render(<BottomNavigator items={items} selectedId="journey" />);

    expect(screen.getByTestId("ui-lynx-bottom-navigator-item-home")).toHaveAttribute(
      "accessibility-label",
      "홈",
    );
    expect(screen.getByTestId("ui-lynx-bottom-navigator-item-journey")).toHaveAttribute(
      "accessibility-label",
      "여정, 선택됨, 새 소식 있음",
    );
    expect(screen.getByTestId("ui-lynx-bottom-navigator-item-journey")).toHaveAttribute(
      "accessibility-traits",
      "button",
    );
    expect(screen.getByTestId("ui-lynx-bottom-navigator-item-settings")).toHaveAttribute(
      "accessibility-traits",
      "button",
    );
    expect(screen.getByTestId("ui-lynx-bottom-navigator-item-settings")).toHaveAttribute(
      "accessibility-label",
      "설정, 로그인 후 사용 가능",
    );
  });

  test("enabled 항목은 disabled를 건너뛴 선형 D-pad 순서와 양끝 경계를 노출한다", () => {
    render(<BottomNavigator items={items} selectedId="home" />);

    const home = screen.getByTestId("ui-lynx-bottom-navigator-item-home");
    const journey = screen.getByTestId("ui-lynx-bottom-navigator-item-journey");
    const roleplay = screen.getByTestId("ui-lynx-bottom-navigator-item-roleplay");
    const settingsItem = screen.getByTestId("ui-lynx-bottom-navigator-item-settings");
    expect(home).toHaveAttribute("focusable", "true");
    expect(home).toHaveAttribute("focus-index", "0,0");
    expect(home).toHaveAttribute("next-focus-left", "ui-lynx-bottom-navigator-focus-0");
    expect(home).toHaveAttribute("next-focus-right", "ui-lynx-bottom-navigator-focus-1");
    expect(journey).toHaveAttribute("next-focus-left", "ui-lynx-bottom-navigator-focus-0");
    expect(journey).toHaveAttribute("next-focus-right", "ui-lynx-bottom-navigator-focus-2");
    expect(roleplay).toHaveAttribute("next-focus-right", "ui-lynx-bottom-navigator-focus-2");
    expect(settingsItem).toHaveAttribute("focusable", "false");
    expect(settingsItem).not.toHaveAttribute("focus-index");
  });

  test("아이콘 normal/pressed 자손은 장식으로 숨기고 token 색을 SVG content에 해석한다", () => {
    render(<BottomNavigator items={items} selectedId="journey" />);

    const homeDefault = screen.getByTestId("ui-lynx-bottom-navigator-icon-home-default");
    const homePressed = screen.getByTestId("ui-lynx-bottom-navigator-icon-home-pressed");
    const journeyDefault = screen.getByTestId("ui-lynx-bottom-navigator-icon-journey-default");
    expect(homeDefault).toHaveAttribute(
      "content",
      house.replaceAll("currentColor", color.fg["neutral-subtle"]),
    );
    expect(homePressed).toHaveAttribute(
      "content",
      house.replaceAll("currentColor", color.fg["neutral-muted"]),
    );
    expect(journeyDefault).toHaveAttribute(
      "content",
      map.replaceAll("currentColor", color.fg["neutral-inverted"]),
    );
    expect(homeDefault.parentElement).toHaveAttribute("accessibility-elements-hidden", "true");
  });

  test("dot/count badge를 장식으로 숨기고 99+를 표시한다", () => {
    render(<BottomNavigator items={items} selectedId="home" />);

    const dot = screen.getByTestId("ui-lynx-bottom-navigator-badge-journey");
    const count = screen.getByTestId("ui-lynx-bottom-navigator-badge-roleplay");
    expect(dot).toHaveClass("ui-lynx-bottom-navigator-badge-dot");
    expect(dot.parentElement).toHaveAttribute("accessibility-elements-hidden", "true");
    expect(count).toHaveTextContent("99+");
    expect(count.parentElement).toHaveAttribute("accessibility-elements-hidden", "true");
  });

  test("enabled 항목 tap은 id를 전달하고 disabled 항목은 차단한다", () => {
    const bindselect = vi.fn<(id: string) => void>();
    render(<BottomNavigator items={items} selectedId="home" bindselect={bindselect} />);

    fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-home"), {});
    fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-journey"), {});
    fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-settings"), {});

    expect(bindselect).toHaveBeenCalledTimes(2);
    expect(bindselect).toHaveBeenNthCalledWith(1, "home");
    expect(bindselect).toHaveBeenNthCalledWith(2, "journey");
  });

  test("긴 접근성 이름은 시각 text로 렌더하지 않고 온전히 보존한다", () => {
    const longLabel = "새로운 학습 여정을 살펴보는 매우 긴 목적지 이름";
    const longItems = [{ ...items[0]!, accessibilityLabel: longLabel }, items[1]!, items[2]!];
    render(<BottomNavigator items={longItems} selectedId="home" />);

    expect(screen.getByTestId("ui-lynx-bottom-navigator-item-home")).toHaveAttribute(
      "accessibility-label",
      `${longLabel}, 선택됨`,
    );
    expect(screen.queryByText(longLabel)).not.toBeInTheDocument();
  });

  test("disabled 이유를 같은 focus node의 접근성 이름으로 전달한다", () => {
    const disabledItems = [items[0]!, items[1]!, items[3]!];
    render(<BottomNavigator items={disabledItems} selectedId="home" />);

    expect(screen.getByTestId("ui-lynx-bottom-navigator-item-settings")).toHaveAttribute(
      "accessibility-label",
      "설정, 로그인 후 사용 가능",
    );
  });
});
