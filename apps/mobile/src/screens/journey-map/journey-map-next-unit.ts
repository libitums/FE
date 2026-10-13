// 맵이 처음 보여 줄 「다음에 풀 유닛」을 고르는 순수 모듈입니다.

import type { CatalogProgress } from "../../lib/catalog-progress";
import type { CatalogGate, CatalogMapSection } from "./catalog-map.contract";
import type { JourneyProgress } from "./journey-map-progress";
import type { JourneyMapItemStatus, JourneyMapSection } from "./journey-map-types";

export type MapUnitEntry = {
  readonly domId: string;
  readonly status: JourneyMapItemStatus;
};

export type MapScrollTarget =
  /** 대상이 맵의 첫 유닛이거나 대상이 없습니다 — 스크롤하지 않습니다. */
  | { readonly kind: "top" }
  | { readonly kind: "unit"; readonly domId: string };

export function tutorialUnitEntries(
  _sections: readonly JourneyMapSection[],
  _progress: JourneyProgress,
): readonly MapUnitEntry[] {
  return [];
}

export function catalogUnitEntries(
  _sections: readonly CatalogMapSection[],
  _gate: CatalogGate,
): readonly MapUnitEntry[] {
  return [];
}

/** 첫 `available`, 없으면 마지막 `completed`. 그것이 0번이거나 없으면 `top`. */
export function nextMapScrollTarget(_entries: readonly MapUnitEntry[]): MapScrollTarget {
  return { kind: "top" };
}

export type MapScrollTargetInput = {
  readonly tutorialSections: readonly JourneyMapSection[];
  readonly progress: JourneyProgress;
  readonly catalogSections: readonly CatalogMapSection[];
  readonly catalogProgress: CatalogProgress;
};

/** 화면이 부르는 한 줄입니다 — 두 목록을 잇고 판정합니다. 튜토리얼 통과는 `progress`에서 파생합니다. */
export function mapScrollTargetOf(_input: MapScrollTargetInput): MapScrollTarget {
  return { kind: "top" };
}
