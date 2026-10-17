// 로그인 직후 「이 계정에 이미 기록이 있는가」를 가르는 순수 판정입니다. 서버 응답을 신호로
// 바꾸고, 신호 둘을 다음 자리로 바꿉니다. 조회와 시간은 `returning-learner-probe.ts`가 맡습니다.

import type { loadLearnerProfile } from "../lib/learner-profile-api";
import type { loadLearningProgress } from "../lib/progress-api";
import { completedActivityCount, journeyProgressFrom } from "./learning-progress";
import type { JourneyProgressState } from "./learning-progress";

/** 기존 함수의 반환형 그대로입니다 — 모양을 다시 적지 않습니다. */
export type LearningProgressLoadResult = Awaited<ReturnType<typeof loadLearningProgress>>;
export type LearnerProfileLoadResult = Awaited<ReturnType<typeof loadLearnerProfile>>;

/** 기록 하나의 판정 상태입니다. `pending`은 아직 응답 전입니다. */
export type LearnerRecordSignal = "pending" | "present" | "absent" | "unknown";
export type SettledLearnerRecordSignal = Exclude<LearnerRecordSignal, "pending">;
export type LearnerRecordSignals = {
  readonly progress: LearnerRecordSignal;
  readonly profile: LearnerRecordSignal;
};

/** 로그인 뒤 다음 자리입니다 — 맵이면 진입 구간을 비우고, 언어 선택이면 지금 흐름입니다. */
export type EntryRouteAfterLogin = "journey-map" | "language-select";

// 판정을 기다리는 최대 시간입니다. 모션 토큰이 아닙니다. 테스트가 리터럴로 복제하지 않고
// 이 상수를 import합니다.
export const returningLearnerWaitMs = 3000;

export const pendingLearnerRecordSignals: LearnerRecordSignals = {
  progress: "pending",
  profile: "pending",
};

// VN 진행 중(`active` · `beatIndex: 1`)은 활동 수에 들지 않지만 기록으로 봅니다.
export function hasLearningRecord(state: JourneyProgressState): boolean {
  return completedActivityCount(state) > 0 || state.visualNovelProgress.beatIndex > 0;
}

export function progressSignalOf(loaded: LearningProgressLoadResult): SettledLearnerRecordSignal {
  if (!loaded.ok) return "unknown";
  if (loaded.raw === null) return "absent";
  const state = journeyProgressFrom(loaded.raw);
  if (state === null) return "unknown";
  return hasLearningRecord(state) ? "present" : "absent";
}

export function profileSignalOf(loaded: LearnerProfileLoadResult): SettledLearnerRecordSignal {
  if (!loaded.ok) return "unknown";
  return loaded.record === null ? "absent" : "present";
}

/** 아직 정할 수 없으면 `null`입니다. */
export function settledEntryRouteOf(signals: LearnerRecordSignals): EntryRouteAfterLogin | null {
  if (signals.progress === "present" || signals.profile === "present") return "journey-map";
  if (signals.progress === "pending" || signals.profile === "pending") return null;
  return "language-select";
}

/** 시간이 다 됐을 때입니다 — `pending`을 `unknown`으로 읽습니다. `null`을 내지 않습니다. */
export function entryRouteOnTimeoutOf(signals: LearnerRecordSignals): EntryRouteAfterLogin {
  return settledEntryRouteOf(signals) ?? "language-select";
}
