// 듣기 속도 결선입니다 — 「천천히」 값 · 토글 · 문항 보고를 내립니다.

import type { Dispatch, SetStateAction } from "@lynx-js/react";

import type { CatalogUnitKey } from "../lib/catalog-progress";
import { toggledListenPace } from "../lib/listen-pace";
import type { ListenPace } from "../lib/listen-pace";
import type { ListenItemReport } from "../lib/question-audio";
import type { EpisodeIntroEventSink } from "../screens/episode-intro/episode-intro.contract";
import { listenItemAnsweredEventOf } from "./catalog-events";

export type CatalogListenWiring = {
  readonly listenPace: ListenPace;
  readonly onToggleListenPace: () => void;
  readonly onListenItemAnswered: (
    episodeId: string,
    unitKey: CatalogUnitKey,
    report: ListenItemReport,
  ) => void;
};

export type CatalogListenWiringArgs = {
  readonly listenPace: ListenPace;
  readonly setListenPace: Dispatch<SetStateAction<ListenPace>>;
  readonly episodeIntroEventSink: EpisodeIntroEventSink;
};

export function catalogListenWiring(args: CatalogListenWiringArgs): CatalogListenWiring {
  const sink = args.episodeIntroEventSink;
  return {
    listenPace: args.listenPace,
    onToggleListenPace: () => args.setListenPace((pace) => toggledListenPace(pace)),
    onListenItemAnswered: (episodeId, unitKey, report) => {
      sink?.(listenItemAnsweredEventOf(episodeId, unitKey, report));
    },
  };
}
