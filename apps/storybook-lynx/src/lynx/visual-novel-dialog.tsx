import { root, useInitData } from "@lynx-js/react";
import { VisualNovelDialog } from "@libitums/ui-lynx/visual-novel-dialog";

import { normalizeVisualNovelDialogStoryArgs } from "../visual-novel-dialog-story";
import "./story-canvas.css";
import "./visual-novel-dialog.css";

function DemoAvatar() {
  return (
    <view className="story-visual-novel-avatar">
      <text className="story-visual-novel-avatar-label">아</text>
    </view>
  );
}

function App() {
  const args = normalizeVisualNovelDialogStoryArgs(useInitData());
  const shared = {
    contentLanguage: args.contentLanguage,
    continueIndicator: args.continueIndicator,
    direction: args.direction,
    languageTag: args.languageTag,
    line: args.line,
    reducedMotion: args.reducedMotion,
    reveal: args.reveal,
    status: args.reveal === "instant" ? ("ready" as const) : args.status,
    surface: args.surface,
    visibleCharacterCount: args.visibleCharacterCount,
  };

  const dialog =
    args.advance === "auto" ? (
      args.variant === "narration" ? (
        <VisualNovelDialog {...shared} advance="auto" autoControlAvailable variant="narration" />
      ) : args.variant === "thought" ? (
        <VisualNovelDialog
          {...shared}
          advance="auto"
          autoControlAvailable
          variant="thought"
          speakerName={args.speakerName}
          avatar={args.showAvatar ? <DemoAvatar /> : undefined}
        />
      ) : (
        <VisualNovelDialog
          {...shared}
          advance="auto"
          autoControlAvailable
          variant="speech"
          speakerName={args.speakerName}
          avatar={args.showAvatar ? <DemoAvatar /> : undefined}
        />
      )
    ) : args.variant === "narration" ? (
      <VisualNovelDialog {...shared} advance="tap" variant="narration" />
    ) : args.variant === "thought" ? (
      <VisualNovelDialog
        {...shared}
        advance="tap"
        variant="thought"
        speakerName={args.speakerName}
        avatar={args.showAvatar ? <DemoAvatar /> : undefined}
      />
    ) : (
      <VisualNovelDialog
        {...shared}
        advance="tap"
        variant="speech"
        speakerName={args.speakerName}
        avatar={args.showAvatar ? <DemoAvatar /> : undefined}
      />
    );

  return (
    <view className="story-visual-novel-scene">
      <view className="story-visual-novel-moon" />
      <view className="story-visual-novel-hill story-visual-novel-hill-far" />
      <view className="story-visual-novel-hill story-visual-novel-hill-near" />
      <view className="story-visual-novel-panel">{dialog}</view>
    </view>
  );
}

root.render(<App />);
export default App;
