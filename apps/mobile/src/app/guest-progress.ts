// 비회원 진행 · 학습일의 순수 함수와 이관입니다(ADR-0111). 연속 규칙은 서버 `learning_streak`(ADR-0035)와 같습니다.
// `adoptGuestRecords`만 저장소를 만지며 `"background only"` 안에서만 미전송 칸 모듈을 부릅니다.

import type { LocalDay } from "../lib/learning-progress.contract";
import { mergeJourneyProgress } from "./learning-progress";
import type { JourneyProgressState } from "./learning-progress";
import {
  clearPendingLearningDays,
  readPendingLearningDays,
  writePendingLearningDays,
} from "./pending-learning-days";
import {
  clearPendingProgress,
  readPendingProgress,
  writePendingProgress,
} from "./pending-learning-progress";

/** 비회원 칸의 사용자 ID 자리 — 기존 미전송 칸 키를 그대로 씁니다. Supabase 사용자 ID는 UUID라 충돌하지 않습니다. */
export const guestProgressId = "guest";

const dayMs = 24 * 60 * 60 * 1000;
const dayPattern = /^\d{4}-\d{2}-\d{2}$/;

/** 실제 달력에 있는 `YYYY-MM-DD`일 때만 UTC 자정의 밀리초, 아니면 `null`입니다. */
function dayStartMs(day: string): number | null {
  if (!dayPattern.test(day)) {
    return null;
  }
  const ms = Date.parse(`${day}T00:00:00Z`);
  if (!Number.isFinite(ms) || new Date(ms).toISOString().slice(0, 10) !== day) {
    return null;
  }
  return ms;
}

/** `LocalDay` 하루 전(`YYYY-MM-DD`)입니다. 달력에 없는 값이면 그대로 돌려줍니다. */
export function previousLocalDay(day: LocalDay): LocalDay {
  const ms = dayStartMs(day);
  return ms === null ? day : new Date(ms - dayMs).toISOString().slice(0, 10);
}

/**
 * 서버 `learning_streak`와 같은 규칙(ADR-0035)으로 센 연속 일수입니다 — 오늘이 있으면 오늘부터, 없고 어제가 있으면
 * 어제부터 거꾸로 이어진 날 수, 둘 다 없으면 0. 중복 · 순서 무관, 형식이 틀린 날은 무시합니다.
 */
export function learningStreakOf(days: readonly LocalDay[], today: LocalDay): number {
  const valid = new Set(days.filter((day) => dayStartMs(day) !== null));
  let cursor = valid.has(today) ? today : previousLocalDay(today);
  let streak = 0;
  while (valid.has(cursor)) {
    streak += 1;
    cursor = previousLocalDay(cursor);
  }
  return streak;
}

/** 두 미전송 진행을 합칩니다. 한쪽만 있으면 그쪽, 둘이면 `mergeJourneyProgress(user, guest)`, 둘 다 없으면 `null`입니다. */
export function mergedPendingProgress(
  user: JourneyProgressState | null,
  guest: JourneyProgressState | null,
): JourneyProgressState | null {
  if (user === null) {
    return guest;
  }
  return guest === null ? user : mergeJourneyProgress(user, guest);
}

/** 두 날짜 대기열의 합집합입니다(중복 없음 · 오름차순). */
export function mergedPendingDays(
  user: readonly LocalDay[],
  guest: readonly LocalDay[],
): readonly LocalDay[] {
  return [...new Set([...user, ...guest])].sort();
}

/**
 * 로그인 성공 직후 **세션을 저장하기 전에** 부릅니다. 비회원 칸을 그 사용자의 미전송 칸으로 옮기고 비회원 칸을
 * 지웁니다. 프로필은 `createLearnerProfileSync`가 옮깁니다(ADR-0059 D3). 던지지 않습니다.
 */
export function adoptGuestRecords(userId: string): void {
  "background only";
  try {
    const merged = mergedPendingProgress(
      readPendingProgress(userId),
      readPendingProgress(guestProgressId),
    );
    if (merged !== null) {
      writePendingProgress(userId, merged);
    }
    clearPendingProgress(guestProgressId);
    writePendingLearningDays(
      userId,
      mergedPendingDays(readPendingLearningDays(userId), readPendingLearningDays(guestProgressId)),
    );
    clearPendingLearningDays(guestProgressId);
  } catch {
    // 저장소 예외는 로그인을 막지 않습니다.
  }
}
