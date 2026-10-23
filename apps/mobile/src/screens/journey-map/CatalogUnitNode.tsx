import type { ReactNode } from "@lynx-js/react";

import lantern from "@libitums/icons/lynx/lantern-05";
import play from "@libitums/icons/lynx/play";
import { LearningUnit } from "@libitums/ui-lynx/learning-unit";
import type { LearningUnitTapEvent } from "@libitums/ui-lynx/learning-unit";

import { useUiCopy } from "../../lib/ui-copy";
import { catalogSheetKey } from "./catalog-sheet";
import { catalogUnitNodeAccessibilityLabel, catalogUnitNodeTitle } from "./catalog-map";
import type { CatalogUnitNodeProps, CatalogUnitNodeRole } from "./catalog-map.contract";

import { canSelectMapNode } from "./journey-map-load";
import { MapUnitStage } from "./MapUnitStage";
import { SpecialUnitMapItem } from "./SpecialUnitMapItem";

import "./journey-step-node.css";

// 표지의 상태 어휘를 `LearningUnit`의 어휘로 옮깁니다 — 레슨 · 문화 노드만 씁니다.
const unitStatusByStatus = {
  locked: "default",
  available: "available",
  completed: "clear",
  checking: "checking",
} as const;

// 티켓을 쓰고 연 열린 유닛은 진한 색(`active` — `brand.primary` 면 · 흰 아이콘)으로 섭니다. 그 밖은 위 표를 따릅니다.
function lessonUnitStatusOf(node: CatalogUnitNodeProps["node"]) {
  return node.ticketed === true && node.status === "available"
    ? "active"
    : unitStatusByStatus[node.status];
}

// 문화는 레슨처럼 배우는 단위라 원형으로 남고 아이콘으로만 갈립니다(사용자 결정 2026-10-17).
const lessonIconByRole: Readonly<Record<Exclude<CatalogUnitNodeRole, "final">, string>> = {
  lesson: play,
  culture: lantern,
};

// 카탈로그 노드입니다. 상태(잠김 · 열림 · 끝)는 사슬에서 파생되어 내려오고, 열린 노드만 고름을
// 올립니다(맵이 말풍선을 엽니다 — 바로 시작하지 않습니다). 레슨(`play`) · 문화(`lantern-05`)는 원형
// `LearningUnit`이고, 최종만 스페셜 항목입니다.
export function CatalogUnitNode(props: CatalogUnitNodeProps): ReactNode {
  return props.node.role === "final" ? (
    <CatalogSpecialNode {...props} />
  ) : (
    <CatalogLessonNode {...props} icon={lessonIconByRole[props.node.role]} />
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
      sheetTargetId={catalogSheetKey(episodeId, node.key)}
      onSelect={(tapY) => {
        "background only";
        onSelect(episodeId, node.key, tapY);
      }}
    />
  );
}

// `LearningUnit`이 `default`에서 탭을 흘리지 않는 것에만 기대지 않고 여기서도 막습니다.
function CatalogLessonNode({
  episodeId,
  episodeOrdinal,
  node,
  onSelect,
  icon,
}: CatalogUnitNodeProps & { readonly icon: string }) {
  const copy = useUiCopy();
  const handleSelect = (event: LearningUnitTapEvent) => {
    "background only";
    if (canSelectMapNode(node.status)) {
      // 탭의 세로 좌표를 함께 올립니다 — 맵이 말풍선을 그 자리에 먼저 띄웁니다(`JourneyStepNode`와 같은 규칙).
      onSelect(episodeId, node.key, event.detail?.y ?? 0);
    }
  };

  return (
    <view className="journey-step-node">
      <MapUnitStage targetId={catalogSheetKey(episodeId, node.key)}>
        <LearningUnit
          id={`catalog-unit-${episodeId}-${node.key}`}
          accessibilityLabel={catalogUnitNodeAccessibilityLabel(episodeOrdinal, node, copy)}
          icon={icon}
          status={lessonUnitStatusOf(node)}
          narrative="none"
          bindtap={handleSelect}
        />
      </MapUnitStage>
      <text className="journey-step-node-label" accessibility-element={false}>
        {catalogUnitNodeTitle(node, copy)}
      </text>
    </view>
  );
}
