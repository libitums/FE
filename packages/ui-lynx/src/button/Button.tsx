import type {} from "@lynx-js/react";
import { useMotion } from "../motion/MotionProvider";
import {
  getButtonContract,
  getButtonIconColor,
  hasPressedShade,
  type ButtonProps,
} from "./button.contract";

export function Button(props: ButtonProps) {
  const motion = useMotion();
  const contract = getButtonContract(props, motion);
  // standard에서는 data-motion 속성을 아예 넘기지 않습니다. undefined로 넘기면 테스트 렌더러가 "null" 문자열로 남깁니다.
  const motionProps = motion === "reduced" ? { "data-motion": "reduced" } : {};
  const shaded = hasPressedShade(props.variant, motion);
  const interactive = !props.disabled && !props.loading;
  const iconPosition = props.iconPosition ?? "leading";
  // loading이 아니면 style 속성을 아예 넘기지 않습니다 — 빈 style이 standard DOM에 남지 않게 합니다.
  const hidden = contract.contentVisibility === "hidden" ? { style: { opacity: 0 } } : {};
  const icon = props.icon ? (
    <svg
      className="ui-lynx-button-icon"
      data-testid="ui-lynx-button-icon"
      content={props.icon}
      current-color={getButtonIconColor(props)}
      {...hidden}
    />
  ) : null;
  function handleTap() {
    "background only";
    props.bindtap?.();
  }
  // Android의 접근성 트리에 버튼 이름을 노출하려면 실제 View가 필요합니다.
  return (
    <view
      className={contract.className}
      data-testid="ui-lynx-button"
      {...motionProps}
      data-variant={props.variant ?? "neutral"}
      data-size={props.size ?? "m"}
      data-width={props.width ?? "hug"}
      data-disabled={props.disabled ? "true" : "false"}
      data-loading={props.loading ? "true" : "false"}
      flatten={false}
      accessibility-element={true}
      accessibility-label={props.loading ? `${props.label}, loading` : props.label}
      accessibility-traits={contract.traits}
      accessibility-enable-tap={interactive}
      bindtap={interactive ? handleTap : undefined}
    >
      <view className="ui-lynx-button-surface">
        {shaded ? (
          <view className="ui-lynx-button-shade" data-testid="ui-lynx-button-shade" />
        ) : null}
        {props.loading ? (
          <view className="ui-lynx-button-spinner-wrap">
            <view className="ui-lynx-button-spinner" data-testid="ui-lynx-button-spinner" />
          </view>
        ) : null}
        {iconPosition === "leading" ? icon : null}
        <text className="ui-lynx-button-label" data-testid="ui-lynx-button-label" {...hidden}>
          {props.label}
        </text>
        {iconPosition === "trailing" ? icon : null}
      </view>
    </view>
  );
}
