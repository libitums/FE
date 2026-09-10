import { root, useInitData } from "@lynx-js/react";
import { StatusIndicator } from "@libitums/ui-lynx";
import type { StatusIndicatorStatus } from "@libitums/ui-lynx";

import type { StatusIndicatorStoryArgs } from "../story-types";
import "./story-canvas.css";

const statuses = new Set<StatusIndicatorStatus>([
  "completed",
  "in-progress",
  "needs-retry",
  "locked",
]);

function App() {
  const args = useInitData() as Partial<StatusIndicatorStoryArgs>;
  const status = statuses.has(args.status as StatusIndicatorStatus)
    ? (args.status as StatusIndicatorStatus)
    : "completed";
  const label = typeof args.label === "string" ? args.label : "완료";
  const contextLabel =
    typeof args.contextLabel === "string" && args.contextLabel ? args.contextLabel : undefined;

  return (
    <view className="story-canvas">
      <view className="story-card">
        <text className="story-eyebrow">LYNX COMPONENT</text>
        <text className="story-title">Status Indicator</text>
        <StatusIndicator status={status} label={label} contextLabel={contextLabel} />
      </view>
    </view>
  );
}

root.render(<App />);
export default App;
