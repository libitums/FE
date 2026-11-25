// Airbridge 소재 테스트 깔때기(ADR-0063 적용 기록 2026-11-24) — 새로 Airbridge로 나가는 다섯의 견본입니다.
import type { AnalyticsEvent } from "./analytics.contract";
import { planEventExamples, purchaseIntentExample } from "./purchase-intent.test-support";

export const ticketsRanOut = { name: "tickets_ran_out" } as const satisfies AnalyticsEvent;

export const firstChatMessageSent = {
  name: "first_chat_message_sent",
  surface: "chat",
  daysSinceFirstOpen: "1",
  characterId: "duksu",
} as const satisfies AnalyticsEvent;

/** 메시지마다 나는 이벤트 — Airbridge로 보내지 않습니다(첫 채팅만). */
export const chatMessageSent = {
  name: "chat_message_sent",
  surface: "chat",
  daysSinceFirstOpen: "3",
  characterId: "duksu",
  paid: true,
  cost: "3",
  fromSuggestion: false,
} as const satisfies AnalyticsEvent;

export const plansViewedExample = planEventExamples[0];
export const planSelectedExample = planEventExamples[1];

/** 스토어 가격으로 실제 결제를 연 엽전 팩 구매 단추입니다(통화가 소문자로 와도). */
export const packCheckoutExample = {
  ...purchaseIntentExample,
  placement: "coin_shop",
  kind: "pack",
  product: "duru.coins.1200.v1",
  period: "once",
  price: "4.99",
  currency: "usd",
  country: "US",
  priceSource: "store",
  preview: false,
} as const satisfies AnalyticsEvent;
