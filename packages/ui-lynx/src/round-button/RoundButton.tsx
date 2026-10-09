import type {} from "@lynx-js/react";

import { useMotion } from "../motion/MotionProvider";
import {
  getRoundButtonContract,
  getRoundButtonForegroundColor,
  type RoundButtonProps,
} from "./round-button.contract";

export function RoundButton(props: RoundButtonProps) {
  const motion = useMotion();
  const contract = getRoundButtonContract(props, motion);
  // standard에서는 data-motion 속성을 아예 넘기지 않습니다. undefined로 넘기면 테스트 렌더러가 "null" 문자열로 남깁니다.
  const motionProps = motion === "reduced" ? { "data-motion": "reduced" } : {};
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
      {...motionProps}
      data-variant={contract.variant}
      data-size={contract.size}
      data-disabled={props.disabled ? "true" : "false"}
      data-loading={props.loading ? "true" : "false"}
      accessibility-element={true}
      accessibility-label={contract.accessibilityLabel}
      accessibility-traits={contract.traits}
      accessibility-enable-tap={contract.interactive}
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
