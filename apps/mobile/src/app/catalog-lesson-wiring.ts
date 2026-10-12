// 카탈로그 레슨 · 최종 테스트의 결선입니다 — 시작 가드 · 활동 잇기 · 판정 · 기록 · 이벤트 · 결과 뒤 이동.

import type { Dispatch, SetStateAction } from "@lynx-js/react";

import type { AnswerResult } from "../lib/answer-result";
import type { CatalogProgress, CatalogUnitKey } from "../lib/catalog-progress";
import type { AssessmentVerdict } from "../screens/assessment/assessment";
import type { EpisodeFinalUnitId } from "../screens/episode-final/episode-final.contract";
import type { EpisodeIntroEventSink } from "../screens/episode-intro/episode-intro.contract";
import type { CatalogWiringValues } from "./catalog-cover-wiring";
import type { NavAction } from "./nav-state";

export type CatalogLessonWiring = {
  readonly onStartCatalogUnit: (episodeId: string, unitKey: CatalogUnitKey) => void;
  readonly onExitCatalogSession: () => void;
  readonly onFinishCatalogActivity: (
    episodeId: string,
    unitKey: CatalogUnitKey,
    activityIndex: number,
    results: readonly AnswerResult[],
    skippedCount: number,
  ) => void;
  readonly onFinishCatalogFinal: (episodeId: string, results: readonly AnswerResult[]) => void;
  readonly onExitCatalogUnitComplete: (
    episodeId: string,
    unitKey: CatalogUnitKey,
    verdict: AssessmentVerdict,
  ) => void;
  readonly onLeaveCatalogEpilogue: () => void;
};

export type CatalogLessonWiringArgs = CatalogWiringValues & {
  readonly setCatalogProgress: Dispatch<SetStateAction<CatalogProgress>>;
  readonly completedEpisodeFinalIds: readonly EpisodeFinalUnitId[];
  readonly dispatch: Dispatch<NavAction>;
  readonly episodeIntroEventSink: EpisodeIntroEventSink;
  readonly pendingResults: readonly AnswerResult[];
  readonly setPendingResults: Dispatch<SetStateAction<readonly AnswerResult[]>>;
  readonly pendingSkippedCount: number;
  readonly setPendingSkippedCount: Dispatch<SetStateAction<number>>;
};

const noop = (): void => undefined;

export function catalogLessonWiring(_args: CatalogLessonWiringArgs): CatalogLessonWiring {
  return {
    onStartCatalogUnit: noop,
    onExitCatalogSession: noop,
    onFinishCatalogActivity: noop,
    onFinishCatalogFinal: noop,
    onExitCatalogUnitComplete: noop,
    onLeaveCatalogEpilogue: noop,
  };
}
