// 끝낸 유닛에서 다음 유닛으로 이어지는 발자국의 순수 파생입니다(ADR-0100) — 구간 · 기하 · 자리. 던지지 않습니다.

import { CATALOG_INTRO_KEY, isCatalogUnitDone } from "../../lib/catalog-progress";
import type { CatalogProgress, CatalogUnitKey } from "../../lib/catalog-progress";
import { catalogSelectorToken } from "./catalog-map";
import type { CatalogReadySection } from "./catalog-map.contract";

export type MapPoint = { readonly x: number; readonly y: number };

/** 발자국 하나 — 중심(px) · 발끝 방향(deg, 시계 방향, 0 = 위) · 왼발(-1) / 오른발(1). */
export type MapFootprint = {
  readonly x: number;
  readonly y: number;
  readonly rotation: number;
  readonly flip: 1 | -1;
};

/** 진행 방향 간격입니다. */
export const FOOTPRINT_STEP = 20;
/** 경로 기준 좌우 폭입니다. */
export const FOOTPRINT_LATERAL = 5;
export const FOOTPRINT_WIDTH = 12;
export const FOOTPRINT_HEIGHT = 14;
/** 유닛 가장자리에서 떨어지는 거리입니다. */
export const FOOTPRINT_EDGE_GAP = 6;

/**
 * 유닛 표식 상자(`MapUnitStage`)의 id입니다 — 발자국이 노드 중심을 잴 때 씁니다. 셀 id(`journey-map-unit-…`, 자동
 * 스크롤 · 말풍선이 잰다)와 다른 이름공간이라 두 질의가 섞이지 않습니다.
 */
export function catalogMarkDomId(episodeId: string, unitKey: CatalogUnitKey): string {
  const token = catalogSelectorToken(episodeId);
  return `journey-map-mark-${token.length}-${token}-${catalogSelectorToken(unitKey)}`;
}

/** 레슨 · 문화 원형 링의 반지름과 스페셜 네모(면 104)의 중심 → 모서리 거리입니다. */
const CIRCLE_RADIUS = 50;
const SQUARE_REACH = 62;

export type MapSegment = { readonly from: CatalogUnitKey; readonly to: CatalogUnitKey };
export type MapNodeShape = "circle" | "square";
/** 노드 표식 상자의 자리(뷰포트 기준)입니다. */
export type MapCellRect = {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
};
export type MapNodeAnchor = { readonly center: MapPoint; readonly inset: number };
export type MapFootprintSegment = {
  readonly from: CatalogUnitKey;
  readonly to: CatalogUnitKey;
  readonly prints: readonly MapFootprint[];
};

/**
 * 두 중심과 각 끝의 inset으로 발자국 목록을 냅니다. 선분 길이 L ≤ 0이면 빈 목록, 아니면 n = max(2, round(L / 20)).
 * i번째 중심은 t = (i + .5) / n, 좌우는 첫 발 왼쪽(−)부터 ±5 번갈아, 발끝은 선분 방향(atan2 + 90°).
 */
export function footprintsAlong(
  from: MapPoint,
  to: MapPoint,
  insetFrom: number,
  insetTo: number,
): readonly MapFootprint[] {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.hypot(dx, dy);
  if (!Number.isFinite(distance) || distance <= 0) return [];
  const ux = dx / distance;
  const uy = dy / distance;
  const start = { x: from.x + ux * insetFrom, y: from.y + uy * insetFrom };
  const end = { x: to.x - ux * insetTo, y: to.y - uy * insetTo };
  const length = distance - insetFrom - insetTo;
  if (length <= 0) return [];
  const count = Math.max(2, Math.round(length / FOOTPRINT_STEP));
  const rotation = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
  const prints: MapFootprint[] = [];
  for (let index = 0; index < count; index += 1) {
    const t = (index + 0.5) / count;
    const flip: 1 | -1 = index % 2 === 0 ? -1 : 1;
    prints.push({
      x: start.x + (end.x - start.x) * t - uy * flip * FOOTPRINT_LATERAL,
      y: start.y + (end.y - start.y) * t + ux * flip * FOOTPRINT_LATERAL,
      rotation,
      flip,
    });
  }
  return prints;
}

/** 사슬 [intro, ...lessonKeys, finalKey]에서 앞 유닛을 끝낸 쌍만, 순서대로. 에피소드 사이는 없습니다. */
export function clearedSegmentsOf(
  section: Pick<CatalogReadySection, "episodeId" | "lessonKeys" | "finalKey">,
  progress: CatalogProgress,
): readonly MapSegment[] {
  const chain: CatalogUnitKey[] = [CATALOG_INTRO_KEY, ...section.lessonKeys, section.finalKey];
  const segments: MapSegment[] = [];
  for (let index = 0; index + 1 < chain.length; index += 1) {
    const from = chain[index];
    const to = chain[index + 1];
    if (from === undefined || to === undefined) continue;
    if (isCatalogUnitDone(progress, section.episodeId, from)) segments.push({ from, to });
  }
  return segments;
}

/** intro · 최종 · 이야기 유닛은 스페셜 네모, 그 밖(레슨 · 문화)은 원입니다. */
export function mapNodeShapeOf(
  section: Pick<CatalogReadySection, "finalKey" | "storyKeys">,
  key: CatalogUnitKey,
): MapNodeShape {
  if (key === CATALOG_INTRO_KEY || key === section.finalKey) return "square";
  return (section.storyKeys ?? []).includes(key) ? "square" : "circle";
}

/** 노드 표식 상자(`MapUnitStage`, 유닛과 같은 크기) rect → 중심 · inset. 표지 일러스트 · 라벨과 무관합니다. */
export function mapNodeAnchorOf(rect: MapCellRect, shape: MapNodeShape): MapNodeAnchor {
  const reach = shape === "circle" ? CIRCLE_RADIUS : SQUARE_REACH;
  return {
    center: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
    inset: reach + FOOTPRINT_EDGE_GAP,
  };
}

/** 구획 원점 기준 좌표로 구간마다 발자국을 냅니다. 양 끝 rect가 없는 구간은 뺍니다. */
export function footprintLayoutOf(
  segments: readonly MapSegment[],
  rects: Readonly<Record<CatalogUnitKey, MapCellRect | undefined>>,
  origin: MapPoint,
  shapeOf: (key: CatalogUnitKey) => MapNodeShape,
): readonly MapFootprintSegment[] {
  const layout: MapFootprintSegment[] = [];
  for (const segment of segments) {
    const fromRect = rects[segment.from];
    const toRect = rects[segment.to];
    if (fromRect === undefined || toRect === undefined) continue;
    const from = mapNodeAnchorOf(fromRect, shapeOf(segment.from));
    const to = mapNodeAnchorOf(toRect, shapeOf(segment.to));
    const prints = footprintsAlong(from.center, to.center, from.inset, to.inset).map((print) => ({
      ...print,
      x: print.x - origin.x,
      y: print.y - origin.y,
    }));
    layout.push({ from: segment.from, to: segment.to, prints });
  }
  return layout;
}

/** 등장 순번 → 지연 ms: 유닛이 끝남 색으로 바뀐 뒤(d6) 발자국마다 d2씩 늦게. */
export function footprintEnterDelayMs(
  index: number,
  tokens: { readonly d6: number; readonly d2: number },
): number {
  return tokens.d6 + Math.max(0, Math.trunc(index)) * tokens.d2;
}
