import { root, useInitData } from "@lynx-js/react";
import { MotionProvider } from "@libitums/ui-lynx/motion";
import { PageIndicator } from "@libitums/ui-lynx/page-indicator";
import type { PageIndicatorStoryArgs } from "../story-types";
import { normalizeStoryMotion } from "../story-motion";
import "./story-canvas.css";

function App() {
  const args = useInitData() as Partial<PageIndicatorStoryArgs>;
  const pageCount =
    typeof args.pageCount === "number" && Number.isFinite(args.pageCount) ? args.pageCount : 0;
  const currentPage =
    typeof args.currentPage === "number" && Number.isFinite(args.currentPage)
      ? args.currentPage
      : 1;

  const motion = normalizeStoryMotion(args.motion);

  return (
    <view className="story-canvas">
      <view className="story-card">
        <text className="story-eyebrow">LYNX COMPONENT</text>
        <text className="story-title">Page Indicator</text>
        <MotionProvider motion={motion}>
          <PageIndicator pageCount={pageCount} currentPage={currentPage} />
        </MotionProvider>
      </view>
    </view>
  );
}

root.render(<App />);
export default App;
