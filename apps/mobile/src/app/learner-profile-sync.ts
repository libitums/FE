// 학습자 프로필의 기기 캐시 ↔ 서버 동기화입니다 — 순수 걸음 셋과 사용자 한 명의 동기화 객체.
// 충돌 규칙: 미전송(pending) 기기 값이 서버 값을 덮고, 미전송이 없으면 서버 값이 기기 값을 덮습니다.
// 시계를 견주지 않습니다.

import { loadLearnerProfile, saveLearnerProfile } from "../lib/learner-profile-api";
import {
  clearGuestLearnerProfile,
  readGuestLearnerProfile,
  readLearnerProfileCache,
  writeLearnerProfileCache,
} from "../lib/learner-profile-cache";
import { sameLearnerProfile } from "../lib/learner-profile";
import type {
  LearnerProfileCacheEntry,
  LearnerProfileRecord,
} from "../lib/learner-profile.contract";
import { progressUserId } from "./pending-learning-progress";

export type LearnerProfileSyncStep =
  | { readonly kind: "upload"; readonly record: LearnerProfileRecord }
  | { readonly kind: "download" };

/** 다음에 할 일입니다(순수). 미전송이 있으면 올리고, 없으면 내려받습니다. */
export function learnerProfileSyncStepOf(
  cache: LearnerProfileCacheEntry | null,
): LearnerProfileSyncStep {
  return cache !== null && cache.sync === "pending"
    ? { kind: "upload", record: cache.record }
    : { kind: "download" };
}

/** 내려받은 결과를 캐시에 합칩니다(순수). 서버에 행이 없고 기기에 값이 있으면 다시 올릴 값(`pending`)으로 둡니다. */
export function learnerProfileCacheAfterDownload(
  cache: LearnerProfileCacheEntry | null,
  server: LearnerProfileRecord | null,
): LearnerProfileCacheEntry | null {
  if (cache !== null && cache.sync === "pending") {
    return cache;
  }
  if (server === null) {
    return cache === null ? null : { record: cache.record, sync: "pending" };
  }
  if (cache !== null && sameLearnerProfile(cache.record, server)) {
    return cache;
  }
  return { record: server, sync: "synced" };
}

/** 로그인 직후 한 번: 손님 값이 있으면 그 값이 미전송으로 이깁니다(순수). */
export function learnerProfileCacheAfterSignIn(
  cache: LearnerProfileCacheEntry | null,
  guest: LearnerProfileRecord | null,
): LearnerProfileCacheEntry | null {
  return guest === null ? cache : { record: guest, sync: "pending" };
}

export const learnerProfileRetryDelaysMs: readonly number[] = [1000, 5000, 15000, 30000, 60000];

export type LearnerProfileSync = {
  readonly userId: string;
  readonly flush: () => Promise<void>;
  readonly save: (record: LearnerProfileRecord) => void;
  readonly dispose: () => void;
};

type RunOutcome = "done" | "failed";

/** 로그인한 한 사용자의 캐시 ↔ 서버 동기화를 소유합니다. 렌더 중에는 만들지 않습니다. */
export function createLearnerProfileSync(
  userId: string,
  apply: (entry: LearnerProfileCacheEntry | null) => void,
): LearnerProfileSync {
  "background only";
  let disposed = false;
  let running: Promise<void> | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let retryAttempt = 0;
  const isCurrent = (): boolean => !disposed && progressUserId() === userId;

  // 손님 칸이 있으면 그 값이 미전송으로 이기고, 네트워크보다 먼저 사용자 칸에 영속화합니다.
  const guest = readGuestLearnerProfile();
  let cache = learnerProfileCacheAfterSignIn(readLearnerProfileCache(userId), guest);
  if (guest !== null && cache !== null) {
    writeLearnerProfileCache(userId, cache);
    clearGuestLearnerProfile();
  }
  apply(cache);

  function commit(next: LearnerProfileCacheEntry): void {
    cache = next;
    writeLearnerProfileCache(userId, next);
    apply(next);
  }

  async function upload(record: LearnerProfileRecord): Promise<RunOutcome | "again"> {
    const saved = await saveLearnerProfile(record);
    if (!isCurrent()) return "done";
    if (!saved) return "failed";
    retryAttempt = 0;
    // 보낸 값이 아직 캐시의 값일 때만 확인된 값으로 적습니다. 그사이 새 수정이 있으면 한 번 더 돕니다.
    if (cache !== null && cache.sync === "pending" && sameLearnerProfile(cache.record, record)) {
      commit({ record, sync: "synced" });
      return "done";
    }
    return "again";
  }

  async function download(): Promise<RunOutcome | "again"> {
    const loaded = await loadLearnerProfile();
    // 조회 실패는 그대로 끝냅니다(재시도 없음). 다음 기회는 다음 flush입니다.
    if (!isCurrent() || !loaded.ok) return "done";
    const next = learnerProfileCacheAfterDownload(cache, loaded.record);
    if (next !== cache && next !== null) commit(next);
    return cache !== null && cache.sync === "pending" ? "again" : "done";
  }

  async function run(): Promise<RunOutcome> {
    while (isCurrent()) {
      const step = learnerProfileSyncStepOf(cache);
      const outcome = step.kind === "upload" ? await upload(step.record) : await download();
      if (outcome !== "again") return outcome;
    }
    return "done";
  }

  function start(fromRetry: boolean): Promise<void> {
    if (running !== null) return running;
    if (!isCurrent()) return Promise.resolve();
    clearTimeout(retryTimer);
    if (!fromRetry) retryAttempt = 0;
    running = run()
      .catch((): RunOutcome => "failed")
      .then((outcome) => {
        running = null;
        if (!isCurrent()) return;
        // 끝난 걸음과 이 정리 사이에 들어온 수정은 한 번 더 돌려 올립니다.
        if (outcome === "done" && cache !== null && cache.sync === "pending") {
          void start(true);
          return;
        }
        const delay = learnerProfileRetryDelaysMs[retryAttempt];
        if (outcome === "failed" && delay !== undefined) {
          retryAttempt += 1;
          retryTimer = setTimeout(() => {
            void start(true);
          }, delay);
        }
      });
    return running;
  }

  return {
    userId,
    flush: () => start(false),
    save(record: LearnerProfileRecord): void {
      if (!isCurrent()) return;
      // 네트워크 요청보다 먼저 영속화합니다. 실패 · 종료 · 로그아웃 때도 남습니다.
      commit({ record, sync: "pending" });
      void start(false);
    },
    dispose(): void {
      disposed = true;
      clearTimeout(retryTimer);
    },
  };
}
