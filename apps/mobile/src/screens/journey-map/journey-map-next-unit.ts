// 맵이 처음 보여 줄 「다음에 풀 유닛」을 고르는 순수 모듈입니다.

import { CATALOG_INTRO_KEY } from "../../lib/catalog-progress";
import { TUTORIAL_EPISODE_ID } from "../../lib/tutorial-episode";
import type { CatalogGate, CatalogMapSection } from "./catalog-map.contract";
import { catalogCoverStatus, catalogUnitDomId, catalogUnitNodesOf } from "./catalog-map";
import { catalogTutorialBypassed } from "./catalog-gate";
import type { JourneyMapItemStatus } from "./journey-map-types";

export type MapUnitEntry = {
  readonly domId: string;
  readonly status: JourneyMapItemStatus;
};

export type MapScrollTarget =
  /** 대상이 맵의 첫 유닛이거나 대상이 없습니다 — 스크롤하지 않습니다. */
  { readonly kind: "top" } | { readonly kind: "unit"; readonly domId: string };

// 옛 통과로 우회된 튜토리얼은 열려 있어도 「다음에 풀 유닛」이 아닙니다 — 열린 것만 잠긴 것으로 냅니다.
function withoutAvailable(status: JourneyMapItemStatus): JourneyMapItemStatus {
  return status === "available" ? "locked" : status;
}

/** 구획 순서대로 편 유닛 목록입니다. 우회된 튜토리얼 구획의 available은 locked로 냅니다. */
export function catalogUnitEntries(
  sections: readonly CatalogMapSection[],
  gate: CatalogGate,
): readonly MapUnitEntry[] {
  const bypassed = catalogTutorialBypassed(sections, gate);
  return sections.flatMap((section, index): readonly MapUnitEntry[] => {
    if (section.kind === "catalog-unavailable") return [];
    const skip = bypassed && section.episodeId === TUTORIAL_EPISODE_ID;
    const statusOf = (status: JourneyMapItemStatus): JourneyMapItemStatus =>
      skip ? withoutAvailable(status) : status;
    return [
      {
        domId: catalogUnitDomId(section.episodeId, CATALOG_INTRO_KEY),
        status: statusOf(catalogCoverStatus(sections, index, gate)),
      },
      ...catalogUnitNodesOf(section, gate.progress).map((node): MapUnitEntry => ({
        domId: catalogUnitDomId(section.episodeId, node.key),
        status: statusOf(node.status),
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
  readonly catalogSections: readonly CatalogMapSection[];
  readonly gate: CatalogGate;
};

/** 화면이 부르는 한 줄입니다 — 유닛을 펴고 판정합니다. */
export function mapScrollTargetOf(input: MapScrollTargetInput): MapScrollTarget {
  return nextMapScrollTarget(catalogUnitEntries(input.catalogSections, input.gate));
}
