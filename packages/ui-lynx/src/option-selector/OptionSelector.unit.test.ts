import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { color } from "@libitums/design-tokens";
import { describe, expect, test } from "vitest";

import {
  type OptionSelectorOption,
  type OptionSelectorProps,
  getOptionSelectorContract,
  isSameOptionSelection,
  nextOptionSelection,
} from "./option-selector.contract";

const options: readonly OptionSelectorOption[] = [
  { id: "a", label: "Coffee, please" },
  { id: "b", label: "Tea, please" },
  { id: "c", label: "Water, please", disabled: true },
];

const noop = () => undefined;

function props(overrides: Partial<OptionSelectorProps> = {}): OptionSelectorProps {
  return {
    groupLabel: "알맞은 응답을 고르세요",
    options,
    selectedIds: [],
    onChange: noop,
    ...overrides,
  };
}

describe("getOptionSelectorContract", () => {
  test("기본값은 outlined, m, single, deferred, stack, ui다", () => {
    const contract = getOptionSelectorContract(props());

    expect(contract).toMatchObject({
      className:
        "ui-lynx-option-selector ui-lynx-option-selector-outlined ui-lynx-option-selector-m ui-lynx-option-selector-stack",
      listClassName: "ui-lynx-option-selector-list ui-lynx-option-selector-list-stack",
      groupLabel: "알맞은 응답을 고르세요",
      variant: "outlined",
      size: "m",
      selection: "single",
      commit: "deferred",
      layout: "stack",
      contentLanguage: "ui",
      committed: false,
    });
    expect(contract).not.toHaveProperty("languageTag");
    expect(contract.rows.map((row) => row.map((item) => item.id))).toEqual([["a"], ["b"], ["c"]]);
  });

  test("옵션별 class와 조합을 반영한다", () => {
    expect(
      getOptionSelectorContract(props({ variant: "filled", size: "s", layout: "grid" })).className,
    ).toBe(
      "ui-lynx-option-selector ui-lynx-option-selector-filled ui-lynx-option-selector-s ui-lynx-option-selector-grid",
    );
  });

  test("Grid는 2열 행 우선 순서로 묶는다", () => {
    const contract = getOptionSelectorContract(props({ layout: "grid" }));
    expect(contract.rows.map((row) => row.map((item) => item.id))).toEqual([["a", "b"], ["c"]]);
    expect(contract.listClassName).toContain("ui-lynx-option-selector-list-grid");
  });

  test("항목 상태·접근성 이름·traits·Indicator 색을 계산한다", () => {
    const contract = getOptionSelectorContract(props({ selectedIds: ["b"] }));

    expect(contract.items[0]).toEqual({
      id: "a",
      label: "Coffee, please",
      icon: null,
      selected: false,
      disabled: false,
      interactive: true,
      className: "ui-lynx-option-selector-item ui-lynx-option-selector-item-pressable",
      accessibilityLabel: "Coffee, please",
      traits: "button",
      indicatorColor: null,
    });
    expect(contract.items[1]).toMatchObject({
      selected: true,
      interactive: true,
      className: "ui-lynx-option-selector-item ui-lynx-option-selector-item-selected",
      accessibilityLabel: "Tea, please, 선택됨",
      traits: "button",
      indicatorColor: color.fg.brand,
    });
    expect(contract.items[2]).toMatchObject({
      disabled: true,
      interactive: false,
      className: "ui-lynx-option-selector-item ui-lynx-option-selector-item-disabled",
      accessibilityLabel: "Water, please",
      traits: "disabled",
      indicatorColor: null,
    });
  });

  test("committed는 모든 항목을 Disabled로, 고른 항목을 Disabled + Selected로 둔다", () => {
    const outlined = getOptionSelectorContract(props({ selectedIds: ["a"], committed: true }));
    expect(outlined.committed).toBe(true);
    expect(outlined.items.every((item) => item.disabled && !item.interactive)).toBe(true);
    expect(outlined.items[0]).toMatchObject({
      selected: true,
      traits: "disabled",
      accessibilityLabel: "Coffee, please, 선택됨",
      indicatorColor: color.fg.disabled,
      className:
        "ui-lynx-option-selector-item ui-lynx-option-selector-item-selected ui-lynx-option-selector-item-disabled",
    });

    const filled = getOptionSelectorContract(
      props({ variant: "filled", selectedIds: ["a"], committed: true }),
    );
    expect(filled.items[0]!.indicatorColor).toBe(color.gray[800]);
    expect(
      getOptionSelectorContract(props({ variant: "filled", selectedIds: ["a"] })).items[0]!
        .indicatorColor,
    ).toBe(color.brand.primary);
  });

  test("learning content는 languageTag가 필요하고 trim해 보존한다", () => {
    expect(() => getOptionSelectorContract(props({ contentLanguage: "learning" }))).toThrow(
      "languageTag is required for learning content",
    );
    expect(
      getOptionSelectorContract(props({ contentLanguage: "learning", languageTag: " en-US " })),
    ).toMatchObject({ contentLanguage: "learning", languageTag: "en-US" });
  });

  test("조합 규칙: Multiple은 Deferred만, Immediate는 Single만 허용한다", () => {
    expect(() =>
      getOptionSelectorContract(props({ selection: "multiple", commit: "immediate" })),
    ).toThrow("multiple selection requires deferred commit");
    expect(() =>
      getOptionSelectorContract(props({ selection: "multiple", commit: "deferred" })),
    ).not.toThrow();
    expect(() =>
      getOptionSelectorContract(props({ selection: "single", commit: "immediate" })),
    ).not.toThrow();
  });

  test("선택값은 Single에서 하나 이하이고 존재하는 고유 id여야 한다", () => {
    expect(() => getOptionSelectorContract(props({ selectedIds: ["a", "b"] }))).toThrow(
      "single selection allows at most one selected id",
    );
    expect(() => getOptionSelectorContract(props({ selectedIds: ["missing"] }))).toThrow(
      "selectedIds must reference existing options",
    );
    expect(() =>
      getOptionSelectorContract(props({ selection: "multiple", selectedIds: ["a", "a"] })),
    ).toThrow("selectedIds must be unique");
    expect(() =>
      getOptionSelectorContract(props({ selection: "multiple", selectedIds: ["a", "b"] })),
    ).not.toThrow();
  });

  test("groupLabel과 options를 검증한다", () => {
    expect(() => getOptionSelectorContract(props({ groupLabel: "  " }))).toThrow(
      "groupLabel must not be empty",
    );
    expect(() => getOptionSelectorContract(props({ options: options.slice(0, 1) }))).toThrow(
      "at least 2 options",
    );
    expect(() =>
      getOptionSelectorContract(props({ options: [{ id: " ", label: "A" }, options[1]!] })),
    ).toThrow("option id must not be empty");
    expect(() =>
      getOptionSelectorContract(props({ options: [{ id: "a", label: " " }, options[1]!] })),
    ).toThrow("option label must not be empty");
    expect(() =>
      getOptionSelectorContract(props({ options: [options[0]!, { id: "a", label: "B" }] })),
    ).toThrow("option ids must be unique");
  });

  test("알 수 없는 옵션 값은 거부한다", () => {
    expect(() =>
      getOptionSelectorContract(props({ variant: "ghost" as unknown as "filled" })),
    ).toThrow("OptionSelector variant must be one of");
    expect(() => getOptionSelectorContract(props({ size: "xl" as unknown as "s" }))).toThrow(
      "OptionSelector size must be one of",
    );
  });
});

describe("nextOptionSelection", () => {
  test("Single은 누른 항목 하나로 바꾸고 다시 눌러도 유지한다", () => {
    expect(nextOptionSelection({ options, selection: "single", selectedIds: [], id: "a" })).toEqual(
      ["a"],
    );
    expect(
      nextOptionSelection({ options, selection: "single", selectedIds: ["a"], id: "b" }),
    ).toEqual(["b"]);
    expect(
      nextOptionSelection({ options, selection: "single", selectedIds: ["a"], id: "a" }),
    ).toEqual(["a"]);
  });

  test("Multiple은 켜고 끄며 결과를 options 순서로 정렬한다", () => {
    expect(
      nextOptionSelection({ options, selection: "multiple", selectedIds: ["b"], id: "a" }),
    ).toEqual(["a", "b"]);
    expect(
      nextOptionSelection({ options, selection: "multiple", selectedIds: ["a", "b"], id: "a" }),
    ).toEqual(["b"]);
  });

  test("존재하지 않는 id는 거부한다", () => {
    expect(() =>
      nextOptionSelection({ options, selection: "single", selectedIds: [], id: "missing" }),
    ).toThrow("id must reference an existing option");
  });

  test("isSameOptionSelection은 순서까지 비교한다", () => {
    expect(isSameOptionSelection(["a"], ["a"])).toBe(true);
    expect(isSameOptionSelection(["a", "b"], ["b", "a"])).toBe(false);
    expect(isSameOptionSelection([], ["a"])).toBe(false);
  });
});

describe("option-selector.css", () => {
  const styles = readFileSync(
    resolve(process.cwd(), "src/option-selector/option-selector.css"),
    "utf8",
  );

  test("design token 외의 CSS 변수와 중첩 var 사용자 정의 속성을 쓰지 않는다", () => {
    for (const match of styles.matchAll(/var\((--[A-Za-z0-9_-]+)/g)) {
      expect(match[1]).toMatch(/^--libitum-/);
    }
    expect(styles).not.toMatch(/^\s*--[A-Za-z0-9_-]+\s*:/m);
    expect(styles).not.toMatch(/color:\s*inherit/);
    expect(styles).not.toMatch(/display:\s*linear/);
    expect(styles).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  test("Size별 최소 높이·padding·모서리·Label typography를 token으로 고정한다", () => {
    expect(styles).toMatch(
      /\.ui-lynx-option-selector-s \.ui-lynx-option-selector-item\s*\{[^}]*min-height:\s*var\(--libitum-spacing-48\)[^}]*border-radius:\s*var\(--libitum-radius-md\)/,
    );
    expect(styles).toMatch(
      /\.ui-lynx-option-selector-m \.ui-lynx-option-selector-item\s*\{[^}]*min-height:\s*60px[^}]*border-radius:\s*var\(--libitum-radius-lg\)/,
    );
    expect(styles).toMatch(
      /\.ui-lynx-option-selector-l \.ui-lynx-option-selector-item\s*\{[^}]*min-height:\s*68px[^}]*border-radius:\s*var\(--libitum-radius-lg\)/,
    );
    expect(styles).toMatch(
      /\.ui-lynx-option-selector-s \.ui-lynx-option-selector-surface\s*\{[^}]*padding:\s*var\(--libitum-spacing-12\)/,
    );
    expect(styles).toMatch(
      /\.ui-lynx-option-selector-m \.ui-lynx-option-selector-surface\s*\{[^}]*padding:\s*var\(--libitum-spacing-16\)/,
    );
    expect(styles).toMatch(
      /\.ui-lynx-option-selector-l \.ui-lynx-option-selector-surface\s*\{[^}]*padding:\s*var\(--libitum-spacing-20\)/,
    );
    for (const [size, typography] of [
      ["s", "button-m"],
      ["m", "button-xl"],
      ["l", "heading-s"],
    ] as const) {
      expect(styles).toMatch(
        new RegExp(
          `\\.ui-lynx-option-selector-${size} \\.ui-lynx-option-selector-label\\s*\\{[^}]*font-size:\\s*var\\(--libitum-typography-${typography}-font-size\\)`,
        ),
      );
    }
    for (const [size, icon] of [
      ["s", "xs"],
      ["m", "sm"],
      ["l", "md"],
    ] as const) {
      expect(styles).toMatch(
        new RegExp(
          `\\.ui-lynx-option-selector-${size} \\.ui-lynx-option-selector-indicator-slot,[^{]*\\{[^}]*width:\\s*var\\(--libitum-icon-size-${icon}\\)`,
        ),
      );
    }
  });

  test("테두리 영역은 바깥·안쪽 1px 두 겹으로 늘 2px을 차지한다", () => {
    expect(styles).toMatch(
      /\.ui-lynx-option-selector-item\s*\{[^}]*border-width:\s*var\(--libitum-stroke-width-thin\)/,
    );
    expect(styles).toMatch(
      /\.ui-lynx-option-selector-surface\s*\{[^}]*border-width:\s*var\(--libitum-stroke-width-thin\)/,
    );
  });

  test("Label 색은 모든 상태에서 <text>에 직접 지정한다", () => {
    for (const color of [
      "fg-neutral",
      "fg-brand",
      "fg-disabled",
      "gray-50",
      "brand-primary",
      "gray-800",
    ]) {
      expect(styles).toMatch(
        new RegExp(
          `\\.ui-lynx-option-selector-label\\s*\\{[^}]*color:\\s*var\\(--libitum-color-${color}\\)`,
        ),
      );
    }
  });

  test("Pressed는 pressable 항목에만 적용하고 Selected에는 Pressed 배경을 쓰지 않는다", () => {
    expect(styles).toMatch(
      /\.ui-lynx-option-selector-outlined \.ui-lynx-option-selector-item-pressable:active\s*\{[^}]*background-color:\s*var\(--libitum-color-gray-100\)/,
    );
    expect(styles).toMatch(
      /\.ui-lynx-option-selector-filled \.ui-lynx-option-selector-item-pressable:active\s*\{[^}]*background-color:\s*var\(--libitum-color-gray-900\)/,
    );
    expect(styles).not.toMatch(/item-selected[^{]*:active/);
  });

  test("Grid 행은 같은 너비의 두 열로 나누고 목록 간격을 flex gap으로 둔다", () => {
    expect(styles).toMatch(
      /\.ui-lynx-option-selector-item,\s*\.ui-lynx-option-selector-cell-spacer\s*\{[^}]*flex:\s*1 1 0/,
    );
    expect(styles).toMatch(/row-gap:\s*var\(--libitum-spacing-8\)/);
    expect(styles).toMatch(/column-gap:\s*var\(--libitum-spacing-12\)/);
  });
});
