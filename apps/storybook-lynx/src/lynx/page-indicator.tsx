import { root, useInitData } from "@lynx-js/react";
import { PageIndicator } from "@libitums/ui-lynx/page-indicator";
import type { PageIndicatorStoryArgs } from "../story-types";
import "./story-canvas.css";

function App() {
  const args = useInitData() as Partial<PageIndicatorStoryArgs>;
  const pageCount =
    typeof args.pageCount === "number" && Number.isFinite(args.pageCount) ? args.pageCount : 0;
  const currentPage =
    typeof args.currentPage === "number" && Number.isFinite(args.currentPage)
      ? args.currentPage
      : 1;

  return (
    <view className="story-canvas">
      <view className="story-card">
        <text className="story-eyebrow">LYNX COMPONENT</text>
        <text className="story-title">Page Indicator</text>
        <PageIndicator pageCount={pageCount} currentPage={currentPage} />
      </view>
    </view>
  );
}

root.render(<App />);
export default App;
