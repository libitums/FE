import type { ReactNode } from "@lynx-js/react";

import bookmark from "@libitums/icons/lynx/bookmark";
import { LearningUnit } from "@libitums/ui-lynx/learning-unit";

import { useUiCopy } from "../../lib/ui-copy";
import { catalogCoverAccessibilityLabel } from "./catalog-map";
import type { CatalogCoverMapItemProps } from "./catalog-map.contract";

import "./journey-special-unit.css";

// 표지의 상태 어휘를 `LearningUnit`의 어휘로 옮깁니다 — 튜토리얼 표지와 같은 표입니다.
const unitStatusByStatus = {
  locked: "default",
  available: "available",
  completed: "clear",
} as const;

// 카탈로그 에피소드의 표지 노드입니다. 잠김이면 고름을 올리지 않습니다 — `LearningUnit`이 `default`에서
// 탭을 흘리지 않는 것에만 기대지 않고 여기서도 막습니다.
export function CatalogCoverMapItem({
  episodeId,
  ordinal,
  status,
  onSelect,
}: CatalogCoverMapItemProps): ReactNode {
  const copy = useUiCopy();
  const handleSelect = () => {
    "background only";
    if (status !== "locked") {
      onSelect(episodeId);
    }
  };

  return (
    <view className="journey-special-unit">
      <LearningUnit
        id={`catalog-cover-${episodeId}`}
        accessibilityLabel={catalogCoverAccessibilityLabel(ordinal, copy)}
        icon={bookmark}
        status={unitStatusByStatus[status]}
        narrative="narrative"
        bindtap={handleSelect}
      />
      <text className="journey-special-unit-label" accessibility-element={false}>
        {copy.catalogMap.coverTitle}
      </text>
    </view>
  );
}
