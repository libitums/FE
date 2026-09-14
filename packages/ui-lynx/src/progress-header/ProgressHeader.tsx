import type {} from "@lynx-js/react";
import { color } from "@libitums/design-tokens";
import cross from "@libitums/icons/lynx/cross";

import { getProgressHeaderProgress, type ProgressHeaderProps } from "./progress-header.contract";

export function ProgressHeader(props: ProgressHeaderProps) {
  const normalized = getProgressHeaderProgress(props.progress);
  const motion = props.motion ?? "standard";

  function handleExit() {
    "background only";
    props.onExit();
  }

  return (
    <view
      className={`ui-lynx-progress-header ui-lynx-progress-header-motion-${motion}`}
      data-testid="ui-lynx-progress-header"
      data-progress={String(normalized.value)}
      data-motion={motion}
    >
      <view
        className="ui-lynx-progress-header-title-row"
        data-testid="ui-lynx-progress-header-title-row"
      >
        <text
          className="ui-lynx-progress-header-title"
          data-testid="ui-lynx-progress-header-title"
          accessibility-traits="header"
        >
          {props.title}
        </text>
        <view
          className="ui-lynx-progress-header-exit"
          data-testid="ui-lynx-progress-header-exit"
          accessibility-element={true}
          accessibility-label={props.exitAccessibilityLabel}
          accessibility-traits="button"
          bindtap={handleExit}
        >
          <svg
            className="ui-lynx-progress-header-exit-icon ui-lynx-progress-header-exit-icon-default"
            data-testid="ui-lynx-progress-header-exit-icon"
            content={cross}
            current-color={color.fg["neutral-subtle"]}
          />
          <svg
            className="ui-lynx-progress-header-exit-icon ui-lynx-progress-header-exit-icon-pressed"
            content={cross}
            current-color={color.fg.neutral}
          />
        </view>
      </view>
      <view className="ui-lynx-progress-header-track" data-testid="ui-lynx-progress-header-track">
        {normalized.fillPercent !== null ? (
          <view
            className="ui-lynx-progress-header-fill"
            data-testid="ui-lynx-progress-header-fill"
            style={{ width: `${normalized.fillPercent}%` }}
          />
        ) : null}
      </view>
      <view
        className="ui-lynx-progress-header-caption"
        data-testid="ui-lynx-progress-header-caption"
        accessibility-element={true}
        accessibility-label={`${props.activity}, ${normalized.percentageLabel}`}
      >
        <view
          className="ui-lynx-progress-header-caption-content"
          data-testid="ui-lynx-progress-header-caption-content"
          accessibility-elements-hidden={true}
        >
          <text
            className="ui-lynx-progress-header-activity"
            data-testid="ui-lynx-progress-header-activity"
          >
            {props.activity}
          </text>
          <text
            className="ui-lynx-progress-header-percentage"
            data-testid="ui-lynx-progress-header-percentage"
          >
            {normalized.percentageLabel}
          </text>
        </view>
      </view>
    </view>
  );
}
