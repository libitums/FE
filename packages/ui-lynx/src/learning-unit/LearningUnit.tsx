import type {} from "@lynx-js/react";
import clapper from "@libitums/icons/lynx/clapper";
import lock from "@libitums/icons/lynx/lock";
import tick from "@libitums/icons/lynx/tick";
import { color } from "@libitums/design-tokens";

import { getLearningUnitContract, type LearningUnitProps } from "./learning-unit.contract";

const fullRing =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="47.5" fill="none" stroke="currentColor" stroke-width="5"/></svg>';
const narrativeRing =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M70.074 93.049 A47.5 47.5 0 1 1 93.049 70.074" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"/></svg>';

export function LearningUnit(props: LearningUnitProps) {
  const contract = getLearningUnitContract(props);
  const icon =
    contract.iconKind === "lock" ? lock : contract.iconKind === "tick" ? tick : props.icon;
  const iconContent = icon.replace(/currentColor/g, contract.iconColor);
  const badgeContent = clapper.replace(/currentColor/g, color.fg.neutral);
  const ringContent = (contract.narrative === "narrative" ? narrativeRing : fullRing).replace(
    /currentColor/g,
    contract.ringColor,
  );

  function handleTap() {
    "background only";
    props.bindtap?.();
  }

  return (
    <view
      className={contract.className}
      data-testid="ui-lynx-learning-unit"
      data-status={contract.status}
      data-narrative={contract.narrative}
      data-focused={contract.focused ? "true" : "false"}
      accessibility-element={true}
      accessibility-label={contract.accessibilityLabel}
      accessibility-value={contract.accessibilityValue}
      accessibility-traits={contract.traits}
      focusable={contract.interactive}
      bindtap={contract.interactive ? handleTap : undefined}
    >
      <view className="ui-lynx-learning-unit-visual">
        <view className="ui-lynx-learning-unit-ring">
          <svg
            className="ui-lynx-learning-unit-ring-outline"
            data-testid="ui-lynx-learning-unit-ring"
            content={ringContent}
            current-color={contract.ringColor}
            accessibility-elements-hidden={true}
          />
          <view className="ui-lynx-learning-unit-surface" accessibility-elements-hidden={true}>
            <svg
              className="ui-lynx-learning-unit-icon"
              data-testid="ui-lynx-learning-unit-icon"
              content={iconContent}
              current-color={contract.iconColor}
            />
          </view>
        </view>
        {contract.narrative === "narrative" ? (
          <view
            className="ui-lynx-learning-unit-badge"
            data-testid="ui-lynx-learning-unit-badge"
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
