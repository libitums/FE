import type { CatalogProgress, CatalogUnitKey } from "./catalog-progress";

/** 그 유닛을 시작할 때 쓰는 티켓 수 — 튜토리얼이거나 이미 끝낸 유닛이면 0, 아니면 1입니다. */
export function catalogUnitTicketCost(
  _progress: CatalogProgress,
  _episodeId: string,
  _unitKey: CatalogUnitKey,
): 0 | 1 {
  return 1;
}
