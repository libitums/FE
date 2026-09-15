import { root, useInitData } from "@lynx-js/react";
import cross from "@libitums/icons/lynx/cross";
import mail from "@libitums/icons/lynx/mail";
import search from "@libitums/icons/lynx/search";
import { TextField } from "@libitums/ui-lynx/text-field";

import { normalizeTextFieldStoryArgs } from "../text-field-story";
import "./story-canvas.css";

function App() {
  const args = normalizeTextFieldStoryArgs(useInitData());
  const leading =
    args.adornment === "icons"
      ? { kind: "icon" as const, icon: mail }
      : args.adornment === "prefix-suffix"
        ? { kind: "prefix" as const, text: "약" }
        : args.purpose === "search"
          ? { kind: "icon" as const, icon: search }
          : undefined;
  const trailing =
    args.adornment === "icons"
      ? { kind: "icon" as const, icon: mail }
      : args.adornment === "prefix-suffix"
        ? { kind: "suffix" as const, text: "분" }
        : args.adornment === "action"
          ? {
              kind: "action" as const,
              icon: cross,
              accessibilityLabel: "검색어 지우기",
              bindtap: () => {
                "background only";
              },
            }
          : undefined;

  return (
    <view className="story-canvas">
      <view className="story-card">
        <text className="story-eyebrow">LYNX COMPONENT</text>
        <text className="story-title">Text Field</text>
        <TextField
          availability={args.availability}
          counter={args.counterMaxLength ? { maxLength: args.counterMaxLength } : undefined}
          defaultValue={args.defaultValue}
          label={args.label}
          leading={leading}
          placeholder={args.placeholder}
          purpose={args.purpose}
          qualifier={args.qualifier}
          supporting={
            args.supporting === "none"
              ? undefined
              : { kind: args.supporting, message: args.supportingMessage }
          }
          trailing={trailing}
        />
      </view>
    </view>
  );
}

root.render(<App />);
export default App;
