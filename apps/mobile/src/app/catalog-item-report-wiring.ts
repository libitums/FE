// 활동이 올린 문항 판정 보고를 측정 이벤트로 잇는 결선입니다. 채점 유형이 아니면 보내지 않습니다.

import type { CatalogUnitKey } from "../lib/catalog-progress";
import type { ItemAnswerReport } from "../lib/item-answer";
import type { EpisodeIntroEventSink } from "../screens/episode-intro/episode-intro.contract";
import { itemAnsweredEventOf } from "./catalog-events";
import type { CatalogItemRef } from "./catalog-lesson-types";

export type CatalogItemReportWiring = {
  readonly onCatalogItemAnswered: (
    episodeId: string,
    unitKey: CatalogUnitKey,
    ref: CatalogItemRef,
    report: ItemAnswerReport,
  ) => void;
};

export function catalogItemReportWiring(args: {
  readonly episodeIntroEventSink: EpisodeIntroEventSink;
}): CatalogItemReportWiring {
  const sink = args.episodeIntroEventSink;
  return {
    onCatalogItemAnswered: (episodeId, unitKey, ref, report) => {
      const event = itemAnsweredEventOf(episodeId, unitKey, ref, report);
      if (event !== null) sink?.(event);
    },
  };
}
