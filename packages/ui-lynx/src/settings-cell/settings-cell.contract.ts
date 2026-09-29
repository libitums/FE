import type { AvatarProps } from "../avatar";

type SettingsCellBase = {
  readonly title: string;
  readonly description?: string;
  readonly avatar?: Pick<AvatarProps, "name" | "imageSource">;
  readonly disabled?: boolean;
  readonly focused?: boolean;
};

export type SettingsCellToggleProps = SettingsCellBase & {
  readonly trailing: "toggle";
  readonly checked: boolean;
  readonly onChange: (checked: boolean) => void;
  readonly value?: never;
  readonly onNavigate?: never;
};

export type SettingsCellNavigationProps = SettingsCellBase & {
  readonly trailing: "navigation";
  readonly value?: string;
  readonly onNavigate: () => void;
  readonly checked?: never;
  readonly onChange?: never;
};

export type SettingsCellProps = SettingsCellToggleProps | SettingsCellNavigationProps;
export type SettingsGroupItem = SettingsCellProps & { readonly id: string };
export type SettingsGroupProps = {
  readonly accessibilityLabel: string;
  readonly items: readonly SettingsGroupItem[];
};

export type SettingsCellContract = {
  readonly accessibilityLabel: string;
  readonly className: string;
  readonly disabled: boolean;
  readonly description?: string;
  readonly value?: string;
};

function optionalText(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string") throw new Error("Settings Cell text must be a string");
  return value.trim() || undefined;
}

export function getSettingsCellContract(props: SettingsCellProps): SettingsCellContract {
  if (!props || typeof props !== "object") throw new Error("Settings Cell props are required");
  const title = optionalText(props.title);
  if (!title) throw new Error("Settings Cell title must not be empty");
  const description = optionalText(props.description);
  const disabled = props.disabled === true;
  if (props.trailing === "toggle") {
    if (typeof props.checked !== "boolean" || typeof props.onChange !== "function") {
      throw new Error("Toggle Settings Cell requires checked and onChange");
    }
    if (props.value !== undefined) throw new Error("Toggle Settings Cell cannot have a value");
  } else if (props.trailing === "navigation") {
    if (typeof props.onNavigate !== "function") {
      throw new Error("Navigation Settings Cell requires onNavigate");
    }
  } else {
    throw new Error("Settings Cell trailing must be toggle or navigation");
  }
  const value = props.trailing === "navigation" ? optionalText(props.value) : undefined;
  const accessibilityLabel = [
    title,
    description,
    props.trailing === "toggle" ? (props.checked ? "on" : "off") : value,
  ]
    .filter(Boolean)
    .join(", ");
  return {
    accessibilityLabel,
    className: [
      "ui-lynx-settings-cell",
      `ui-lynx-settings-cell-type-${props.trailing}`,
      disabled ? "ui-lynx-settings-cell-disabled" : "ui-lynx-settings-cell-enabled",
      props.focused && !disabled ? "ui-lynx-settings-cell-focused" : "",
    ]
      .filter(Boolean)
      .join(" "),
    disabled,
    ...(description ? { description } : {}),
    ...(value ? { value } : {}),
  };
}

export function validateSettingsGroup(props: SettingsGroupProps): void {
  if (!props || !Array.isArray(props.items) || props.items.length === 0) {
    throw new Error("Settings Group requires at least one item");
  }
  if (!optionalText(props.accessibilityLabel)) {
    throw new Error("Settings Group accessibilityLabel must not be empty");
  }
  const hasAvatar = props.items[0]?.avatar !== undefined;
  const ids = new Set<string>();
  for (const item of props.items) {
    getSettingsCellContract(item);
    if (!optionalText(item.id) || ids.has(item.id)) {
      throw new Error("Settings Group items require unique non-empty ids");
    }
    ids.add(item.id);
    if ((item.avatar !== undefined) !== hasAvatar) {
      throw new Error("Settings Group cannot mix avatar and avatar-less items");
    }
  }
}
