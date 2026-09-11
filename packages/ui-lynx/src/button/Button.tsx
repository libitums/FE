import type {} from "@lynx-js/react";
import { getButtonContract, getButtonIconColor } from "./logic";
import type { ButtonProps } from "./contract";

export function Button(props: ButtonProps) {
  const contract = getButtonContract(props);
  const interactive = !props.disabled && !props.loading;
  const iconPosition = props.iconPosition ?? "leading";
  const icon = props.icon ? (
    <svg
      className="ui-lynx-button-icon"
      data-testid="ui-lynx-button-icon"
      content={props.icon}
      current-color={getButtonIconColor(props)}
    />
  ) : null;
  function handleTap() {
    "background only";
    props.bindtap?.();
  }
  return (
    <view
      className={contract.className}
      data-testid="ui-lynx-button"
      data-variant={props.variant ?? "neutral"}
      data-size={props.size ?? "m"}
      data-width={props.width ?? "hug"}
      data-disabled={props.disabled ? "true" : "false"}
      data-loading={props.loading ? "true" : "false"}
      accessibility-element={true}
      accessibility-label={props.loading ? `${props.label}, 로딩 중` : props.label}
      accessibility-traits={contract.traits}
      bindtap={interactive ? handleTap : undefined}
    >
      <view className="ui-lynx-button-surface">
        {props.loading ? (
          <view className="ui-lynx-button-spinner-wrap" accessibility-elements-hidden={true}>
            <view className="ui-lynx-button-spinner" data-testid="ui-lynx-button-spinner" />
          </view>
        ) : iconPosition === "leading" ? (
          icon
        ) : null}
        <text className="ui-lynx-button-label" data-testid="ui-lynx-button-label">
          {props.label}
        </text>
        {!props.loading && iconPosition === "trailing" ? icon : null}
      </view>
    </view>
  );
}
