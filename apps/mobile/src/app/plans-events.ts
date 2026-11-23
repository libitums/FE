// 요금제 이벤트의 모양(ADR-0144 · ADR-0160) — 결선(`usePlans`)이 이 값을 그대로 냅니다. 순수.
// `currentPlan` · `from` · `kind`는 서버 권한에서 고른 지금 요금제(`currentPlanOf`)로 셉니다.

import type { CompanionEventInput } from "../lib/companion-event.contract";
import type { PlanId } from "../lib/plans-api";
import { planChangeKind, planChangeOf, type CurrentPlan } from "../screens/plans/plan-change";
import type { PlanPeriod, PlanPlacement } from "../screens/plans/plans-model";
import type { ShopTab } from "../screens/coin-shop/shop-model";

/** 대화 쪽 자리(메신저 판 · 대화 전송에서 연 상점)는 chat, 나머지는 learning. */
export const planSurfaceOf = (placement: PlanPlacement): "learning" | "chat" =>
  placement === "messenger" || placement === "chat_send" ? "chat" : "learning";

export function plansViewedEvent(
  placement: PlanPlacement,
  view: "offer" | "compare",
  current: CurrentPlan | null,
): CompanionEventInput {
  return {
    name: "plans_viewed",
    surface: planSurfaceOf(placement),
    placement,
    view,
    currentPlan: current?.id ?? "free",
  };
}

export function planSelectedEvent(
  placement: PlanPlacement,
  plan: PlanId,
  period: PlanPeriod,
  current: CurrentPlan | null,
): CompanionEventInput {
  return {
    name: "plan_selected",
    surface: planSurfaceOf(placement),
    placement,
    plan,
    period,
    from: current?.id ?? "free",
    to: plan,
    kind: planChangeKind(planChangeOf(current, plan, period)),
  };
}

export function shopTabSwitchedEvent(
  from: ShopTab,
  to: ShopTab,
  surface: "learning" | "chat",
): CompanionEventInput {
  return { name: "shop_tab_switched", surface, from, to };
}
