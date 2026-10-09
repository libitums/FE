import type {} from "@lynx-js/react";
import clapper from "@libitums/icons/lynx/clapper";
import lock from "@libitums/icons/lynx/lock";
import tick from "@libitums/icons/lynx/tick";
import { color } from "@libitums/design-tokens";

import { useMotion } from "../motion/MotionProvider";
import {
  getLearningUnitContract,
  type LearningUnitProps,
  type LearningUnitTapEvent,
} from "./learning-unit.contract";

const fullRing =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="47.5" fill="none" stroke="currentColor" stroke-width="5"/></svg>';
const narrativeRing =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M70.074 93.049 A47.5 47.5 0 1 1 93.049 70.074" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"/></svg>';

export function LearningUnit(props: LearningUnitProps) {
  const motion = useMotion();
  const contract = getLearningUnitContract(props, motion);
  // standard에서는 data-motion 속성을 아예 넘기지 않습니다. undefined로 넘기면 테스트 렌더러가 "null" 문자열로 남깁니다.
  const motionProps = motion === "reduced" ? { "data-motion": "reduced" } : {};
  const icon =
    contract.iconKind === "lock" ? lock : contract.iconKind === "tick" ? tick : props.icon;
  const iconContent = icon.replace(/currentColor/g, contract.iconColor);
  const badgeContent = clapper.replace(/currentColor/g, color.fg.neutral);
  const ringContent = (contract.narrative === "narrative" ? narrativeRing : fullRing).replace(
    /currentColor/g,
    contract.ringColor,
  );

  function handleTap(event: LearningUnitTapEvent) {
    "background only";
    props.bindtap?.(event);
  }

  return (
    <view
      className={contract.className}
      data-testid={contract.testId}
      {...motionProps}
      data-status={contract.status}
      data-narrative={contract.narrative}
      data-focused={contract.focused ? "true" : "false"}
      accessibility-element={true}
      accessibility-label={contract.accessibilityLabel}
      accessibility-traits={contract.traits}
      focusable={contract.interactive}
      bindtap={contract.interactive ? handleTap : undefined}
    >
      <view className="ui-lynx-learning-unit-visual">
        <view className="ui-lynx-learning-unit-ring">
          <svg
            className="ui-lynx-learning-unit-ring-outline"
            data-testid={`${contract.testId}-ring`}
            content={ringContent}
            current-color={contract.ringColor}
            accessibility-elements-hidden={true}
          />
          <view className="ui-lynx-learning-unit-surface" accessibility-elements-hidden={true}>
            <svg
              className="ui-lynx-learning-unit-icon"
              data-testid={`${contract.testId}-icon`}
              content={iconContent}
              current-color={contract.iconColor}
            />
          </view>
        </view>
        {contract.narrative === "narrative" ? (
          <view
            className="ui-lynx-learning-unit-badge"
            data-testid={`${contract.testId}-badge`}
            accessibility-elements-hidden={true}
          >
            <svg
              className="ui-lynx-learning-unit-badge-icon"
              content={badgeContent}
              current-color={color.fg.neutral}
            />
          </view>
        ) : null}
      </view>
    </view>
  );
}
