import type {} from "@lynx-js/react";

import {
  getRoundButtonContract,
  getRoundButtonForegroundColor,
  type RoundButtonProps,
} from "./round-button.contract";

export function RoundButton(props: RoundButtonProps) {
  const contract = getRoundButtonContract(props);
  const foregroundColor = getRoundButtonForegroundColor(props);
  const iconContent = props.icon.replace(/currentColor/g, foregroundColor);

  function handleTap() {
    "background only";
    props.bindtap?.();
  }

  return (
    <view
      className={contract.className}
      data-testid="ui-lynx-round-button"
      data-variant={contract.variant}
      data-size={contract.size}
      data-disabled={props.disabled ? "true" : "false"}
      data-loading={props.loading ? "true" : "false"}
      accessibility-element={true}
      accessibility-label={contract.accessibilityLabel}
      accessibility-traits={contract.traits}
      bindtap={contract.interactive ? handleTap : undefined}
    >
      <view className="ui-lynx-round-button-surface" data-testid="ui-lynx-round-button-surface">
        {props.loading ? (
          <view accessibility-elements-hidden={true}>
            <view
              className="ui-lynx-round-button-spinner"
              data-testid="ui-lynx-round-button-spinner"
            />
          </view>
        ) : (
          <view accessibility-elements-hidden={true}>
            <svg
              className="ui-lynx-round-button-icon"
              data-testid="ui-lynx-round-button-icon"
              content={iconContent}
              current-color={foregroundColor}
            />
          </view>
        )}
      </view>
    </view>
  );
}
