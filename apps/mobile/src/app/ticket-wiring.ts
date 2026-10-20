// 화면 결선의 레슨 시작 둘(튜토리얼 스텝 · 카탈로그 유닛)에 학습 티켓 문지기를 겹칩니다. 맵의 Start와 결과 화면의
// 「Try again」이 모두 이 둘을 부르므로 여기 한 곳에서 막습니다. 알림 · 푸시는 레슨을 열지 않습니다(메신저 ·
// 전화 · 비주얼 노벨만). 잠긴 유닛은 원래 시작이 그러듯 티켓을 쓰지 않고 그냥 무시합니다.

import { isCatalogUnitDone } from "../lib/catalog-progress";
import type { CatalogProgress } from "../lib/catalog-progress";
import { journeyStepOrdinal } from "../screens/journey-map/journey-map-progress";
import { canStartCatalogUnit } from "../screens/journey-map/catalog-map";
import type { CatalogMapSection } from "../screens/journey-map/catalog-map.contract";
import { completedVisualNovelUnitIdsFrom } from "./journey-progress";
import { canStartJourneyUnit } from "./journey-access";
import type { ScreenWiring } from "./screen-wiring";
import type { JourneyProgressState } from "./learning-progress";
import type { LearningTickets } from "./use-learning-tickets";

export function withLearningTickets<W extends ScreenWiring>(
  wiring: W,
  tickets: Pick<LearningTickets, "startWithTicket" | "status">,
  progress: JourneyProgressState,
  catalogSections: readonly CatalogMapSection[],
): W {
  const { startWithTicket } = tickets;
  const catalogProgress: CatalogProgress = progress.catalogProgress;
  return {
    ...wiring,
    ticketsLeft: tickets.status.available,
    onStartStep: (id) => {
      "background only";
      const startable = canStartJourneyUnit(id, {
        completedStepCount: progress.completedStepCount,
        completedEpisodeIntroIds: progress.completedEpisodeIntroIds,
        completedMessengerUnitIds: progress.completedMessengerUnitIds,
        completedPhoneCallUnitIds: progress.completedPhoneCallUnitIds,
        completedVisualNovelUnitIds: completedVisualNovelUnitIdsFrom(progress.visualNovelProgress),
        completedEpisodeFinalIds: [],
      });
      if (!startable) return;
      const replay = journeyStepOrdinal(id) - 1 < progress.completedStepCount;
      startWithTicket(replay, () => wiring.onStartStep(id));
    },
    onStartCatalogUnit: (episodeId, unitKey) => {
      "background only";
      if (!canStartCatalogUnit(catalogSections, episodeId, unitKey, catalogProgress)) return;
      const replay = isCatalogUnitDone(catalogProgress, episodeId, unitKey);
      startWithTicket(replay, () => wiring.onStartCatalogUnit(episodeId, unitKey));
    },
  };
}
