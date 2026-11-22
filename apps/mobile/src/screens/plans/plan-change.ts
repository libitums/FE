// 지금 요금제와 바꿈의 순수 규칙(ADR-0160 · ADR-0144) — 구독 중 Plans의 「지금」 카드 · CTA 문구 · plan_selected의 kind ·
// 구독 성공 알림이 여기서 갈립니다. 등급은 스토어 구독 그룹의 수준과 같게 둡니다 — Premium이 위, Unlimited Tickets와 Chat Plus는
// 서로를 품지 않아 같은 수준(바꿈 = crossgrade)입니다. `Intl` 없이 날짜를 셉니다(Android PrimJS, ADR-0149 대가 · LR1).

import type { PlanEntitlements, PlanId, PlansCatalog } from "../../lib/plans-api";
import type { PlanPeriod } from "./plans-model";

export type CurrentPlan = {
  readonly id: PlanId;
  readonly period: PlanPeriod;
  readonly productId: string;
  readonly expiresAt: string | null;
  readonly willRenew: boolean;
};

export type PlanChange = "new" | "upgrade" | "downgrade" | "crossgrade" | "period" | "same";
export type PlanChangeKind = "new" | "upgrade" | "downgrade" | "crossgrade";

/** 스토어 구독 그룹의 수준 — 숫자가 클수록 위. Android 호스트 `PurchasesPlanChange.level`이 같은 표를 듭니다(함께 고침). */
const levels: Readonly<Record<PlanId, number>> = { premium: 2, chat_plus: 1, unlimited_tickets: 1 };
/** 같은 수준이면 이 순서가 먼저입니다(지금 요금제 · 새로 켜진 요금제). */
const order: readonly PlanId[] = ["premium", "chat_plus", "unlimited_tickets"];

export function periodOfProduct(productId: string): PlanPeriod {
  return productId.includes(".yearly.") ? "yearly" : "monthly";
}

/** 권한 줄 중 등급 높은 요금제 — 칩 · 「지금」 카드 · 바꿈의 기준입니다. 순수. */
export function currentPlanOf(entitlements: PlanEntitlements | null): CurrentPlan | null {
  const rows = entitlements?.entitlements ?? [];
  const row = order
    .map((id) => rows.find((item) => item.id === id))
    .find((item) => item !== undefined);
  if (row === undefined) return null;
  return {
    id: row.id,
    period: periodOfProduct(row.productId),
    productId: row.productId,
    expiresAt: row.expiresAt,
    willRenew: row.willRenew,
  };
}

export function planChangeOf(
  current: CurrentPlan | null,
  to: PlanId,
  period: PlanPeriod,
): PlanChange {
  if (current === null) return "new";
  if (current.id === to) return current.period === period ? "same" : "period";
  const from = levels[current.id];
  const next = levels[to];
  if (next > from) return "upgrade";
  return next < from ? "downgrade" : "crossgrade";
}

/** plan_selected의 kind — 기간만 바꿈은 스토어에서 같은 수준의 바꿈이라 crossgrade로 묶습니다. */
export function planChangeKind(change: PlanChange): PlanChangeKind {
  return change === "period" || change === "same" ? "crossgrade" : change;
}

/** 기기 시각의 달(0~11) · 날 — 「renews Dec 18」의 재료. 문구가 달 이름을 고릅니다. */
export function dateParts(
  iso: string | null,
): { readonly month: number; readonly day: number } | null {
  if (iso === null) return null;
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return null;
  const date = new Date(ms);
  return { month: date.getMonth(), day: date.getDate() };
}

/** 구매 뒤 다시 읽은 권한에 새로 생긴 요금제 — 구독 성공 알림의 대상입니다. */
export function newlyActivePlan(
  before: PlanEntitlements | null,
  after: PlanEntitlements | null,
): PlanId | null {
  const had = (before?.entitlements ?? []).map((row) => row.id);
  const now = (after?.entitlements ?? []).map((row) => row.id);
  return order.find((id) => now.includes(id) && !had.includes(id)) ?? null;
}

/** 다음 갱신 때로 미뤄진 바꿈 — 지금 요금제(`from`)가 `at`(그 권한의 만료)에 `to` · `period`로 바뀝니다. */
export type ScheduledChange = {
  readonly from: PlanId;
  readonly to: PlanId;
  readonly period: PlanPeriod;
  readonly at: string | null;
};

/** Play 상품 id의 기본요금제 꼬리(`:monthly`)를 뗍니다. */
const baseProduct = (productId: string): string => {
  const colon = productId.indexOf(":");
  return colon < 0 ? productId : productId.slice(0, colon);
};

/**
 * 지금 요금제 줄의 `pendingProductId`로 미뤄진 바꿈을 읽습니다 — 요금제는 권한 줄(다음 요금제 줄이 먼저 생김)에서, 없으면 요금표 상품에서
 * 찾습니다. 올림은 곧바로 바뀌어 지금 요금제가 이미 새 것이라 걸리지 않습니다. 순수.
 */
export function scheduledChangeOf(
  entitlements: PlanEntitlements | null,
  catalog: PlansCatalog | null = null,
): ScheduledChange | null {
  const current = currentPlanOf(entitlements);
  const rows = entitlements?.entitlements ?? [];
  const pending = rows.find((item) => item.id === current?.id)?.pendingProductId;
  if (current === null || pending === undefined || pending === current.productId) return null;
  const base = baseProduct(pending);
  const to =
    rows.find((item) => item.id !== current.id && baseProduct(item.productId) === base)?.id ??
    catalog?.plans.find((plan) => plan.products.monthly === base || plan.products.yearly === base)
      ?.id;
  // 위 등급으로의 pending은 곧바로 바뀌는 올림의 흔적이라 미뤄진 바꿈이 아닙니다(2026-11-19 07:53 기기 확인).
  if (to === undefined || levels[to] > levels[current.id]) return null;
  const period = periodOfProduct(pending);
  if (to === current.id && period === current.period) return null;
  return { from: current.id, to, period, at: current.expiresAt };
}

/** 구독 성공 알림의 대상 — 새로 생긴 요금제와, 그것이 다음 갱신으로 미뤄졌으면 그 바꿈(새로 생긴 미뤄진 바꿈만 있어도). */
export type PlanActivation = { readonly plan: PlanId; readonly scheduled: ScheduledChange | null };

export function planActivationOf(
  before: PlanEntitlements | null,
  after: PlanEntitlements | null,
): PlanActivation | null {
  const scheduled = scheduledChangeOf(after);
  const plan = newlyActivePlan(before, after);
  if (plan !== null) return { plan, scheduled: scheduled?.to === plan ? scheduled : null };
  // 다음 요금제 줄이 이미 활성이었으면(올림 뒤 내림) 새 줄 없이 지금 줄에 pending만 생깁니다 — 그 바꿈이 새로 생겼으면 알립니다.
  const had = scheduledChangeOf(before);
  if (scheduled === null || (had?.to === scheduled.to && had.period === scheduled.period))
    return null;
  return { plan: scheduled.to, scheduled };
}
