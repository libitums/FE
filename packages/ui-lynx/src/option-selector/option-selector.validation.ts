import { color } from "@libitums/design-tokens";

// contract가 이 파일을 가져옵니다 — 순환을 만들지 않도록 타입을 구조로 적습니다.
type Variant = "filled" | "outlined" | "outlined-subtle";
type Feedback = "correct" | "incorrect";
type OptionLike = {
  readonly id: string;
  readonly label: string;
  readonly meaning?: string;
  readonly feedback?: Feedback;
};

export function requireText(value: unknown, name: string): string {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) throw new Error(`OptionSelector ${name} must not be empty`);
  return text;
}

export function validateOptions(
  options: readonly OptionLike[],
  variant: Variant,
  minimumCount: number,
): void {
  if (!Array.isArray(options) || options.length < minimumCount) {
    throw new Error(`OptionSelector requires at least ${minimumCount} options`);
  }
  const ids = new Set<string>();
  for (const option of options) {
    if (typeof option.id !== "string" || !option.id.trim()) {
      throw new Error("OptionSelector option id must not be empty");
    }
    requireText(option.label, "option label");
    if (option.meaning !== undefined) requireText(option.meaning, "option meaning");
    if (variant === "filled" && (option.feedback !== undefined || option.meaning !== undefined)) {
      throw new Error("OptionSelector filled variant does not support feedback or meaning");
    }
    if (ids.has(option.id)) throw new Error("OptionSelector option ids must be unique");
    ids.add(option.id);
  }
}

export function validateSelectedIds(
  options: readonly { readonly id: string }[],
  selection: "single" | "multiple",
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

// Selected·Disabled + Selected의 Label·Indicator 색입니다. 나머지 상태는 Indicator를 그리지 않습니다.
const indicatorColors = {
  filled: { selected: color.brand.primary, disabledSelected: color.gray[800] },
  outlined: { selected: color.fg.brand, disabledSelected: color.fg.disabled },
  "outlined-subtle": { selected: color.fg.brand, disabledSelected: color.fg.disabled },
} as const;

const feedbackIndicatorColors = {
  correct: color.feedback["correct-text"],
  incorrect: color.feedback["incorrect-text"],
} as const;

/** Indicator 색입니다. 판정이 있으면 판정 글자색이 먼저이고, Indicator가 없는 상태는 null입니다. */
export function indicatorColorOf(input: {
  readonly variant: Variant;
  readonly selected: boolean;
  readonly disabled: boolean;
  readonly feedback: Feedback | null;
}): string | null {
  if (input.feedback !== null) return feedbackIndicatorColors[input.feedback];
  if (!input.selected) return null;
  return input.disabled
    ? indicatorColors[input.variant].disabledSelected
    : indicatorColors[input.variant].selected;
}
