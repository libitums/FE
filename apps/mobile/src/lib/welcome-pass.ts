// 첫날 무제한 티켓 — 회원만(ADR-0186 개정 1). 계정을 만든 때부터 24시간 동안 레슨이 티켓을 쓰지 않습니다. 기준은 세션이 지닌
// 계정 생성 시각(인증 응답 `user.created_at`)이라 앱을 지웠다 깔고 로그인해도 같고, 비회원 · 로그아웃은 받지 않습니다.
// 기기 저장소에 따로 적지 않습니다. 활성 구독이 있으면(요금제 종류 무관) 없습니다(개정 2). 순수 함수만 있습니다.

import type { AuthSession } from "./auth-session.contract";
import type { SubscriptionState } from "./plan-access";
import type { UnlimitedPass } from "./unlimited-pass";

export const WELCOME_PASS_MS = 24 * 3_600_000;

/** 세션 → 첫날 이용권의 시작 시각(계정 생성 시각). 비회원(세션 없음)이거나 생성 시각을 모르면 null. 순수. */
export function welcomePassStartOf(session: AuthSession | null): number | null {
  return session?.accountCreatedAt ?? null;
}

/**
 * 머리 칩 · 무제한 모달이 그릴 첫날 이용권 — 없거나 끝났으면 undefined. 시계를 되돌려 시작 전이 되어도 끝 시각은 그대로입니다.
 * 구독 중이거나 구독 상태를 아직 모르면 그리지 않습니다(개정 2 — 구독자에게 뜨지 않고, 첫날 칩이 잠깐 섰다 바뀌지 않게). 순수.
 */
export function welcomePassOf(
  startedAtMs: number | null,
  nowMs: number,
  subscription: SubscriptionState,
): UnlimitedPass | undefined {
  if (startedAtMs === null || subscription !== "none") return undefined;
  const endsAtMs = startedAtMs + WELCOME_PASS_MS;
  return endsAtMs > nowMs ? { kind: "timed", startedAtMs, endsAtMs } : undefined;
}

/**
 * 티켓 판정(`ticketsUnlimited`)이 읽는 첫날 끝 시각 — 없으면 0. 구독 중이면 0(첫날 무제한 없음). 구독 상태를 모르는 동안은 그대로
 * 둡니다 — 판정이 늦어도 티켓을 쓰지 않는 쪽이 사용자에게 손해가 없습니다. 구독이 끝나면(none) 24시간 안에서 다시 적용됩니다. 순수.
 */
export function welcomeTicketUntilMs(
  startedAtMs: number | null,
  subscription: SubscriptionState,
): number {
  return startedAtMs === null || subscription === "active" ? 0 : startedAtMs + WELCOME_PASS_MS;
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
