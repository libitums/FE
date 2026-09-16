import { color } from "@libitums/design-tokens";

export type AnswerLabelResult = "pending" | "correct" | "incorrect";
export type AnswerLabelEmphasis = "solid" | "subtle";
export type AnswerLabelSize = "s" | "m" | "l";
export type AnswerLabelTone = "brand" | "positive" | "negative";
export type AnswerLabelIcon = "tick" | "cross" | null;

type AnswerLabelCommonProps = {
  readonly contextLabel?: string;
  readonly emphasis?: AnswerLabelEmphasis;
  readonly size?: AnswerLabelSize;
};

export type AnswerLabelProps = AnswerLabelCommonProps &
  (
    | { readonly result: "pending"; readonly label: string }
    | { readonly result: "correct" | "incorrect"; readonly label?: string }
  );

export type AnswerLabelContract = {
  readonly accessibilityLabel: string;
  readonly className: string;
  readonly emphasis: AnswerLabelEmphasis;
  readonly foregroundColor: string;
  readonly icon: AnswerLabelIcon;
  readonly label: string;
  readonly result: AnswerLabelResult;
  readonly size: AnswerLabelSize;
  readonly tone: AnswerLabelTone;
};

const resultDefaults = {
  correct: { icon: "tick", label: "정답이에요", tone: "positive" },
  incorrect: { icon: "cross", label: "오답이에요", tone: "negative" },
  pending: { icon: null, label: null, tone: "brand" },
} as const;

const foregroundColors = {
  solid: {
    brand: color.fg["neutral-inverted"],
    negative: color.fg["neutral-inverted"],
    positive: color.fg["neutral-inverted"],
  },
  subtle: {
    brand: color.fg.brand,
    negative: color.feedback["incorrect-text"],
    positive: color.feedback["correct-text"],
  },
} as const;

function requireLabel(value: string | undefined, fallback: string | null): string {
  const normalizedValue = typeof value === "string" ? value.trim() : "";
  const label = normalizedValue || fallback;
  if (typeof label !== "string") {
    throw new Error("AnswerLabel label must not be empty");
  }
  return label;
}

export function getAnswerLabelContract(props: AnswerLabelProps): AnswerLabelContract {
  const emphasis = props.emphasis ?? "solid";
  const size = props.size ?? "m";
  const result = resultDefaults[props.result];
  if (!result) {
    throw new Error("AnswerLabel result must be pending, correct, or incorrect");
  }
  const label = requireLabel(props.label, result.label);
  const contextLabel =
    typeof props.contextLabel === "string" ? props.contextLabel.trim() : undefined;
  const accessibilityLabel = contextLabel ? `${contextLabel}, ${label}` : label;

  return {
    accessibilityLabel,
    className: [
      "ui-lynx-answer-label",
      `ui-lynx-answer-label-${props.result}`,
      `ui-lynx-answer-label-${emphasis}`,
      `ui-lynx-answer-label-${size}`,
    ].join(" "),
    emphasis,
    foregroundColor: foregroundColors[emphasis][result.tone],
    icon: result.icon,
    label,
    result: props.result,
    size,
    tone: result.tone,
  };
}
