// 서버 권한(`companion_entitlements`, ADR-0144 D2 — 정본은 서버)을 앱이 판정에 쓰는 자리입니다. 티켓 비용 · 머리 칩 · 대화 등급을
// 정하는 함수가 여러 화면에 흩어져 있어 `tester-access.ts`처럼 이 모듈의 현재 값을 읽습니다. 값은 요금제 결선(`use-plans.ts`)이
// 렌더마다 맞춥니다 — 결제를 열 수 없으면(권한을 읽지 않음) 언제나 null이라 지금과 같습니다. 테스트는 끝에 null로 되돌립니다.

import type { ChatPlanTier, PlanEntitlements, PlanId } from "./plans-api";
import type { UnlimitedPass } from "./unlimited-pass";

const DAY_MS = 86_400_000;

let current: PlanEntitlements | null = null;

export function setPlanAccess(next: PlanEntitlements | null): void {
  current = next;
}

/** 구독이 레슨 티켓을 무제한으로 하는가입니다(Unlimited Tickets · Premium). */
export function planUnlimitedTickets(): boolean {
  return current?.unlimitedTickets === true;
}

/** 대화 등급 — 권한이 없으면 free. */
export function planChatTier(): ChatPlanTier {
  return current?.tier ?? "free";
}

/**
 * 구독이 이야기 인물을 모두 여는가입니다 — 대화 요금제(Chat Plus · Premium)의 「모든 인물」(`companion.plans.all_characters`).
 * 서버 권한은 요금제별 혜택을 싣지 않아 대화 등급으로 읽습니다(두 대화 요금제 모두 켜져 있음, 사용자 결정 2026-11-22).
 */
export function planAllCharacters(): boolean {
  return planChatTier() !== "free";
}

/** 지금 가진 요금제(권한 줄마다 요금제 id · 상품). 순수. */
export function currentPlanIds(
  entitlements: PlanEntitlements | null,
): readonly { readonly id: PlanId; readonly productId: string }[] {
  return (entitlements?.entitlements ?? []).map((row) => ({
    id: row.id,
    productId: row.productId,
  }));
}

/**
 * 머리 티켓 칩의 무제한 모달이 그릴 구독 판입니다(ADR-0115). 티켓을 무제한으로 하는 권한(Premium 먼저) 중 만료가 있는 줄로
 * 만듭니다. 서버는 시작 시각을 주지 않아 기간(연간 상품이면 365일, 아니면 30일)만큼 앞으로 셉니다 — 모달의 「since」 날짜뿐입니다. 순수.
 */
export function subscriptionUnlimitedPass(
  entitlements: PlanEntitlements | null,
  labelOf: (plan: PlanId) => string,
): UnlimitedPass | undefined {
  if (entitlements === null || !entitlements.unlimitedTickets) return undefined;
  const ticketPlans: readonly PlanId[] = ["premium", "unlimited_tickets"];
  const row = ticketPlans
    .map((id) => entitlements.entitlements.find((item) => item.id === id))
    .find((item) => item !== undefined && item.expiresAt !== null);
  const endsAtMs = row?.expiresAt === null || row === undefined ? NaN : Date.parse(row.expiresAt);
  if (row === undefined || !Number.isFinite(endsAtMs)) return undefined;
  const days = row.productId.includes(".yearly.") ? 365 : 30;
  return {
    kind: "subscription",
    startedAtMs: endsAtMs - days * DAY_MS,
    endsAtMs,
    autoRenews: row.willRenew,
    planLabel: labelOf(row.id),
    productId: row.productId,
  };
}

/** 만료 경계 뒤 여유 — 서버가 `now()`로 권한을 거르므로 경계를 조금 넘겨 읽습니다(기기 · 서버 시각 차). */
export const BOUNDARY_MARGIN_MS = 2000;
/** setTimeout의 가장 긴 지연(2^31 - 1) — 넘기면 곧바로 불립니다. */
export const MAX_TIMER_MS = 2_147_483_647;

/** 가장 가까운 만료(지금 뒤) + 여유까지의 지연 — 다시 읽을 때. 만료가 없으면 null. 순수. */
export function entitlementsRefreshDelay(
  entitlements: PlanEntitlements | null,
  nowMs: number,
): number | null {
  let soonest: number | null = null;
  for (const row of entitlements?.entitlements ?? []) {
    const at = row.expiresAt === null ? NaN : Date.parse(row.expiresAt);
    if (Number.isFinite(at) && at > nowMs && (soonest === null || at < soonest)) soonest = at;
  }
  return soonest === null ? null : Math.min(soonest - nowMs + BOUNDARY_MARGIN_MS, MAX_TIMER_MS);
}
