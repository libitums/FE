// 카탈로그 표지의 결선입니다 — 시작 가드 · 이벤트 · 진행 기록 · 이동, route 모델 만들기.

import type { Dispatch, SetStateAction } from "@lynx-js/react";

import { CATALOG_INTRO_KEY, isCatalogUnitDone, markCatalogUnitDone } from "../lib/catalog-progress";
import type { CatalogProgress } from "../lib/catalog-progress";
import type { LearnerProfile } from "../lib/placeholder-fill";
import { catalogCutViewsOf, catalogCutsOf } from "../screens/catalog-cover/catalog-cover";
import type { CatalogCuts } from "../screens/catalog-cover/catalog-cover.contract";
import type { EpisodeFinalUnitId } from "../screens/episode-final/episode-final.contract";
import type {
  EpisodeIntroEventSink,
  EpisodeIntroExitStage,
} from "../screens/episode-intro/episode-intro.contract";
import { canStartCatalogCover, tutorialPassedFrom } from "../screens/journey-map/catalog-map";
import type { CatalogMapSection } from "../screens/journey-map/catalog-map.contract";
import type { EpisodeContent } from "./episode-content";
import type { NavAction } from "./nav-state";
import type { LearnerProfileValues } from "./use-learner-profile";

export type CatalogWiringValues = {
  readonly episodeContent: EpisodeContent;
  readonly catalogSections: readonly CatalogMapSection[];
  readonly catalogProgress: CatalogProgress;
} & LearnerProfileValues;

export type CatalogCoverWiring = CatalogWiringValues & {
  readonly onStartCatalogCover: (episodeId: string) => void;
  /** 표지(`intro`)나 컷(`prologue`)에서 뒤로 — 이벤트 → `back`. */
  readonly onExitCatalogCover: (episodeId: string, stage: EpisodeIntroExitStage) => void;
  /** 표지 확인 모달의 건너뛰기 — 이벤트 → 진행 기록 → `back`. 이미 끝낸 표지면 `back`만. */
  readonly onSkipCatalogCover: (episodeId: string) => void;
  /** 표지의 `Next` — 이벤트만. */
  readonly onContinueCatalogCover: (episodeId: string) => void;
  /** 마지막 컷 — 이벤트 → 진행 기록. 이동하지 않습니다. */
  readonly onFinishCatalogCoverCuts: (episodeId: string) => void;
  /** 「Episode start!」 배너가 닫힌 뒤 — `back`만. */
  readonly onCloseCatalogCover: () => void;
};

export type CatalogCoverWiringArgs = CatalogWiringValues & {
  readonly setCatalogProgress: Dispatch<SetStateAction<CatalogProgress>>;
  readonly completedEpisodeFinalIds: readonly EpisodeFinalUnitId[];
  readonly dispatch: Dispatch<NavAction>;
  readonly episodeIntroEventSink: EpisodeIntroEventSink;
};

export type CatalogCoverModel = {
  readonly ordinal: number;
  /** 구획(매니페스트)의 제목 — 표지의 둘째 줄 */
  readonly title: string;
  readonly version: string;
  readonly cuts: CatalogCuts;
};

// 기록이 없을 때의 프로필입니다.
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
  return cuts === null
    ? null
    : { ordinal: section.ordinal, title: section.title, version: entry.version, cuts };
}

export type CatalogEpilogueModel = {
  readonly ordinal: number;
  readonly cuts: CatalogCuts;
};

/** 최종 테스트 통과 뒤 컷의 모델입니다. 컷이 없거나 준비되지 않았으면 `null`. */
export function catalogEpilogueModelOf(
  content: EpisodeContent,
  sections: readonly CatalogMapSection[],
  episodeId: string,
  profile: LearnerProfile,
): CatalogEpilogueModel | null {
  const entry = content.catalog.find((item) => item.id === episodeId);
  const section = sections.find((item) => item.episodeId === episodeId);
  if (entry === undefined || entry.status !== "ready" || section === undefined) return null;
  const cuts = catalogCutsOf(
    catalogCutViewsOf(entry.episode.epilogue, {
      imageUrlOf: content.imageUrlOf,
      fill: (text, script) => content.fillText(text, profile, script),
    }),
  );
  return cuts === null ? null : { ordinal: section.ordinal, cuts };
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
    learnerFill,
    learnerRecord,
    learnerSync,
    learnerPort,
  } = args;

  const markIntroDone = (episodeId: string): void => {
    setCatalogProgress((progress) => markCatalogUnitDone(progress, episodeId, CATALOG_INTRO_KEY));
  };

  // 표지 컷 끝: 이벤트 → 진행 기록 순서입니다. 이동하지 않습니다 — 배너가 닫힐 때 `onCloseCatalogCover`가 합니다.
  const recordCoverDone = (episodeId: string): void => {
    episodeIntroEventSink?.({
      name: "episode_prologue_completed",
      episodeId,
      prologueKind: "cuts",
    });
    markIntroDone(episodeId);
  };

  return {
    episodeContent,
    catalogSections,
    catalogProgress,
    learnerFill,
    learnerRecord,
    learnerSync,
    learnerPort,
    onStartCatalogCover: (episodeId) => {
      const gate = {
        tutorialPassed: tutorialPassedFrom(completedEpisodeFinalIds),
        progress: catalogProgress,
      };
      if (!canStartCatalogCover(catalogSections, episodeId, gate)) return;
      const entry = episodeContent.catalog.find((item) => item.id === episodeId);
      if (entry === undefined || entry.status !== "ready") return;
      episodeIntroEventSink?.({ name: "episode_intro_viewed", episodeId });
      const model = catalogCoverModelOf(episodeContent, catalogSections, episodeId, learnerFill);
      if (model === null) {
        // 컷이 없는 에피소드는 화면을 쌓지 않고 바로 끝낸 것으로 기록합니다.
        recordCoverDone(episodeId);
        return;
      }
      dispatch({ type: "push", screen: { name: "catalog-cover", episodeId } });
    },
    onExitCatalogCover: (episodeId, stage) => {
      episodeIntroEventSink?.({ name: "episode_intro_exited", episodeId, stage });
      dispatch({ type: "back" });
    },
    // 이미 끝낸 표지를 다시 열어 건너뛴 것은 세지 않습니다 — 건너뛰기 비율은 처음 보는 사람의 선택만 봅니다.
    onSkipCatalogCover: (episodeId) => {
      if (!isCatalogUnitDone(catalogProgress, episodeId, CATALOG_INTRO_KEY)) {
        episodeIntroEventSink?.({ name: "episode_intro_skipped", episodeId });
        markIntroDone(episodeId);
      }
      dispatch({ type: "back" });
    },
    onContinueCatalogCover: (episodeId) => {
      episodeIntroEventSink?.({
        name: "episode_intro_continued",
        episodeId,
        hasPrologue: true,
      });
    },
    onFinishCatalogCoverCuts: (episodeId) => {
      recordCoverDone(episodeId);
    },
    onCloseCatalogCover: () => {
      dispatch({ type: "back" });
    },
  };
}
