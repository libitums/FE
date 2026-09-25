export type BottomNavigatorDotBadge = {
  readonly kind: "dot";
  readonly accessibilityLabel: string;
};

export type BottomNavigatorCountBadge = {
  readonly kind: "count";
  readonly count: number;
};

export type BottomNavigatorBadge = BottomNavigatorDotBadge | BottomNavigatorCountBadge;

type BottomNavigatorItemBase = {
  readonly id: string;
  readonly accessibilityLabel: string;
  readonly icon: string;
  readonly badge?: BottomNavigatorBadge;
  /**
   * 선택됐을 때 이 항목에 붙일 Lynx timing flag입니다. 호스트가 이 flag가 달린 update
   * pipeline 뒤에서만 지표를 걷으므로(FE ADR-0019), 항목마다 다른 이름을 줘야 어느
   * 전환을 잰 것인지 갈립니다. 비선택 항목에는 붙지 않습니다 — 켜진 채로 두면 전환과
   * 무관한 렌더까지 같은 이름으로 실려 측정이 섞입니다.
   */
  readonly timingFlag?: string;
};

export type BottomNavigatorEnabledItem = BottomNavigatorItemBase & {
  readonly availability?: "enabled";
  readonly disabledReason?: never;
};

export type BottomNavigatorDisabledItem = BottomNavigatorItemBase & {
  readonly availability: "disabled";
  readonly disabledReason: string;
};

export type BottomNavigatorItem = BottomNavigatorEnabledItem | BottomNavigatorDisabledItem;

export type BottomNavigatorProps = {
  readonly items: readonly BottomNavigatorItem[];
  readonly selectedId: string;
  readonly bindselect?: (id: string) => void;
};

export type BottomNavigatorItemContract = {
  readonly id: string;
  readonly selected: boolean;
  readonly disabled: boolean;
  readonly interactive: boolean;
  readonly focusable: boolean;
  readonly focusId?: string;
  readonly focusIndex?: string;
  readonly nextFocusLeft?: string;
  readonly nextFocusRight?: string;
  readonly className: string;
  readonly accessibilityLabel: string;
  readonly traits: "button" | "disabled";
  readonly iconColor: string;
  readonly pressedIconColor: string;
  readonly timingFlag?: string;
  readonly badge?: { readonly kind: "dot" } | { readonly kind: "count"; readonly text: string };
};

export type BottomNavigatorContract = {
  readonly className: "ui-lynx-bottom-navigator";
  readonly itemsClassName: string;
  readonly itemCount: number;
  readonly items: readonly BottomNavigatorItemContract[];
};

import { color } from "@libitums/design-tokens";

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
  if (items.length < 3 || items.length > 5)
    throw new Error("BottomNavigator requires between 3 and 5 items");
  const ids = new Set<string>();
  for (const item of items) {
    if (typeof item.id !== "string" || !item.id.trim())
      throw new Error("BottomNavigator item id must not be empty");
    if (typeof item.accessibilityLabel !== "string" || !item.accessibilityLabel.trim())
      throw new Error("BottomNavigator item accessibilityLabel must not be empty");
    if (ids.has(item.id)) throw new Error("BottomNavigator item ids must be unique");
    ids.add(item.id);
    if (
      item.availability === "disabled" &&
      (typeof item.disabledReason !== "string" || !item.disabledReason.trim())
    )
      throw new Error("BottomNavigator disabledReason must not be empty");
    getBadgeContract(item.badge);
  }
  const selectedItems = items.filter(
    (item) => item.id === selectedId && item.availability !== "disabled",
  );
  if (selectedItems.length !== 1)
    throw new Error("BottomNavigator selectedId must reference exactly one enabled item");
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
    // 비선택은 gray-500입니다. 바 배경(#FFFDFC) 대비 1.48:1이라, 뜻을 지닌 그림에
    // WCAG 1.4.11이 요구하는 3:1에 못 미칩니다 — 디자인을 그대로 따르기로 한
    // 결정이며(2026-09-25), 라벨이 없어 글자로 보완할 길도 없습니다. 선택은 흰
    // 아이콘 대 주황 알약으로 3.02:1이라 이 기준을 넘깁니다.
    const iconColor = disabled
      ? color.fg.disabled
      : selected
        ? color.fg["neutral-inverted"]
        : color.gray["500"];
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
      ...(selected && item.timingFlag ? { timingFlag: item.timingFlag } : {}),
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
