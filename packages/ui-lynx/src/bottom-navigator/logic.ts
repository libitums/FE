import { color } from "@libitums/design-tokens";

import type {
  BottomNavigatorBadge,
  BottomNavigatorContract,
  BottomNavigatorItem,
  BottomNavigatorItemContract,
  BottomNavigatorProps,
} from "./contract";

function getBadgeContract(badge: BottomNavigatorBadge | undefined): {
  readonly accessibilityText?: string;
  readonly render?: BottomNavigatorItemContract["badge"];
} {
  if (!badge) return {};
  if (badge.kind === "dot") {
    if (typeof badge.accessibilityLabel !== "string" || !badge.accessibilityLabel.trim()) {
      throw new Error("BottomNavigator dot badge accessibilityLabel must not be empty");
    }
    return { accessibilityText: badge.accessibilityLabel.trim(), render: { kind: "dot" } };
  }
  if (badge.kind === "count") {
    if (!Number.isInteger(badge.count) || badge.count <= 0) {
      throw new Error("BottomNavigator count badge must be a positive integer");
    }
    return {
      accessibilityText: `읽지 않은 알림 ${badge.count}개`,
      render: { kind: "count", text: badge.count > 99 ? "99+" : String(badge.count) },
    };
  }
  throw new Error("BottomNavigator badge kind must be dot or count");
}

function validateItems(items: readonly BottomNavigatorItem[], selectedId: string): void {
  if (items.length < 3 || items.length > 5) {
    throw new Error("BottomNavigator requires between 3 and 5 items");
  }

  const ids = new Set<string>();
  for (const item of items) {
    if (typeof item.id !== "string" || !item.id.trim()) {
      throw new Error("BottomNavigator item id must not be empty");
    }
    if (typeof item.accessibilityLabel !== "string" || !item.accessibilityLabel.trim()) {
      throw new Error("BottomNavigator item accessibilityLabel must not be empty");
    }
    if (ids.has(item.id)) throw new Error("BottomNavigator item ids must be unique");
    ids.add(item.id);
    if (
      item.availability === "disabled" &&
      (typeof item.disabledReason !== "string" || !item.disabledReason.trim())
    ) {
      throw new Error("BottomNavigator disabledReason must not be empty");
    }
    getBadgeContract(item.badge);
  }

  const selectedItems = items.filter(
    (item) => item.id === selectedId && item.availability !== "disabled",
  );
  if (selectedItems.length !== 1) {
    throw new Error("BottomNavigator selectedId must reference exactly one enabled item");
  }
}

export function getBottomNavigatorContract(props: BottomNavigatorProps): BottomNavigatorContract {
  validateItems(props.items, props.selectedId);

  const enabledIndexes = props.items.flatMap((item, index) =>
    item.availability === "disabled" ? [] : [index],
  );

  const items: readonly BottomNavigatorItemContract[] = props.items.map((item, index) => {
    const selected = item.id === props.selectedId;
    const disabled = item.availability === "disabled";
    const badge = getBadgeContract(item.badge);
    const accessibilityLabel = [
      item.accessibilityLabel.trim(),
      selected ? "선택됨" : undefined,
      disabled ? item.disabledReason.trim() : undefined,
      badge.accessibilityText,
    ]
      .filter((value): value is string => value !== undefined)
      .join(", ");
    const className = [
      "ui-lynx-bottom-navigator-item",
      selected ? "ui-lynx-bottom-navigator-item-selected" : undefined,
      disabled ? "ui-lynx-bottom-navigator-item-disabled" : undefined,
    ]
      .filter((value): value is string => value !== undefined)
      .join(" ");

    const iconColor = disabled
      ? color.fg.disabled
      : selected
        ? color.fg["neutral-inverted"]
        : color.fg["neutral-subtle"];
    const pressedIconColor = disabled
      ? color.fg.disabled
      : selected
        ? color.fg["neutral-inverted"]
        : color.fg["neutral-muted"];
    const enabledPosition = enabledIndexes.indexOf(index);
    const focusId = `ui-lynx-bottom-navigator-focus-${index}`;
    const previousIndex = enabledIndexes[Math.max(0, enabledPosition - 1)];
    const nextIndex = enabledIndexes[Math.min(enabledIndexes.length - 1, enabledPosition + 1)];

    return {
      id: item.id,
      selected,
      disabled,
      interactive: !disabled,
      focusable: !disabled,
      ...(!disabled
        ? {
            focusId,
            focusIndex: `${index},0`,
            nextFocusLeft: `ui-lynx-bottom-navigator-focus-${previousIndex}`,
            nextFocusRight: `ui-lynx-bottom-navigator-focus-${nextIndex}`,
          }
        : {}),
      className,
      accessibilityLabel,
      traits: disabled ? "disabled" : "button",
      iconColor,
      pressedIconColor,
      ...(badge.render ? { badge: badge.render } : {}),
    };
  });

  return {
    className: "ui-lynx-bottom-navigator",
    itemsClassName: `ui-lynx-bottom-navigator-items ui-lynx-bottom-navigator-items-${props.items.length}`,
    itemCount: props.items.length,
    items,
  };
}

export function getBottomNavigatorContracts(
  props: BottomNavigatorProps,
): readonly BottomNavigatorItemContract[] {
  return getBottomNavigatorContract(props).items;
}
