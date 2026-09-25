import type {} from "@lynx-js/react";

import {
  type BottomNavigatorItem,
  type BottomNavigatorItemContract,
  type BottomNavigatorProps,
  getBottomNavigatorContract,
} from "./bottom-navigator.contract";

type BottomNavigatorCellProps = {
  readonly item: BottomNavigatorItem;
  readonly contract: BottomNavigatorItemContract;
  readonly onSelect?: (id: string) => void;
};

function BottomNavigatorCell({ item, contract, onSelect }: BottomNavigatorCellProps) {
  const defaultIcon = item.icon.replace(/currentColor/g, contract.iconColor);
  const pressedIcon = item.icon.replace(/currentColor/g, contract.pressedIconColor);

  function handleTap() {
    "background only";
    onSelect?.(contract.id);
  }

  return (
    <view
      className={contract.className}
      data-testid={`ui-lynx-bottom-navigator-item-${contract.id}`}
      data-id={contract.id}
      data-selected={contract.selected ? "true" : "false"}
      data-disabled={contract.disabled ? "true" : "false"}
      id={contract.focusId}
      focusable={contract.focusable}
      focus-index={contract.focusIndex}
      next-focus-left={contract.nextFocusLeft}
      next-focus-right={contract.nextFocusRight}
      accessibility-element={true}
      accessibility-label={contract.accessibilityLabel}
      accessibility-traits={contract.traits}
      {...(contract.timingFlag ? { __lynx_timing_flag: contract.timingFlag } : {})}
      bindtap={contract.interactive ? handleTap : undefined}
    >
      <view className="ui-lynx-bottom-navigator-surface">
        <view className="ui-lynx-bottom-navigator-icon-area" accessibility-elements-hidden={true}>
          <svg
            className="ui-lynx-bottom-navigator-icon ui-lynx-bottom-navigator-icon-default"
            data-testid={`ui-lynx-bottom-navigator-icon-${contract.id}-default`}
            content={defaultIcon}
            current-color={contract.iconColor}
          />
          <svg
            className="ui-lynx-bottom-navigator-icon ui-lynx-bottom-navigator-icon-pressed"
            data-testid={`ui-lynx-bottom-navigator-icon-${contract.id}-pressed`}
            content={pressedIcon}
            current-color={contract.pressedIconColor}
          />
          {item.badge ? (
            <view accessibility-elements-hidden={true}>
              <view
                className={`ui-lynx-bottom-navigator-badge ui-lynx-bottom-navigator-badge-${item.badge.kind}`}
                data-testid={`ui-lynx-bottom-navigator-badge-${contract.id}`}
              >
                {contract.badge?.kind === "count" ? (
                  <text className="ui-lynx-bottom-navigator-badge-label">
                    {contract.badge.text}
                  </text>
                ) : null}
              </view>
            </view>
          ) : null}
        </view>
      </view>
    </view>
  );
}

export function BottomNavigator(props: BottomNavigatorProps) {
  const navigator = getBottomNavigatorContract(props);

  return (
    <view
      className={navigator.className}
      data-testid="ui-lynx-bottom-navigator"
      data-count={String(navigator.itemCount)}
    >
      <view className={navigator.itemsClassName}>
        {props.items.map((item, index) => (
          <BottomNavigatorCell
            key={item.id}
            item={item}
            contract={navigator.items[index]!}
            onSelect={props.bindselect}
          />
        ))}
      </view>
    </view>
  );
}
