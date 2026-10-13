// 학습자 프로필의 결선입니다 — 에피소드 전 시작 가드 · 가드 화면의 출구 · 설정 저장.

import type { Dispatch } from "@lynx-js/react";

import type { CatalogUnitKey } from "../lib/catalog-progress";
import type { LearnerProfileOutcome, LearnerProfileRecord } from "../lib/learner-profile.contract";
import type { LearnerProfile } from "../lib/placeholder-fill";
import type { EpisodeFinalUnitId } from "../screens/episode-final/episode-final.contract";
import type { EpisodeIntroEventSink } from "../screens/episode-intro/episode-intro.contract";
import type { SettingsEventSink } from "../screens/settings/settings.contract";
import type { CatalogWiringValues } from "./catalog-cover-wiring";
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

/** `startsWith(fill)`은 그 프로필로 만든 표지 · 학습 결선의 **가드 없는** 시작 함수 둘입니다. */
export function learnerProfileWiring(
  args: LearnerProfileWiringArgs,
  startsWith: (fill: LearnerProfile) => CatalogStarts,
): LearnerProfileWiring {
  const starts = startsWith(args.learnerFill);
  return {
    onStartCatalogCover: starts.cover,
    onStartCatalogUnit: starts.unit,
    onResolveLearnerProfileGate: () => undefined,
    onCancelLearnerProfileGate: () => undefined,
    onSubmitLearnerProfile: () => undefined,
  };
}
