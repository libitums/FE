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
  items: readonly T[],
  placementOf: (item: T) => MapUnitPlacement,
): readonly MapRow<T>[] {
  const rows: MapRow<T>[] = [];
  // 짝을 기다리는 일반 유닛입니다 — 한 줄 전용을 만나거나 목록이 끝나면 `orphan`이 됩니다.
  let waiting: { readonly item: T } | null = null;
  for (const item of items) {
    if (placementOf(item) === "solo") {
      if (waiting !== null) rows.push({ kind: "orphan", item: waiting.item });
      waiting = null;
      rows.push({ kind: "solo", item });
    } else if (waiting === null) {
      waiting = { item };
    } else {
      rows.push({ kind: "pair", left: waiting.item, right: item });
      waiting = null;
    }
  }
  if (waiting !== null) rows.push({ kind: "orphan", item: waiting.item });
  return rows;
}

/** 줄 안의 읽는 순서입니다 — `pair`는 [left, right], 나머지는 [item]. */
export function mapRowItems<T>(row: MapRow<T>): readonly T[] {
  return row.kind === "pair" ? [row.left, row.right] : [row.item];
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
  items: readonly JourneyMapItem[],
  columns: MapColumns,
): readonly MapRow<JourneyMapItem>[] {
  return mapRowsOf(items, (item) => (columns === 1 ? "solo" : tutorialItemPlacement[item.kind]));
}

export function catalogRowsOf(
  nodes: readonly CatalogUnitNode[],
  columns: MapColumns,
): readonly MapRow<CatalogUnitNode>[] {
  return mapRowsOf(nodes, (node) => (columns === 1 ? "solo" : catalogNodePlacement[node.role]));
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
export function mapColumnsFor(input: MapColumnsInput): MapColumns {
  const { fontScale, viewportWidth } = input;
  if (fontScale !== null && fontScale > mapSingleColumnFontScale) return 1;
  if (viewportWidth !== null && viewportWidth < mapSingleColumnWidth) return 1;
  return 2;
}

/** 튜토리얼 맵 항목의 id입니다 — 스텝이면 `step.id`, 특별 유닛이면 `id`. */
export function tutorialItemId(item: JourneyMapItem): string {
  return item.kind === "standard" ? item.step.id : item.id;
}
