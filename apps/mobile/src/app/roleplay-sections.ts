// 롤플레이 탭의 구획입니다 — 본편 에피소드마다 롤플레이 하나. **진행에서 파생합니다**(ADR-0007 D3).
// 튜토리얼의 특별 유닛 셋(메신저 · 전화 · 비주얼 노벨)은 2026-10-20 사용자 결정으로 롤플레이 탭에서 뺐습니다(ADR-0076 적용 기록).

import type { CatalogProgress } from "../lib/catalog-progress";
import type { LearnerProfile } from "../lib/placeholder-fill";
import type { CatalogMapSection } from "../screens/journey-map/catalog-map.contract";
import type { RoleplaySection } from "../screens/roleplay-list/roleplay-list.contract";
import type { EpisodeContent } from "./episode-content";
import { catalogRoleplaySectionsOf } from "./roleplay-story-model";

export type RoleplaySectionsInput = {
  readonly catalog: {
    readonly episodeContent: EpisodeContent;
    readonly catalogSections: readonly CatalogMapSection[];
    readonly catalogProgress: CatalogProgress;
  };
  readonly learnerFill: LearnerProfile;
  readonly episodeLabel: (ordinal: number) => string;
};

export function roleplaySectionsOf(input: RoleplaySectionsInput): readonly RoleplaySection[] {
  return catalogRoleplaySectionsOf(
    input.catalog.episodeContent,
    input.catalog.catalogSections,
    input.catalog.catalogProgress,
    input.learnerFill,
    input.episodeLabel,
  );
}
