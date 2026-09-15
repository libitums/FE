import { root, useEffect, useInitData } from "@lynx-js/react";
import { CompactNumericInput } from "@libitums/ui-lynx/compact-numeric-input";
import {
  dispatchCompactNumericInputStoryInput,
  normalizeCompactNumericInputStoryArgs,
} from "../compact-numeric-input-story";
import type { CompactNumericInputStoryArgs } from "../story-types";
import "./story-canvas.css";

function App() {
  const data = normalizeCompactNumericInputStoryArgs(
    useInitData() as Partial<CompactNumericInputStoryArgs>,
  );

  useEffect(() => {
    lynx
      .createSelectorQuery()
      .select('[data-testid="ui-lynx-compact-numeric-input"]')
      .invoke({ method: "setValue", params: { value: data.defaultValue } })
      .exec();
  }, [data.defaultValue]);

  const emitInput = (value: string) => {
    "background only";
    dispatchCompactNumericInputStoryInput(data, value, (envelope) => {
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
        <text className="story-title">Compact Numeric Input</text>
        <CompactNumericInput
          accessibilityLabel={data.accessibilityLabel}
          defaultValue={data.defaultValue}
          placeholder={data.placeholder}
          size={data.size}
          error={data.error}
          disabled={data.disabled}
          bindinput={emitInput}
        />
      </view>
    </view>
  );
}

root.render(<App />);
export default App;
