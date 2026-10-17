// 로그인 직후 서버의 학습 기록 · 프로필을 동시에 조회해 다음 자리를 정합니다.
// 판정 규칙은 `returning-learner.ts`가 갖고, 이 모듈은 조회 · 시간 경주만 맡습니다.

import { loadLearnerProfile } from "../lib/learner-profile-api";
import { loadLearningProgress } from "../lib/progress-api";
import { returningLearnerWaitMs } from "./returning-learner";
import type {
  EntryRouteAfterLogin,
  LearnerProfileLoadResult,
  LearningProgressLoadResult,
} from "./returning-learner";

export type ReturningLearnerProbeDeps = {
  readonly loadProgress: () => Promise<LearningProgressLoadResult>;
  readonly loadProfile: () => Promise<LearnerProfileLoadResult>;
  readonly waitMs: number;
};

export const productReturningLearnerProbeDeps: ReturningLearnerProbeDeps = {
  loadProgress: loadLearningProgress,
  loadProfile: loadLearnerProfile,
  waitMs: returningLearnerWaitMs,
};

/** 로그인(세션 저장) 직후 부릅니다. reject하지 않습니다. */
export function probeEntryRouteAfterLogin(
  _deps: ReturningLearnerProbeDeps = productReturningLearnerProbeDeps,
): Promise<EntryRouteAfterLogin> {
  return Promise.resolve("language-select");
}
