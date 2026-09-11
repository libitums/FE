import { root, useInitData } from "@lynx-js/react";
import { ProgressHeader } from "@libitums/ui-lynx/progress-header";
import type { ProgressHeaderMotion } from "@libitums/ui-lynx/progress-header";

import type { ProgressHeaderStoryArgs } from "../story-types";
import "./progress-header.css";

const motions = new Set<ProgressHeaderMotion>(["standard", "reduced"]);

function App() {
  const args = useInitData() as Partial<ProgressHeaderStoryArgs>;
  const title = typeof args.title === "string" ? args.title : "오늘의 학습";
  const activity = typeof args.activity === "string" ? args.activity : "1단계";
  const progress =
    typeof args.progress === "number" && Number.isFinite(args.progress) ? args.progress : 0;
  const exitAccessibilityLabel =
    typeof args.exitAccessibilityLabel === "string" && args.exitAccessibilityLabel
      ? args.exitAccessibilityLabel
      : "학습 나가기";
  const motion = motions.has(args.motion as ProgressHeaderMotion)
    ? (args.motion as ProgressHeaderMotion)
    : "standard";

  const emitExit = () => {
    "background only";
    if (typeof NativeModules === "undefined") return;

    NativeModules.bridge?.call?.(
      "STORYBOOK_ACTION",
      { name: "onExit", args: [title] },
      () => undefined,
    );
  };

  return (
    <view className="progress-header-story-canvas">
      <ProgressHeader
        title={title}
        activity={activity}
        progress={progress}
        exitAccessibilityLabel={exitAccessibilityLabel}
        motion={motion}
        onExit={emitExit}
      />
    </view>
  );
}

root.render(<App />);
export default App;
