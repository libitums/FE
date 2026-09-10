import { root, useInitData } from "@lynx-js/react";
import { BackHeader } from "@libitums/ui-lynx";

import type { BackHeaderStoryArgs } from "../story-types";
import "./story-canvas.css";

function emit(name: "onBack" | "onInfo", title: string) {
  NativeModules.bridge?.call?.("STORYBOOK_ACTION", { name, args: [title] }, () => undefined);
}

function App() {
  const args = useInitData() as Partial<BackHeaderStoryArgs>;
  const title = typeof args.title === "string" ? args.title : "단계 선택";
  const subtitle = typeof args.subtitle === "string" && args.subtitle ? args.subtitle : undefined;

  return (
    <view className="story-canvas">
      <view className="story-card">
        <text className="story-eyebrow">LYNX COMPONENT</text>
        <text className="story-title">Back Header</text>
        <BackHeader
          title={title}
          subtitle={subtitle}
          showInfo={args.showInfo === true}
          onBack={() => emit("onBack", title)}
          onInfo={() => emit("onInfo", title)}
        />
      </view>
    </view>
  );
}

root.render(<App />);
export default App;
