// 요금제 · 구매 의향 · 상점 탭 이벤트의 견본(ADR-0144 추가 2026-11-17 · ADR-0160) — airbridge 매핑 표(`airbridge-events.test-support`)가 줄 수 한도 안에서 가져다 씁니다.
import type { AnalyticsEvent } from "./analytics.contract";

export const purchaseIntentExample = {
  name: "purchase_intent",
  surface: "learning",
  daysSinceFirstOpen: "6",
  placement: "settings",
  kind: "plan",
  product: "duru.premium.monthly.v1",
  period: "monthly",
  price: "179000",
  currency: "VND",
  country: "VN",
  priceSource: "provisional",
  preview: true,
} as const satisfies AnalyticsEvent;

/** 엽전 팩 결제 성공(ADR-0063 · ADR-0144) — 스토어 금액 · 통화 · 거래 id. Airbridge Order Complete로 나갑니다. */
export const packPurchasedExample = {
  name: "pack_purchased",
  surface: "learning",
  daysSinceFirstOpen: "6",
  product: "duru.coins.1200.v1",
  price: "4.99",
  currency: "USD",
  transactionId: "2000000812345678",
} as const satisfies AnalyticsEvent;

/** 요금제 이벤트 견본 — 보기 · 고름 · 구매 의향 · 상점 탭 전환(ADR-0160). */
export const planEventExamples = [
  {
    name: "plans_viewed",
    surface: "learning",
    daysSinceFirstOpen: "6",
    placement: "settings",
    view: "compare",
    currentPlan: "free",
  },
  {
    name: "plan_selected",
    surface: "chat",
    daysSinceFirstOpen: "6",
    placement: "messenger",
    plan: "premium",
    period: "monthly",
    from: "chat_plus",
    to: "premium",
    kind: "upgrade",
  },
  purchaseIntentExample,
  {
    name: "shop_tab_switched",
    surface: "learning",
    daysSinceFirstOpen: "6",
    from: "coins",
    to: "plans",
  },
] as const satisfies readonly AnalyticsEvent[];
