import { describe, expect, test } from "vitest";

import type {
  LearnerProfileCacheEntry,
  LearnerProfileRecord,
} from "../lib/learner-profile.contract";
import {
  learnerProfileCacheAfterDownload,
  learnerProfileCacheAfterSignIn,
  learnerProfileRetryDelaysMs,
  learnerProfileSyncStepOf,
} from "./learner-profile-sync";

// `unit` 계층: 동기화의 순수 걸음 셋과 재시도 표만 봅니다 — 타이머 · 저장소 · 네트워크가 얽힌 객체는
// integration 계층이 봅니다.

const emma: LearnerProfileRecord = { name: "Emma", countryCode: "DE" };
const liam: LearnerProfileRecord = { name: "Liam", countryCode: "FR" };
const pending = (record: LearnerProfileRecord): LearnerProfileCacheEntry => ({
  record,
  sync: "pending",
});
const synced = (record: LearnerProfileRecord): LearnerProfileCacheEntry => ({
  record,
  sync: "synced",
});

describe("learnerProfileSyncStepOf", () => {
  test("PS-1. 캐시가 없거나 확인된 값이면 내려받는다", () => {
    expect(learnerProfileSyncStepOf(null)).toEqual({ kind: "download" });
    expect(learnerProfileSyncStepOf(synced(emma))).toEqual({ kind: "download" });
  });

  test("PS-1. 미전송 값이 있으면 그 값을 올린다", () => {
    expect(learnerProfileSyncStepOf(pending(emma))).toEqual({ kind: "upload", record: emma });
  });
});

describe("learnerProfileCacheAfterDownload", () => {
  test("PS-2. 캐시도 서버도 없으면 캐시는 없다", () => {
    expect(learnerProfileCacheAfterDownload(null, null)).toBeNull();
  });

  test("PS-2. 서버 값이 있으면 확인된 값으로 캐시를 덮는다", () => {
    expect(learnerProfileCacheAfterDownload(null, emma)).toEqual(synced(emma));
    expect(learnerProfileCacheAfterDownload(synced(emma), liam)).toEqual(synced(liam));
  });

  test("PS-2. 값이 같고 이미 확인된 캐시면 캐시 참조를 그대로 돌려준다", () => {
    const cache = synced(emma);

    expect(learnerProfileCacheAfterDownload(cache, { ...emma })).toBe(cache);
  });

  test("PS-2. 서버에 행이 없는데 확인된 값이 있으면 다시 올릴 값으로 되돌린다", () => {
    expect(learnerProfileCacheAfterDownload(synced(emma), null)).toEqual(pending(emma));
  });

  test("PS-2. 미전송 값은 서버 값에 덮이지 않는다", () => {
    const cache = pending(emma);

    expect(learnerProfileCacheAfterDownload(cache, liam)).toEqual(cache);
    expect(learnerProfileCacheAfterDownload(cache, null)).toEqual(cache);
  });
});

describe("learnerProfileCacheAfterSignIn", () => {
  test("PS-3. 손님 값이 없으면 캐시 그대로다", () => {
    const cache = synced(emma);

    expect(learnerProfileCacheAfterSignIn(cache, null)).toBe(cache);
    expect(learnerProfileCacheAfterSignIn(null, null)).toBeNull();
  });

  test("PS-3. 손님 값이 있으면 어떤 캐시든 그 값이 미전송으로 이긴다", () => {
    expect(learnerProfileCacheAfterSignIn(null, liam)).toEqual(pending(liam));
    expect(learnerProfileCacheAfterSignIn(synced(emma), liam)).toEqual(pending(liam));
    expect(learnerProfileCacheAfterSignIn(pending(emma), liam)).toEqual(pending(liam));
  });
});

describe("learnerProfileRetryDelaysMs", () => {
  test("PS-4. 1 · 5 · 15 · 30 · 60초 다섯 번이다", () => {
    expect(learnerProfileRetryDelaysMs).toEqual([1000, 5000, 15000, 30000, 60000]);
  });
});
