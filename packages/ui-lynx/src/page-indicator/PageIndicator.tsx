import type {} from "@lynx-js/react";

import { motionClassName } from "../motion/motion.contract";
import { useMotion } from "../motion/MotionProvider";
import { getPageIndicatorModel } from "./page-indicator.contract";
import type { PageIndicatorProps } from "./page-indicator.contract";

export function PageIndicator(props: PageIndicatorProps) {
  const motion = useMotion();
  const model = getPageIndicatorModel(props, motion);

  if (!model.shouldRender || model.accessibilityLabel === null) return null;

  return (
    <view
      className={["ui-lynx-page-indicator", motionClassName("ui-lynx-page-indicator", motion)]
        .filter(Boolean)
        .join(" ")}
      data-testid="ui-lynx-page-indicator"
      data-motion={motion === "reduced" ? "reduced" : undefined}
      data-count={String(model.pageCount)}
      data-current={String(model.currentPage)}
      accessibility-element={!props.decorative}
      accessibility-label={props.decorative ? undefined : model.accessibilityLabel}
    >
      <view className="ui-lynx-page-indicator-track" accessibility-elements-hidden={true}>
        {model.items.map((item) => (
          <view
            key={item.page}
            className={`ui-lynx-page-indicator-item${
              item.isCurrent ? " ui-lynx-page-indicator-item-current" : ""
            }`}
            data-testid="ui-lynx-page-indicator-item"
            data-page={String(item.page)}
            data-active={item.isCurrent ? "true" : "false"}
          />
        ))}
      </view>
    </view>
  );
}
