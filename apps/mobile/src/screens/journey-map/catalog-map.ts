// 카탈로그 구획의 순수 파생입니다 — 구획 구조 · 셀렉터 토큰 · 잠금 · 진행 · 캡션 · 라벨.

import {
  CATALOG_INTRO_KEY,
  DEFAULT_CATALOG_COMPLETION,
  isCatalogEpisodeComplete,
  isCatalogUnitDone,
} from "../../lib/catalog-progress";
import type {
  CatalogCompletionKeysOf,
  CatalogProgress,
  CatalogUnitKey,
} from "../../lib/catalog-progress";
import type { CatalogEntry } from "../../lib/episode-catalog";
import { TUTORIAL_EPISODE_ID } from "../../lib/tutorial-episode";
import type { LearningUnit } from "../../lib/episode-content.model";
import type { UiCopy } from "../../lib/ui-copy.contract";
import type { JourneyMapItemStatus } from "./journey-map-types";
import type {
  CatalogCaptionKind,
  CatalogGate,
  CatalogMapSection,
  CatalogReadySection,
  CatalogUnavailableReason,
  CatalogUnavailableSection,
  CatalogUnitNode,
} from "./catalog-map.contract";

/** 기본값 동일성용 모듈 상수입니다 — 새 `[]` 리터럴 대신 이것을 씁니다. */
export const noCatalogMapSections: readonly CatalogMapSection[] = [];

const CULTURE_ITEM_TYPES: ReadonlySet<string> = new Set(["CULTURE_CARD", "CULTURE_CHECK"]);

/**
 * 문항이 하나 이상이고 모두 문화 유형(CULTURE_CARD · CULTURE_CHECK)인 유닛의 id입니다(유닛 순서). 유닛
 * 이름이 아니라 내용으로 가립니다.
 */
export function catalogCultureKeysOf(units: readonly LearningUnit[]): readonly CatalogUnitKey[] {
  return units
    .filter(
      (unit) =>
        unit.items.length > 0 && unit.items.every((item) => CULTURE_ITEM_TYPES.has(item.type)),
    )
    .map((unit) => unit.id);
}

export function catalogMapSectionsOf(
  catalog: readonly CatalogEntry[],
): readonly CatalogMapSection[] {
  return catalog.map((entry): CatalogMapSection => {
    const base = { episodeId: entry.id, ordinal: entry.order, title: entry.title };
    if (entry.status === "ready") {
      return {
        kind: "catalog-ready",
        ...base,
        lessonKeys: entry.episode.units.map((unit) => unit.id),
        finalKey: entry.episode.finalTest.id,
        completionKeys: entry.episode.completion?.requires ?? [entry.episode.finalTest.id],
        cultureKeys: catalogCultureKeysOf(entry.episode.units),
        ...(entry.episode.titleEn === undefined ? {} : { titleEn: entry.episode.titleEn }),
      };
    }
    return {
      kind: "catalog-unavailable",
      ...base,
      reason: entry.status === "pending" ? "pending" : entry.reason,
    };
  });
}

/** 준비된 구획은 그 완료 키, 모르는 id · 준비 안 된 구획은 `DEFAULT_CATALOG_COMPLETION`. */
export function catalogCompletionKeysOf(
  sections: readonly CatalogMapSection[],
): CatalogCompletionKeysOf {
  return (episodeId) => {
    const section = sections.find((candidate) => candidate.episodeId === episodeId);
    return section?.kind === "catalog-ready" ? section.completionKeys : DEFAULT_CATALOG_COMPLETION;
  };
}

const SAFE_SELECTOR_CHAR = /^[A-Za-z0-9-]$/;

/**
 * 서버가 보내는 id를 셀렉터에 안전한 토큰으로 바꿉니다. `[A-Za-z0-9-]` 밖(`_` 포함)은 `_<hex>_`로 바꾸므로
 * 단사입니다 — 어떤 id를 보내도 구획 DOM id가 겹치지 않습니다.
 */
export function catalogSelectorToken(id: string): string {
  let token = "";
  for (const char of id) {
    token += SAFE_SELECTOR_CHAR.test(char) ? char : `_${(char.codePointAt(0) ?? 0).toString(16)}_`;
  }
  return token;
}

export function catalogSectionDomId(episodeId: string): string {
  return `journey-map-screen-catalog-${catalogSelectorToken(episodeId)}`;
}

/** 카탈로그 유닛 셀의 id입니다 — 표지는 `CATALOG_INTRO_KEY`. 어떤 (에피소드, 키) 쌍도 겹치지 않습니다. */
export function catalogUnitDomId(episodeId: string, unitKey: CatalogUnitKey): string {
  // 토큰이 `-`를 그대로 두므로 구분자만으로는 쌍이 겹칩니다 — 에피소드 토큰의 길이를 앞에 둡니다.
  const token = catalogSelectorToken(episodeId);
  return `journey-map-unit-catalog-${token.length}-${token}-${catalogSelectorToken(unitKey)}`;
}

export function catalogCoverStatus(
  sections: readonly CatalogMapSection[],
  index: number,
  gate: CatalogGate,
): JourneyMapItemStatus {
  const section = sections[index];
  if (section === undefined || section.kind === "catalog-unavailable") return "locked";
  // 끝낸 표지는 앞이 아직이어도 숨기지 않습니다(다른 기기 진행 · 순서 변경).
  if (isCatalogUnitDone(gate.progress, section.episodeId, CATALOG_INTRO_KEY)) return "completed";
  // 첫 구획은 늘 열립니다.
  const previous = sections[index - 1];
  if (previous === undefined) return "available";
  const previousDone = isCatalogEpisodeComplete(
    gate.progress,
    previous.episodeId,
    previous.kind === "catalog-ready" ? previous.completionKeys : DEFAULT_CATALOG_COMPLETION,
  );
  // 앞 구획이 튜토리얼이면 옛 튜토리얼 통과 기록으로도 열립니다.
  const open =
    previousDone || (previous.episodeId === TUTORIAL_EPISODE_ID && gate.legacyTutorialPassed);
  return open ? "available" : "locked";
}

export function canStartCatalogCover(
  sections: readonly CatalogMapSection[],
  episodeId: string,
  gate: CatalogGate,
): boolean {
  const index = sections.findIndex((section) => section.episodeId === episodeId);
  return index >= 0 && catalogCoverStatus(sections, index, gate) !== "locked";
}

export function catalogCaptionKindOf(reason: CatalogUnavailableReason): CatalogCaptionKind {
  if (reason === "pending") return "pending";
  return reason === "client-too-old" || reason === "unsupported-schema" ? "update" : "unavailable";
}

export function catalogUnavailableAccessibilityLabel(
  section: CatalogUnavailableSection,
  copy: UiCopy,
): string {
  return copy.catalogMap.unavailableSection(
    copy.catalogMap.episodeLabel(section.ordinal),
    section.title,
    catalogCaptionKindOf(section.reason),
  );
}

/** 표지 → 레슨들 → 최종 사슬입니다. */
const chainOf = (section: CatalogReadySection): readonly CatalogUnitKey[] => [
  CATALOG_INTRO_KEY,
  ...section.lessonKeys,
  section.finalKey,
];

/**
 * 사슬에서 그 키의 상태를 파생합니다 — 끝낸 키는 앞이 아직이어도 `completed`, 바로 앞을 끝냈으면
 * `available`, 그 밖(모르는 키 포함)은 `locked`.
 */
export function catalogUnitStatus(
  section: CatalogReadySection,
  unitKey: CatalogUnitKey,
  progress: CatalogProgress,
): JourneyMapItemStatus {
  if (isCatalogUnitDone(progress, section.episodeId, unitKey)) return "completed";
  const chain = chainOf(section);
  const index = chain.indexOf(unitKey);
  const previous = index > 0 ? chain[index - 1] : undefined;
  if (previous === undefined) return "locked";
  return isCatalogUnitDone(progress, section.episodeId, previous) ? "available" : "locked";
}

export function catalogUnitRoleOf(
  section: CatalogReadySection,
  unitKey: CatalogUnitKey,
): "lesson" | "final" | null {
  if (unitKey === section.finalKey) return "final";
  return section.lessonKeys.includes(unitKey) ? "lesson" : null;
}

export function catalogUnitNodesOf(
  section: CatalogReadySection,
  progress: CatalogProgress,
): readonly CatalogUnitNode[] {
  return [
    ...section.lessonKeys.map((key, index): CatalogUnitNode => ({
      key,
      role: section.cultureKeys.includes(key) ? "culture" : "lesson",
      ordinal: index + 1,
      status: catalogUnitStatus(section, key, progress),
    })),
    {
      key: section.finalKey,
      role: "final",
      ordinal: section.lessonKeys.length + 1,
      status: catalogUnitStatus(section, section.finalKey, progress),
    },
  ];
}

/**
 * 레슨 완료 카드의 `Lesson n` 칩 순번입니다 — 맵 노드(`catalogUnitNodesOf`)와 같은 1부터의 순번이고,
 * 레슨 역할의 유닛만 갖습니다. 문화 단계(맵에서 `Culture`) · 최종 · 모르는 키 · 모르는 에피소드는
 * `undefined`라 칩이 서지 않습니다 — 맵과 다른 이름을 지어내지 않습니다.
 */
export function catalogLessonOrdinalOf(
  sections: readonly CatalogMapSection[],
  episodeId: string,
  unitKey: CatalogUnitKey,
): number | undefined {
  const section = sections.find((candidate) => candidate.episodeId === episodeId);
  if (section === undefined || section.kind !== "catalog-ready") return undefined;
  if (section.cultureKeys.includes(unitKey)) return undefined;
  const index = section.lessonKeys.indexOf(unitKey);
  return index < 0 ? undefined : index + 1;
}

/** 맵 노드와 시작 결선이 같이 쓰는 가드입니다. */
export function canStartCatalogUnit(
  sections: readonly CatalogMapSection[],
  episodeId: string,
  unitKey: CatalogUnitKey,
  progress: CatalogProgress,
): boolean {
  const section = sections.find((candidate) => candidate.episodeId === episodeId);
  if (section === undefined || section.kind !== "catalog-ready") return false;
  if (catalogUnitRoleOf(section, unitKey) === null) return false;
  return catalogUnitStatus(section, unitKey, progress) !== "locked";
}

export function catalogUnitNodeTitle(
  node: Pick<CatalogUnitNode, "role" | "ordinal">,
  copy: UiCopy,
): string {
  switch (node.role) {
    case "lesson":
      return copy.catalogMap.lessonTitle(node.ordinal);
    case "culture":
      return copy.catalogMap.cultureTitle;
    case "final":
      return copy.catalogMap.finalTitle;
  }
}

export function catalogUnitNodeAccessibilityLabel(
  episodeOrdinal: number,
  node: Pick<CatalogUnitNode, "role" | "ordinal">,
  copy: UiCopy,
): string {
  return copy.catalogMap.nodeLabel(
    copy.catalogMap.episodeLabel(episodeOrdinal),
    catalogUnitNodeTitle(node, copy),
  );
}

export function catalogCoverAccessibilityLabel(episodeOrdinal: number, copy: UiCopy): string {
  return copy.catalogMap.nodeLabel(
    copy.catalogMap.episodeLabel(episodeOrdinal),
    copy.catalogMap.coverTitle,
  );
}
