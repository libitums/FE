// 요금제 카드의 순수 모델(ADR-0144) — 어느 자리에 어떤 요금제를 보이고 카드에 무엇을 적는지. 숫자는 서버 표(`companion_plans`)에서 옵니다.
// 자리 규칙: 설정은 전부, 티켓 다 씀은 학습 전용(티켓 무제한이고 대화에 손대지 않음), 메신저는 대화 등급(chat_rank > 0).
// 순서는 서버 sortOrder, BEST는 서버 highlight — 둘 다 앱 업데이트 없이 바뀝니다.

import type { PlanBenefits, PlanId, PlansCatalog } from "../../lib/plans-api";
import type { StoreOffer } from "../../lib/purchase-bridge";

/** 요금제가 보이는 자리 — 설정 → Plans · 티켓 다 씀 대화상자 · 메신저 무료 다 씀 판. */
export type PlanPlacement = "settings" | "tickets" | "messenger";
export type PlanPeriod = "monthly" | "yearly";

export type PlanBenefit =
  | { readonly kind: "unlimited-lessons" }
  | { readonly kind: "free-messages"; readonly perDay: number }
  | { readonly kind: "unlimited-chat"; readonly fairUse: number | null }
  | { readonly kind: "monthly-coins"; readonly coins: number }
  | { readonly kind: "all-characters" };

export type PlanCardView = {
  readonly id: PlanId;
  readonly best: boolean;
  /** 이 기간의 스토어 상품 id — 없으면 이 기간에 팔지 않음. */
  readonly productId: string | null;
  /** 스토어 가격 글 — 다리가 꺼졌거나 못 읽으면 null. */
  readonly price: string | null;
  readonly benefits: readonly PlanBenefit[];
};

const byOrder = (a: PlanBenefits, b: PlanBenefits): number => a.sortOrder - b.sortOrder;

export function plansForPlacement(
  catalog: PlansCatalog,
  placement: PlanPlacement,
): readonly PlanBenefits[] {
  const fits = (plan: PlanBenefits): boolean => {
    switch (placement) {
      case "settings":
        return true;
      case "tickets":
        return plan.unlimitedTickets && plan.chatRank === null;
      case "messenger":
        return plan.chatRank !== null && plan.chatRank > 0;
    }
  };
  return catalog.plans.filter(fits).sort(byOrder);
}

export function planBenefitsOf(plan: PlanBenefits): readonly PlanBenefit[] {
  const benefits: PlanBenefit[] = [];
  if (plan.unlimitedTickets) benefits.push({ kind: "unlimited-lessons" });
  if (plan.chatRank !== null && plan.chatRank > 0) {
    benefits.push(
      plan.dailyFreeMessages === null
        ? { kind: "unlimited-chat", fairUse: plan.dailyMessageCap }
        : { kind: "free-messages", perDay: plan.dailyFreeMessages },
    );
  }
  if (plan.monthlyCoins > 0) benefits.push({ kind: "monthly-coins", coins: plan.monthlyCoins });
  // 대화 무제한이면 모든 인물은 그 안에 들어 있어 따로 적지 않습니다.
  if (plan.allCharacters && plan.dailyFreeMessages !== null)
    benefits.push({ kind: "all-characters" });
  return benefits;
}

export function planCardsFor(
  catalog: PlansCatalog,
  placement: PlanPlacement,
  period: PlanPeriod,
  offers: readonly StoreOffer[] | null,
): readonly PlanCardView[] {
  return plansForPlacement(catalog, placement).map((plan) => {
    const productId = plan.products[period];
    const offer =
      productId === null ? undefined : offers?.find((item) => item.productId === productId);
    return {
      id: plan.id,
      best: plan.highlight,
      productId,
      price: offer?.price ?? null,
      benefits: planBenefitsOf(plan),
    };
  });
}

export function initialPlanSelection(
  cards: readonly PlanCardView[],
  focus: PlanId | null,
): PlanId | null {
  if (focus !== null && cards.some((card) => card.id === focus)) return focus;
  return (cards.find((card) => card.best) ?? cards[0])?.id ?? null;
}
