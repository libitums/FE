// 요금제 화면 · 부품의 계약(ADR-0144). 타입 · testid만 둡니다.

import type { PlanId, PlansCatalog } from "../../lib/plans-api";
import type { PurchaseResult, RestoreResult, StoreOffer } from "../../lib/purchase-bridge";
import type { PlanCardView, PlanPeriod } from "./plans-model";

/** 설정 → Plans 화면. 결선이 데이터 · 다리를 쥐고, 화면은 고름 · 기간 · 안내만 집니다. */
export type PlansScreenProps = {
  /** null = 아직 못 읽었거나 실패 — 실패 안내를 보입니다. */
  readonly catalog: PlansCatalog | null;
  /** 스토어 가격 — 다리가 꺼졌으면 null(가격 자리에 「스토어에서」). */
  readonly offers: readonly StoreOffer[] | null;
  /** 맥락 입구에서 왔으면 그 요금제를 처음 고릅니다. 없으면 BEST. */
  readonly focus: PlanId | null;
  readonly onSelect: (
    plan: PlanId,
    period: PlanPeriod,
    productId: string | null,
  ) => Promise<PurchaseResult>;
  readonly onRestore: () => Promise<RestoreResult>;
  readonly onBack: () => void;
};

export type PlanCardProps = {
  readonly card: PlanCardView;
  readonly period: PlanPeriod;
  readonly testId: string;
  /** 고른 카드 — 테두리 · 낭독 「Selected」. 맥락 카드는 고름이 없습니다(undefined). */
  readonly selected?: boolean;
  readonly onPress: () => void;
};

/** 맥락 카드 묶음(티켓 대화상자 · 메신저 판)의 결선 — 결선이 없으면 그 자리는 지금 그대로입니다. */
export type PlanOfferWiring = {
  readonly cards: readonly PlanCardView[];
  /** 카드 · 「Go unlimited」 — 1단계는 그 요금제를 강조한 Plans 화면을 엽니다. */
  readonly onSelect: (plan: PlanId) => void;
  readonly onCompare: () => void;
  /** 카드가 처음 보일 때 한 번(plans_viewed offer). */
  readonly onShown: () => void;
};

export const plansTestIds = {
  screen: "plans-screen",
  back: "plans-screen-back",
  card: (id: PlanId) => `plans-card-${id}`,
  price: (id: PlanId) => `plans-card-${id}-price`,
  monthly: "plans-period-monthly",
  yearly: "plans-period-yearly",
  continue: "plans-continue",
  restore: "plans-restore",
  notice: "plans-notice",
  empty: "plans-empty",
  offer: "plan-offer",
  offerCard: (id: PlanId) => `plan-offer-card-${id}`,
  offerGo: "plan-offer-go",
  offerCompare: "plan-offer-compare",
} as const;
