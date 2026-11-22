// 무제한 티켓의 상태를 화면이 그릴 모양으로 바꿉니다(ADR-0115). 지금은 시험 계정(ADR-0085)만 결선하고, 구독은 결제가
// 붙으면 같은 모양으로 들어옵니다.

/** 무제한 상태의 출처입니다. */
export type UnlimitedPass =
  | { readonly kind: "guest" }
  | {
      readonly kind: "subscription";
      readonly startedAtMs: number;
      readonly endsAtMs: number;
      readonly autoRenews: boolean;
      /** 요금제 이름(스토어 상품 이름)입니다. 없으면 알약을 세우지 않습니다. */
      readonly planLabel?: string;
      /** 스토어 상품 id — 「Manage subscription」이 Play 구독 화면에서 이 구독을 고릅니다. */
      readonly productId?: string;
    }
  /** 보상으로 받은 시간 한정 무제한(ADR-0175) — 갱신이 없고 시간으로 끝납니다. */
  | { readonly kind: "timed"; readonly startedAtMs: number; readonly endsAtMs: number };

/** 기기 지역 시간의 달력 날짜입니다. `month`는 1~12. */
export type CalendarDate = { readonly year: number; readonly month: number; readonly day: number };

/** 갱신이 꺼진 구독이 이 날 수 이하로 남으면 「곧 끝남」입니다. */
export const UNLIMITED_ENDING_SOON_DAYS = 7;

export type UnlimitedPassView =
  | { readonly kind: "guest" }
  | {
      readonly kind: "renews";
      readonly on: CalendarDate;
      readonly since: CalendarDate;
      readonly planLabel: string | null;
    }
  | { readonly kind: "ends"; readonly on: CalendarDate; readonly planLabel: string | null }
  | {
      readonly kind: "ending-soon";
      readonly on: CalendarDate;
      readonly daysLeft: number;
      readonly totalDays: number;
      readonly remaining: number;
      readonly planLabel: string | null;
    }
  | {
      readonly kind: "timed";
      readonly on: CalendarDate;
      readonly hoursLeft: number;
      readonly totalHours: number;
      readonly remaining: number;
    };

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** 그 순간의 기기 지역 시간 달력 날짜입니다. 던지지 않습니다. */
export function calendarDateOf(ms: number): CalendarDate {
  const date = new Date(ms);
  return { year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate() };
}

/**
 * 무제한 상태를 모달의 모양으로 바꿉니다. 자동 갱신이면 `renews`, 갱신이 꺼졌으면 남은 날(올림)이
 * `UNLIMITED_ENDING_SOON_DAYS` 이하일 때 `ending-soon`, 아니면 `ends`입니다. 끝난 뒤는 0일 · 비율 0입니다.
 */
export function unlimitedPassView(pass: UnlimitedPass, nowMs: number): UnlimitedPassView {
  if (pass.kind === "guest") return { kind: "guest" };
  if (pass.kind === "timed") {
    const leftMs = Math.max(0, pass.endsAtMs - nowMs);
    const spanMs = pass.endsAtMs - pass.startedAtMs;
    return {
      kind: "timed",
      on: calendarDateOf(pass.endsAtMs),
      hoursLeft: Math.ceil(leftMs / HOUR_MS),
      totalHours: Math.max(1, Math.round(spanMs / HOUR_MS)),
      remaining: spanMs > 0 ? Math.min(1, leftMs / spanMs) : 0,
    };
  }
  const on = calendarDateOf(pass.endsAtMs);
  const planLabel = pass.planLabel ?? null;
  if (pass.autoRenews) {
    return { kind: "renews", on, since: calendarDateOf(pass.startedAtMs), planLabel };
  }
  const leftMs = Math.max(0, pass.endsAtMs - nowMs);
  const daysLeft = Math.ceil(leftMs / DAY_MS);
  if (daysLeft > UNLIMITED_ENDING_SOON_DAYS) return { kind: "ends", on, planLabel };
  const spanMs = pass.endsAtMs - pass.startedAtMs;
  const remaining = spanMs > 0 ? Math.min(1, leftMs / spanMs) : 0;
  return {
    kind: "ending-soon",
    on,
    daysLeft,
    totalDays: Math.max(1, Math.round(spanMs / DAY_MS)),
    remaining,
    planLabel,
  };
}

/** 시험 계정(ADR-0085)의 무제한 상태입니다 — 기간이 없습니다. */
export const guestUnlimitedPass: UnlimitedPass = { kind: "guest" };
