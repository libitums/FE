// 학습자 프로필의 결선입니다 — 에피소드 전 시작 가드 · 가드 화면의 출구 · 설정 저장.

import type { Dispatch } from "@lynx-js/react";

import { CATALOG_INTRO_KEY } from "../lib/catalog-progress";
import type { CatalogUnitKey } from "../lib/catalog-progress";
import {
  learnerProfileSavedEvent,
  learnerProfileSkippedEvent,
  sameLearnerProfile,
} from "../lib/learner-profile";
import type { LearnerProfileOutcome, LearnerProfileRecord } from "../lib/learner-profile.contract";
import type { LearnerProfile } from "../lib/placeholder-fill";
import type { EpisodeFinalUnitId } from "../screens/episode-final/episode-final.contract";
import type { EpisodeIntroEventSink } from "../screens/episode-intro/episode-intro.contract";
import {
  canStartCatalogCover,
  canStartCatalogUnit,
  tutorialPassedFrom,
} from "../screens/journey-map/catalog-map";
import type { SettingsEventSink } from "../screens/settings/settings.contract";
import type { CatalogWiringValues } from "./catalog-cover-wiring";
import { catalogEntryNeedsLearnerProfile, learnerProfileGateOf } from "./learner-profile-gate";
import type { NavAction } from "./nav-state";
import type { LearnerProfileControls } from "./use-learner-profile";

export type CatalogStarts = {
  readonly cover: (episodeId: string) => void;
  readonly unit: (episodeId: string, unitKey: CatalogUnitKey) => void;
};

export type LearnerProfileWiring = {
  readonly onStartCatalogCover: (episodeId: string) => void;
  readonly onStartCatalogUnit: (episodeId: string, unitKey: CatalogUnitKey) => void;
  readonly onResolveLearnerProfileGate: (
    episodeId: string,
    unitKey: CatalogUnitKey,
    outcome: LearnerProfileOutcome,
  ) => void;
  readonly onCancelLearnerProfileGate: () => void;
  readonly onSubmitLearnerProfile: (record: LearnerProfileRecord) => void;
};

export type LearnerProfileWiringArgs = CatalogWiringValues &
  LearnerProfileControls & {
    readonly completedEpisodeFinalIds: readonly EpisodeFinalUnitId[];
    readonly dispatch: Dispatch<NavAction>;
    readonly episodeIntroEventSink: EpisodeIntroEventSink;
    readonly settingsEventSink: SettingsEventSink;
  };

/**
 * `startsWith(fill)`은 그 프로필로 만든 표지 · 학습 결선의 **가드 없는** 시작 함수 둘입니다. 가드 화면에서 풀 때는 저장이
 * 돌려준 프로필(아직 렌더되기 전 값)로 시작해야 해서 프로필을 인자로 받습니다.
 */
export function learnerProfileWiring(
  args: LearnerProfileWiringArgs,
  startsWith: (fill: LearnerProfile) => CatalogStarts,
): LearnerProfileWiring {
  const { dispatch, learnerRecord, episodeIntroEventSink: episodeSink } = args;
  const current = startsWith(args.learnerFill);

  // 열 수 있는 시작이고(잠긴 유닛 · 없는 에피소드는 원래 시작이 알아서 거절합니다) 이름 · 나라가 드는데 기록도 없고
  // 이번 실행에 아직 묻지도 않았을 때만 가드 화면을 세웁니다.
  const asks = (episodeId: string, startable: boolean): boolean => {
    if (!startable) return false;
    const entry = args.episodeContent.catalog.find((item) => item.id === episodeId);
    if (entry === undefined || entry.status !== "ready") return false;
    return (
      learnerProfileGateOf({
        needsProfile: catalogEntryNeedsLearnerProfile(args.episodeContent, entry),
        record: learnerRecord,
        prompt: args.learnerPrompt,
      }) === "ask"
    );
  };
  const askBefore = (episodeId: string, unitKey: CatalogUnitKey): void => {
    dispatch({ type: "push", screen: { name: "learner-profile-gate", episodeId, unitKey } });
  };

  return {
    onStartCatalogCover: (episodeId) => {
      const startable = canStartCatalogCover(args.catalogSections, episodeId, {
        tutorialPassed: tutorialPassedFrom(args.completedEpisodeFinalIds),
        progress: args.catalogProgress,
      });
      if (asks(episodeId, startable)) askBefore(episodeId, CATALOG_INTRO_KEY);
      else current.cover(episodeId);
    },
    onStartCatalogUnit: (episodeId, unitKey) => {
      const startable = canStartCatalogUnit(
        args.catalogSections,
        episodeId,
        unitKey,
        args.catalogProgress,
      );
      if (asks(episodeId, startable)) askBefore(episodeId, unitKey);
      else current.unit(episodeId, unitKey);
    },
    onResolveLearnerProfileGate: (episodeId, unitKey, outcome) => {
      let fill = args.learnerFill;
      if (outcome.kind === "saved") {
        fill = args.saveLearnerProfile(outcome.record);
        args.markLearnerProfileAsked();
        episodeSink?.(learnerProfileSavedEvent("episode", learnerRecord));
      } else {
        args.markLearnerProfileAsked();
        episodeSink?.(learnerProfileSkippedEvent("episode"));
      }
      // 가드 화면을 걷은 다음 원래 시작을 부릅니다 - 시작이 쌓는 화면이 가드 화면 위에 남지 않게.
      dispatch({ type: "back" });
      const starts = startsWith(fill);
      if (unitKey === CATALOG_INTRO_KEY) starts.cover(episodeId);
      else starts.unit(episodeId, unitKey);
    },
    // 건너뜀이 아닙니다 - 물었다고 적지 않아 다음에 같은 유닛을 열면 다시 묻습니다.
    onCancelLearnerProfileGate: () => dispatch({ type: "back" }),
    onSubmitLearnerProfile: (record) => {
      if (!sameLearnerProfile(learnerRecord, record)) {
        args.saveLearnerProfile(record);
        args.settingsEventSink?.(learnerProfileSavedEvent("settings", learnerRecord));
      }
      dispatch({ type: "backToRoot" });
    },
  };
}
