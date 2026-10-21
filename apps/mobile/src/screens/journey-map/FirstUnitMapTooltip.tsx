import { Tooltip } from "@libitums/ui-lynx/tooltip";

import { useUiCopy } from "../../lib/ui-copy";
import type { FirstUnitMapTooltipProps } from "./catalog-map.contract";
import { canSelectMapNode } from "./journey-map-load";

// 첫 유닛 안내의 말풍선입니다 — 대상 표지 아래에 섭니다. 유닛의 탭 길을 지나지 않으므로 자체 가드를 둡니다.
export function FirstUnitMapTooltip({ status, onSelect }: FirstUnitMapTooltipProps) {
  const copy = useUiCopy();
  const handleTap = () => {
    "background only";
    if (canSelectMapNode(status)) onSelect();
  };

  return (
    <view
      className="first-unit-map-tooltip"
      data-testid="first-unit-map-tooltip"
      bindtap={handleTap}
    >
      <Tooltip
        message={copy.episodeIntro.guide.map}
        tone="brand"
        placement="bottom"
        visibility="visible"
      />
    </view>
  );
}
