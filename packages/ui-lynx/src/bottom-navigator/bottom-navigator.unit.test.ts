import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { color } from "@libitums/design-tokens";
import { describe, expect, test } from "vitest";

import type { BottomNavigatorItem } from "./contract";
import { getBottomNavigatorContract, getBottomNavigatorContracts } from "./logic";

const icon = '<svg viewBox="0 0 24 24"><path fill="currentColor" /></svg>';
const items: readonly BottomNavigatorItem[] = [
  { id: "home", accessibilityLabel: "홈", icon },
  {
    id: "journey",
    accessibilityLabel: "여정",
    icon,
    badge: { kind: "dot", accessibilityLabel: "새 소식 있음" },
  },
  { id: "roleplay", accessibilityLabel: "롤플레이", icon, badge: { kind: "count", count: 120 } },
  {
    id: "settings",
    accessibilityLabel: "설정",
    icon,
    availability: "disabled",
    disabledReason: "로그인 후 사용 가능",
  },
];

describe("getBottomNavigatorContracts", () => {
  test("3~5개 항목과 정확히 하나의 enabled 선택값을 검증한다", () => {
    expect(() =>
      getBottomNavigatorContracts({ items: items.slice(0, 2), selectedId: "home" }),
    ).toThrow("between 3 and 5 items");
    expect(() =>
      getBottomNavigatorContracts({ items: [...items, items[0]!, items[1]!], selectedId: "home" }),
    ).toThrow("between 3 and 5 items");
    expect(() => getBottomNavigatorContracts({ items, selectedId: "missing" })).toThrow(
      "selectedId must reference exactly one enabled item",
    );
    expect(() => getBottomNavigatorContracts({ items, selectedId: "settings" })).toThrow(
      "selectedId must reference exactly one enabled item",
    );
  });

  test("id와 접근성 이름은 비어 있지 않고 id는 고유해야 한다", () => {
    expect(() =>
      getBottomNavigatorContracts({
        items: [{ ...items[0]!, id: " " }, items[1]!, items[2]!],
        selectedId: " ",
      }),
    ).toThrow("item id must not be empty");
    expect(() =>
      getBottomNavigatorContracts({
        items: [{ ...items[0]!, accessibilityLabel: " " }, items[1]!, items[2]!],
        selectedId: "home",
      }),
    ).toThrow("accessibilityLabel must not be empty");
    expect(() =>
      getBottomNavigatorContracts({
        items: [items[0]!, { ...items[1]!, id: "home" }, items[2]!],
        selectedId: "home",
      }),
    ).toThrow("item ids must be unique");
  });

  test("선택·비선택·disabled 상태와 아이콘 token을 고정한다", () => {
    const contracts = getBottomNavigatorContracts({ items, selectedId: "journey" });

    expect(contracts[0]).toMatchObject({
      selected: false,
      disabled: false,
      interactive: true,
      traits: "button",
      accessibilityLabel: "홈",
      iconColor: color.fg["neutral-subtle"],
      pressedIconColor: color.fg["neutral-muted"],
    });
    expect(contracts[1]).toMatchObject({
      selected: true,
      interactive: true,
      accessibilityLabel: "여정, 선택됨, 새 소식 있음",
      iconColor: color.fg["neutral-inverted"],
      pressedIconColor: color.fg["neutral-inverted"],
      className: expect.stringContaining("ui-lynx-bottom-navigator-item-selected"),
    });
    expect(contracts[3]).toMatchObject({
      disabled: true,
      interactive: false,
      traits: "disabled",
      accessibilityLabel: "설정, 로그인 후 사용 가능",
      iconColor: color.fg.disabled,
      pressedIconColor: color.fg.disabled,
      className: expect.stringContaining("ui-lynx-bottom-navigator-item-disabled"),
    });
  });

  test("enabled 항목만 좌우 D-pad 순서에 들어가고 양끝은 자기 자신을 가리킨다", () => {
    const contracts = getBottomNavigatorContracts({ items, selectedId: "home" });

    expect(contracts[0]).toMatchObject({
      focusable: true,
      focusIndex: "0,0",
      nextFocusLeft: "ui-lynx-bottom-navigator-focus-0",
      nextFocusRight: "ui-lynx-bottom-navigator-focus-1",
    });
    expect(contracts[1]).toMatchObject({
      focusable: true,
      focusIndex: "1,0",
      nextFocusLeft: "ui-lynx-bottom-navigator-focus-0",
      nextFocusRight: "ui-lynx-bottom-navigator-focus-2",
    });
    expect(contracts[2]).toMatchObject({
      focusable: true,
      focusIndex: "2,0",
      nextFocusLeft: "ui-lynx-bottom-navigator-focus-1",
      nextFocusRight: "ui-lynx-bottom-navigator-focus-2",
    });
    expect(contracts[3]).toMatchObject({ focusable: false });
  });

  test("count badge는 99+로 제한하되 접근성 이름에는 실제 개수를 보존한다", () => {
    const contracts = getBottomNavigatorContracts({ items, selectedId: "home" });
    expect(contracts[2]).toMatchObject({
      badge: { kind: "count", text: "99+" },
      accessibilityLabel: "롤플레이, 읽지 않은 알림 120개",
    });
  });

  test.each([3, 4, 5] as const)("%s개 navigator 계약과 item 순서를 고정한다", (count) => {
    const source = [
      ...items.slice(0, 3),
      ...(count >= 4 ? [{ id: "four", accessibilityLabel: "넷", icon }] : []),
      ...(count === 5 ? [{ id: "five", accessibilityLabel: "다섯", icon }] : []),
    ];
    const snapshot = structuredClone(source);
    const contract = getBottomNavigatorContract({ items: source, selectedId: "home" });

    expect(contract).toMatchObject({
      className: "ui-lynx-bottom-navigator",
      itemsClassName: `ui-lynx-bottom-navigator-items ui-lynx-bottom-navigator-items-${count}`,
      itemCount: count,
    });
    expect(contract.items.map((item) => item.id)).toEqual(source.map((item) => item.id));
    expect(source).toEqual(snapshot);
  });

  test("dot 이름과 count는 유효해야 한다", () => {
    expect(() =>
      getBottomNavigatorContracts({
        items: [
          items[0]!,
          { ...items[1]!, badge: { kind: "dot", accessibilityLabel: " " } },
          items[2]!,
        ],
        selectedId: "home",
      }),
    ).toThrow("dot badge accessibilityLabel must not be empty");
    expect(() =>
      getBottomNavigatorContracts({
        items: [items[0]!, items[1]!, { ...items[2]!, badge: { kind: "count", count: 0 } }],
        selectedId: "home",
      }),
    ).toThrow("count badge must be a positive integer");
    expect(() =>
      getBottomNavigatorContracts({
        items: [items[0]!, { ...items[1]!, badge: { kind: "unknown" } as never }, items[2]!],
        selectedId: "home",
      }),
    ).toThrow("badge kind must be dot or count");
  });

  test("disabled 항목은 사용할 수 없는 이유를 별도 계약으로 요구하고 접근성 이름에 합친다", () => {
    expect(() =>
      getBottomNavigatorContracts({
        items: [items[0]!, items[1]!, { ...items[3]!, disabledReason: " " } as BottomNavigatorItem],
        selectedId: "home",
      }),
    ).toThrow("disabledReason must not be empty");

    const disabledItem = items[3]!;
    expect(
      getBottomNavigatorContracts({
        items: [items[0]!, items[1]!, disabledItem],
        selectedId: "home",
      })[2],
    ).toMatchObject({ accessibilityLabel: "설정, 로그인 후 사용 가능", disabled: true });
  });

  test.each([
    ["id", undefined, "item id must not be empty"],
    ["id", null, "item id must not be empty"],
    ["id", 1, "item id must not be empty"],
    ["accessibilityLabel", undefined, "item accessibilityLabel must not be empty"],
    ["accessibilityLabel", null, "item accessibilityLabel must not be empty"],
  ] as const)("JS 소비자의 잘못된 %s=%j 입력을 계약 오류로 거부한다", (key, value, message) => {
    const invalid = { ...items[0]!, [key]: value } as unknown as BottomNavigatorItem;
    expect(() =>
      getBottomNavigatorContracts({ items: [invalid, items[1]!, items[2]!], selectedId: "home" }),
    ).toThrow(message);
  });

  test("JS 소비자의 누락된 disabledReason과 dot label을 계약 오류로 거부한다", () => {
    const invalidDisabled = {
      ...items[3]!,
      disabledReason: undefined,
    } as unknown as BottomNavigatorItem;
    const invalidDot = {
      ...items[1]!,
      badge: { kind: "dot", accessibilityLabel: null },
    } as unknown as BottomNavigatorItem;

    expect(() =>
      getBottomNavigatorContracts({
        items: [items[0]!, items[1]!, invalidDisabled],
        selectedId: "home",
      }),
    ).toThrow("disabledReason must not be empty");
    expect(() =>
      getBottomNavigatorContracts({
        items: [items[0]!, invalidDot, items[2]!],
        selectedId: "home",
      }),
    ).toThrow("dot badge accessibilityLabel must not be empty");
  });
});

describe("bottom-navigator.css", () => {
  const styles = readFileSync(
    resolve(process.cwd(), "src/bottom-navigator/bottom-navigator.css"),
    "utf8",
  );

  test("bar와 cell의 정본 token 및 48px focusable hit area를 고정한다", () => {
    expect(styles).toMatch(/\.ui-lynx-bottom-navigator\s*\{[^}]*position:\s*fixed[^}]*bottom:\s*0/);
    expect(styles).toMatch(/background-color:\s*var\(--libitum-color-white\)/);
    expect(styles).toMatch(
      /border-radius:\s*var\(--libitum-radius-md\) var\(--libitum-radius-md\) 0 0/,
    );
    expect(styles).toMatch(
      /\.ui-lynx-bottom-navigator-item\s*\{[^}]*min-width:\s*var\(--libitum-spacing-48\)[^}]*height:\s*var\(--libitum-spacing-48\)/,
    );
    expect(styles).toMatch(
      /\.ui-lynx-bottom-navigator-surface\s*\{[^}]*width:\s*var\(--libitum-spacing-40\)[^}]*height:\s*var\(--libitum-spacing-40\)/,
    );
    expect(styles).toMatch(
      /\.ui-lynx-bottom-navigator-item-selected \.ui-lynx-bottom-navigator-surface\s*\{[^}]*width:\s*60px/,
    );
  });

  test("active pill, pressed, focus, badge 계약을 token으로 표현한다", () => {
    expect(styles).toMatch(
      /\.ui-lynx-bottom-navigator-item-selected \.ui-lynx-bottom-navigator-surface\s*\{[^}]*background-color:\s*var\(--libitum-color-brand-primary\)/,
    );
    expect(styles).toMatch(
      /\.ui-lynx-bottom-navigator-item-selected:active \.ui-lynx-bottom-navigator-surface\s*\{[^}]*background-color:\s*var\(--libitum-color-brand-primary-pressed\)/,
    );
    expect(styles).toMatch(
      /\.ui-lynx-bottom-navigator-item:not\(\.ui-lynx-bottom-navigator-item-disabled\):focus-visible[^}]*box-shadow:[^}]*var\(--libitum-color-border-strong\)/,
    );
    expect(styles).toMatch(
      /\.ui-lynx-bottom-navigator-badge-dot\s*\{[^}]*width:\s*var\(--libitum-spacing-8\)[^}]*height:\s*var\(--libitum-spacing-8\)[^}]*background-color:\s*var\(--libitum-color-feedback-incorrect\)/,
    );
    expect(styles).toMatch(
      /\.ui-lynx-bottom-navigator-badge-count\s*\{[^}]*min-width:\s*var\(--libitum-spacing-16\)[^}]*height:\s*var\(--libitum-spacing-16\)[^}]*background-color:\s*var\(--libitum-color-feedback-incorrect-strong-surface\)/,
    );
  });

  test("작은 viewport에서 5개 항목이 shrink되되 hit area와 아이콘 크기는 줄지 않는다", () => {
    expect(styles).toMatch(
      /\.ui-lynx-bottom-navigator-items\s*\{[^}]*width:\s*100%[^}]*justify-content:\s*space-between/,
    );
    expect(styles).toMatch(/\.ui-lynx-bottom-navigator-item\s*\{[^}]*flex:\s*1 1 0/);
    expect(styles).toMatch(
      /\.ui-lynx-bottom-navigator-icon\s*\{[^}]*width:\s*var\(--libitum-icon-size-sm\)[^}]*height:\s*var\(--libitum-icon-size-sm\)/,
    );
  });
});
