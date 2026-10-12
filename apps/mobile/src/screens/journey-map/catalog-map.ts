// 카탈로그 구획의 순수 파생입니다 — 구획 구조 · 셀렉터 토큰 · 잠금 · 진행 · 캡션 · 라벨.

import {
  CATALOG_INTRO_KEY,
  isCatalogEpisodePassed,
  isCatalogUnitDone,
} from "../../lib/catalog-progress";
import type { CatalogProgress, CatalogUnitKey } from "../../lib/catalog-progress";
import type { CatalogEntry } from "../../lib/episode-catalog";
import type { UiCopy } from "../../lib/ui-copy.contract";
import type { EpisodeFinalUnitId } from "../episode-final/episode-final.contract";
import type { JourneyMapItemStatus } from "./journey-map-types";
import type {
  CatalogCaptionKind,
  CatalogGate,
  CatalogLockedNode,
  CatalogMapSection,
  CatalogReadySection,
  CatalogSectionProgress,
  CatalogUnavailableReason,
  CatalogUnavailableSection,
  CatalogUnitNode,
} from "./catalog-map.contract";

/** 기본값 동일성용 모듈 상수입니다 — 새 `[]` 리터럴 대신 이것을 씁니다. */
export const noCatalogMapSections: readonly CatalogMapSection[] = [];

export const TUTORIAL_GATE_UNIT: EpisodeFinalUnitId = "tutorial-final-test";

export function catalogMapSectionsOf(
  catalog: readonly CatalogEntry[],
): readonly CatalogMapSection[] {
  return catalog.map((entry, index): CatalogMapSection => {
    const base = { episodeId: entry.id, ordinal: index + 1, title: entry.title };
    if (entry.status === "ready") {
      return {
        kind: "catalog-ready",
        ...base,
        lessonKeys: entry.episode.units.map((unit) => unit.id),
        finalKey: entry.episode.finalTest.id,
      };
    }
    return {
      kind: "catalog-unavailable",
      ...base,
      reason: entry.status === "pending" ? "pending" : entry.reason,
    };
  });
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

export function tutorialPassedFrom(
  completedEpisodeFinalIds: readonly EpisodeFinalUnitId[],
): boolean {
  return completedEpisodeFinalIds.includes(TUTORIAL_GATE_UNIT);
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
  const previous = sections[index - 1];
  const open =
    previous === undefined
      ? gate.tutorialPassed
      : isCatalogEpisodePassed(gate.progress, previous.episodeId);
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

export function catalogLockedNodesOf(section: CatalogReadySection): readonly CatalogLockedNode[] {
  return [
    ...section.lessonKeys.map((key, index): CatalogLockedNode => ({
      key,
      role: "lesson",
      ordinal: index + 1,
    })),
    { key: section.finalKey, role: "final", ordinal: section.lessonKeys.length + 1 },
  ];
}

export function catalogSectionProgress(
  section: CatalogReadySection,
  progress: CatalogProgress,
): CatalogSectionProgress {
  const keys = [CATALOG_INTRO_KEY, ...section.lessonKeys, section.finalKey];
  return {
    completed: keys.filter((key) => isCatalogUnitDone(progress, section.episodeId, key)).length,
    total: keys.length,
  };
}

export function catalogCaptionKindOf(reason: CatalogUnavailableReason): CatalogCaptionKind {
  if (reason === "pending") return "pending";
  return reason === "client-too-old" || reason === "unsupported-schema" ? "update" : "unavailable";
}

export function catalogLockedNodeTitle(node: CatalogLockedNode, copy: UiCopy): string {
  return node.role === "lesson"
    ? copy.catalogMap.lessonTitle(node.ordinal)
    : copy.catalogMap.finalTitle;
}

export function catalogLockedNodeAccessibilityLabel(node: CatalogLockedNode, copy: UiCopy): string {
  return copy.catalogMap.preparing(catalogLockedNodeTitle(node, copy));
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

/** 사슬(표지 → 레슨들 → 최종)에서 그 키의 상태를 파생합니다. */
export function catalogUnitStatus(
  _section: CatalogReadySection,
  _unitKey: CatalogUnitKey,
  _progress: CatalogProgress,
): JourneyMapItemStatus {
  return "locked";
}

export function catalogUnitNodesOf(
  section: CatalogReadySection,
  _progress: CatalogProgress,
): readonly CatalogUnitNode[] {
  return catalogLockedNodesOf(section).map((node): CatalogUnitNode => ({
    ...node,
    status: "locked",
  }));
}

/** 맵 노드와 시작 결선이 같이 쓰는 가드입니다. */
export function canStartCatalogUnit(
  _sections: readonly CatalogMapSection[],
  _episodeId: string,
  _unitKey: CatalogUnitKey,
  _progress: CatalogProgress,
): boolean {
  return false;
}

export function catalogUnitRoleOf(
  _section: CatalogReadySection,
  _unitKey: CatalogUnitKey,
): "lesson" | "final" | null {
  return null;
}

export function catalogUnitNodeTitle(_node: CatalogUnitNode, _copy: UiCopy): string {
  return "";
}

export function catalogUnitNodeAccessibilityLabel(
  _episodeOrdinal: number,
  _node: CatalogUnitNode,
  _copy: UiCopy,
): string {
  return "";
}

export function catalogCoverAccessibilityLabel(_episodeOrdinal: number, _copy: UiCopy): string {
  return "";
}
