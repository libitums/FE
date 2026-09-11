import type {} from "@lynx-js/react";
import { getStatusIndicatorLabel } from "./logic";
import type { StatusIndicatorProps } from "./contract";

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
