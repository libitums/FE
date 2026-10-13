// 맵의 유닛을 줄로 나누는 순수 모듈입니다 — 튜토리얼과 카탈로그가 같은 함수를 씁니다.
// 상태(잠김 · 열림 · 끝)는 입력이 아닙니다.

import type { CatalogUnitNode } from "./catalog-map.contract";
import type { JourneyMapItem } from "./journey-map-types";

/** 유닛이 줄에서 차지하는 방식입니다 — 둘이 나란히 서는 것과 늘 혼자 서는 것. */
export type MapUnitPlacement = "paired" | "solo";

export type MapRow<T> =
  | { readonly kind: "pair"; readonly left: T; readonly right: T }
  /** 한 줄 전용 유닛입니다. */
  | { readonly kind: "solo"; readonly item: T }
  /** 짝을 잃은 일반 유닛입니다 — 줄 가운데에 섭니다. */
  | { readonly kind: "orphan"; readonly item: T };

export type MapRowKind = MapRow<unknown>["kind"];

/** 순서 있는 목록 → 줄 목록. 던지지 않고, 줄을 펴면 입력과 같은 순서 · 같은 원소입니다. */
export function mapRowsOf<T>(
  _items: readonly T[],
  _placementOf: (item: T) => MapUnitPlacement,
): readonly MapRow<T>[] {
  return [];
}

/** 줄 안의 읽는 순서입니다 — `pair`는 [left, right], 나머지는 [item]. */
export function mapRowItems<T>(_row: MapRow<T>): readonly T[] {
  return [];
}

export const tutorialItemPlacement: Readonly<Record<JourneyMapItem["kind"], MapUnitPlacement>> = {
  standard: "paired",
  "episode-intro": "solo",
  messenger: "solo",
  "phone-call": "solo",
  "visual-novel": "solo",
  "episode-final": "solo",
};

export const catalogNodePlacement: Readonly<Record<CatalogUnitNode["role"], MapUnitPlacement>> = {
  lesson: "paired",
  final: "solo",
};

/** 맵의 열 수입니다 — 1이면 모든 유닛이 한 칸 줄(`solo`)로 섭니다. */
export type MapColumns = 1 | 2;

export function tutorialRowsOf(
  _items: readonly JourneyMapItem[],
  _columns: MapColumns,
): readonly MapRow<JourneyMapItem>[] {
  return [];
}

export function catalogRowsOf(
  _nodes: readonly CatalogUnitNode[],
  _columns: MapColumns,
): readonly MapRow<CatalogUnitNode>[] {
  return [];
}

export const mapSingleColumnFontScale = 2;
export const mapSingleColumnWidth = 320;

export type MapColumnsInput = {
  /** 코어가 그리는 글자 배율입니다. 모르면 `null`. */
  readonly fontScale: number | null;
  /** LynxView의 가로 폭입니다(pt · dp). 모르면 `null`. */
  readonly viewportWidth: number | null;
};

/** 배율이 임계를 넘거나 폭이 임계에 못 미치면 1, 그 밖(모르는 값 포함)은 2. */
export function mapColumnsFor(_input: MapColumnsInput): MapColumns {
  return 2;
}

/** 튜토리얼 맵 항목의 id입니다 — 스텝이면 `step.id`, 특별 유닛이면 `id`. */
export function tutorialItemId(_item: JourneyMapItem): string {
  return "";
}
