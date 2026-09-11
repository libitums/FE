import type {} from "@lynx-js/react";
import { color } from "@libitums/design-tokens";
import arrowLeft03 from "@libitums/icons/lynx/arrow-left-03";
import info02 from "@libitums/icons/lynx/info-02";

export type ButtonVariant = "neutral" | "brand" | "outline" | "subtle" | "text";
export type ButtonSize = "s" | "m" | "l" | "xl";
export type ButtonWidth = "hug" | "fill";
export type IconPosition = "leading" | "trailing";

export type ButtonProps = {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  width?: ButtonWidth;
  disabled?: boolean;
  loading?: boolean;
  icon?: string;
  iconPosition?: IconPosition;
  bindtap?: () => void;
};

export type BackHeaderProps = {
  title: string;
  subtitle?: string;
  showInfo?: boolean;
  onBack: () => void;
  onInfo?: () => void;
};

export type StatusIndicatorStatus = "completed" | "in-progress" | "needs-retry" | "locked";

export type StatusIndicatorProps = {
  status: StatusIndicatorStatus;
  label: string;
  contextLabel?: string;
};

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

export type ButtonContract = {
  className: string;
  traits: "button" | "disabled";
};

const statusIndicatorNames: Record<StatusIndicatorStatus, string> = {
  completed: "완료",
  "in-progress": "진행 중",
  "needs-retry": "다시 시도",
  locked: "잠김",
};

export function getButtonContract(props: ButtonProps): ButtonContract {
  const variant = props.variant ?? "neutral";
  const size = props.size ?? "m";
  const width = props.width ?? "hug";
  const className = [
    "ui-lynx-button",
    `ui-lynx-button-${variant}`,
    `ui-lynx-button-${size}`,
    `ui-lynx-button-${width}`,
    props.disabled ? "ui-lynx-button-disabled" : undefined,
    props.loading ? "ui-lynx-button-loading" : undefined,
  ]
    .filter((value): value is string => value !== undefined)
    .join(" ");

  return {
    className,
    traits: props.disabled ? "disabled" : "button",
  };
}

export function getStatusIndicatorLabel(props: StatusIndicatorProps): string {
  const statusName = statusIndicatorNames[props.status];
  const labels = [props.contextLabel, props.label];

  if (props.label !== statusName) {
    labels.push(statusName);
  }

  return labels.filter((label): label is string => Boolean(label)).join(", ");
}

export function getButtonIconColor(props: ButtonProps): string {
  if (props.disabled) {
    return props.variant === "subtle" || props.variant === "text"
      ? color.gray[300]
      : color.fg.disabled;
  }

  switch (props.variant ?? "neutral") {
    case "neutral":
      return color.gray[50];
    case "brand":
      return color.white;
    case "outline":
    case "subtle":
      return color.fg["neutral-muted"];
    case "text":
      return color.fg.brand;
  }
}

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

export function BackHeader(props: BackHeaderProps) {
  function handleBack() {
    "background only";
    props.onBack();
  }

  function handleInfo() {
    "background only";
    props.onInfo?.();
  }

  return (
    <view className="ui-lynx-back-header" data-testid="ui-lynx-back-header">
      <view className="ui-lynx-back-header-leading" bindtap={handleBack}>
        <view
          className="ui-lynx-back-header-back-icon-area"
          data-testid="ui-lynx-back-header-back"
          accessibility-element={true}
          accessibility-label={`뒤로, ${props.title}`}
          accessibility-traits="button"
          catchtap={handleBack}
        >
          <svg
            className="ui-lynx-back-header-icon ui-lynx-back-header-icon-default"
            data-testid="ui-lynx-back-header-back-icon"
            content={arrowLeft03}
            current-color={color.fg["neutral-subtle"]}
          />
          <svg
            className="ui-lynx-back-header-icon ui-lynx-back-header-icon-pressed"
            content={arrowLeft03}
            current-color={color.fg.neutral}
          />
        </view>
        <view className="ui-lynx-back-header-copy">
          <text
            className="ui-lynx-back-header-title"
            data-testid="ui-lynx-back-header-title"
            accessibility-traits="header"
          >
            {props.title}
          </text>
          {props.subtitle ? (
            <text
              className="ui-lynx-back-header-subtitle"
              data-testid="ui-lynx-back-header-subtitle"
            >
              {props.subtitle}
            </text>
          ) : null}
        </view>
      </view>
      {props.showInfo && props.onInfo ? (
        <view
          className="ui-lynx-back-header-info"
          data-testid="ui-lynx-back-header-info"
          accessibility-element={true}
          accessibility-label="화면 정보"
          accessibility-traits="button"
          bindtap={handleInfo}
        >
          <svg
            className="ui-lynx-back-header-icon ui-lynx-back-header-icon-default"
            data-testid="ui-lynx-back-header-info-icon"
            content={info02}
            current-color={color.fg["neutral-subtle"]}
          />
          <svg
            className="ui-lynx-back-header-icon ui-lynx-back-header-icon-pressed"
            content={info02}
            current-color={color.fg.neutral}
          />
        </view>
      ) : null}
    </view>
  );
}

export function StatusIndicator(props: StatusIndicatorProps) {
  return (
    <view
      className={`ui-lynx-status-indicator ui-lynx-status-indicator-${props.status}`}
      data-testid="ui-lynx-status-indicator"
      data-status={props.status}
      accessibility-element={true}
      accessibility-label={getStatusIndicatorLabel(props)}
    >
      <view
        className="ui-lynx-status-indicator-content"
        data-testid="ui-lynx-status-indicator-content"
        accessibility-elements-hidden={true}
      >
        <view className="ui-lynx-status-indicator-dot" />
        <text className="ui-lynx-status-indicator-label">{props.label}</text>
      </view>
    </view>
  );
}
