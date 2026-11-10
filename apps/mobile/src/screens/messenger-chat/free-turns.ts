// 하루 무료 수 · T1~T4 계획 · 보내기 관문입니다(messenger-chat-1-5 spec §4.1). 순수 — 시계는 인자로 받습니다.

export const FREE_TURNS_PER_DAY = 3;
/** "YYYY-MM-DD", 기기 지역 날짜. */
export type DayKey = string;
export type ResetClock = { readonly hours: number; readonly minutes: number };
export type OutPanelMark = "due" | "shown";
export type TurnRecord = {
  readonly day: DayKey;
  readonly used: number;
  readonly outPanel: OutPanelMark;
};
export type TurnUsage = {
  readonly day: DayKey;
  readonly used: number;
  readonly remaining: number;
  readonly outPanel: OutPanelMark;
};
export type ChatTier = "free" | "unlimited";
export type TurnPlan =
  | { readonly kind: "unlimited" }
  | { readonly kind: "free"; readonly remaining: number; readonly total: number }
  | { readonly kind: "last-free"; readonly total: number; readonly price: number }
  | { readonly kind: "coin"; readonly price: number; readonly outPanel: OutPanelMark };
export type SendGate =
  | { readonly kind: "open" }
  | { readonly kind: "free" }
  | { readonly kind: "pay"; readonly price: number }
  | { readonly kind: "top-up"; readonly price: number; readonly shortBy: number };

const pad2 = (n: number): string => String(n).padStart(2, "0");
const MINUTE_MS = 60_000;
const DAY_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function dayKeyOf(nowMs: number): DayKey {
  const date = new Date(nowMs);
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/** 다음 지역 자정까지 ms(≥ 1, DST 안전). */
export function msUntilNextDay(nowMs: number): number {
  const date = new Date(nowMs);
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1).getTime();
  return Math.max(1, next - nowMs);
}

/** 분 올림. 음수 · NaN → 0h 0m. */
export function resetClockOf(ms: number): ResetClock {
  if (!(ms > 0)) return { hours: 0, minutes: 0 };
  const totalMinutes = Math.ceil(ms / MINUTE_MS);
  return { hours: Math.floor(totalMinutes / 60), minutes: totalMinutes % 60 };
}

/** 모양이 하나라도 어긋나면 null(던지지 않음). */
export function parseTurnRecord(raw: unknown): TurnRecord | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;
  const { day, used, outPanel } = raw as Record<string, unknown>;
  if (typeof day !== "string" || !DAY_KEY_PATTERN.test(day)) return null;
  if (typeof used !== "number" || !Number.isInteger(used) || used < 0) return null;
  if (outPanel !== "due" && outPanel !== "shown") return null;
  return { day, used, outPanel };
}

export function turnUsageOf(
  record: TurnRecord | null,
  day: DayKey,
  perDay: number = FREE_TURNS_PER_DAY,
): TurnUsage {
  if (record === null || record.day !== day) {
    return { day, used: 0, remaining: perDay, outPanel: "due" };
  }
  return {
    day,
    used: record.used,
    remaining: Math.max(0, perDay - record.used),
    outPanel: record.outPanel,
  };
}

export function recordFreeSend(record: TurnRecord | null, day: DayKey): TurnRecord {
  if (record === null || record.day !== day) return { day, used: 1, outPanel: "due" };
  return { day, used: record.used + 1, outPanel: record.outPanel };
}

export function recordOutPanelShown(record: TurnRecord | null, day: DayKey): TurnRecord {
  if (record === null || record.day !== day) return { day, used: 0, outPanel: "shown" };
  return { day, used: record.used, outPanel: "shown" };
}

export function turnPlanFor(input: {
  readonly tier: ChatTier;
  readonly usage: TurnUsage;
  readonly price: number;
  readonly total?: number;
}): TurnPlan {
  if (input.tier === "unlimited") return { kind: "unlimited" };
  const total = input.total ?? FREE_TURNS_PER_DAY;
  const { remaining, outPanel } = input.usage;
  if (remaining <= 0) return { kind: "coin", price: input.price, outPanel };
  if (remaining === 1) return { kind: "last-free", total, price: input.price };
  return { kind: "free", remaining, total };
}

export function sendGateFor(plan: TurnPlan, balance: number): SendGate {
  switch (plan.kind) {
    case "unlimited":
      return { kind: "open" };
    case "free":
    case "last-free":
      return { kind: "free" };
    case "coin": {
      const have = Number.isFinite(balance) && balance > 0 ? balance : 0;
      return have >= plan.price
        ? { kind: "pay", price: plan.price }
        : { kind: "top-up", price: plan.price, shortBy: plan.price - have };
    }
  }
}
