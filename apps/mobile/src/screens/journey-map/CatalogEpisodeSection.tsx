import type { ReactNode } from "@lynx-js/react";

import { useUiCopy } from "../../lib/ui-copy";
import { CatalogCoverMapItem } from "./CatalogCoverMapItem";
import { CatalogLockedUnitNode } from "./CatalogLockedUnitNode";
import { catalogLockedNodesOf, catalogSectionDomId } from "./catalog-map";
import type { CatalogEpisodeSectionProps } from "./catalog-map.contract";

import "./episode-pending.css";
import "./catalog-map.css";

// 본문이 있는 에피소드의 구획입니다 — 표지 노드 하나와 아직 열 수 없는 유닛 노드들입니다.
// 머리 카드는 흐름 안에 두지 않습니다(맵에 하나뿐이고 스크롤 자리가 고릅니다) — 그래서 **heading trait이 없습니다**.
export function CatalogEpisodeSection({
  section,
  coverStatus,
  onStartCover,
}: CatalogEpisodeSectionProps): ReactNode {
  const copy = useUiCopy();

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
        status={coverStatus}
        onSelect={onStartCover}
      />
      {/* 표지 아래가 그대로 잠겨 있는 이유를 한 번 말합니다. 노드마다 이미 「coming soon」을 읽으므로 낭독에서는
          뺍니다. 유닛이 열리면(학습 유닛을 잇는 단계) 걷습니다. */}
      <text className="catalog-section-caption" accessibility-elements-hidden={true}>
        {copy.catalogMap.caption.pending}
      </text>
      {catalogLockedNodesOf(section).map((node) => (
        <CatalogLockedUnitNode key={node.key} episodeId={section.episodeId} node={node} />
      ))}
    </view>
  );
}
