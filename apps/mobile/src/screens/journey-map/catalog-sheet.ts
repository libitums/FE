// 카탈로그 유닛 말풍선의 순수 모듈입니다 — 말풍선 열림 상태가 튜토리얼 스텝과 같은 자리(`openStepId`)를
// 쓰도록 (에피소드, 유닛) 쌍을 키 하나로 옮기고, 말풍선 · 머리 띠에 실을 값을 냅니다.

import { isCatalogUnitDone } from "../../lib/catalog-progress";
import type { CatalogProgress, CatalogUnitKey } from "../../lib/catalog-progress";
import { CATALOG_INTRO_KEY } from "../../lib/catalog-progress";
import { specialUnitSize, stepUnitSize } from "./journey-map-sheet";
import type {
  CatalogMapSection,
  CatalogReadySection,
  CatalogSheetKey,
} from "./catalog-map.contract";

export type CatalogSheetTarget = {
  readonly episodeId: string;
  readonly unitKey: CatalogUnitKey;
};

const PREFIX = "catalog:";

/** 유닛 키에는 `:`가 없습니다(콘텐츠 스텝 id) — 마지막 `:`로 가릅니다. */
export function catalogSheetKey(episodeId: string, unitKey: CatalogUnitKey): CatalogSheetKey {
  return `${PREFIX}${episodeId}:${unitKey}`;
}

export function catalogSheetTargetOf(key: string | null): CatalogSheetTarget | null {
  if (key === null || !key.startsWith(PREFIX)) return null;
  const rest = key.slice(PREFIX.length);
  const split = rest.lastIndexOf(":");
  if (split <= 0 || split === rest.length - 1) return null;
  return { episodeId: rest.slice(0, split), unitKey: rest.slice(split + 1) };
}

/** 말풍선 · 머리 띠의 제목입니다 — 영어 제목이 있으면 그것, 없으면 매니페스트 제목. */
export function catalogSectionTitle(section: CatalogReadySection): string {
  return section.titleEn ?? section.title;
}

/** 표지 → 학습 유닛들 → 최종 순서의 키입니다. 머리 띠의 unit 번호(표지 00)와 진행 막대가 이 순서를 셉니다. */
function chainKeysOf(section: CatalogReadySection): readonly CatalogUnitKey[] {
  return [CATALOG_INTRO_KEY, ...section.lessonKeys, section.finalKey];
}

export type CatalogOpenedUnit = {
  readonly section: CatalogReadySection;
  /** 구획 안 자리(0부터 — 표지 00)입니다. */
  readonly unit: number;
  readonly completedUnitCount: number;
  readonly totalUnitCount: number;
};

/** 열린 말풍선이 카탈로그 유닛이면 그 구획 · 자리 · 진행을 냅니다. 아니면 `undefined`. */
export function catalogOpenedUnitOf(
  sections: readonly CatalogMapSection[],
  openKey: string | null,
  progress: CatalogProgress,
): CatalogOpenedUnit | undefined {
  const target = catalogSheetTargetOf(openKey);
  if (target === null) return undefined;
  const section = sections.find((candidate) => candidate.episodeId === target.episodeId);
  if (section?.kind !== "catalog-ready") return undefined;
  const chain = chainKeysOf(section);
  const unit = chain.indexOf(target.unitKey);
  if (unit < 0) return undefined;
  return {
    section,
    unit,
    completedUnitCount: chain.filter((key) => isCatalogUnitDone(progress, section.episodeId, key))
      .length,
    totalUnitCount: chain.length,
  };
}

/**
 * 말풍선의 진행 수치입니다. 카탈로그 진행은 유닛 단위로만 남으므로 끝낸 유닛이면 전부, 아니면 0입니다
 * (튜토리얼 스텝과 같은 규칙). 전체가 0이면(문항을 셀 수 없음) 말풍선이 진행 줄을 그리지 않습니다.
 */
export function catalogSheetFigures(
  target: CatalogSheetTarget,
  itemCount: number,
  progress: CatalogProgress,
): { readonly completedActivityCount: number; readonly totalActivityCount: number } {
  const total = Number.isInteger(itemCount) && itemCount > 0 ? itemCount : 0;
  const done = isCatalogUnitDone(progress, target.episodeId, target.unitKey);
  return { completedActivityCount: done ? total : 0, totalActivityCount: total };
}

/**
 * 말풍선이 붙을 표식의 높이입니다. 최종 · 막간 이야기는 스페셜 표식(124)이라 레슨 원(100)으로 재면 말풍선 꼬리가
 * 표식에 파고듭니다. 모르는 에피소드 · 유닛은 레슨 원입니다.
 */
export function catalogSheetUnitSize(
  sections: readonly CatalogMapSection[],
  episodeId: string,
  unitKey: CatalogUnitKey,
): number {
  const section = sections.find((candidate) => candidate.episodeId === episodeId);
  return section?.kind === "catalog-ready" &&
    (section.finalKey === unitKey || (section.storyKeys ?? []).includes(unitKey))
    ? specialUnitSize
    : stepUnitSize;
}
