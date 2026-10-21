// 진행 상태(`legacyTutorial` + `catalogProgress` + `tickets`) 계약으로 `learning-progress` 모듈을 부르는 테스트 지원입니다.
// 제품 코드가 import하지 않습니다.
//
// 모듈 전체를 가져와 계약 모양으로 좁혀 부릅니다 — 계약 모양이 아직 없는 구현에서는 단언이 실패하고(호출 오류 · 값 불일치),
// 컴파일은 구현 상태와 무관하게 통과합니다.

import type { CatalogCompletionKeysOf, CatalogProgress } from "../../lib/catalog-progress";
import type { LearningProgressSnapshotV1 } from "../../lib/learning-progress.contract";
import type { TicketLedger } from "../../lib/learning-tickets";
import type { CatalogMapSection } from "../../screens/journey-map/catalog-map.contract";
import * as learningProgress from "../learning-progress";
import { emptyLegacyTutorialRecord } from "../legacy-tutorial-progress";
import type { LegacyTutorialRecord } from "../legacy-tutorial-progress";

export type ContractProgressState = {
  readonly legacyTutorial: LegacyTutorialRecord;
  readonly catalogProgress: CatalogProgress;
  readonly tickets?: TicketLedger;
};

export type CompletedEpisodeLike = { readonly id: string; readonly title: string };

type ProgressApi = {
  readonly learningProgressSnapshotFrom: (
    state: ContractProgressState,
  ) => LearningProgressSnapshotV1;
  readonly journeyProgressFrom: (raw: unknown) => ContractProgressState | null;
  readonly completedActivityCount: (state: ContractProgressState) => number;
  readonly catalogActivityCount: (progress: CatalogProgress) => number;
  readonly trophyCountFrom: (
    state: ContractProgressState,
    completionKeysOf: CatalogCompletionKeysOf,
  ) => number;
  readonly mergeJourneyProgress: (
    a: ContractProgressState,
    b: ContractProgressState,
  ) => ContractProgressState;
  readonly journeyProgressCovers: (
    server: ContractProgressState,
    local: ContractProgressState,
  ) => boolean;
  readonly completedSurveyEpisodesFrom: (
    sections: readonly CatalogMapSection[],
    progress: CatalogProgress,
  ) => readonly CompletedEpisodeLike[];
};

export const progressApi = learningProgress as unknown as ProgressApi;

export const emptyContractState: ContractProgressState = {
  legacyTutorial: emptyLegacyTutorialRecord,
  catalogProgress: {},
};

/** 서버 RPC(`merge_learning_progress_v1`)가 요구하는 조건을 TS로 적은 검사입니다. */
export function serverAcceptsSnapshot(snapshot: unknown): boolean {
  if (typeof snapshot !== "object" || snapshot === null || Array.isArray(snapshot)) return false;
  const record = snapshot as Record<string, unknown>;
  const steps = record["completedStepCount"];
  const visualNovel = record["visualNovel"] as Record<string, unknown> | null | undefined;
  return (
    record["version"] === 1 &&
    typeof steps === "number" &&
    Number.isInteger(steps) &&
    Array.isArray(record["completedEpisodeIntroIds"]) &&
    Array.isArray(record["completedMessengerUnitIds"]) &&
    Array.isArray(record["completedPhoneCallUnitIds"]) &&
    Array.isArray(record["completedEpisodeFinalIds"]) &&
    typeof visualNovel === "object" &&
    visualNovel !== null &&
    (visualNovel["status"] === "active" || visualNovel["status"] === "completed") &&
    typeof visualNovel["beatIndex"] === "number"
  );
}
