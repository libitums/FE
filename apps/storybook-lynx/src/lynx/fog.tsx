import { root, useInitData } from "@lynx-js/react";
import { Fog } from "@libitums/ui-lynx/fog";

import type { FogStoryArgs } from "../fog-story";
import { normalizeFogStoryArgs } from "../fog-story";
import "./fog-story.css";
import "./story-canvas.css";

const items = ["첫 번째 학습", "두 번째 학습", "세 번째 학습", "네 번째 학습"];

function App() {
  const data = normalizeFogStoryArgs(useInitData() as Partial<FogStoryArgs>);
  const horizontal = data.direction === "start" || data.direction === "end";

  return (
    <view className="story-canvas">
      <view className="story-card">
        <text className="story-eyebrow">LYNX COMPONENT</text>
        <text className="story-title">Fog</text>
        <view
          className={`fog-story-viewport fog-story-surface-${data.color}`}
          style={{ direction: data.layoutDirection }}
        >
          <scroll-view
            className={horizontal ? "fog-story-scroll-horizontal" : "fog-story-scroll-vertical"}
            scroll-orientation={horizontal ? "horizontal" : "vertical"}
            scroll-bar-enable={false}
          >
            <view
              className={horizontal ? "fog-story-content-horizontal" : "fog-story-content-vertical"}
            >
              {items.map((item, index) => (
                <view className="fog-story-item" key={item}>
                  <text className="fog-story-index">0{index + 1}</text>
                  <text className="fog-story-label">{item}</text>
                </view>
              ))}
            </view>
          </scroll-view>
          <Fog
            direction={data.direction}
            size={data.size}
            color={data.color}
            visibility={data.visibility}
            layoutDirection={data.layoutDirection}
          />
        </view>
      </view>
    </view>
  );
}

root.render(<App />);
export default App;
