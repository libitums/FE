import { root, useInitData } from "@lynx-js/react";
import { Tooltip } from "@libitums/ui-lynx/tooltip";

import { normalizeTooltipStoryArgs } from "../tooltip-story";
import "./story-canvas.css";
import "./tooltip.css";

function App() {
  const args = normalizeTooltipStoryArgs(useInitData());

  return (
    <view className="story-canvas">
      <view className="story-card story-tooltip-card">
        <text className="story-eyebrow">LYNX COMPONENT</text>
        <text className="story-title">Tooltip</text>
        <view className="story-tooltip-stage" data-direction={args.direction}>
          <view className="story-tooltip-host">
            <view
              className="story-tooltip-trigger"
              accessibility-element={true}
              accessibility-label="힌트"
              accessibility-traits="button"
              focusable={true}
            >
              <text className="story-tooltip-trigger-label">?</text>
            </view>
            <Tooltip {...args} />
          </view>
        </view>
      </view>
    </view>
  );
}

root.render(<App />);
export default App;
