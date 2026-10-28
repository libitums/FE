// 막간 이야기 유닛(ADR-0088)의 카탈로그 파생입니다 — 구획의 이야기 키와 판정. 순수 함수만 둡니다.

import type { CatalogUnitKey } from "../../lib/catalog-progress";
import type { LearningUnit } from "../../lib/episode-content.model";
import type { CatalogMapSection } from "./catalog-map.contract";

/** 막간 이야기 유닛(`story`가 있는 유닛)의 id입니다(유닛 순서, ADR-0088). */
export function catalogStoryKeysOf(units: readonly LearningUnit[]): readonly CatalogUnitKey[] {
  return units.filter((unit) => unit.story !== undefined).map((unit) => unit.id);
}

/** 그 키가 준비된 구획의 이야기 유닛인가 — 티켓 판정이 씁니다. 모르는 구획 · 키는 거짓입니다. */
export function catalogIsStoryUnit(
  sections: readonly CatalogMapSection[],
  episodeId: string,
  unitKey: CatalogUnitKey,
): boolean {
  const section = sections.find((candidate) => candidate.episodeId === episodeId);
  return section?.kind === "catalog-ready" && (section.storyKeys ?? []).includes(unitKey);
}
