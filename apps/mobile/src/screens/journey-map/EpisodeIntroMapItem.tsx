import { Tooltip } from "@libitums/ui-lynx/tooltip";
import { useUiCopy } from "../../lib/ui-copy";
import type { EpisodeIntroMapItemProps } from "../episode-intro/episode-intro.contract";

import { canSelectMapNode } from "./journey-map-load";
import { SpecialUnitMapItem } from "./SpecialUnitMapItem";

// 에피소드 표지의 맵 항목입니다 — 구획의 **첫 항목**이고, 이것을 끝내야 그 에피소드의
// 나머지가 열립니다(D6).
//
// **`locked`는 오늘 안 옵니다** — 표지 앞에는 걸 것이 없어 `mapItemStatus`가 표지에게
// 그 값을 내지 않습니다. 그래도 `status` 타입은 공용을 쓰므로 값이 오면 잠긴 것처럼 서고
// 눌리지 않아야 합니다(`SpecialUnitMapItem`의 가드, 말풍선의 가드).
export function EpisodeIntroMapItem({
  id,
  title,
  status,
  onSelect,
  guided = false,
}: EpisodeIntroMapItemProps & { guided?: boolean }) {
  const copy = useUiCopy();
  const handleSelect = () => {
    "background only";
    onSelect(id);
  };
  // 말풍선은 유닛의 탭 길을 지나지 않으므로 자체 가드를 둡니다.
  const handleTooltipTap = () => {
    "background only";
    if (canSelectMapNode(status)) {
      onSelect(id);
    }
  };

  return (
    <SpecialUnitMapItem
      unitId={id}
      title={title}
      accessibilityName={title}
      status={status}
      onSelect={handleSelect}
      layer={guided ? "guide" : "map"}
    >
      {guided ? (
        <view className="first-unit-map-tooltip" bindtap={handleTooltipTap}>
          <Tooltip
            message={copy.episodeIntro.guide.map}
            tone="brand"
            placement="bottom"
            visibility="visible"
          />
        </view>
      ) : null}
    </SpecialUnitMapItem>
  );
}
