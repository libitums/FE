import { root, useInitData } from "@lynx-js/react";
import { StepIndicator } from "@libitums/ui-lynx/step-indicator";

import { normalizeStepIndicatorStoryArgs } from "../step-indicator-story";
import "./story-canvas.css";

function App() {
  const { currentStep, totalSteps } = normalizeStepIndicatorStoryArgs(useInitData());

  return (
    <view className="story-canvas">
      <view className="story-card">
        <text className="story-eyebrow">LYNX COMPONENT</text>
        <text className="story-title">Step Indicator</text>
        <StepIndicator currentStep={currentStep} totalSteps={totalSteps} />
      </view>
    </view>
  );
}

root.render(<App />);
export default App;
