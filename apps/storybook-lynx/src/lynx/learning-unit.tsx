import { root, useInitData } from "@lynx-js/react";
import audioWaves from "@libitums/icons/lynx/audio-waves";
import headset from "@libitums/icons/lynx/headset";
import { LearningUnit } from "@libitums/ui-lynx/learning-unit";
import type { LearningUnitStatus } from "@libitums/ui-lynx/learning-unit";

import {
  dispatchLearningUnitStoryTap,
  normalizeLearningUnitStoryArgs,
  type LearningUnitStoryArgs,
  type LearningUnitStoryData,
} from "../learning-unit-story";
import "./learning-unit-story.css";
import "./story-canvas.css";

const states: readonly LearningUnitStatus[] = ["default", "available", "active", "clear"];

function emitTap(data: LearningUnitStoryData) {
  "background only";
  dispatchLearningUnitStoryTap(data, (payload) => {
    NativeModules.bridge?.call?.("STORYBOOK_ACTION", payload, () => undefined);
  });
}

function App() {
  const data = normalizeLearningUnitStoryArgs(useInitData() as Partial<LearningUnitStoryArgs>);
  const icon = data.icon === "audio-waves" ? audioWaves : headset;

  return (
    <view className="story-canvas">
      <view className="story-card learning-unit-story-card">
        <text className="story-eyebrow">LYNX COMPONENT</text>
        <text className="story-title">Learning Unit</text>
        {data.showAllStates ? (
          <view className="learning-unit-story-grid">
            {states.map((status) => (
              <view className="learning-unit-story-item" key={status}>
                <LearningUnit
                  accessibilityLabel={`${data.accessibilityLabel}, ${status}`}
                  icon={icon}
                  status={status}
                  narrative={data.narrative}
                  bindtap={() => emitTap({ ...data, status })}
                />
                <text className="learning-unit-story-label">{status.toUpperCase()}</text>
              </view>
            ))}
          </view>
        ) : (
          <view className="learning-unit-story-example">
            <LearningUnit
              accessibilityLabel={data.accessibilityLabel}
              icon={icon}
              status={data.status}
              narrative={data.narrative}
              focused={data.focused}
              bindtap={() => emitTap(data)}
            />
          </view>
        )}
      </view>
    </view>
  );
}

root.render(<App />);
export default App;
