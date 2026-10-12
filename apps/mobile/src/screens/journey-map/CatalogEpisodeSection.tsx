import type { ReactNode } from "@lynx-js/react";

import { CatalogCoverMapItem } from "./CatalogCoverMapItem";
import { CatalogUnitNode } from "./CatalogUnitNode";
import { catalogSectionDomId, catalogUnitNodesOf } from "./catalog-map";
import type { CatalogEpisodeSectionProps } from "./catalog-map.contract";

import "./episode-pending.css";
import "./catalog-map.css";

// 본문이 있는 에피소드의 구획입니다 — 표지 노드 하나와 레슨 · 최종 유닛 노드들입니다. 유닛 노드의 상태는
// 사슬(표지 → 레슨들 → 최종)에서 파생되고, 열린 노드만 고름을 올립니다.
// 머리 카드는 흐름 안에 두지 않습니다(맵에 하나뿐이고 스크롤 자리가 고릅니다) — 그래서 **heading trait이 없습니다**.
export function CatalogEpisodeSection({
  section,
  coverStatus,
  progress,
  onStartCover,
  onStartUnit,
}: CatalogEpisodeSectionProps): ReactNode {
  return (
    <view
      // ⚠ `id`입니다 — 머리 카드가 구획 자리를 `#id` 선택자로 잽니다(하나라도 못 재면 측정 전체가 `null`).
      id={catalogSectionDomId(section.episodeId)}
      className="journey-map-screen-episode"
      data-testid={`catalog-section-${section.episodeId}`}
    >
      <view className="episode-pending-divider" />
      <CatalogCoverMapItem
        episodeId={section.episodeId}
        ordinal={section.ordinal}
        status={coverStatus}
        onSelect={onStartCover}
      />
      {catalogUnitNodesOf(section, progress).map((node) => (
        <CatalogUnitNode
          key={node.key}
          episodeId={section.episodeId}
          episodeOrdinal={section.ordinal}
          node={node}
          onSelect={onStartUnit}
        />
      ))}
    </view>
  );
}
