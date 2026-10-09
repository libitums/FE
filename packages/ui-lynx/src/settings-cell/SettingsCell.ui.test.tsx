import { fireEvent, render, screen, within } from "@lynx-js/react/testing-library";
import { describe, expect, test, vi } from "vitest";

import { MotionProvider } from "../motion";
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
    expect(row).toHaveAttribute("accessibility-label", "자동 재생, off");
    expect(row).toHaveAttribute("accessibility-traits", "button");
    expect(row).toHaveAttribute("accessibility-role-description", "switch");
    expect(row).toHaveAttribute("flatten", "false");
    expect(row).toHaveAttribute("accessibility-enable-tap", "true");
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
    expect(row).not.toHaveAttribute("accessibility-enable-tap");
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
    // 그룹은 접근성 요소가 아닙니다 — 셀이 각각 요소로 서야 스크린리더가 셀 하나하나에 닿습니다.
    expect(group).toHaveAttribute("accessibility-element", "false");
    for (const cell of screen.getAllByTestId("ui-lynx-settings-cell")) {
      expect(cell).toHaveAttribute("accessibility-element", "true");
    }
    expect(screen.getAllByTestId("ui-lynx-settings-cell")).toHaveLength(2);
    expect(group.querySelectorAll(".ui-lynx-settings-group-divider")).toHaveLength(1);
    expect(
      group.querySelectorAll(
        '[data-testid="ui-lynx-avatar"][accessibility-elements-hidden="true"]',
      ),
    ).toHaveLength(2);
  });

  test("그룹 항목 상자마다 id를 실은 testid가 있어 항목을 가려 집을 수 있다", () => {
    const onNavigate = vi.fn<() => void>();
    render(
      <SettingsGroup
        accessibilityLabel="계정"
        items={[
          { id: "profile", trailing: "navigation", title: "프로필", onNavigate },
          { id: "terms", trailing: "navigation", title: "약관", onNavigate: vi.fn<() => void>() },
        ]}
      />,
    );

    const item = screen.getByTestId("ui-lynx-settings-group-item-profile");
    const cell = within(item).getByTestId("ui-lynx-settings-cell");
    expect(cell).toHaveAttribute("accessibility-label", "프로필");
    tap(cell);
    expect(onNavigate).toHaveBeenCalledTimes(1);
  });
});

// 테스트 렌더러는 값이 undefined인 data-* 속성을 문자열 "null"로 남깁니다. 부재는 null 또는 "null"로 봅니다.
/** 요소와 자손의 accessibility-* 속성을 순서대로 모읍니다. */
const accessibilitySnapshot = (root: Element): Record<string, string>[] =>
  [root, ...Array.from(root.querySelectorAll("*"))].map((element) =>
    Object.fromEntries(
      Array.from(element.attributes)
        .filter((attribute) => attribute.name.startsWith("accessibility-"))
        .map((attribute) => [attribute.name, attribute.value]),
    ),
  );

describe("Settings Cell motion 컨텍스트", () => {
  test("SC1: reduced Provider에서 toggle 셀과 SettingsGroup 안의 셀이 data-motion과 reduced 클래스를 낸다", () => {
    render(
      <MotionProvider motion="reduced">
        <SettingsCell trailing="toggle" title="자동 재생" checked={false} onChange={() => {}} />
        <SettingsGroup
          accessibilityLabel="재생"
          items={[
            {
              id: "autoplay",
              trailing: "toggle",
              title: "자동 재생",
              checked: true,
              onChange: () => {},
            },
            {
              id: "sound",
              trailing: "toggle",
              title: "효과음",
              checked: false,
              onChange: () => {},
            },
          ]}
        />
      </MotionProvider>,
    );
    const rows = screen.getAllByTestId("ui-lynx-settings-cell");
    expect(rows).toHaveLength(3);
    for (const row of rows) {
      expect(row).toHaveAttribute("data-motion", "reduced");
      expect(row).toHaveClass("ui-lynx-settings-cell-motion-reduced");
    }
  });

  test("SC2: Provider가 없으면 data-motion과 motion 클래스가 없다", () => {
    render(<SettingsCell trailing="toggle" title="자동 재생" checked onChange={() => {}} />);
    const row = screen.getByTestId("ui-lynx-settings-cell");
    expect(row).not.toHaveAttribute("data-motion");
    expect(row.hasAttribute("data-motion")).toBe(false);
    expect(row.getAttribute("class") ?? "").not.toContain("motion");
  });

  test("SC1(R2). reduced Provider에서도 accessibility-* 속성이 Provider 없이와 같다", () => {
    const plain = render(
      <SettingsCell trailing="toggle" title="자동 재생" checked onChange={() => {}} />,
    );
    const expected = accessibilitySnapshot(screen.getByTestId("ui-lynx-settings-cell"));
    plain.unmount();
    render(
      <MotionProvider motion="reduced">
        <SettingsCell trailing="toggle" title="자동 재생" checked onChange={() => {}} />
      </MotionProvider>,
    );
    const snapshot = accessibilitySnapshot(screen.getByTestId("ui-lynx-settings-cell"));
    expect(snapshot).toEqual(expected);
    expect(snapshot[0]).toHaveProperty("accessibility-role-description", "switch");
  });
});
