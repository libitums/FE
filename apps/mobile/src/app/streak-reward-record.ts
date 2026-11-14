// 연속 학습 보상(ADR-0143)을 받았다는 기기 기록입니다 — 받은 뒤 같은 날 모달을 다시 열면 Collect 대신 Continue가 서게 합니다.
// 지급의 정본은 서버 원장(한 번만)이고, 이 기록은 화면을 고르는 데만 씁니다. 계정마다 따로 둡니다.

import type { LocalDay } from "../lib/learning-progress.contract";
import { getItem, isStorageAvailable, setItem } from "../lib/storage";
import { progressUserId } from "./pending-learning-progress";

export const streakRewardStorageKey = (userId: string): string => `libitum.streak-reward.${userId}`;

/** 마지막으로 받은 이정표(연속 일수)와 그날. */
export type StreakRewardRecord = { readonly days: number; readonly day: LocalDay };

const dayPattern = /^(\d{4})-(\d{2})-(\d{2})$/;

/** `YYYY-MM-DD`를 UTC 자정의 날 번호로 — 기기 시간대와 상관없이 날 차이만 셉니다. */
function dayNumber(day: LocalDay): number | null {
  const match = dayPattern.exec(day);
  if (match === null) return null;
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) / 86_400_000;
}

export function streakRewardRecordFrom(raw: string | null): StreakRewardRecord | null {
  if (raw === null || raw.trim() === "") return null;
  try {
    const value = JSON.parse(raw) as Record<string, unknown> | null;
    const days = value?.days;
    const day = value?.day;
    return typeof days === "number" &&
      Number.isInteger(days) &&
      days > 0 &&
      typeof day === "string" &&
      dayNumber(day) !== null
      ? { days, day }
      : null;
  } catch {
    return null;
  }
}

/**
 * 지금 보이는 연속 `days`의 이정표를 이미 받았나 — 같은 일수이고 받은 날로부터 0 ~ 1일. 오늘 아직 학습하지 않았으면 어제의 연속이
 * 그대로 보이므로 다음 날까지 같은 연속입니다. 끊겼다가 같은 일수에 다시 닿으려면 3일 넘게 걸려 겹치지 않습니다.
 */
export function streakRewardCollected(
  record: StreakRewardRecord | null,
  days: number,
  today: LocalDay,
): boolean {
  if (record === null || record.days !== days) return false;
  const from = dayNumber(record.day);
  const to = dayNumber(today);
  if (from === null || to === null) return false;
  const gap = to - from;
  return gap >= 0 && gap <= 1;
}

export type StreakRewardStore = {
  readonly read: () => StreakRewardRecord | null;
  readonly write: (record: StreakRewardRecord) => void;
};

/** 지금 로그인한 계정의 기록 — background(효과 · 핸들러)에서만 부릅니다. 실패는 조용히(다음에 Collect가 다시 보일 뿐). */
export const deviceStreakRewardStore: StreakRewardStore = {
  read: () => {
    "background only";
    try {
      const userId = progressUserId();
      return userId !== null && isStorageAvailable()
        ? streakRewardRecordFrom(getItem(streakRewardStorageKey(userId)))
        : null;
    } catch {
      return null;
    }
  },
  write: (record) => {
    "background only";
    try {
      const userId = progressUserId();
      if (userId !== null) setItem(streakRewardStorageKey(userId), JSON.stringify(record));
    } catch {
      // 저장 실패가 화면을 막지 않습니다 — 서버는 두 번 주지 않습니다.
    }
  },
};
