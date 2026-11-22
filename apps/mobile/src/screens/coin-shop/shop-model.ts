// 하나의 상점(ADR-0160)의 순수 규칙 — 탭 · 입구 · 엽전 탭 아래 요금제 한 줄 · 머리 요금제 칩.

import type { PlanId, PlansCatalog } from "../../lib/plans-api";
import type { CurrentPlan } from "../plans/plan-change";
import type { PlanPlacement } from "../plans/plans-model";

export type ShopTab = "coins" | "plans";
/** 상점을 연 대화 동작 — 메시지 전송에서 엽전이 모자라 열렸으면 `send`. */
export type ShopFrom = "send" | null;

/** 상점을 여는 요청 — 첫 탭 · 지표 자리 · Plans 탭에서 처음 고를 요금제. */
export type ShopRequest = {
  readonly tab: ShopTab;
  readonly placement: PlanPlacement;
  readonly focus: PlanId | null;
};

export type ShopPromo =
  | { readonly plan: "premium"; readonly coins: number }
  | { readonly plan: "chat_plus"; readonly perDay: number };

export type HeaderPlanChip = "plans" | PlanId;

/**
 * 엽전 탭 아래 요금제 한 줄 — 대화 전송에서 열렸으면 Chat Plus(하루 무료 메시지), 아니면 Premium(월 엽전). 이미 그 혜택을 가진 구독자에게는
 * 보이지 않습니다: Chat Plus 구독자는 Premium 올림 줄, Premium 구독자는 줄 없음. 숫자는 서버 표에서 오고, 없으면 줄도 없습니다.
 */
export function shopPromoOf(
  from: ShopFrom,
  current: CurrentPlan | null,
  catalog: PlansCatalog | null,
): ShopPromo | null {
  if (catalog === null || current?.id === "premium") return null;
  const wanted = from === "send" && current?.id !== "chat_plus" ? "chat_plus" : "premium";
  const plan = catalog.plans.find((item) => item.id === wanted);
  if (plan === undefined) return null;
  if (wanted === "chat_plus") {
    const perDay = plan.dailyFreeMessages;
    return perDay === null || perDay <= 0 ? null : { plan: "chat_plus", perDay };
  }
  return plan.monthlyCoins > 0 ? { plan: "premium", coins: plan.monthlyCoins } : null;
}

export function headerPlanChipOf(current: CurrentPlan | null): HeaderPlanChip {
  return current?.id ?? "plans";
}
