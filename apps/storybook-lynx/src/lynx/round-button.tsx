import { root, useInitData } from "@lynx-js/react";
import info02 from "@libitums/icons/lynx/info-02";
import { RoundButton } from "@libitums/ui-lynx/round-button";
import type { RoundButtonStoryArgs } from "../story-types";
import { dispatchRoundButtonStoryTap, normalizeRoundButtonStoryArgs } from "../round-button-story";
import "./story-canvas.css";

const icons = { "info-02": info02 } as const;

function App() {
  const data = normalizeRoundButtonStoryArgs(useInitData() as Partial<RoundButtonStoryArgs>);
  const { accessibilityLabel, variant, size, disabled, loading } = data;
  const icon = icons[data.icon];
  const emitTap = () => {
    "background only";
    dispatchRoundButtonStoryTap(data, (envelope) => {
      NativeModules.bridge?.call?.(
        envelope.channel,
        { name: envelope.name, args: envelope.args },
        () => undefined,
      );
    });
  };
  return (
    <view className="story-canvas">
      <view className="story-card">
        <text className="story-eyebrow">LYNX COMPONENT</text>
        <text className="story-title">Round Button</text>
        <RoundButton
          accessibilityLabel={accessibilityLabel}
          icon={icon}
          variant={variant}
          size={size}
          disabled={disabled}
          loading={loading}
          bindtap={emitTap}
        />
      </view>
    </view>
  );
}

root.render(<App />);
export default App;
