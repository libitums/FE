import { root, useInitData } from "@lynx-js/react";
import { Dialog } from "@libitums/ui-lynx/dialog";

import { dispatchDialogStoryAction, normalizeDialogStoryArgs } from "../dialog-story";
import type { DialogStoryArgs } from "../story-types";
import "./story-canvas.css";

function App() {
  const data = normalizeDialogStoryArgs(useInitData() as Partial<DialogStoryArgs>);

  function emitAction(id: string) {
    "background only";
    dispatchDialogStoryAction(data, id, (envelope) => {
      NativeModules.bridge?.call?.(
        envelope.channel,
        { name: envelope.name, args: envelope.args },
        () => undefined,
      );
    });
  }

  return (
    <view className="story-canvas">
      <Dialog
        title={data.title}
        description={data.description}
        actions={data.actions}
        motion={data.motion}
        bindaction={emitAction}
      />
    </view>
  );
}

root.render(<App />);
export default App;
