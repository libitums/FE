export type CompactNumericInputSize = "s" | "m" | "l";

export type CompactNumericInputProps = {
  readonly accessibilityLabel: string;
  readonly defaultValue?: string;
  readonly placeholder?: string;
  readonly size?: CompactNumericInputSize;
  readonly error?: boolean;
  readonly disabled?: boolean;
  readonly bindinput?: (value: string) => void;
  readonly bindfocus?: () => void;
  readonly bindblur?: () => void;
};

export type CompactNumericInputContract = {
  readonly accessibilityLabel: string;
  readonly className: string;
  readonly defaultValue: string;
  readonly disabled: boolean;
  readonly error: boolean;
  readonly interactive: boolean;
  readonly placeholder: string | undefined;
  readonly size: CompactNumericInputSize;
};

export function getCompactNumericInputValue(value: string): string {
  return value.match(/[0-9](?!.*[0-9])/)?.[0] ?? "";
}

export function getCompactNumericInputContract(
  props: CompactNumericInputProps,
): CompactNumericInputContract {
  if (typeof props.accessibilityLabel !== "string" || !props.accessibilityLabel.trim()) {
    throw new Error("CompactNumericInput accessibilityLabel must not be empty");
  }

  const size = props.size ?? "m";
  const error = Boolean(props.error);
  const disabled = Boolean(props.disabled);
  const className = [
    "ui-lynx-compact-numeric-input",
    `ui-lynx-compact-numeric-input-${size}`,
    error ? "ui-lynx-compact-numeric-input-error" : undefined,
    disabled ? "ui-lynx-compact-numeric-input-disabled" : undefined,
  ]
    .filter((value): value is string => value !== undefined)
    .join(" ");

  return {
    accessibilityLabel: props.accessibilityLabel,
    className,
    defaultValue: getCompactNumericInputValue(props.defaultValue ?? ""),
    disabled,
    error,
    interactive: !disabled,
    placeholder:
      props.placeholder === undefined ? undefined : getCompactNumericInputValue(props.placeholder),
    size,
  };
}
