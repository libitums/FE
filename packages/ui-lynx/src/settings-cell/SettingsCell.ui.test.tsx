import { fireEvent, render, screen } from "@lynx-js/react/testing-library";
import { describe, expect, test, vi } from "vitest";

import { SettingsCell, SettingsGroup } from "./SettingsCell";

function tap(element: Element) {
  fireEvent(element, new Event("bindEvent:tap"));
}

describe("Settings Cell UI", () => {
  test("toggle 행 전체가 상태를 변경하고 별도 중첩 제어를 만들지 않는다", () => {
    const onChange = vi.fn<(checked: boolean) => void>();
    render(
      <SettingsCell trailing="toggle" title="자동 재생" checked={false} onChange={onChange} />,
    );
    const row = screen.getByTestId("ui-lynx-settings-cell");
    expect(row).toHaveAttribute("accessibility-label", "자동 재생, 꺼짐");
    expect(row).toHaveAttribute("accessibility-traits", "button");
    expect(row).toHaveAttribute("accessibility-role-description", "switch");
    expect(row).toHaveAttribute("data-checked", "false");
    expect(row.querySelectorAll("[bindtap]")).toHaveLength(0);
    tap(row);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  test("navigation은 값·설명을 보여주고 행 탭을 전달한다", () => {
    const onNavigate = vi.fn<() => void>();
    render(
      <SettingsCell
        trailing="navigation"
        title="언어"
        description="학습 언어"
        value="한국어"
        onNavigate={onNavigate}
      />,
    );
    const row = screen.getByTestId("ui-lynx-settings-cell");
    expect(row).toHaveAttribute("accessibility-label", "언어, 학습 언어, 한국어");
    expect(row).toHaveTextContent("학습 언어");
    expect(row).toHaveTextContent("한국어");
    tap(row);
    expect(onNavigate).toHaveBeenCalledOnce();
  });

  test("disabled 행은 탭과 포커스를 받지 않는다", () => {
    const onChange = vi.fn<(checked: boolean) => void>();
    render(
      <SettingsCell trailing="toggle" title="자동 재생" checked disabled onChange={onChange} />,
    );
    const row = screen.getByTestId("ui-lynx-settings-cell");
    expect(row).toHaveAttribute("accessibility-traits", "disabled");
    expect(row).toHaveAttribute("focusable", "false");
    expect(row).not.toHaveAttribute("bindtap");
    tap(row);
    expect(onChange).not.toHaveBeenCalled();
  });

  test("group은 셀 사이에만 inset 구분선을 배치하고 아바타를 장식으로 처리한다", () => {
    render(
      <SettingsGroup
        accessibilityLabel="계정 설정"
        items={[
          {
            id: "profile",
            trailing: "navigation",
            title: "프로필",
            avatar: { name: "김말랑" },
            onNavigate: vi.fn<() => void>(),
          },
          {
            id: "notice",
            trailing: "toggle",
            title: "알림",
            avatar: { name: "김말랑" },
            checked: true,
            onChange: vi.fn<(checked: boolean) => void>(),
          },
        ]}
      />,
    );
    const group = screen.getByTestId("ui-lynx-settings-group");
    expect(group).toHaveAttribute("accessibility-label", "계정 설정");
    expect(screen.getAllByTestId("ui-lynx-settings-cell")).toHaveLength(2);
    expect(group.querySelectorAll(".ui-lynx-settings-group-divider")).toHaveLength(1);
    expect(
      group.querySelectorAll(
        '[data-testid="ui-lynx-avatar"][accessibility-elements-hidden="true"]',
      ),
    ).toHaveLength(2);
  });
});
