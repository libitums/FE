import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { color } from "@libitums/design-tokens";
import { describe, expect, test } from "vitest";

import {
  type BottomNavigatorItem,
  getBottomNavigatorContract,
  getBottomNavigatorContracts,
} from "./bottom-navigator.contract";

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
      iconColor: color.gray["500"],
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

  // timing flag는 선택된 항목에만 실립니다. 비선택에도 붙으면 전환과 무관한 렌더까지
  // 같은 이름으로 실려 성능 수집이 섞입니다(FE ADR-0019).
  test("timing flag는 선택된 항목에만 실린다", () => {
    const flagged = items.map((item) => ({ ...item, timingFlag: `libitum:navigation:${item.id}` }));
    const contracts = getBottomNavigatorContracts({ items: flagged, selectedId: "journey" });

    expect(contracts[1]).toMatchObject({ timingFlag: "libitum:navigation:journey" });
    expect(contracts[0]).not.toHaveProperty("timingFlag");
    expect(contracts[2]).not.toHaveProperty("timingFlag");
    expect(contracts[3]).not.toHaveProperty("timingFlag");
  });

  // flag를 주지 않은 소비자에게 빈 속성이 새어 나가면 안 됩니다 — 속성이 아예 없어야
  // 컴포넌트가 `__lynx_timing_flag`를 붙이지 않습니다.
  test("timing flag를 주지 않으면 계약에 그 열쇠가 없다", () => {
    const contracts = getBottomNavigatorContracts({ items, selectedId: "journey" });

    expect(contracts[1]).not.toHaveProperty("timingFlag");
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

  // 바를 화면 바닥에 붙이는 일은 셸이 집니다. `position: fixed`가 되살아나면 콘텐츠가
  // 바 뒤로 숨고 safe area 여백이 두 번 겹치므로, 없음을 답니다.
  test("바는 스스로 자리 잡지 않고 셸의 흐름에 놓인다", () => {
    expect(styles).not.toMatch(/\.ui-lynx-bottom-navigator\s*\{[^}]*position:\s*fixed/);
  });

  test("바의 정본 token을 고정한다", () => {
    expect(styles).toMatch(
      /\.ui-lynx-bottom-navigator\s*\{[^}]*background-color:\s*var\(--libitum-color-background-primary\)/,
    );
    expect(styles).toMatch(
      /border-radius:\s*var\(--libitum-radius-xl\) var\(--libitum-radius-xl\) 0 0/,
    );
    // 세로 4 · 가로 24입니다. 위아래에도 24를 주면 바가 88pt로 부풀어 iOS 기본
    // 탭바(49pt)와 크게 어긋납니다.
    expect(styles).toMatch(
      /\.ui-lynx-bottom-navigator\s*\{[^}]*padding:\s*var\(--libitum-spacing-4\) var\(--libitum-spacing-24\)/,
    );
  });

  // 항목 상자는 선택 여부와 무관하게 58 × 40입니다. 선택될 때만 넓어지면 이웃이 옆으로
  // 밀리므로, 두 크기가 갈리면 여기서 빨개집니다.
  test("항목 상자는 선택 여부와 무관하게 같은 크기다", () => {
    expect(styles).toMatch(
      /\.ui-lynx-bottom-navigator-item\s*\{[^}]*width:\s*58px[^}]*height:\s*40px/,
    );
    expect(styles).toMatch(
      /\.ui-lynx-bottom-navigator-surface\s*\{[^}]*width:\s*100%[^}]*height:\s*100%/,
    );
    // 선택 규칙은 배경색만 바꿉니다 — 폭을 다시 건드리면 레이아웃이 흔들립니다.
    expect(styles).not.toMatch(
      /\.ui-lynx-bottom-navigator-item-selected[^}]*\{[^}]*(?:max-)?width:/,
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

  // 항목은 폭을 나눠 갖지 않고 고정 간격으로 가운데 모입니다. `flex: 1 1 0`가 돌아오면
  // 항목 수에 따라 크기가 흔들리므로 없음을 함께 답니다.
  test("항목은 고정 간격으로 가운데 모이고 크기를 나눠 갖지 않는다", () => {
    expect(styles).toMatch(
      /\.ui-lynx-bottom-navigator-items\s*\{[^}]*justify-content:\s*center[^}]*gap:\s*var\(--libitum-spacing-32\)/,
    );
    expect(styles).not.toMatch(/\.ui-lynx-bottom-navigator-item\s*\{[^}]*flex:/);
    expect(styles).toMatch(
      /\.ui-lynx-bottom-navigator-icon\s*\{[^}]*width:\s*var\(--libitum-icon-size-md\)[^}]*height:\s*var\(--libitum-icon-size-md\)/,
    );
  });
});
