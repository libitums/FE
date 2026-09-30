import type { LocalDay } from "../lib/learning-progress.contract";
import { getItem, removeItem, setItem } from "../lib/storage";

const keyFor = (userId: string) => `libitum.learning-days.pending.${userId}`;

export function readPendingLearningDays(userId: string): LocalDay[] {
  "background only";
  try {
    const raw: unknown = JSON.parse(getItem(keyFor(userId)) ?? "[]");
    if (!Array.isArray(raw)) return [];
    return [
      ...new Set(
        raw.filter((day): day is string => {
          if (typeof day !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
          const date = new Date(`${day}T00:00:00Z`);
          return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === day;
        }),
      ),
    ].sort();
  } catch {
    return [];
  }
}

export function clearPendingLearningDays(userId: string): void {
  "background only";
  removeItem(keyFor(userId));
}

export function writePendingLearningDays(userId: string, days: readonly LocalDay[]): void {
  "background only";
  if (days.length === 0) clearPendingLearningDays(userId);
  else setItem(keyFor(userId), JSON.stringify(days));
}
