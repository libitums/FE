import { root, useEffect, useInitData, useState } from "@lynx-js/react";
import { Overlay } from "@libitums/ui-lynx/overlay";

import type { OverlayStoryArgs } from "../overlay-story";
import { dispatchOverlayStoryDismiss, normalizeOverlayStoryArgs } from "../overlay-story";
import "./overlay-story.css";
import "./story-canvas.css";

function App() {
  const data = normalizeOverlayStoryArgs(useInitData() as Partial<OverlayStoryArgs>);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    setOpen(true);
  }, [data.blur, data.dismiss, data.motion, data.phase, data.scope, data.surface]);

  function emitDismiss() {
    "background only";
    const didDismiss = dispatchOverlayStoryDismiss(data, (envelope) => {
      NativeModules.bridge?.call?.(
        envelope.channel,
        { name: envelope.name, args: envelope.args },
        () => undefined,
      );
    });
    if (didDismiss) setOpen(false);
  }

  if (data.scope === "area") {
    return (
      <view className="overlay-story-canvas">
        <text className="overlay-story-heading">AREA OVERLAY</text>
        <view className="overlay-story-media" flatten={false}>
          <view className="overlay-story-art overlay-story-art-one" />
          <view className="overlay-story-art overlay-story-art-two" />
          {open ? (
            <Overlay scope="area" blur={data.blur} motion={data.motion} phase={data.phase} />
          ) : null}
          <view className="overlay-story-area-foreground">
            <text className="overlay-story-area-label">분석 중</text>
          </view>
        </view>
        <text className="overlay-story-caption">부모 영역 안에서만 target을 가립니다.</text>
      </view>
    );
  }

  return (
    <view className="overlay-story-canvas">
      <text className="overlay-story-heading">SCREEN OVERLAY</text>
      <view className="overlay-story-content-card">
        <text className="overlay-story-content-title">오늘의 학습</text>
        <text className="overlay-story-content-copy">Overlay 뒤 target은 입력할 수 없습니다.</text>
      </view>
      {open && data.surface === "sheet" ? (
        <Overlay
          scope="screen"
          surface="sheet"
          blur={data.blur}
          motion={data.motion}
          phase={data.phase}
          {...(data.dismiss === "tap"
            ? { dismiss: "tap" as const, binddismiss: emitDismiss }
            : { dismiss: "none" as const })}
        />
      ) : null}
      {open && data.surface === "dialog" ? (
        <Overlay
          scope="screen"
          surface="dialog"
          blur={data.blur}
          motion={data.motion}
          phase={data.phase}
          dismiss="none"
        />
      ) : null}
      {open && data.surface === "sheet" ? (
        <view className="overlay-story-sheet">
          <view className="overlay-story-handle" />
          <text className="overlay-story-surface-title">학습을 종료할까요?</text>
          <text className="overlay-story-surface-copy">dim을 탭하면 Sheet와 함께 닫힙니다.</text>
        </view>
      ) : null}
      {open && data.surface === "dialog" ? (
        <view className="overlay-story-dialog">
          <text className="overlay-story-surface-title">학습을 종료할까요?</text>
          <text className="overlay-story-surface-copy">
            Dialog overlay는 dim 탭으로 닫히지 않습니다.
          </text>
        </view>
      ) : null}
    </view>
  );
}

root.render(<App />);
export default App;
