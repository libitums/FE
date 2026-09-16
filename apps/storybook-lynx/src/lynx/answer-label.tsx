import { root, useInitData } from "@lynx-js/react";
import { AnswerLabel } from "@libitums/ui-lynx/answer-label";
import type {
  AnswerLabelEmphasis,
  AnswerLabelResult,
  AnswerLabelSize,
} from "@libitums/ui-lynx/answer-label";

import type { AnswerLabelStoryArgs } from "../story-types";
import "./story-canvas.css";

const results = new Set<AnswerLabelResult>(["pending", "correct", "incorrect"]);
const emphases = new Set<AnswerLabelEmphasis>(["solid", "subtle"]);
const sizes = new Set<AnswerLabelSize>(["s", "m", "l"]);

function App() {
  const args = useInitData() as Partial<AnswerLabelStoryArgs>;
  const result = results.has(args.result as AnswerLabelResult)
    ? (args.result as AnswerLabelResult)
    : "pending";
  const emphasis = emphases.has(args.emphasis as AnswerLabelEmphasis)
    ? (args.emphasis as AnswerLabelEmphasis)
    : "solid";
  const size = sizes.has(args.size as AnswerLabelSize) ? (args.size as AnswerLabelSize) : "m";
  const label = typeof args.label === "string" && args.label.trim() ? args.label : undefined;
  const contextLabel =
    typeof args.contextLabel === "string" && args.contextLabel.trim()
      ? args.contextLabel
      : undefined;

  return (
    <view className="story-canvas">
      <view className="story-card">
        <text className="story-eyebrow">LYNX COMPONENT</text>
        <text className="story-title">Answer Label</text>
        {result === "pending" ? (
          <AnswerLabel
            result="pending"
            label={label ?? "잘 들어 보세요"}
            emphasis={emphasis}
            size={size}
            contextLabel={contextLabel}
          />
        ) : (
          <AnswerLabel
            result={result}
            label={label}
            emphasis={emphasis}
            size={size}
            contextLabel={contextLabel}
          />
        )}
      </view>
    </view>
  );
}

root.render(<App />);
export default App;
