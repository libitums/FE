// 화면 결선의 카탈로그 유닛 시작에 학습 티켓 문지기를 겹칩니다. 맵의 Start와 결과 화면의 「Try again」이 모두
// 이 시작을 부르므로 여기 한 곳에서 막습니다. 알림 · 푸시는 레슨을 열지 않습니다. 잠긴 유닛은 원래 시작이 그러듯
// 티켓을 쓰지 않고 그냥 무시합니다. 튜토리얼(u00) · 이미 끝낸 유닛 · 이미 티켓을 쓰고 연 유닛은 티켓을 쓰지 않습니다
// (`catalogUnitTicketCost`). 티켓을 쓰고 여는 유닛은 기록해 둡니다 — 레슨을 중간에 나가도 다시 열 때 또 쓰지 않습니다.

import { catalogUnitTicketCost } from "../lib/catalog-ticket-cost";
import { isTesterAccessActive } from "../lib/tester-access";
import type { CatalogProgress, CatalogUnitKey } from "../lib/catalog-progress";
import { canStartCatalogUnit } from "../screens/journey-map/catalog-map";
import type { CatalogMapSection } from "../screens/journey-map/catalog-map.contract";
import type { ScreenWiring } from "./screen-wiring";
import type { JourneyProgressState } from "./learning-progress";
import type { LearningTickets } from "./use-learning-tickets";

export function withLearningTickets<W extends ScreenWiring>(
  wiring: W,
  tickets: Pick<LearningTickets, "startWithTicket" | "status">,
  progress: JourneyProgressState & {
    readonly markTicketUnit: (episodeId: string, unitKey: CatalogUnitKey) => void;
  },
  catalogSections: readonly CatalogMapSection[],
): W {
  const { startWithTicket } = tickets;
  const catalogProgress: CatalogProgress = progress.catalogProgress;
  const ticketUnits: CatalogProgress = progress.ticketUnits ?? {};
  return {
    ...wiring,
    // 시험 계정은 결과 화면의 남은 장수 줄을 세우지 않습니다(ADR-0085).
    ...(isTesterAccessActive() ? {} : { ticketsLeft: tickets.status.available }),
    catalogTicketUnits: ticketUnits,
    onStartCatalogUnit: (episodeId, unitKey, source) => {
      "background only";
      if (!canStartCatalogUnit(catalogSections, episodeId, unitKey, catalogProgress)) return;
      const free = catalogUnitTicketCost(catalogProgress, episodeId, unitKey, ticketUnits) === 0;
      // `open`은 한 장을 쓴 뒤에만 불립니다(무료면 바로). 그때 연 유닛을 적습니다.
      startWithTicket(free, () => {
        if (!free) progress.markTicketUnit(episodeId, unitKey);
        if (source === undefined) wiring.onStartCatalogUnit(episodeId, unitKey);
        else wiring.onStartCatalogUnit(episodeId, unitKey, source);
      });
    },
  };
}
