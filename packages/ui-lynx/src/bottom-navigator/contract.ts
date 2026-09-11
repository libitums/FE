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
  readonly traits: "button";
  readonly iconColor: string;
  readonly pressedIconColor: string;
  readonly badge?: { readonly kind: "dot" } | { readonly kind: "count"; readonly text: string };
};

export type BottomNavigatorContract = {
  readonly className: "ui-lynx-bottom-navigator";
  readonly itemsClassName: string;
  readonly itemCount: number;
  readonly items: readonly BottomNavigatorItemContract[];
};
