// 롤플레이 탭의 구획 전부입니다 — 튜토리얼(특별 유닛 셋)과 본편 에피소드(에피소드마다 롤플레이 하나).
// **진행에서 파생합니다**(ADR-0007 D3) — 상태로 따로 두면 진행과 어긋날 자리가 생깁니다.

import type { CatalogProgress } from "../lib/catalog-progress";
import type { LearnerProfile } from "../lib/placeholder-fill";
import { isMapItemComplete, journeyMapSections } from "../screens/journey-map/journey-map";
import type { CatalogMapSection } from "../screens/journey-map/catalog-map.contract";
import { roleplaySectionsFrom } from "../screens/roleplay-list/roleplay-list";
import type { RoleplaySection } from "../screens/roleplay-list/roleplay-list.contract";
import type { EpisodeContent } from "./episode-content";
import { catalogRoleplaySectionsOf } from "./roleplay-story-model";

export type RoleplaySectionsInput = {
  /** 튜토리얼 항목의 완료 판정 입력 — 여정 맵과 같은 값입니다. */
  readonly journey: Parameters<typeof isMapItemComplete>[1];
  readonly catalog: {
    readonly episodeContent: EpisodeContent;
    readonly catalogSections: readonly CatalogMapSection[];
    readonly catalogProgress: CatalogProgress;
  };
  readonly learnerFill: LearnerProfile;
  readonly episodeLabel: (ordinal: number) => string;
};

export function roleplaySectionsOf(input: RoleplaySectionsInput): readonly RoleplaySection[] {
  const tutorial = roleplaySectionsFrom(journeyMapSections, (item) =>
    isMapItemComplete(item, input.journey),
  );
  const catalog = catalogRoleplaySectionsOf(
    input.catalog.episodeContent,
    input.catalog.catalogSections,
    input.catalog.catalogProgress,
    input.learnerFill,
    input.episodeLabel,
  );
  return [...tutorial, ...catalog];
}
