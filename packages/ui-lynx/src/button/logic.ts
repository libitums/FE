import { color } from "@libitums/design-tokens";

import type { ButtonContract, ButtonProps } from "./contract";

export function getButtonContract(props: ButtonProps): ButtonContract {
  const variant = props.variant ?? "neutral";
  const size = props.size ?? "m";
  const width = props.width ?? "hug";
  const className = [
    "ui-lynx-button",
    `ui-lynx-button-${variant}`,
    `ui-lynx-button-${size}`,
    `ui-lynx-button-${width}`,
    props.disabled ? "ui-lynx-button-disabled" : undefined,
    props.loading ? "ui-lynx-button-loading" : undefined,
  ]
    .filter((value): value is string => value !== undefined)
    .join(" ");

  return {
    className,
    traits: props.disabled ? "disabled" : "button",
  };
}

export function getButtonIconColor(props: ButtonProps): string {
  if (props.disabled) {
    return props.variant === "subtle" || props.variant === "text"
      ? color.gray[300]
      : color.fg.disabled;
  }

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
