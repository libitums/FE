export type TextFieldInputPurpose = "text" | "email" | "password" | "search" | "url" | "telephone";

export type TextFieldAvailability = "enabled" | "read-only" | "disabled";
export type TextFieldContent = "empty" | "filled";
export type TextFieldInteraction = "unfocused" | "focused";
export type TextFieldValidation = "none" | "error";
export type TextFieldVisualState =
  | "empty"
  | "filled"
  | "focused"
  | "error"
  | "read-only"
  | "disabled";

export type TextFieldLeading = { kind: "icon"; icon: string } | { kind: "prefix"; text: string };

export type TextFieldTrailing =
  | { kind: "icon"; icon: string }
  | { kind: "suffix"; text: string }
  | {
      kind: "action";
      icon: string;
      accessibilityLabel: string;
      bindtap: () => void;
    };

export type TextFieldSupporting =
  | { kind: "helper"; message: string }
  | { kind: "error"; message: string };

export type TextFieldCounter = {
  maxLength: number;
};

export type TextFieldProps = {
  accessibilityLabel?: string;
  label?: string;
  qualifier?: string;
  defaultValue?: string;
  placeholder?: string;
  purpose?: TextFieldInputPurpose;
  availability?: TextFieldAvailability;
  leading?: TextFieldLeading;
  trailing?: TextFieldTrailing;
  supporting?: TextFieldSupporting;
  counter?: TextFieldCounter;
  bindinput?: (value: string) => void;
  bindfocus?: (value: string) => void;
  bindblur?: (value: string) => void;
  bindconfirm?: (value: string) => void;
};

export type TextFieldRuntimeState = {
  value: string;
  focused: boolean;
};

export type TextFieldContract = {
  accessibilityLabel: string;
  availability: TextFieldAvailability;
  className: string;
  content: TextFieldContent;
  counterAccessibilityLabel?: string;
  counterLabel?: string;
  interaction: TextFieldInteraction;
  nativeConfirmType?: "search";
  nativeType: "text" | "password" | "tel" | "email";
  validation: TextFieldValidation;
  visualState: TextFieldVisualState;
};

function requireNonEmpty(value: string | undefined, name: string): string | undefined {
  if (value === undefined) return undefined;
  if (!value.trim()) throw new Error(`${name} must not be empty`);
  return value;
}

function validateAffixes(props: TextFieldProps): void {
  if (props.leading?.kind === "icon") requireNonEmpty(props.leading.icon, "leading.icon");
  if (props.leading?.kind === "prefix") requireNonEmpty(props.leading.text, "leading.text");
  if (props.trailing?.kind === "icon") requireNonEmpty(props.trailing.icon, "trailing.icon");
  if (props.trailing?.kind === "suffix") requireNonEmpty(props.trailing.text, "trailing.text");
  if (props.trailing?.kind === "action") {
    requireNonEmpty(props.trailing.icon, "trailing.icon");
    requireNonEmpty(props.trailing.accessibilityLabel, "trailing.accessibilityLabel");
  }
}

function getNativeInputPurpose(
  purpose: TextFieldInputPurpose,
): Pick<TextFieldContract, "nativeType" | "nativeConfirmType"> {
  switch (purpose) {
    case "email":
      return { nativeType: "email" };
    case "password":
      return { nativeType: "password" };
    case "telephone":
      return { nativeType: "tel" };
    case "search":
      return { nativeType: "text", nativeConfirmType: "search" };
    case "text":
    case "url":
      return { nativeType: "text" };
  }
}

export function getTextFieldContract(
  props: TextFieldProps,
  state: TextFieldRuntimeState = { value: props.defaultValue ?? "", focused: false },
): TextFieldContract {
  const label = requireNonEmpty(props.label, "label");
  const accessibilityName = requireNonEmpty(props.accessibilityLabel, "accessibilityLabel");
  if (!label && !accessibilityName) {
    throw new Error("label or accessibilityLabel is required");
  }
  requireNonEmpty(props.qualifier, "qualifier");
  requireNonEmpty(props.placeholder, "placeholder");
  requireNonEmpty(props.supporting?.message, "supporting.message");
  validateAffixes(props);

  if (
    props.counter &&
    (!Number.isInteger(props.counter.maxLength) || props.counter.maxLength < 1)
  ) {
    throw new Error("counter.maxLength must be a positive integer");
  }

  const availability = props.availability ?? "enabled";
  const content: TextFieldContent = state.value.length > 0 ? "filled" : "empty";
  const interaction: TextFieldInteraction = state.focused ? "focused" : "unfocused";
  const validation: TextFieldValidation = props.supporting?.kind === "error" ? "error" : "none";
  const visualState: TextFieldVisualState =
    availability === "disabled"
      ? "disabled"
      : availability === "read-only"
        ? "read-only"
        : validation === "error"
          ? "error"
          : state.focused
            ? "focused"
            : content;
  const count = Array.from(state.value).length;
  const counterLabel = props.counter ? `${count}/${props.counter.maxLength}` : undefined;
  const counterAccessibilityLabel = props.counter
    ? `${props.counter.maxLength}자 중 ${count}자 입력`
    : undefined;
  const describedBy = [
    props.qualifier,
    props.supporting?.kind === "error"
      ? `오류: ${props.supporting.message}`
      : props.supporting?.message,
    counterAccessibilityLabel,
  ].filter((value): value is string => Boolean(value));

  return {
    accessibilityLabel: [accessibilityName ?? label, ...describedBy].join(", "),
    availability,
    className: [
      "ui-lynx-text-field",
      `ui-lynx-text-field-${visualState}`,
      props.leading ? "ui-lynx-text-field-with-leading" : undefined,
      props.trailing ? "ui-lynx-text-field-with-trailing" : undefined,
    ]
      .filter((value): value is string => value !== undefined)
      .join(" "),
    content,
    counterAccessibilityLabel,
    counterLabel,
    interaction,
    ...getNativeInputPurpose(props.purpose ?? "text"),
    validation,
    visualState,
  };
}
