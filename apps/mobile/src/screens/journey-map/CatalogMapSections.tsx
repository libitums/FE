import type { ReactNode } from "@lynx-js/react";

import { CatalogComingSoonSection } from "./CatalogComingSoonSection";
import { CatalogEpisodeSection } from "./CatalogEpisodeSection";
import { CatalogUnavailableSection } from "./CatalogUnavailableSection";
import { catalogComingSoonOrdinal } from "./catalog-coming-soon";
import { mapGuideTargetOf } from "./catalog-gate";
import { catalogCoverStatus } from "./catalog-map";
import { mapNodeStatusUnder } from "./journey-map-load";
import type { CatalogMapSectionsProps } from "./catalog-map.contract";

import "./catalog-map.css";

// 카탈로그 구획들의 루트입니다. 구획마다 표지 상태를 순수 함수로 파생해 두 변형 중 하나를 고릅니다 —
// 본문이 있으면 표지 + 유닛 노드, 없거나 잠겼으면 흐린 표식 + 사유 캡션입니다. 마지막이 열린 에피소드면 맨 끝에
// 「다음 에피소드 준비 중」 구획이 섭니다. 맨 아래 여백은 맵 상자의 아래 패딩(`mapContentInsets`)이 집니다.
// 첫 유닛 안내가 떠 있으면 안내 대상(첫 구획이 튜토리얼일 때 그 구획)의 표지에 손잡이를 내리고, 대상이 아닌 구획은
// 낭독에서 가립니다.
export function CatalogMapSections({
  sections,
  gate,
  access = "open",
  guide,
  onStartCover,
  onSelectUnit,
}: CatalogMapSectionsProps): ReactNode {
  const comingSoon = catalogComingSoonOrdinal(sections);
  const target = guide?.visible === true ? mapGuideTargetOf(sections) : null;
  const guiding = target !== null;
  return (
    <view className="catalog-map-sections" data-testid="journey-map-screen-catalog">
      {sections.map((section, index) => {
        // 안내가 떠 있는 동안 대상이 아닌 구획(준비 중 · 잠김 포함)은 낭독에서 가립니다.
        const covered = guiding && section.episodeId !== target;
        if (section.kind === "catalog-ready") {
          return (
            <view
              key={section.episodeId}
              className="catalog-map-section-cover"
              accessibility-elements-hidden={covered}
            >
              <CatalogEpisodeSection
                section={section}
                coverStatus={mapNodeStatusUnder(access, catalogCoverStatus(sections, index, gate))}
                access={access}
                progress={gate.progress}
                guide={
                  guiding && !covered && guide !== undefined ? { dismiss: guide.dismiss } : null
                }
                onStartCover={onStartCover}
                onSelectUnit={onSelectUnit}
              />
            </view>
          );
        }
        // 받는 중인 에피소드는 맨 끝 「준비 중」과 같은 그림입니다 — 곧 열리는 에피소드라 같은 말을 합니다(ADR-0071).
        return section.reason === "pending" ? (
          <CatalogComingSoonSection
            key={section.episodeId}
            ordinal={section.ordinal}
            episodeId={section.episodeId}
            hidden={guiding ? covered : undefined}
          />
        ) : (
          <CatalogUnavailableSection
            key={section.episodeId}
            section={section}
            hidden={guiding ? covered : undefined}
          />
        );
      })}
      {comingSoon === null ? null : (
        <CatalogComingSoonSection ordinal={comingSoon} hidden={guiding ? true : undefined} />
      )}
    </view>
  );
}
