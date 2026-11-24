// 첫날 무제한 티켓 — 회원만(ADR-0186 개정 1). 계정을 만든 때부터 24시간 동안 레슨이 티켓을 쓰지 않습니다. 기준은 세션이 지닌
// 계정 생성 시각(인증 응답 `user.created_at`)이라 앱을 지웠다 깔고 로그인해도 같고, 비회원 · 로그아웃은 받지 않습니다.
// 기기 저장소에 따로 적지 않습니다. 순수 함수만 있습니다.

import type { AuthSession } from "./auth-session.contract";
import type { UnlimitedPass } from "./unlimited-pass";

export const WELCOME_PASS_MS = 24 * 3_600_000;

/** 세션 → 첫날 이용권의 시작 시각(계정 생성 시각). 비회원(세션 없음)이거나 생성 시각을 모르면 null. 순수. */
export function welcomePassStartOf(session: AuthSession | null): number | null {
  return session?.accountCreatedAt ?? null;
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
