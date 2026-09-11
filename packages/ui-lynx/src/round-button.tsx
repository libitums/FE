import type {} from "@lynx-js/react";
import { color } from "@libitums/design-tokens";

export type RoundButtonVariant = "neutral" | "brand";
export type RoundButtonSize = "s" | "m" | "l" | "xl";

export type RoundButtonProps = {
  readonly accessibilityLabel: string;
  readonly icon: string;
  readonly variant?: RoundButtonVariant;
  readonly size?: RoundButtonSize;
  readonly disabled?: boolean;
  readonly loading?: boolean;
  readonly bindtap?: () => void;
};

export type RoundButtonContract = {
  readonly variant: RoundButtonVariant;
  readonly size: RoundButtonSize;
  readonly className: string;
  readonly traits: "button" | "disabled";
  readonly accessibilityLabel: string;
  readonly interactive: boolean;
};

export function getRoundButtonContract(props: RoundButtonProps): RoundButtonContract {
  if (!props.accessibilityLabel.trim()) {
    throw new Error("RoundButton accessibilityLabel must not be empty");
  }
  const variant = props.variant ?? "neutral";
  const size = props.size ?? "m";
  const disabled = Boolean(props.disabled);
  const loading = Boolean(props.loading);
  const className = [
    "ui-lynx-round-button",
    `ui-lynx-round-button-${variant}`,
    `ui-lynx-round-button-${size}`,
    disabled ? "ui-lynx-round-button-disabled" : undefined,
    loading ? "ui-lynx-round-button-loading" : undefined,
  ]
    .filter((value): value is string => value !== undefined)
    .join(" ");

  return {
    variant,
    size,
    className,
    traits: disabled ? "disabled" : "button",
    accessibilityLabel: loading ? `${props.accessibilityLabel}, 로딩 중` : props.accessibilityLabel,
    interactive: !disabled && !loading,
  };
}

export function getRoundButtonForegroundColor(props: RoundButtonProps): string {
  if (props.disabled) {
    return props.variant === "brand" ? color.brand["reward-disabled-surface"] : color.gray[500];
  }
  return props.variant === "brand" ? color.fg.brand : color.fg["neutral-subtle"];
}

export function RoundButton(props: RoundButtonProps) {
  const contract = getRoundButtonContract(props);
  const foregroundColor = getRoundButtonForegroundColor(props);
  const iconContent = props.icon.replaceAll("currentColor", foregroundColor);

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
