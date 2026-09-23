import { color } from "@libitums/design-tokens";

// `overlay`는 FE 확장(2026-09-21 여정 입장 디자인 반영): 면 없이 흰 아이콘만 그려 어두운 그림
// 위에 얹는다.
export type RoundButtonVariant = "neutral" | "brand" | "overlay";
export type RoundButtonSize = "s" | "m" | "l" | "xl";

export type RoundButtonProps = {
  readonly accessibilityLabel: string;
  readonly icon: string;
  readonly variant?: RoundButtonVariant;
  readonly size?: RoundButtonSize;
  readonly disabled?: boolean;
  readonly loading?: boolean;
  readonly bindtap?: () => void;
};

export type RoundButtonContract = {
  readonly variant: RoundButtonVariant;
  readonly size: RoundButtonSize;
  readonly className: string;
  readonly traits: "button" | "disabled";
  readonly accessibilityLabel: string;
  readonly interactive: boolean;
};

export function getRoundButtonContract(props: RoundButtonProps): RoundButtonContract {
  if (typeof props.accessibilityLabel !== "string" || !props.accessibilityLabel.trim()) {
    throw new Error("RoundButton accessibilityLabel must not be empty");
  }
  const variant = props.variant ?? "neutral";
  const size = props.size ?? "m";
  const disabled = Boolean(props.disabled);
  const loading = Boolean(props.loading);
  const className = [
    "ui-lynx-round-button",
    `ui-lynx-round-button-${variant}`,
    `ui-lynx-round-button-${size}`,
    disabled ? "ui-lynx-round-button-disabled" : undefined,
    loading ? "ui-lynx-round-button-loading" : undefined,
  ]
    .filter((value): value is string => value !== undefined)
    .join(" ");

  return {
    variant,
    size,
    className,
    traits: disabled ? "disabled" : "button",
    accessibilityLabel: loading ? `${props.accessibilityLabel}, 로딩 중` : props.accessibilityLabel,
    interactive: !disabled && !loading,
  };
}

export function getRoundButtonForegroundColor(props: RoundButtonProps): string {
  if (props.disabled) {
    return props.variant === "brand" ? color.brand["reward-disabled-surface"] : color.gray[500];
  }
  if (props.variant === "overlay") return color.white;
  // FE override(2026-09-21 디자인 반영): brand 아이콘은 정본의 fg.brand 대신 brand.primary.
  return props.variant === "brand" ? color.brand.primary : color.fg["neutral-subtle"];
}
