import { root, useInitData } from "@lynx-js/react";
import { BottomSheet, type BottomSheetDismissReason } from "@libitums/ui-lynx/bottom-sheet";

import {
  dispatchBottomSheetStoryAction,
  dispatchBottomSheetStoryDismiss,
  normalizeBottomSheetStoryArgs,
} from "../bottom-sheet-story";
import type { BottomSheetStoryArgs } from "../story-types";
import "./story-canvas.css";

function App() {
  const data = normalizeBottomSheetStoryArgs(useInitData() as Partial<BottomSheetStoryArgs>);

  function callBridge(name: "onDismiss" | "onAction", args: readonly [string]) {
    "background only";
    NativeModules.bridge?.call?.("STORYBOOK_ACTION", { name, args }, () => undefined);
  }

  function emitDismiss(reason: BottomSheetDismissReason) {
    "background only";
    dispatchBottomSheetStoryDismiss(reason, (envelope) => {
      callBridge(envelope.name, envelope.args);
    });
  }

  function emitPrimaryAction() {
    "background only";
    dispatchBottomSheetStoryAction("primary", (envelope) => {
      callBridge(envelope.name, envelope.args);
    });
  }

  function emitSecondaryAction() {
    "background only";
    dispatchBottomSheetStoryAction("secondary", (envelope) => {
      callBridge(envelope.name, envelope.args);
    });
  }

  const actions = [
    { id: "primary", label: data.primaryActionLabel, bindtap: emitPrimaryAction },
    ...(data.showSecondaryAction
      ? [{ id: "secondary", label: data.secondaryActionLabel, bindtap: emitSecondaryAction }]
      : []),
  ];

  return (
    <view className="story-canvas">
      <view className="story-card">
        <text className="story-eyebrow">CURRENT LESSON</text>
        <text className="story-title">Ordering at a café</text>
      </view>
      <BottomSheet
        overline={data.overline || undefined}
        title={data.title}
        description={data.description || undefined}
        closeAccessibilityLabel="학습 도구 시트 닫기"
        actions={actions}
        draggable={data.draggable}
        motion={data.motion}
        ondismiss={emitDismiss}
      />
    </view>
  );
}

root.render(<App />);
export default App;
