// 요금제 카드의 순수 모델(ADR-0144) — 어느 자리에 어떤 요금제를 보이고 카드에 무엇을 적는지. 숫자는 서버 표(`companion_plans`)에서 옵니다.
// 자리 규칙: 설정은 전부, 티켓 다 씀은 학습 전용(티켓 무제한이고 대화에 손대지 않음), 메신저는 대화 등급(chat_rank > 0).
// 순서는 서버 sortOrder, BEST는 서버 highlight — 둘 다 앱 업데이트 없이 바뀝니다.

import type { PlanBenefits, PlanId, PlansCatalog } from "../../lib/plans-api";
import { shownPriceFor, type PricingRegion, type ShownPrice } from "../../lib/provisional-prices";
import type { StoreOffer } from "../../lib/purchase-bridge";
import type { CurrentPlan } from "./plan-change";

/**
 * 요금제가 보이는 자리 — 설정 → Plans · 티켓 다 씀 대화상자 · 메신저 무료 다 씀 판, 그리고 상점 Plans 탭의 입구(ADR-0160):
 * 머리 요금제 칩 · 엽전 탭(줄 · 탭 전환) · 대화 전송에서 연 상점 · 티켓 모달의 Go unlimited. 카드 묶음은 앞 셋만 다르고 나머지는 설정과 같습니다.
 */
export type PlanPlacement =
  | "settings"
  | "tickets"
  | "messenger"
  | "header_chip"
  | "coin_shop"
  | "chat_send"
  | "tickets_chip";
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
  /** 가격 글 — 스토어 가격, 없으면 임시 추천 가격(ADR-0144 추가 2026-11-17), 그것도 없으면 null. */
  readonly price: string | null;
  /** 보이는 가격의 금액 · 통화 · 출처(구매 의향 이벤트 · 연간 할인 줄). 가격이 없으면 null. */
  readonly shown: ShownPrice | null;
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
      case "header_chip":
      case "coin_shop":
      case "chat_send":
      case "tickets_chip":
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
  region: PricingRegion = "US",
): readonly PlanCardView[] {
  return plansForPlacement(catalog, placement).map((plan) => {
    const productId = plan.products[period];
    // 스토어 가격이 언제나 이깁니다 — 스토어에 닿지 못했거나(SDK 키 없음) 목록에 그 상품이 없으면(승인 전) 임시 추천 가격
    // (ADR-0144 2단계 2026-11-17). 구매는 결제 플래그가 켜져야 열리므로, 표 가격이 보여도 팔리지는 않습니다.
    const shown = productId === null ? null : shownPriceFor(productId, offers, region);
    return {
      id: plan.id,
      best: plan.highlight,
      productId,
      price: shown?.text ?? null,
      shown,
      benefits: planBenefitsOf(plan),
    };
  });
}

export function initialPlanSelection(
  cards: readonly PlanCardView[],
  focus: PlanId | null,
  current: CurrentPlan | null = null,
): PlanId | null {
  const has = (id: PlanId | null) => id !== null && cards.some((card) => card.id === id);
  if (current === null) {
    if (has(focus)) return focus;
    return (cards.find((card) => card.best) ?? cards[0])?.id ?? null;
  }
  // 구독 중(ADR-0160): 지금 요금제가 아닌 focus → 위 등급 Premium → 없음(CTA는 고를 때까지 막힘).
  if (has(focus) && focus !== current.id) return focus;
  return current.id !== "premium" && has("premium") ? "premium" : null;
}

/** 이 기간의 이 카드가 지금 가진 구독인가 — 같은 요금제라도 다른 기간이면 바꿀 수 있습니다. */
export function isCurrentCard(
  id: PlanId,
  period: PlanPeriod,
  current: CurrentPlan | null,
): boolean {
  return current !== null && current.id === id && current.period === period;
}

/** 가격 글자 단계 — 긴 통화(₫ · Rp)는 한 단계 작게(15 → 13). 글은 스토어가 준 그대로이고 길이만 봅니다. */
export function priceSizeOf(price: string | null): "regular" | "compact" {
  return price !== null && price.length >= 10 ? "compact" : "regular";
}

export type PlanHeadline =
  | { readonly kind: "everything" }
  | { readonly kind: "chats"; readonly perDay: number }
  | { readonly kind: "unlimited-chat" }
  | { readonly kind: "learn" };

export type PlanDetail =
  | { readonly kind: "every-unit" }
  | { readonly kind: "all-friends" }
  | { readonly kind: "coins"; readonly coins: number };

/** 카드의 큰 제목 한 줄과 작은 세부 줄(시안 S2). */
export function planCardLinesOf(benefits: readonly PlanBenefit[]): {
  readonly headline: PlanHeadline;
  readonly details: readonly PlanDetail[];
} {
  const lessons = benefits.some((benefit) => benefit.kind === "unlimited-lessons");
  const unlimitedChat = benefits.some((benefit) => benefit.kind === "unlimited-chat");
  const free = benefits.find(
    (benefit): benefit is Extract<PlanBenefit, { kind: "free-messages" }> =>
      benefit.kind === "free-messages",
  );
  const details: PlanDetail[] = [];
  if (lessons && !unlimitedChat && free === undefined) details.push({ kind: "every-unit" });
  if (benefits.some((benefit) => benefit.kind === "all-characters"))
    details.push({ kind: "all-friends" });
  for (const benefit of benefits)
    if (benefit.kind === "monthly-coins") details.push({ kind: "coins", coins: benefit.coins });
  const headline: PlanHeadline =
    lessons && unlimitedChat
      ? { kind: "everything" }
      : free !== undefined
        ? { kind: "chats", perDay: free.perDay }
        : unlimitedChat
          ? { kind: "unlimited-chat" }
          : { kind: "learn" };
  return { headline, details };
}
