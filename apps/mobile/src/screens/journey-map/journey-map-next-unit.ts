// 맵이 처음 보여 줄 「다음에 풀 유닛」을 고르는 순수 모듈입니다.

import type { CatalogProgress } from "../../lib/catalog-progress";
import type { CatalogGate, CatalogMapSection } from "./catalog-map.contract";
import type { JourneyProgress } from "./journey-map-progress";
import type { JourneyMapItemStatus, JourneyMapSection } from "./journey-map-types";
import { CATALOG_INTRO_KEY } from "../../lib/catalog-progress";
import {
  catalogCoverStatus,
  catalogUnitDomId,
  catalogUnitNodesOf,
  TUTORIAL_GATE_UNIT,
} from "./catalog-map";
import { mapItemStatus } from "./journey-map-progress";
import { tutorialItemId } from "./journey-map-rows";
import { mapUnitDomId } from "./journey-map-scroll";

export type MapUnitEntry = {
  readonly domId: string;
  readonly status: JourneyMapItemStatus;
};

export type MapScrollTarget =
  /** 대상이 맵의 첫 유닛이거나 대상이 없습니다 — 스크롤하지 않습니다. */
  { readonly kind: "top" } | { readonly kind: "unit"; readonly domId: string };

export function tutorialUnitEntries(
  sections: readonly JourneyMapSection[],
  progress: JourneyProgress,
): readonly MapUnitEntry[] {
  return sections.flatMap((section) =>
    section.items.map((item): MapUnitEntry => ({
      domId: mapUnitDomId(tutorialItemId(item)),
      status: mapItemStatus(item, section.items, progress),
    })),
  );
}

export function catalogUnitEntries(
  sections: readonly CatalogMapSection[],
  gate: CatalogGate,
): readonly MapUnitEntry[] {
  return sections.flatMap((section, index): readonly MapUnitEntry[] => {
    if (section.kind === "catalog-unavailable") return [];
    return [
      {
        domId: catalogUnitDomId(section.episodeId, CATALOG_INTRO_KEY),
        status: catalogCoverStatus(sections, index, gate),
      },
      ...catalogUnitNodesOf(section, gate.progress).map((node): MapUnitEntry => ({
        domId: catalogUnitDomId(section.episodeId, node.key),
        status: node.status,
      })),
    ];
  });
}

/** 첫 `available`, 없으면 마지막 `completed`. 그것이 0번이거나 없으면 `top`. */
export function nextMapScrollTarget(entries: readonly MapUnitEntry[]): MapScrollTarget {
  const firstAvailable = entries.findIndex((entry) => entry.status === "available");
  let index = firstAvailable;
  if (index < 0) {
    entries.forEach((candidate, position) => {
      if (candidate.status === "completed") index = position;
    });
  }
  const entry = index > 0 ? entries[index] : undefined;
  return entry === undefined ? { kind: "top" } : { kind: "unit", domId: entry.domId };
}

export type MapScrollTargetInput = {
  readonly tutorialSections: readonly JourneyMapSection[];
  readonly progress: JourneyProgress;
  readonly catalogSections: readonly CatalogMapSection[];
  readonly catalogProgress: CatalogProgress;
};

/** 화면이 부르는 한 줄입니다 — 두 목록을 잇고 판정합니다. 튜토리얼 통과는 `progress`에서 파생합니다. */
export function mapScrollTargetOf(input: MapScrollTargetInput): MapScrollTarget {
  const gate: CatalogGate = {
    tutorialPassed: input.progress.completedEpisodeFinalIds.includes(TUTORIAL_GATE_UNIT),
    progress: input.catalogProgress,
  };
  return nextMapScrollTarget([
    ...tutorialUnitEntries(input.tutorialSections, input.progress),
    ...catalogUnitEntries(input.catalogSections, gate),
  ]);
}
