import type { ReactNode } from "@lynx-js/react";

import { CatalogEpisodeSection } from "./CatalogEpisodeSection";
import { CatalogUnavailableSection } from "./CatalogUnavailableSection";
import { catalogCoverStatus } from "./catalog-map";
import { mapNodeStatusUnder } from "./journey-map-load";
import type { CatalogMapSectionsProps } from "./catalog-map.contract";

import "./catalog-map.css";

// 카탈로그 구획들의 루트입니다. 구획마다 표지 상태를 순수 함수로 파생해 두 변형 중 하나를 고릅니다 —
// 본문이 있으면 표지 + 유닛 노드, 없거나 잠겼으면 흐린 표식 + 사유 캡션입니다.
export function CatalogMapSections({
  sections,
  gate,
  access = "open",
  onStartCover,
  onStartUnit,
}: CatalogMapSectionsProps): ReactNode {
  return (
    <view className="catalog-map-sections" data-testid="journey-map-screen-catalog">
      {sections.map((section, index) =>
        section.kind === "catalog-ready" ? (
          <CatalogEpisodeSection
            key={section.episodeId}
            section={section}
            coverStatus={mapNodeStatusUnder(access, catalogCoverStatus(sections, index, gate))}
            access={access}
            progress={gate.progress}
            onStartCover={onStartCover}
            onStartUnit={onStartUnit}
          />
        ) : (
          <CatalogUnavailableSection key={section.episodeId} section={section} />
        ),
      )}
      {sections[sections.length - 1]?.kind === "catalog-unavailable" ? (
        <view className="catalog-map-tail" />
      ) : null}
    </view>
  );
}
