// 광고 보고 티켓 이벤트의 이름 · 견본(ADR-0209 D9) — airbridge 매핑 표(`airbridge-events.test-support`)가 가져다 씁니다.
// 모두 PostHog만(Airbridge로 나가지 않음).
import type { AnalyticsEvent } from "./analytics.contract";

export const adTicketEventNames = [
  "ad_ticket_offer_shown",
  "ad_ticket_started",
  "ad_ticket_completed",
  "ad_ticket_failed",
  "ad_ticket_granted",
] as const;

export const adTicketEventExamples = [
  { name: "ad_ticket_offer_shown", arm: "test", left: "2" },
  { name: "ad_ticket_started" },
  { name: "ad_ticket_completed" },
  { name: "ad_ticket_failed", reason: "no_fill" },
  { name: "ad_ticket_granted", left: "1" },
] as const satisfies readonly AnalyticsEvent[];
