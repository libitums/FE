import { root, useInitData } from "@lynx-js/react";
import { Button } from "@libitums/ui-lynx";
import type { ButtonSize, ButtonVariant, ButtonWidth } from "@libitums/ui-lynx";

import type { ButtonStoryArgs } from "../story-types";
import "./story-canvas.css";

const variants = new Set<ButtonVariant>(["neutral", "brand", "outline", "subtle", "text"]);
const sizes = new Set<ButtonSize>(["s", "m", "l", "xl"]);
const widths = new Set<ButtonWidth>(["hug", "fill"]);

function App() {
  const args = useInitData() as Partial<ButtonStoryArgs>;
  const label = typeof args.label === "string" ? args.label : "계속하기";
  const variant = variants.has(args.variant as ButtonVariant) ? args.variant : "neutral";
  const size = sizes.has(args.size as ButtonSize) ? args.size : "m";
  const width = widths.has(args.width as ButtonWidth) ? args.width : "hug";

  const emitTap = () => {
    "background only";
    NativeModules.bridge?.call?.(
      "STORYBOOK_ACTION",
      { name: "onTap", args: [label] },
      () => undefined,
    );
  };

  return (
    <view className="story-canvas">
      <view className="story-card">
        <text className="story-eyebrow">LYNX COMPONENT</text>
        <text className="story-title">Button</text>
        <Button
          label={label}
          variant={variant}
          size={size}
          width={width}
          disabled={args.disabled === true}
          loading={args.loading === true}
          bindtap={emitTap}
        />
      </view>
    </view>
  );
}

root.render(<App />);
export default App;
