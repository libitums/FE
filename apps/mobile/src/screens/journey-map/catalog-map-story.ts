// 막간 이야기 유닛(ADR-0088)의 카탈로그 파생입니다 — 구획의 이야기 키와 판정. 순수 함수만 둡니다.

import type { CatalogUnitKey } from "../../lib/catalog-progress";
import type { LearningUnit } from "../../lib/episode-content.model";
import type {
  CatalogMapSection,
  CatalogReadySection,
  CatalogStoryIcon,
} from "./catalog-map.contract";

/** 막간 이야기 유닛(`story`가 있는 유닛)의 id입니다(유닛 순서, ADR-0088). */
export function catalogStoryKeysOf(units: readonly LearningUnit[]): readonly CatalogUnitKey[] {
  return units.filter((unit) => unit.story !== undefined).map((unit) => unit.id);
}

const STORY_ICON_BY_FORM: Readonly<Record<string, CatalogStoryIcon>> = {
  message: "chat",
  call: "phone",
};

/** 이야기 유닛 키 → 노드 아이콘. 문자 · 전화 밖의 형식(컷 · 사진 보기 · 모르는 형식)은 필름입니다. */
export function catalogStoryIconsOf(
  units: readonly LearningUnit[],
): Readonly<Record<CatalogUnitKey, CatalogStoryIcon>> {
  const icons: Record<CatalogUnitKey, CatalogStoryIcon> = {};
  for (const unit of units) {
    if (unit.story !== undefined) icons[unit.id] = STORY_ICON_BY_FORM[unit.story.form] ?? "film";
  }
  return icons;
}

/** 구획에 싣는 이야기 필드 — 이야기가 없으면 빈 객체입니다. */
export function catalogStoryFieldsOf(
  units: readonly LearningUnit[],
): Pick<CatalogReadySection, "storyKeys" | "storyIcons"> {
  const storyKeys = catalogStoryKeysOf(units);
  return storyKeys.length === 0 ? {} : { storyKeys, storyIcons: catalogStoryIconsOf(units) };
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
