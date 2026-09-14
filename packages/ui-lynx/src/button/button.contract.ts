export type ButtonVariant = "neutral" | "brand" | "outline" | "subtle" | "text";
export type ButtonSize = "s" | "m" | "l" | "xl";
export type ButtonWidth = "hug" | "fill";
export type IconPosition = "leading" | "trailing";

export type ButtonProps = {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  width?: ButtonWidth;
  disabled?: boolean;
  loading?: boolean;
  icon?: string;
  iconPosition?: IconPosition;
  bindtap?: () => void;
};

export type ButtonContract = {
  className: string;
  traits: "button" | "disabled";
};

import { color } from "@libitums/design-tokens";
export function getButtonContract(props: ButtonProps): ButtonContract {
  const variant = props.variant ?? "neutral";
  const size = props.size ?? "m";
  const width = props.width ?? "hug";
  return {
    className: [
      "ui-lynx-button",
      `ui-lynx-button-${variant}`,
      `ui-lynx-button-${size}`,
      `ui-lynx-button-${width}`,
      props.disabled ? "ui-lynx-button-disabled" : undefined,
      props.loading ? "ui-lynx-button-loading" : undefined,
    ]
      .filter((value): value is string => value !== undefined)
      .join(" "),
    traits: props.disabled ? "disabled" : "button",
  };
}
export function getButtonIconColor(props: ButtonProps): string {
  if (props.disabled)
    return props.variant === "subtle" || props.variant === "text"
      ? color.gray[300]
      : color.fg.disabled;
  switch (props.variant ?? "neutral") {
    case "neutral":
      return color.gray[50];
    case "brand":
      return color.white;
    case "outline":
    case "subtle":
      return color.fg["neutral-muted"];
    case "text":
      return color.fg.brand;
  }
}
