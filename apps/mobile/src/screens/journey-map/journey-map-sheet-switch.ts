// 말풍선이 열린 동안 가림막을 누른 자리에 다른 유닛이 있는지 가립니다 — 있으면 맵이 그 유닛으로 말풍선을 옮기고,
// 없으면 닫습니다. 가림막이 맵 위를 덮으므로 유닛의 탭은 오지 않고, 누른 자리와 유닛 상자의 자리를 견줘야 합니다.
// 순수 함수만 있습니다.

import type { CatalogUnitKey, CatalogProgress } from "../../lib/catalog-progress";
import { catalogUnitDomId, catalogUnitNodesOf } from "./catalog-map";
import type { CatalogMapSection, SheetTargetId } from "./catalog-map.contract";
import { catalogSheetKey } from "./catalog-sheet";
import { canSelectMapNode, mapNodeStatusUnder } from "./journey-map-load";
import type { JourneyMapNodeAccess } from "./journey-map-load.contract";
import type { MeasuredRect } from "./journey-map-scroll";

/** 말풍선을 옮겨 열 수 있는 유닛 하나입니다 — 잴 상자(`domId`)는 라벨까지 감싼 유닛 칸입니다. */
export type SheetSwitchCandidate = {
  readonly id: SheetTargetId;
  readonly episodeId: string;
  readonly unitKey: CatalogUnitKey;
  readonly domId: string;
};

/** 열린(고를 수 있는) 카탈로그 유닛 전부입니다. 지금 열린 유닛(`openId`)은 빼고 — 그 자리를 누르면 닫습니다. */
export function sheetSwitchCandidates(
  sections: readonly CatalogMapSection[],
  progress: CatalogProgress,
  access: JourneyMapNodeAccess,
  openId: SheetTargetId | null,
): readonly SheetSwitchCandidate[] {
  return sections.flatMap((section) =>
    section.kind !== "catalog-ready"
      ? []
      : catalogUnitNodesOf(section, progress)
          .filter((node) => canSelectMapNode(mapNodeStatusUnder(access, node.status)))
          .map((node) => ({
            id: catalogSheetKey(section.episodeId, node.key),
            episodeId: section.episodeId,
            unitKey: node.key,
            domId: catalogUnitDomId(section.episodeId, node.key),
          }))
          .filter((candidate) => candidate.id !== openId),
  );
}

/** 누른 자리(`x` · `y`, 잰 상자와 같은 화면 좌표)를 품은 첫 후보입니다. 못 잰 상자 · 가로를 모르는 상자는 건너뜁니다. */
export function sheetSwitchTargetAt(
  candidates: readonly SheetSwitchCandidate[],
  rects: readonly (MeasuredRect | null)[],
  x: number,
  y: number,
): SheetSwitchCandidate | null {
  for (let index = 0; index < candidates.length; index += 1) {
    const rect = rects[index];
    const candidate = candidates[index];
    if (rect === null || rect === undefined || candidate === undefined) continue;
    if (rect.left === null || rect.width === null) continue;
    const inside =
      x >= rect.left && x <= rect.left + rect.width && y >= rect.top && y <= rect.top + rect.height;
    if (inside) return candidate;
  }
  return null;
}
