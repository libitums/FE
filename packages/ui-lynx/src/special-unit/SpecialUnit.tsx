import type {} from "@lynx-js/react";
import fivePointedStar from "@libitums/icons/lynx/five-pointed-star";

import { useMotion } from "../motion/MotionProvider";
import {
  getSpecialUnitContract,
  hasSpecialUnitPressedShade,
  type SpecialUnitProps,
  type SpecialUnitTapEvent,
} from "./special-unit.contract";

export function SpecialUnit(props: SpecialUnitProps) {
  const motion = useMotion();
  const contract = getSpecialUnitContract(props, motion);
  // standard에서는 data-motion 속성을 아예 넘기지 않습니다. undefined로 넘기면 테스트 렌더러가 "null" 문자열로 남깁니다.
  const motionProps = motion === "reduced" ? { "data-motion": "reduced" } : {};
  const shaded = hasSpecialUnitPressedShade(contract.status, motion);
  const iconContent = fivePointedStar.replace(/currentColor/g, contract.iconColor);

  function handleTap(event: SpecialUnitTapEvent) {
    "background only";
    props.bindtap?.(event);
  }

  return (
    <view
      className={contract.className}
      data-testid={contract.testId}
      {...motionProps}
      data-status={contract.status}
      data-focused={contract.focused ? "true" : "false"}
      accessibility-element={true}
      accessibility-label={contract.accessibilityLabel}
      accessibility-traits={contract.traits}
      focusable={contract.interactive}
      bindtap={contract.interactive ? handleTap : undefined}
    >
      <view className="ui-lynx-special-unit-halo" data-testid={`${contract.testId}-halo`}>
        <view className="ui-lynx-special-unit-body" data-testid={`${contract.testId}-body`}>
          <view className="ui-lynx-special-unit-shade" data-testid={`${contract.testId}-shade`} />
          <view className="ui-lynx-special-unit-face" data-testid={`${contract.testId}-face`}>
            {shaded ? (
              <view
                className="ui-lynx-special-unit-pressed-shade"
                data-testid={`${contract.testId}-pressed-shade`}
              />
            ) : null}
            <svg
              className="ui-lynx-special-unit-icon"
              data-testid={`${contract.testId}-icon`}
              content={iconContent}
              current-color={contract.iconColor}
            />
          </view>
        </view>
      </view>
    </view>
  );
}
