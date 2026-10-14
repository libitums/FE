import type { ReactNode } from "@lynx-js/react";

import flag from "@libitums/icons/lynx/flag";
import play from "@libitums/icons/lynx/play";
import { LearningUnit } from "@libitums/ui-lynx/learning-unit";

import { useUiCopy } from "../../lib/ui-copy";
import { catalogUnitNodeAccessibilityLabel, catalogUnitNodeTitle } from "./catalog-map";
import type { CatalogUnitNodeProps } from "./catalog-map.contract";

import "./journey-special-unit.css";

// 표지의 상태 어휘를 `LearningUnit`의 어휘로 옮깁니다 — 표지 노드와 같은 표입니다.
const unitStatusByStatus = {
  locked: "default",
  available: "available",
  completed: "clear",
} as const;

// 카탈로그 레슨 · 최종 노드입니다 — 상태(잠김 · 열림 · 끝)는 사슬에서 파생되어 내려오고, 열린 노드만
// 고름을 올립니다. 잠김이면 `LearningUnit`이 `default`에서 탭을 흘리지 않는 것에만 기대지 않고 여기서도
// 막습니다(표지 노드와 같은 이중 방어). 학습 유닛은 `play`, 최종 테스트는 `flag` 아이콘입니다.
export function CatalogUnitNode({
  episodeId,
  episodeOrdinal,
  node,
  onSelect,
}: CatalogUnitNodeProps): ReactNode {
  const copy = useUiCopy();
  const isFinal = node.role === "final";
  const handleSelect = () => {
    "background only";
    if (node.status !== "locked") {
      onSelect(episodeId, node.key);
    }
  };

  return (
    <view className="journey-special-unit">
      <LearningUnit
        id={`catalog-unit-${episodeId}-${node.key}`}
        accessibilityLabel={catalogUnitNodeAccessibilityLabel(episodeOrdinal, node, copy)}
        icon={isFinal ? flag : play}
        status={unitStatusByStatus[node.status]}
        narrative={isFinal ? "narrative" : "none"}
        bindtap={handleSelect}
      />
      <text className="journey-special-unit-label" accessibility-element={false}>
        {catalogUnitNodeTitle(node, copy)}
      </text>
    </view>
  );
}
