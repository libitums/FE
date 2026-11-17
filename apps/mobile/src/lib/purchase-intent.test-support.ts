// 구매 의향 이벤트의 견본(ADR-0144 추가 2026-11-17) — airbridge 매핑 표(`airbridge-events.test-support`)가 줄 수 한도 안에서 가져다 씁니다.
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
  preview: true,
} as const satisfies AnalyticsEvent;
