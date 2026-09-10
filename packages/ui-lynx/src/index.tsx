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
  const state = props.disabled ? "disabled" : props.loading ? "loading" : undefined;
  const className = [
    "ui-lynx-button",
    `ui-lynx-button-${variant}`,
    `ui-lynx-button-${size}`,
    `ui-lynx-button-${width}`,
    state ? `ui-lynx-button-${state}` : undefined,
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

export function Button(props: ButtonProps) {
  const contract = getButtonContract(props);
  const interactive = !props.disabled && !props.loading;
  const iconPosition = props.iconPosition ?? "leading";
  const icon = props.icon ? (
    <svg
      className="ui-lynx-button-icon"
      data-testid="ui-lynx-button-icon"
      content={props.icon}
      current-color={color.fg.neutral}
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
      <view className="ui-lynx-back-header-leading">
        <view
          className="ui-lynx-back-header-back"
          data-testid="ui-lynx-back-header-back"
          accessibility-element={true}
          accessibility-label={`뒤로, ${props.title}`}
          accessibility-traits="button"
          bindtap={handleBack}
        >
          <svg
            className="ui-lynx-back-header-icon"
            data-testid="ui-lynx-back-header-back-icon"
            content={arrowLeft03}
            current-color={color.fg["neutral-subtle"]}
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
            className="ui-lynx-back-header-icon"
            data-testid="ui-lynx-back-header-info-icon"
            content={info02}
            current-color={color.fg["neutral-subtle"]}
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
