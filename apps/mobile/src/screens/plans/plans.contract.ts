// 요금제 화면 · 부품의 계약(ADR-0144). 타입 · testid만 둡니다.

import type { AppPlatform } from "../../lib/app-version";
import type { LegalDocument } from "../../lib/legal-document.contract";
import type { PlanEntitlements, PlanId, PlansCatalog } from "../../lib/plans-api";
import type { PricingRegion } from "../../lib/provisional-prices";
import type { PurchaseResult, RestoreResult, StoreOffer } from "../../lib/purchase-bridge";
import type { PlanCardView, PlanPeriod, PlanPlacement } from "./plans-model";

/** Plans 내용(설정 → Plans · 상점 Plans 탭, ADR-0160)이 받는 데이터와 동작 — 결선이 쥐고, 내용은 고름 · 기간 · 안내만 집니다. */
export type PlansData = {
  /** null = 아직 못 읽었거나 실패 — 실패 안내를 보입니다. */
  readonly catalog: PlansCatalog | null;
  /** 스토어 가격 — 다리가 꺼졌으면 null(가격 자리에 「스토어에서」). */
  readonly offers: readonly StoreOffer[] | null;
  readonly onSelect: (
    plan: PlanId,
    period: PlanPeriod,
    productId: string | null,
  ) => Promise<PurchaseResult>;
  readonly onRestore: () => Promise<RestoreResult>;
  /** 임시 추천 가격의 지역(ADR-0144 추가 2026-11-17) — 스토어 가격이 없을 때만 씁니다. 기본 US. */
  readonly region?: PricingRegion;
  /** 내 권한(서버 정본, ADR-0144 D2) — 「지금 요금제」 배지 · 구독 관리. 결제를 열 수 없으면 null. */
  readonly current?: PlanEntitlements | null;
  /** 고지의 스토어 이름(App Store · Google Play). 모르면 일반 이름. */
  readonly platform?: AppPlatform | null;
  /** 스토어 구독 관리를 엽니다 — 지금 요금제의 상품(Play가 그 구독을 고름). */
  readonly onManageSubscription?: (productId: string | null) => void;
  /** 고지의 이용약관 · 개인정보처리방침 링크. */
  readonly onOpenLegal?: (document: LegalDocument) => void;
};

/** 설정 → Plans 화면 — 밝은 판(시안 L1). */
export type PlansScreenProps = PlansData & {
  /** 맥락 입구에서 왔으면 그 요금제를 처음 고릅니다. 없으면 BEST(구독 중이면 위 등급). */
  readonly focus: PlanId | null;
  readonly onBack: () => void;
};

/** Plans 내용 — 설정(밝은 판)과 상점 Plans 탭(어두운 판)이 함께 씁니다. */
export type PlansPanelProps = PlansData & {
  readonly focus: PlanId | null;
  /** 들어온 자리 — 티켓 입구면 「Out of tickets?」 태그. */
  readonly placement: PlanPlacement;
  readonly theme: "light" | "dark";
  /** 바닥 단추 아래 여백(홈 인디케이터). */
  readonly bottomInset?: number;
  /** 구매가 끝나면(purchased) — 상점은 닫힙니다. */
  readonly onPurchased?: () => void;
};

export type PlanCardProps = {
  readonly card: PlanCardView;
  readonly period: PlanPeriod;
  readonly testId: string;
  /** 고른 카드 — 테두리 · 라디오 · 낭독 「Selected」. 맥락 카드는 고름이 없습니다(undefined). */
  readonly selected?: boolean;
  /** 지금 가진 구독(같은 기간) — 「Current plan · renews …」 글. 있으면 고를 수 없는 회색 카드입니다(ADR-0160). */
  readonly current?: string;
  /** 구독 중 다른 카드의 바꿈 태그 — 「Upgrade · starts now」 · 「Switch · starts Dec 18」. */
  readonly tag?: string;
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
  yourPlan: "plans-your-plan",
  ticketsTag: "plans-tickets-tag",
  tag: (id: PlanId) => `plans-card-${id}-tag`,
  monthly: "plans-period-monthly",
  yearly: "plans-period-yearly",
  continue: "plans-continue",
  restore: "plans-restore",
  notice: "plans-notice",
  terms: "plans-terms",
  termsOfUse: "plans-terms-of-use",
  privacyPolicy: "plans-privacy-policy",
  currentBadge: (id: PlanId) => `plans-card-${id}-current`,
  manage: "plans-manage",
  empty: "plans-empty",
  offer: "plan-offer",
  offerCard: (id: PlanId) => `plan-offer-card-${id}`,
  offerGo: "plan-offer-go",
  offerCompare: "plan-offer-compare",
} as const;
