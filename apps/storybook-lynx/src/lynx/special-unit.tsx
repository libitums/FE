import { root, useInitData } from "@lynx-js/react";
import { MotionProvider } from "@libitums/ui-lynx/motion";
import { SpecialUnit } from "@libitums/ui-lynx/special-unit";
import type { SpecialUnitStatus } from "@libitums/ui-lynx/special-unit";

import {
  dispatchSpecialUnitStoryTap,
  normalizeSpecialUnitStoryArgs,
  type SpecialUnitStoryArgs,
  type SpecialUnitStoryData,
} from "../special-unit-story";
import "./special-unit-story.css";
import "./story-canvas.css";

const states: readonly SpecialUnitStatus[] = [
  "default",
  "checking",
  "available",
  "active",
  "clear",
];

function emitTap(data: SpecialUnitStoryData) {
  "background only";
  dispatchSpecialUnitStoryTap(data, (payload) => {
    NativeModules.bridge?.call?.("STORYBOOK_ACTION", payload, () => undefined);
  });
}

function App() {
  const data = normalizeSpecialUnitStoryArgs(useInitData() as Partial<SpecialUnitStoryArgs>);

  return (
    <MotionProvider motion={data.motion}>
      <view className="story-canvas">
        <view className="story-card special-unit-story-card">
          <text className="story-eyebrow">LYNX COMPONENT</text>
          <text className="story-title">Special Unit</text>
          {data.showAllStates ? (
            <view className="special-unit-story-grid">
              {states.map((status) => (
                <view className="special-unit-story-item" key={status}>
                  <SpecialUnit
                    accessibilityLabel={`${data.accessibilityLabel}, ${status}`}
                    status={status}
                    bindtap={() => emitTap({ ...data, status })}
                  />
                  <text className="special-unit-story-label">{status.toUpperCase()}</text>
                </view>
              ))}
            </view>
          ) : (
            <view className="special-unit-story-example">
              <SpecialUnit
                accessibilityLabel={data.accessibilityLabel}
                status={data.status}
                focused={data.focused}
                bindtap={() => emitTap(data)}
              />
            </view>
          )}
        </view>
      </view>
    </MotionProvider>
  );
}

root.render(<App />);
export default App;
