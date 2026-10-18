import type { ReactNode } from "@lynx-js/react";

import { CatalogComingSoonSection } from "./CatalogComingSoonSection";
import { CatalogEpisodeSection } from "./CatalogEpisodeSection";
import { CatalogUnavailableSection } from "./CatalogUnavailableSection";
import { catalogComingSoonOrdinal } from "./catalog-coming-soon";
import { catalogCoverStatus } from "./catalog-map";
import { mapNodeStatusUnder } from "./journey-map-load";
import type { CatalogMapSectionsProps } from "./catalog-map.contract";

import "./catalog-map.css";

// 카탈로그 구획들의 루트입니다. 구획마다 표지 상태를 순수 함수로 파생해 두 변형 중 하나를 고릅니다 —
// 본문이 있으면 표지 + 유닛 노드, 없거나 잠겼으면 흐린 표식 + 사유 캡션입니다. 마지막이 열린 에피소드면 맨 끝에
// 「다음 에피소드 준비 중」 구획이 섭니다. 맨 아래 여백은 맵 상자의 아래 패딩(`mapContentInsets`)이 집니다.
export function CatalogMapSections({
  sections,
  gate,
  access = "open",
  onStartCover,
  onSelectUnit,
}: CatalogMapSectionsProps): ReactNode {
  const comingSoon = catalogComingSoonOrdinal(sections);
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
            onSelectUnit={onSelectUnit}
          />
        ) : (
          <CatalogUnavailableSection key={section.episodeId} section={section} />
        ),
      )}
      {comingSoon === null ? null : <CatalogComingSoonSection ordinal={comingSoon} />}
    </view>
  );
}
