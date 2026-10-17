// 로그인 직후 서버의 학습 기록 · 프로필을 동시에 조회해 다음 자리를 정합니다.
// 판정 규칙은 `returning-learner.ts`가 갖고, 이 모듈은 조회 · 시간 경주만 맡습니다.

import { loadLearnerProfile } from "../lib/learner-profile-api";
import { loadLearningProgress } from "../lib/progress-api";
import {
  entryRouteOnTimeoutOf,
  pendingLearnerRecordSignals,
  profileSignalOf,
  progressSignalOf,
  returningLearnerWaitMs,
  settledEntryRouteOf,
} from "./returning-learner";
import type {
  EntryRouteAfterLogin,
  LearnerProfileLoadResult,
  LearnerRecordSignals,
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

// loader는 호출한 틱에 시작합니다. 동기 throw · reject는 `null`(unknown)로 받습니다.
function settle<T>(load: () => Promise<T>): Promise<T | null> {
  try {
    return load().catch(() => null);
  } catch {
    return Promise.resolve(null);
  }
}

/** 로그인(세션 저장) 직후 부릅니다. reject하지 않습니다. */
export function probeEntryRouteAfterLogin(
  deps: ReturningLearnerProbeDeps = productReturningLearnerProbeDeps,
): Promise<EntryRouteAfterLogin> {
  return new Promise<EntryRouteAfterLogin>((resolve) => {
    let signals: LearnerRecordSignals = pendingLearnerRecordSignals;
    let decided = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const decide = (route: EntryRouteAfterLogin): void => {
      if (decided) return;
      decided = true;
      if (timer !== undefined) clearTimeout(timer);
      resolve(route);
    };
    const update = (next: LearnerRecordSignals): void => {
      if (decided) return;
      signals = next;
      const route = settledEntryRouteOf(next);
      if (route !== null) decide(route);
    };

    timer = setTimeout(() => decide(entryRouteOnTimeoutOf(signals)), deps.waitMs);
    void settle(deps.loadProgress).then((loaded) => {
      update({ ...signals, progress: loaded === null ? "unknown" : progressSignalOf(loaded) });
    });
    void settle(deps.loadProfile).then((loaded) => {
      update({ ...signals, profile: loaded === null ? "unknown" : profileSignalOf(loaded) });
    });
  });
}
