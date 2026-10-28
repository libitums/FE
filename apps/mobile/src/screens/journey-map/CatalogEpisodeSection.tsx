import type { ReactNode } from "@lynx-js/react";

import { CATALOG_INTRO_KEY } from "../../lib/catalog-progress";
import { CatalogCoverMapItem } from "./CatalogCoverMapItem";
import { CatalogUnitNode } from "./CatalogUnitNode";
import { FirstUnitMapTooltip } from "./FirstUnitMapTooltip";
import { MapUnitCell, MapUnitRow } from "./MapUnitRow";
import { catalogSectionDomId, catalogUnitDomId, catalogUnitNodesOf } from "./catalog-map";
import { catalogFreshUnitKeysOf } from "./catalog-update";
import type { CatalogEpisodeSectionProps } from "./catalog-map.contract";
import { mapNodeStatusUnder } from "./journey-map-load";
import { catalogRowsOf, mapRowItems } from "./journey-map-rows";
import { useMapColumns } from "./useMapColumns";

import "./episode-pending.css";
import "./catalog-map.css";

// 본문이 있는 에피소드의 구획입니다 — 표지 노드 하나와 레슨 · 최종 유닛 노드들입니다. 유닛 노드의 상태는
// 사슬(표지 → 레슨들 → 최종)에서 파생되고, 열린 노드만 고름을 올립니다. 표지는 늘 한 줄 전용 줄이고, 노드는
// 일반(레슨)끼리 둘씩 줄을 이룹니다.
// 머리 띠는 흐름 안에 두지 않습니다(스텝 말풍선이 열린 동안만 맵 위에 겹칩니다) — 그래서 **heading trait이 없습니다**.
// 첫 유닛 안내(`guide`)가 이 구획의 표지를 가리키면 표지를 안내 겹으로 들고 말풍선을 자식으로 붙이며, 표지를 뺀
// 셀은 유닛마다 낭독에서 가립니다. 표지를 고르면 안내를 먼저 닫고 시작합니다.
export function CatalogEpisodeSection({
  section,
  coverStatus,
  access,
  progress,
  ticketUnits = {},
  guide,
  onStartCover,
  onSelectUnit,
}: CatalogEpisodeSectionProps): ReactNode {
  const columns = useMapColumns();
  const guided = guide !== null;
  const freshKeys = catalogFreshUnitKeysOf(section, progress);
  const startCover = (episodeId: string): void => {
    "background only";
    guide?.dismiss();
    onStartCover(episodeId);
  };
  return (
    <view
      // 구획 자리를 `#id` 선택자로 잴 수 있게 둡니다.
      id={catalogSectionDomId(section.episodeId)}
      className="journey-map-screen-episode"
      data-testid={`catalog-section-${section.episodeId}`}
    >
      {/* 자식은 **하나의 식**으로 냅니다 — 정적 자식과 식이 섞이면 Lynx가 식의 결과를 래퍼 상자에
          감싸 줄이 구획 상자의 직계 자식이 아니게 됩니다. 구분선 → 표지(늘 한 줄 전용 줄) → 노드 줄. */}
      {[
        <view key="divider" className="episode-pending-divider" />,
        <MapUnitRow key="cover" kind="solo">
          <MapUnitCell
            domId={catalogUnitDomId(section.episodeId, CATALOG_INTRO_KEY)}
            testKey={`catalog-${section.episodeId}-${CATALOG_INTRO_KEY}`}
          >
            <CatalogCoverMapItem
              episodeId={section.episodeId}
              ordinal={section.ordinal}
              status={coverStatus}
              onSelect={startCover}
              layer={guided ? "guide" : "map"}
            >
              {guided ? (
                <FirstUnitMapTooltip
                  status={coverStatus}
                  onSelect={() => {
                    "background only";
                    startCover(section.episodeId);
                  }}
                />
              ) : null}
            </CatalogCoverMapItem>
          </MapUnitCell>
        </MapUnitRow>,
        ...catalogRowsOf(catalogUnitNodesOf(section, progress, ticketUnits), columns).map((row) => {
          const rowNodes = mapRowItems(row);
          return (
            <MapUnitRow key={rowNodes.map((node) => node.key).join("+")} kind={row.kind}>
              {rowNodes.map((node) => (
                <MapUnitCell
                  key={node.key}
                  domId={catalogUnitDomId(section.episodeId, node.key)}
                  testKey={`catalog-${section.episodeId}-${node.key}`}
                  hidden={guided}
                >
                  <CatalogUnitNode
                    episodeId={section.episodeId}
                    episodeOrdinal={section.ordinal}
                    node={{ ...node, status: mapNodeStatusUnder(access, node.status) }}
                    onSelect={onSelectUnit}
                    fresh={freshKeys.includes(node.key)}
                  />
                </MapUnitCell>
              ))}
            </MapUnitRow>
          );
        }),
      ]}
    </view>
  );
}
