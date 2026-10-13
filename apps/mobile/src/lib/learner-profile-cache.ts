// 학습자 프로필의 기기 캐시입니다 — 사용자별 한 칸과 로그인 전 손님 한 칸. 읽기 · 쓰기는 저장소 예외를
// 삼킵니다(읽기 실패 = 없음).

import type { LearnerProfileCacheEntry, LearnerProfileRecord } from "./learner-profile.contract";

export const guestLearnerProfileKey = "libitum.learner-profile.guest";

export function learnerProfileCacheKey(userId: string): string {
  return `libitum.learner-profile.${userId}`;
}

/** 순수 디코드입니다 — 버전 · 모양 · 규칙을 어기면 `null`. */
export function learnerProfileCacheEntryFrom(_raw: unknown): LearnerProfileCacheEntry | null {
  return null;
}

export function readLearnerProfileCache(_userId: string): LearnerProfileCacheEntry | null {
  "background only";
  return null;
}

export function writeLearnerProfileCache(_userId: string, _entry: LearnerProfileCacheEntry): void {
  "background only";
}

export function clearLearnerProfileCache(_userId: string): void {
  "background only";
}

export function readGuestLearnerProfile(): LearnerProfileRecord | null {
  "background only";
  return null;
}

export function writeGuestLearnerProfile(_record: LearnerProfileRecord): void {
  "background only";
}

export function clearGuestLearnerProfile(): void {
  "background only";
}
