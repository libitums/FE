import { color } from "@libitums/design-tokens";

export type OptionSelectorVariant = "filled" | "outlined";
export type OptionSelectorSize = "s" | "m" | "l";
export type OptionSelectorSelection = "single" | "multiple";
export type OptionSelectorCommit = "deferred" | "immediate";
export type OptionSelectorLayout = "stack" | "grid";
export type OptionSelectorContentLanguage = "ui" | "learning";

export type OptionSelectorOption = {
  readonly id: string;
  readonly label: string;
  readonly disabled?: boolean;
  /**
   * Label 앞에 붙는 장식 그림(SVG 문자열, 예: 국기). 정본 스펙 밖의 FE 확장이다(2026-09-21 언어
   * 선택 디자인 반영). 장식이라 접근성 이름에 들어가지 않는다 — 뜻은 Label이 진다.
   */
  readonly icon?: string;
  /**
   * 보이는 Label과 다른 접근성 이름(FE 확장, 2026-09-21). Label에 국기 이모지처럼 읽히면 거슬리는
   * 장식이 섞일 때 쓴다. 없으면 Label이 이름이다. 선택 접미사는 이 이름 뒤에 붙는다.
   */
  readonly accessibilityLabel?: string;
};

export type OptionSelectorProps = {
  /** 무엇을 고르는지 알리는 질문·지시문. 목록의 접근성 이름이 된다. */
  readonly groupLabel: string;
  readonly options: readonly OptionSelectorOption[];
  /** controlled 선택값. Single은 0~1개, Multiple은 0개 이상이다. */
  readonly selectedIds: readonly string[];
  readonly onChange: (selectedIds: readonly string[]) => void;
  /** Immediate 전용. 선택한 직후 그 항목 id로 호출한다. */
  readonly onCommit?: (id: string) => void;
  /** 제출·확정 뒤 모든 항목을 Disabled로, 고른 항목은 Disabled + Selected로 둔다. */
  readonly committed?: boolean;
  readonly variant?: OptionSelectorVariant;
  readonly size?: OptionSelectorSize;
  readonly selection?: OptionSelectorSelection;
  readonly commit?: OptionSelectorCommit;
  readonly layout?: OptionSelectorLayout;
  readonly contentLanguage?: OptionSelectorContentLanguage;
  readonly languageTag?: string;
};

export type OptionSelectorItemContract = {
  readonly id: string;
  readonly label: string;
  readonly selected: boolean;
  readonly disabled: boolean;
  readonly interactive: boolean;
  readonly className: string;
  readonly accessibilityLabel: string;
  readonly traits: "button" | "disabled";
  /** Label 앞 장식 그림. 없으면 null이다. */
  readonly icon: string | null;
  /** Selected일 때만 Indicator를 그린다. svg current-color는 CSS 변수를 읽지 못해 TS token 값을 넘긴다. */
  readonly indicatorColor: string | null;
};

export type OptionSelectorContract = {
  readonly className: string;
  readonly listClassName: string;
  readonly groupLabel: string;
  readonly variant: OptionSelectorVariant;
  readonly size: OptionSelectorSize;
  readonly selection: OptionSelectorSelection;
  readonly commit: OptionSelectorCommit;
  readonly layout: OptionSelectorLayout;
  readonly contentLanguage: OptionSelectorContentLanguage;
  readonly languageTag?: string;
  readonly committed: boolean;
  readonly items: readonly OptionSelectorItemContract[];
  /** 행 우선 순서. Stack은 한 행에 하나, Grid는 한 행에 둘이다. */
  readonly rows: readonly (readonly OptionSelectorItemContract[])[];
};

export type OptionSelectorSelectionInput = {
  readonly options: readonly OptionSelectorOption[];
  readonly selection: OptionSelectorSelection;
  readonly selectedIds: readonly string[];
  readonly id: string;
};

const variants = new Set<OptionSelectorVariant>(["filled", "outlined"]);
const sizes = new Set<OptionSelectorSize>(["s", "m", "l"]);
const selections = new Set<OptionSelectorSelection>(["single", "multiple"]);
const commits = new Set<OptionSelectorCommit>(["deferred", "immediate"]);
const layouts = new Set<OptionSelectorLayout>(["stack", "grid"]);
const contentLanguages = new Set<OptionSelectorContentLanguage>(["ui", "learning"]);

// Selected·Disabled + Selected의 Label·Indicator 색. 나머지 상태는 Indicator를 그리지 않는다.
const indicatorColors = {
  filled: { selected: color.brand.primary, disabledSelected: color.gray[800] },
  outlined: { selected: color.fg.brand, disabledSelected: color.fg.disabled },
} as const;

function requireOption<T extends string>(value: T, allowed: ReadonlySet<T>, name: string): T {
  if (!allowed.has(value)) {
    throw new Error(`OptionSelector ${name} must be one of ${[...allowed].join(", ")}`);
  }
  return value;
}

function requireText(value: unknown, name: string): string {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) throw new Error(`OptionSelector ${name} must not be empty`);
  return text;
}

function validateOptions(options: readonly OptionSelectorOption[]): void {
  if (!Array.isArray(options) || options.length < 2) {
    throw new Error("OptionSelector requires at least 2 options");
  }
  const ids = new Set<string>();
  for (const option of options) {
    if (typeof option.id !== "string" || !option.id.trim()) {
      throw new Error("OptionSelector option id must not be empty");
    }
    requireText(option.label, "option label");
    if (ids.has(option.id)) throw new Error("OptionSelector option ids must be unique");
    ids.add(option.id);
  }
}

function validateSelectedIds(
  options: readonly OptionSelectorOption[],
  selection: OptionSelectorSelection,
  selectedIds: readonly string[],
): void {
  if (!Array.isArray(selectedIds)) {
    throw new Error("OptionSelector selectedIds must be an array");
  }
  if (selection === "single" && selectedIds.length > 1) {
    throw new Error("OptionSelector single selection allows at most one selected id");
  }
  const known = new Set(options.map((option) => option.id));
  const seen = new Set<string>();
  for (const id of selectedIds) {
    if (!known.has(id))
      throw new Error("OptionSelector selectedIds must reference existing options");
    if (seen.has(id)) throw new Error("OptionSelector selectedIds must be unique");
    seen.add(id);
  }
}

/**
 * 탭 한 번 뒤의 선택값을 계산한다. Single은 누른 항목 하나만 남기고(다시 눌러도 유지),
 * Multiple은 누른 항목을 켜고 끈다. 결과는 항상 options 순서를 따른다.
 */
export function nextOptionSelection(input: OptionSelectorSelectionInput): readonly string[] {
  if (!input.options.some((option) => option.id === input.id)) {
    throw new Error("OptionSelector id must reference an existing option");
  }
  if (input.selection === "single") return [input.id];
  const next = new Set(input.selectedIds);
  if (next.has(input.id)) next.delete(input.id);
  else next.add(input.id);
  return input.options.filter((option) => next.has(option.id)).map((option) => option.id);
}

export function isSameOptionSelection(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((id, index) => id === b[index]);
}

export function getOptionSelectorContract(props: OptionSelectorProps): OptionSelectorContract {
  const groupLabel = requireText(props.groupLabel, "groupLabel");
  const variant = requireOption(props.variant ?? "outlined", variants, "variant");
  const size = requireOption(props.size ?? "m", sizes, "size");
  const selection = requireOption(props.selection ?? "single", selections, "selection");
  const commit = requireOption(props.commit ?? "deferred", commits, "commit");
  const layout = requireOption(props.layout ?? "stack", layouts, "layout");
  const contentLanguage = requireOption(
    props.contentLanguage ?? "ui",
    contentLanguages,
    "contentLanguage",
  );
  const languageTag = props.languageTag?.trim();
  if (contentLanguage === "learning" && !languageTag) {
    throw new Error("languageTag is required for learning content");
  }
  // 조합 규칙: Multiple은 Deferred만, Immediate는 Single만 쓴다. 둘은 같은 규칙의 양면이다.
  if (selection === "multiple" && commit === "immediate") {
    throw new Error("OptionSelector multiple selection requires deferred commit");
  }
  validateOptions(props.options);
  validateSelectedIds(props.options, selection, props.selectedIds);

  const committed = props.committed === true;
  const selectedSet = new Set(props.selectedIds);
  const items = props.options.map((option): OptionSelectorItemContract => {
    const selected = selectedSet.has(option.id);
    const disabled = committed || option.disabled === true;
    const label = option.label.trim();
    const spokenLabel = option.accessibilityLabel?.trim() || label;
    // Selected는 Pressed 배경을 쓰지 않으므로 pressable은 Enabled·Unselected에만 붙인다.
    const pressable = !disabled && !selected;
    return {
      id: option.id,
      label,
      icon: option.icon ?? null,
      selected,
      disabled,
      interactive: !disabled,
      className: [
        "ui-lynx-option-selector-item",
        selected ? "ui-lynx-option-selector-item-selected" : undefined,
        disabled ? "ui-lynx-option-selector-item-disabled" : undefined,
        pressable ? "ui-lynx-option-selector-item-pressable" : undefined,
      ]
        .filter((value): value is string => value !== undefined)
        .join(" "),
      // ADR-0016 D3: 선택 여부는 이름 뒤 접미사로 낸다. 비선택은 이름만 둔다.
      accessibilityLabel: selected ? `${spokenLabel}, 선택됨` : spokenLabel,
      // ADR-0016 D2·D10: traits는 한 값이다. 확정·비활성 항목은 다시 조작할 수 없으므로 disabled다.
      traits: disabled ? "disabled" : "button",
      indicatorColor: selected
        ? disabled
          ? indicatorColors[variant].disabledSelected
          : indicatorColors[variant].selected
        : null,
    };
  });

  const columns = layout === "grid" ? 2 : 1;
  const rows: OptionSelectorItemContract[][] = [];
  for (let index = 0; index < items.length; index += columns) {
    rows.push(items.slice(index, index + columns));
  }

  return {
    className: [
      "ui-lynx-option-selector",
      `ui-lynx-option-selector-${variant}`,
      `ui-lynx-option-selector-${size}`,
      `ui-lynx-option-selector-${layout}`,
    ].join(" "),
    listClassName: `ui-lynx-option-selector-list ui-lynx-option-selector-list-${layout}`,
    groupLabel,
    variant,
    size,
    selection,
    commit,
    layout,
    contentLanguage,
    ...(languageTag ? { languageTag } : {}),
    committed,
    items,
    rows,
  };
}
