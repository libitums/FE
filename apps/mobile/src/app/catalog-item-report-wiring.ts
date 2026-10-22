// 활동이 올린 문항 판정 보고를 측정 이벤트로 잇는 결선입니다. 껍데기만 있는 단계입니다 — 아직 보내지 않습니다.

import type { CatalogUnitKey } from "../lib/catalog-progress";
import type { ItemAnswerReport } from "../lib/item-answer";
import type { EpisodeIntroEventSink } from "../screens/episode-intro/episode-intro.contract";
import type { CatalogItemRef } from "./catalog-lesson-types";

export type CatalogItemReportWiring = {
  readonly onCatalogItemAnswered: (
    episodeId: string,
    unitKey: CatalogUnitKey,
    ref: CatalogItemRef,
    report: ItemAnswerReport,
  ) => void;
};

export function catalogItemReportWiring(_args: {
  readonly episodeIntroEventSink: EpisodeIntroEventSink;
}): CatalogItemReportWiring {
  return {
    onCatalogItemAnswered: () => {},
  };
}
