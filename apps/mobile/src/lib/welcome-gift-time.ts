// 가입 보상 창의 무제한 줄(ADR-0186 개정 3) — 첫날 무제한이 끝나는 시각을 기기 시간대의 「오늘 · 내일 + 시:분」으로 바꿉니다.
// PrimJS(Android)에 날짜 지역화 API가 없어 Date의 지역 시각 값(getHours · getMinutes)으로 직접 만들고, 언어별 표기는 문구 표가 정합니다.
// 순수 함수만 있습니다.

import type { UnlimitedPass } from "./unlimited-pass";

/** 끝 시각 — 기기 시간대 기준 오늘인지 내일인지와 그 시각(0~23 · 0~59). */
export type WelcomeGiftEnd = {
  readonly day: "today" | "tomorrow";
  readonly hours: number;
  readonly minutes: number;
};

const DAY_MS = 86_400_000;

/** 기기 달력의 날 번호 — 서머타임으로 하루가 23 · 25시간이어도 날짜 차이가 맞습니다. */
const dayNumber = (date: Date): number =>
  Math.round(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS);

/**
 * 첫날 이용권 → 무제한 줄이 적을 끝 시각. 시간 한정 이용권이 아니거나 끝났거나 기기 날짜로 오늘 · 내일이 아니면 null(줄 없음 —
 * 시계를 되돌린 경우). 순수.
 */
export function welcomeGiftEndOf(
  pass: UnlimitedPass | undefined,
  nowMs: number,
): WelcomeGiftEnd | null {
  if (pass?.kind !== "timed" || pass.endsAtMs <= nowMs) return null;
  const end = new Date(pass.endsAtMs);
  const days = dayNumber(end) - dayNumber(new Date(nowMs));
  if (days !== 0 && days !== 1) return null;
  return {
    day: days === 0 ? "today" : "tomorrow",
    hours: end.getHours(),
    minutes: end.getMinutes(),
  };
}

const twoDigits = (n: number): string => (n < 10 ? `0${String(n)}` : String(n));

/** 12시간 표기 부품 — 시(1~12) · 두 자리 분 · 오후인가(12 ~ 23시). */
export function clock12(
  hours: number,
  minutes: number,
): { readonly hour: number; readonly minutes: string; readonly pm: boolean } {
  return { hour: hours % 12 === 0 ? 12 : hours % 12, minutes: twoDigits(minutes), pm: hours >= 12 };
}

/** 24시간 표기 — `21:41`(구분자는 언어마다 — 인도네시아어는 `.`). 시는 그대로, 분은 두 자리. */
export function clock24(hours: number, minutes: number, separator = ":"): string {
  return `${String(hours)}${separator}${twoDigits(minutes)}`;
}

/** 두 자리 시의 24시간 표기 — 인도네시아어 `pukul 09.05`. */
export function clock24Padded(hours: number, minutes: number, separator: string): string {
  return `${twoDigits(hours)}${separator}${twoDigits(minutes)}`;
}
