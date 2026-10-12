// 카탈로그 표지의 결선입니다 — 시작 가드 · 이벤트 · 진행 기록 · 이동, route 모델 만들기.

import type { Dispatch, SetStateAction } from "@lynx-js/react";

import { CATALOG_INTRO_KEY, markCatalogUnitDone } from "../lib/catalog-progress";
import type { CatalogProgress } from "../lib/catalog-progress";
import type { LearnerProfile } from "../lib/placeholder-fill";
import { catalogCutViewsOf, catalogCutsOf } from "../screens/catalog-cover/catalog-cover";
import type { CatalogCuts } from "../screens/catalog-cover/catalog-cover.contract";
import type { EpisodeFinalUnitId } from "../screens/episode-final/episode-final.contract";
import type { EpisodeIntroEventSink } from "../screens/episode-intro/episode-intro.contract";
import { canStartCatalogCover, tutorialPassedFrom } from "../screens/journey-map/catalog-map";
import type { CatalogMapSection } from "../screens/journey-map/catalog-map.contract";
import type { EpisodeContent } from "./episode-content";
import type { NavAction } from "./nav-state";

export type CatalogWiringValues = {
  readonly episodeContent: EpisodeContent;
  readonly catalogSections: readonly CatalogMapSection[];
  readonly catalogProgress: CatalogProgress;
};

export type CatalogCoverWiring = CatalogWiringValues & {
  readonly onStartCatalogCover: (episodeId: string) => void;
  readonly onExitCatalogCover: (episodeId: string) => void;
  readonly onCompleteCatalogCover: (episodeId: string) => void;
};

export type CatalogCoverWiringArgs = CatalogWiringValues & {
  readonly setCatalogProgress: Dispatch<SetStateAction<CatalogProgress>>;
  readonly completedEpisodeFinalIds: readonly EpisodeFinalUnitId[];
  readonly dispatch: Dispatch<NavAction>;
  readonly episodeIntroEventSink: EpisodeIntroEventSink;
};

export type CatalogCoverModel = {
  readonly ordinal: number;
  readonly version: string;
  readonly cuts: CatalogCuts;
};

// 온보딩이 프로필을 내리기 전까지(3d) 비어 있는 프로필입니다.
export const noLearnerProfile: LearnerProfile = {};

export function catalogCoverModelOf(
  content: EpisodeContent,
  sections: readonly CatalogMapSection[],
  episodeId: string,
  profile: LearnerProfile,
): CatalogCoverModel | null {
  const entry = content.catalog.find((item) => item.id === episodeId);
  const section = sections.find((item) => item.episodeId === episodeId);
  if (entry === undefined || entry.status !== "ready" || section === undefined) return null;
  const cuts = catalogCutsOf(
    catalogCutViewsOf(entry.episode.prologue, {
      imageUrlOf: content.imageUrlOf,
      fill: (text, script) => content.fillText(text, profile, script),
    }),
  );
  return cuts === null ? null : { ordinal: section.ordinal, version: entry.version, cuts };
}

export function catalogCoverWiring(args: CatalogCoverWiringArgs): CatalogCoverWiring {
  const {
    episodeContent,
    catalogSections,
    catalogProgress,
    setCatalogProgress,
    completedEpisodeFinalIds,
    dispatch,
    episodeIntroEventSink,
  } = args;

  // 표지 끝: 이벤트 → 진행 기록 순서입니다. 이동은 호출자가 이어서 합니다.
  const recordCoverDone = (episodeId: string): void => {
    episodeIntroEventSink?.({
      name: "episode_prologue_completed",
      episodeId,
      prologueKind: "cuts",
    });
    setCatalogProgress((progress) => markCatalogUnitDone(progress, episodeId, CATALOG_INTRO_KEY));
  };

  return {
    episodeContent,
    catalogSections,
    catalogProgress,
    onStartCatalogCover: (episodeId) => {
      const gate = {
        tutorialPassed: tutorialPassedFrom(completedEpisodeFinalIds),
        progress: catalogProgress,
      };
      if (!canStartCatalogCover(catalogSections, episodeId, gate)) return;
      const entry = episodeContent.catalog.find((item) => item.id === episodeId);
      if (entry === undefined || entry.status !== "ready") return;
      episodeIntroEventSink?.({ name: "episode_intro_viewed", episodeId });
      const model = catalogCoverModelOf(
        episodeContent,
        catalogSections,
        episodeId,
        noLearnerProfile,
      );
      if (model === null) {
        // 컷이 없는 에피소드는 화면을 쌓지 않고 바로 끝낸 것으로 기록합니다.
        recordCoverDone(episodeId);
        return;
      }
      dispatch({ type: "push", screen: { name: "catalog-cover", episodeId } });
    },
    onExitCatalogCover: (episodeId) => {
      episodeIntroEventSink?.({ name: "episode_intro_exited", episodeId, stage: "prologue" });
      dispatch({ type: "back" });
    },
    onCompleteCatalogCover: (episodeId) => {
      recordCoverDone(episodeId);
      dispatch({ type: "back" });
    },
  };
}
