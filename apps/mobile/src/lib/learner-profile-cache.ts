// 학습자 프로필의 기기 캐시입니다 — 사용자별 한 칸과 로그인 전 손님 한 칸. 읽기 · 쓰기는 저장소 예외를
// 삼킵니다(읽기 실패 = 없음).

import { learnerProfileRecordFrom } from "./learner-profile";
import type { LearnerProfileCacheEntry, LearnerProfileRecord } from "./learner-profile.contract";
import { getItem, removeItem, setItem } from "./storage";

export const guestLearnerProfileKey = "libitum.learner-profile.guest";

export function learnerProfileCacheKey(userId: string): string {
  return `libitum.learner-profile.${userId}`;
}

const CACHE_VERSION = 1;

function fieldsOf(raw: unknown): { record: LearnerProfileRecord | null; sync: unknown } {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { record: null, sync: undefined };
  }
  const cell = raw as { v?: unknown; sync?: unknown };
  return {
    record: cell.v === CACHE_VERSION ? learnerProfileRecordFrom(raw) : null,
    sync: cell.sync,
  };
}

/** 순수 디코드입니다 — 버전 · 모양 · 규칙을 어기면 `null`. */
export function learnerProfileCacheEntryFrom(raw: unknown): LearnerProfileCacheEntry | null {
  const { record, sync } = fieldsOf(raw);
  return record !== null && (sync === "pending" || sync === "synced") ? { record, sync } : null;
}

function parsedItem(key: string): unknown {
  try {
    return JSON.parse(getItem(key) ?? "null") as unknown;
  } catch {
    return null;
  }
}

function writeItem(key: string, value: unknown): void {
  try {
    setItem(key, JSON.stringify(value));
  } catch {
    // 기기 저장소가 거절해도 화면을 막지 않습니다 — 다음 저장이 다시 씁니다.
  }
}

function removeQuietly(key: string): void {
  try {
    removeItem(key);
  } catch {
    // 지우기 실패는 없는 것과 같게 둡니다.
  }
}

export function readLearnerProfileCache(userId: string): LearnerProfileCacheEntry | null {
  "background only";
  return learnerProfileCacheEntryFrom(parsedItem(learnerProfileCacheKey(userId)));
}

export function writeLearnerProfileCache(userId: string, entry: LearnerProfileCacheEntry): void {
  "background only";
  writeItem(learnerProfileCacheKey(userId), {
    v: CACHE_VERSION,
    name: entry.record.name,
    countryCode: entry.record.countryCode,
    sync: entry.sync,
  });
}

export function clearLearnerProfileCache(userId: string): void {
  "background only";
  removeQuietly(learnerProfileCacheKey(userId));
}

export function readGuestLearnerProfile(): LearnerProfileRecord | null {
  "background only";
  return fieldsOf(parsedItem(guestLearnerProfileKey)).record;
}

export function writeGuestLearnerProfile(record: LearnerProfileRecord): void {
  "background only";
  writeItem(guestLearnerProfileKey, {
    v: CACHE_VERSION,
    name: record.name,
    countryCode: record.countryCode,
  });
}

export function clearGuestLearnerProfile(): void {
  "background only";
  removeQuietly(guestLearnerProfileKey);
}
