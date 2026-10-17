import type { ReactNode } from "@lynx-js/react";

import play from "@libitums/icons/lynx/play";
import { LearningUnit } from "@libitums/ui-lynx/learning-unit";

import { useUiCopy } from "../../lib/ui-copy";
import { catalogUnitNodeAccessibilityLabel, catalogUnitNodeTitle } from "./catalog-map";
import type { CatalogUnitNodeProps } from "./catalog-map.contract";

import { canSelectMapNode } from "./journey-map-load";
import { SpecialUnitMapItem } from "./SpecialUnitMapItem";

import "./journey-step-node.css";

// 표지의 상태 어휘를 `LearningUnit`의 어휘로 옮깁니다 — 레슨 노드만 씁니다.
const unitStatusByStatus = {
  locked: "default",
  available: "available",
  completed: "clear",
  checking: "checking",
} as const;

// 카탈로그 노드입니다. 상태(잠김 · 열림 · 끝)는 사슬에서 파생되어 내려오고, 열린 노드만 고름을
// 올립니다. 레슨은 원형 `LearningUnit`(`play`)이고, 문화 · 최종은 스페셜 항목입니다.
export function CatalogUnitNode(props: CatalogUnitNodeProps): ReactNode {
  return props.node.role === "lesson" ? (
    <CatalogLessonNode {...props} />
  ) : (
    <CatalogSpecialNode {...props} />
  );
}

function CatalogSpecialNode({ episodeId, episodeOrdinal, node, onSelect }: CatalogUnitNodeProps) {
  const copy = useUiCopy();

  return (
    <SpecialUnitMapItem
      unitId={`catalog-unit-${episodeId}-${node.key}`}
      title={catalogUnitNodeTitle(node, copy)}
      accessibilityName={catalogUnitNodeAccessibilityLabel(episodeOrdinal, node, copy)}
      status={node.status}
      onSelect={() => {
        "background only";
        onSelect(episodeId, node.key);
      }}
    />
  );
}

// `LearningUnit`이 `default`에서 탭을 흘리지 않는 것에만 기대지 않고 여기서도 막습니다.
function CatalogLessonNode({ episodeId, episodeOrdinal, node, onSelect }: CatalogUnitNodeProps) {
  const copy = useUiCopy();
  const handleSelect = () => {
    "background only";
    if (canSelectMapNode(node.status)) {
      onSelect(episodeId, node.key);
    }
  };

  return (
    <view className="journey-step-node">
      <LearningUnit
        id={`catalog-unit-${episodeId}-${node.key}`}
        accessibilityLabel={catalogUnitNodeAccessibilityLabel(episodeOrdinal, node, copy)}
        icon={play}
        status={unitStatusByStatus[node.status]}
        narrative="none"
        bindtap={handleSelect}
      />
      <text className="journey-step-node-label" accessibility-element={false}>
        {catalogUnitNodeTitle(node, copy)}
      </text>
    </view>
  );
}
