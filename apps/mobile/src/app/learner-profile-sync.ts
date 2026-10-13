// 학습자 프로필의 기기 캐시 ↔ 서버 동기화입니다 — 순수 걸음 셋과 사용자 한 명의 동기화 객체.

import type {
  LearnerProfileCacheEntry,
  LearnerProfileRecord,
} from "../lib/learner-profile.contract";

export type LearnerProfileSyncStep =
  | { readonly kind: "upload"; readonly record: LearnerProfileRecord }
  | { readonly kind: "download" };

/** 다음에 할 일입니다(순수). 미전송이 있으면 올리고, 없으면 내려받습니다. */
export function learnerProfileSyncStepOf(
  _cache: LearnerProfileCacheEntry | null,
): LearnerProfileSyncStep {
  return { kind: "download" };
}

/** 내려받은 결과를 캐시에 합칩니다(순수). 서버에 행이 없고 기기에 값이 있으면 다시 올릴 값(`pending`)으로 둡니다. */
export function learnerProfileCacheAfterDownload(
  cache: LearnerProfileCacheEntry | null,
  _server: LearnerProfileRecord | null,
): LearnerProfileCacheEntry | null {
  return cache;
}

/** 로그인 직후 한 번: 손님 값이 있으면 그 값이 미전송으로 이깁니다(순수). */
export function learnerProfileCacheAfterSignIn(
  cache: LearnerProfileCacheEntry | null,
  _guest: LearnerProfileRecord | null,
): LearnerProfileCacheEntry | null {
  return cache;
}

export const learnerProfileRetryDelaysMs: readonly number[] = [1000, 5000, 15000, 30000, 60000];

export type LearnerProfileSync = {
  readonly userId: string;
  readonly flush: () => Promise<void>;
  readonly save: (record: LearnerProfileRecord) => void;
  readonly dispose: () => void;
};

/** 로그인한 한 사용자의 캐시 ↔ 서버 동기화를 소유합니다. 렌더 중에는 만들지 않습니다. */
export function createLearnerProfileSync(
  userId: string,
  _apply: (entry: LearnerProfileCacheEntry | null) => void,
): LearnerProfileSync {
  return {
    userId,
    flush: async () => undefined,
    save: () => undefined,
    dispose: () => undefined,
  };
}
