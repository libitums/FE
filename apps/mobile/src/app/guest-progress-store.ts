// 비회원 저장 객체입니다(ADR-0111) — 진행 · 학습일을 기기에만 적고 서버 요청은 0건, 재시도도 없습니다.
// 기존 미전송 칸 모듈을 `id = "guest"`로 재사용합니다.

import { loadGuestSession } from "../lib/guest-session";
import type { LocalDay } from "../lib/learning-progress.contract";
import { localDayFrom } from "../lib/progress-api";
import { guestProgressId, learningStreakOf } from "./guest-progress";
import {
  journeyProgressFrom,
  learningProgressSnapshotFrom,
  mergeJourneyProgress,
} from "./learning-progress";
import type { JourneyProgressState } from "./learning-progress";
import { readPendingLearningDays, writePendingLearningDays } from "./pending-learning-days";
import {
  progressUserId,
  readPendingProgress,
  writePendingProgress,
} from "./pending-learning-progress";
import type { ProgressLoadOutcome, ProgressLocalSnapshot } from "./progress-load.contract";

/** `createJourneyProgressSync`의 반환 모양입니다. */
export type ProgressSyncHandle = {
  readonly userId: string;
  readonly restoredLocal: ProgressLocalSnapshot;
  readonly isCurrent: () => boolean;
  readonly flush: () => Promise<void>;
  readonly capture: (next: JourneyProgressState) => void;
  readonly dispose: () => void;
};

/** `createLearningDaySync`의 반환 모양입니다. */
export type LearningDayHandle = {
  readonly flush: () => Promise<void>;
  readonly record: (day: LocalDay) => Promise<void>;
  readonly dispose: () => void;
};

const jsonFrom = (state: JourneyProgressState) =>
  JSON.stringify(learningProgressSnapshotFrom(state));

/** 세션이 서면 곧 거짓이 되어 늦은 쓰기가 사용자 진행을 덮지 않습니다. */
const guestIsCurrent = () => loadGuestSession() && progressUserId() === null;

/** 비회원의 진행을 기기에만 적는 저장 객체입니다. */
export function createGuestProgressStore(
  readLatest: () => JourneyProgressState,
  apply: (next: JourneyProgressState) => void,
  onLoadSettled: (outcome: ProgressLoadOutcome) => void,
): ProgressSyncHandle {
  "background only";
  let disposed = false;
  let settled = false;
  const pending = readPendingProgress(guestProgressId);
  if (pending !== null) {
    apply(mergeJourneyProgress(readLatest(), pending));
  }
  let lastJson = jsonFrom(readLatest());
  const isCurrent = () => !disposed && guestIsCurrent();
  return {
    userId: guestProgressId,
    restoredLocal: pending === null ? "none" : "restored",
    isCurrent,
    flush: () => {
      if (!settled && isCurrent()) {
        settled = true;
        onLoadSettled("loaded");
      }
      return Promise.resolve();
    },
    capture: (next) => {
      if (!isCurrent()) {
        return;
      }
      const json = jsonFrom(next);
      if (json === lastJson) {
        return;
      }
      lastJson = json;
      writePendingProgress(guestProgressId, next);
    },
    dispose: () => {
      disposed = true;
    },
  };
}

/** 비회원의 학습일을 기기에 적고 연속을 기기에서 세는 저장 객체입니다. */
export function createGuestLearningDayStore(
  apply: (streak: number, celebrate: boolean) => void,
): LearningDayHandle {
  "background only";
  let disposed = false;
  const isCurrent = () => !disposed && guestIsCurrent();
  const streakNow = (days: readonly LocalDay[]) => learningStreakOf(days, localDayFrom(new Date()));
  return {
    flush: () => {
      if (isCurrent()) {
        apply(streakNow(readPendingLearningDays(guestProgressId)), false);
      }
      return Promise.resolve();
    },
    record: (day) => {
      if (!isCurrent()) {
        return Promise.resolve();
      }
      const days = readPendingLearningDays(guestProgressId);
      // 같은 날의 두 번째 기록은 쓰기 · 상태 갱신 없이 끝낸다(연속 수가 바뀌지 않는다 — PR #392 리뷰).
      if (days.includes(day)) return Promise.resolve();
      const next = [...days, day].sort();
      writePendingLearningDays(guestProgressId, next);
      apply(streakNow(next), true);
      return Promise.resolve();
    },
    dispose: () => {
      disposed = true;
    },
  };
}
