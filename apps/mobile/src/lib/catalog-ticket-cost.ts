import { isCatalogUnitDone } from "./catalog-progress";
import type { CatalogProgress, CatalogUnitKey } from "./catalog-progress";
import { TUTORIAL_EPISODE_ID } from "./tutorial-episode";

/**
 * 그 유닛을 시작할 때 쓰는 티켓 수 — 튜토리얼이거나 이미 끝낸 유닛이거나 이미 티켓을 쓰고 연 유닛(`ticketUnits`)이면
 * 0, 아니면 1입니다. 티켓으로 연 레슨을 중간에 나가도 다시 열 때 또 쓰지 않습니다.
 */
export function catalogUnitTicketCost(
  progress: CatalogProgress,
  episodeId: string,
  unitKey: CatalogUnitKey,
  ticketUnits: CatalogProgress = {},
): 0 | 1 {
  if (episodeId === TUTORIAL_EPISODE_ID) return 0;
  if (isCatalogUnitDone(ticketUnits, episodeId, unitKey)) return 0;
  return isCatalogUnitDone(progress, episodeId, unitKey) ? 0 : 1;
}
