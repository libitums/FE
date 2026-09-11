import type {} from "@lynx-js/react";

import type { PageIndicatorProps } from "./contract";
import { getPageIndicatorModel } from "./logic";

export function PageIndicator(props: PageIndicatorProps) {
  const model = getPageIndicatorModel(props);

  if (!model.shouldRender || model.accessibilityLabel === null) return null;

  return (
    <view
      className="ui-lynx-page-indicator"
      data-testid="ui-lynx-page-indicator"
      data-count={String(model.pageCount)}
      data-current={String(model.currentPage)}
      accessibility-element={true}
      accessibility-label={model.accessibilityLabel}
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
