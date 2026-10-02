import { describe, expect, test, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  getSettingsCellContract,
  validateSettingsGroup,
  type SettingsCellProps,
} from "./settings-cell.contract";

describe("Settings Cell contract", () => {
  test("toggle 상태와 설명을 하나의 접근성 이름으로 결합한다", () => {
    const contract = getSettingsCellContract({
      trailing: "toggle",
      title: " 자동 재생 ",
      description: " 다음 학습 ",
      checked: true,
      onChange: vi.fn<(checked: boolean) => void>(),
    });
    expect(contract.accessibilityLabel).toBe("자동 재생, 다음 학습, on");
    expect(contract).toHaveProperty("accessibilityTapEnabled", true);
    expect(contract.className).toContain("ui-lynx-settings-cell-type-toggle");
  });

  test("navigation 값은 접근성 이름에 포함하고 빈 설명은 생략한다", () => {
    const contract = getSettingsCellContract({
      trailing: "navigation",
      title: "언어",
      value: " 한국어 ",
      description: " ",
      onNavigate: vi.fn<() => void>(),
    });
    expect(contract.accessibilityLabel).toBe("언어, 한국어");
    expect(contract.value).toBe("한국어");
    expect(contract).toHaveProperty("accessibilityTapEnabled", true);
    expect(contract).not.toHaveProperty("description");
  });

  test("toggle에 value를 넣거나 빈 title을 전달하면 거부한다", () => {
    expect(() =>
      getSettingsCellContract({
        trailing: "toggle",
        title: "알림",
        checked: false,
        onChange: vi.fn<(checked: boolean) => void>(),
        value: "값",
      } as unknown as SettingsCellProps),
    ).toThrow(/cannot have a value/);
    expect(() =>
      getSettingsCellContract({
        trailing: "navigation",
        title: " ",
        onNavigate: vi.fn<() => void>(),
      }),
    ).toThrow(/title/);
  });

  test("disabled 행은 Android 접근성 클릭을 노출하지 않는다", () => {
    const contract = getSettingsCellContract({
      trailing: "navigation",
      title: "로그아웃",
      disabled: true,
      onNavigate: vi.fn<() => void>(),
    });
    expect(contract).toHaveProperty("accessibilityTapEnabled", false);
  });

  test("group은 비어 있거나 아바타 사용이 섞이면 거부한다", () => {
    expect(() => validateSettingsGroup({ accessibilityLabel: "설정", items: [] })).toThrow(
      /at least one/,
    );
    expect(() =>
      validateSettingsGroup({
        accessibilityLabel: "설정",
        items: [
          {
            id: "a",
            trailing: "navigation",
            title: "계정",
            avatar: { name: "김말랑" },
            onNavigate: vi.fn<() => void>(),
          },
          { id: "b", trailing: "navigation", title: "알림", onNavigate: vi.fn<() => void>() },
        ],
      }),
    ).toThrow(/mix avatar/);
  });

  test("group은 중복 id를 거부한다", () => {
    expect(() =>
      validateSettingsGroup({
        accessibilityLabel: "설정",
        items: [
          { id: "same", trailing: "navigation", title: "계정", onNavigate: vi.fn<() => void>() },
          { id: "same", trailing: "navigation", title: "알림", onNavigate: vi.fn<() => void>() },
        ],
      }),
    ).toThrow(/unique/);
  });

  test("높이·간격·토글 크기·구분선과 disabled 토큰을 유지한다", () => {
    const css = readFileSync(resolve(process.cwd(), "src/settings-cell/settings-cell.css"), "utf8");
    expect(css).toMatch(/\.ui-lynx-settings-cell\s*\{[^}]*min-height:\s*72px/s);
    expect(css).toMatch(
      /\.ui-lynx-settings-cell\s*\{[^}]*padding:\s*var\(--libitum-spacing-16\) var\(--libitum-spacing-20\)/s,
    );
    expect(css).toMatch(
      /\.ui-lynx-settings-cell-switch\s*\{[^}]*width:\s*32px;[^}]*height:\s*20px/s,
    );
    expect(css).toMatch(
      /\.ui-lynx-settings-cell-switch-knob\s*\{[^}]*width:\s*12px;[^}]*height:\s*12px/s,
    );
    expect(css).toContain("opacity: var(--libitum-opacity-disabled)");
    expect(css).toMatch(
      /\.ui-lynx-settings-group-divider\s*\{[^}]*margin:\s*0 var\(--libitum-spacing-20\)/s,
    );
  });
});
