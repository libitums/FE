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
