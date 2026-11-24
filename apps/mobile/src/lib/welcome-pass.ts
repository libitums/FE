// 첫날 무제한 티켓(ADR-0186) — 이 기기에서 앱을 처음 연 때부터 24시간 동안 레슨이 티켓을 쓰지 않습니다. 비회원 · 회원 모두.
// 시작 시각은 계정과 무관한 기기 범위 값이고(로그아웃 · 계정 삭제에도 지우지 않음), 진입점이 첫 실행일 기록(`first-open`)보다 먼저
// 불러 「첫 실행일 · 로그인 · 비회원 표식이 아직 없는 기기」에만 적습니다 — 이미 쓰던 기기는 받지 않습니다. 서버는 모릅니다(레슨 티켓은 기기 원장).

import { authSessionStorageKey } from "./auth-session";
import { firstOpenDayStorageKey } from "./first-open";
import { guestSessionStorageKey } from "./guest-session";
import { getItem, isStorageAvailable, setItem } from "./storage";
import type { UnlimitedPass } from "./unlimited-pass";

export const welcomePassStorageKey = "libitum.welcome-pass.started-at";
export const WELCOME_PASS_MS = 24 * 3_600_000;

/** 저장된 글 → 시작 시각. 양의 정수 ms가 아니면 null. 순수. */
export function welcomePassStartFrom(raw: string | null): number | null {
  if (raw === null || !/^\d{1,15}$/.test(raw)) return null;
  const value = Number(raw);
  return value > 0 ? value : null;
}

/**
 * 첫 실행이면 시작 시각을 적습니다 — 진입점이 `noteFirstOpen` **앞에서** 실행마다 한 번 부릅니다. 쓰던 기기(첫 실행일 · 로그인 · 비회원 표식이
 * 있음)이거나 시작 시각이 이미 있으면 아무것도 하지 않습니다. 저장소가 없으면 적지 않습니다(이용권 없음).
 */
export function noteWelcomePass(nowMs: number = Date.now()): void {
  try {
    if (!isStorageAvailable()) return;
    // 첫 실행일 기록(2026-11-14)보다 먼저 깔아 쓰던 기기는 그 기록이 없습니다 — 로그인 · 비회원 표식이 있으면 쓰던 기기로 봅니다.
    const used = [firstOpenDayStorageKey, authSessionStorageKey, guestSessionStorageKey];
    if (getItem(welcomePassStorageKey) !== null || used.some((key) => getItem(key) !== null))
      return;
    setItem(welcomePassStorageKey, String(nowMs));
  } catch {
    // 적지 못하면 이용권이 없을 뿐입니다 — 지금 규칙(3장 · 한 시간에 한 장) 그대로.
  }
}

/** 이 기기의 시작 시각 — 없으면 null. background에서만 부릅니다(저장소). */
export function welcomePassStartedAtMs(): number | null {
  try {
    return isStorageAvailable() ? welcomePassStartFrom(getItem(welcomePassStorageKey)) : null;
  } catch {
    return null;
  }
}

/** 머리 칩 · 무제한 모달이 그릴 첫날 이용권 — 없거나 끝났으면 undefined. 시계를 되돌려 시작 전이 되어도 끝 시각은 그대로입니다. 순수. */
export function welcomePassOf(
  startedAtMs: number | null,
  nowMs: number,
): UnlimitedPass | undefined {
  if (startedAtMs === null) return undefined;
  const endsAtMs = startedAtMs + WELCOME_PASS_MS;
  return endsAtMs > nowMs ? { kind: "timed", startedAtMs, endsAtMs } : undefined;
}

/** 두 시간 한정 이용권 가운데 늦게 끝나는 쪽 — 머리 칩은 하나만 그립니다. 순수. */
export function laterTimedPass(
  a: UnlimitedPass | undefined,
  b: UnlimitedPass | undefined,
): UnlimitedPass | undefined {
  if (a?.kind !== "timed") return b;
  if (b?.kind !== "timed") return a;
  return b.endsAtMs > a.endsAtMs ? b : a;
}
