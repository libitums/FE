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

const LIST_FIELDS = [
  "completedEpisodeIntroIds",
  "completedMessengerUnitIds",
  "completedPhoneCallUnitIds",
  "completedEpisodeFinalIds",
] as const;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isIdList = (value: unknown): boolean =>
  Array.isArray(value) && value.every((item) => typeof item === "string" && item !== "");

const isSafeCount = (value: unknown): boolean =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0;

function visualNovelOk(value: unknown): boolean {
  if (!isPlainObject(value)) return false;
  const { status, beatIndex } = value;
  return (
    (status === "active" && (beatIndex === 0 || beatIndex === 1)) ||
    (status === "completed" && beatIndex === 2)
  );
}

function catalogProgressOk(value: unknown): boolean {
  return (
    isPlainObject(value) &&
    Object.entries(value).every(([key, units]) => key !== "" && isIdList(units))
  );
}

function ticketsOk(value: unknown): boolean {
  if (!isPlainObject(value)) return false;
  const day = value["grantDay"];
  return (
    isSafeCount(value["refillAtMs"]) &&
    isSafeCount(value["grantedMs"]) &&
    typeof day === "string" &&
    (day === "" || /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(day))
  );
}

/**
 * 서버 RPC(`merge_learning_progress_v1`, supabase/migrations/20261020120000…sql)가 요구하는 조건을 TS로 적은 검사입니다.
 * 버전 · 16384 바이트 상한 · 스텝 수(0 이상 안전 정수) · 목록 넷(비지 않은 문자열) · 비주얼 노벨(status와 beatIndex 짝) ·
 * 선택 필드 catalogProgress · tickets를 같은 규칙으로 봅니다.
 */
export function serverAcceptsSnapshot(snapshot: unknown): boolean {
  if (!isPlainObject(snapshot)) return false;
  if (
    snapshot["version"] !== 1 ||
    new TextEncoder().encode(JSON.stringify(snapshot)).length > 16384
  ) {
    return false;
  }
  return (
    isSafeCount(snapshot["completedStepCount"]) &&
    LIST_FIELDS.every((field) => isIdList(snapshot[field])) &&
    visualNovelOk(snapshot["visualNovel"]) &&
    (!("catalogProgress" in snapshot) || catalogProgressOk(snapshot["catalogProgress"])) &&
    (!("tickets" in snapshot) || ticketsOk(snapshot["tickets"]))
  );
}
