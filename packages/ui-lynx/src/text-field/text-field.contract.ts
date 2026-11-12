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
  /** native `<input>`의 `id`입니다 — 소비자가 접근성 초점을 이 칸으로 보낼 때 씁니다. */
  id?: string;
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
  /** 이 칸이 띄운 시스템 키보드의 높이가 바뀔 때(내려가면 0)입니다. 단위는 레이아웃 px(iOS pt · Android dp — Android 물리 픽셀은 밀도로 나눔). 아래에 붙은 시트가 키보드 위로 올라갈 때 씁니다. */
  bindkeyboardheightchange?: (height: number) => void;
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
    ? `${count} of ${props.counter.maxLength} characters`
    : undefined;
  const describedBy = [
    props.qualifier,
    props.supporting?.kind === "error"
      ? `Error: ${props.supporting.message}`
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

/** `keyboardheightchange`를 레이아웃 단위로 맞출 때 보는 기기 정보입니다(`SystemInfo`의 부분). */
export type KeyboardUnitInfo = { readonly platform: string; readonly pixelRatio: number };

/**
 * 키보드 높이를 레이아웃 px(pt/dp)로 바꿉니다. Android의 `height`는 물리 픽셀이라 `pixelRatio`로 나누고, iOS는 pt
 * 그대로입니다. 유한한 양수가 아니면 0, 기기 정보가 없거나 밀도가 이상하면 받은 값 그대로입니다.
 */
export function keyboardHeightInLayoutUnits(
  height: number,
  info: KeyboardUnitInfo | undefined,
): number {
  if (!Number.isFinite(height) || height <= 0) return 0;
  if (info?.platform !== "Android" || !(info.pixelRatio > 0)) return height;
  return Math.round(height / info.pixelRatio);
}
