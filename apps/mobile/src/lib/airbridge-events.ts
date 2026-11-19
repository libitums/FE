// 제품 이벤트 → Airbridge 이벤트 매핑 · sink 합성 — 순수 · SDK import 0. 계약: docs/adr/0063-airbridge-events.md.
import type { AnalyticsEvent, AnalyticsEventSinks } from "./analytics.contract";
import type {
  AirbridgeEvent,
  AirbridgeEventFrom,
  AirbridgeEventTracker,
  WithAirbridgeEvents,
} from "./airbridge-events.contract";

function mapEvent(event: AnalyticsEvent): AirbridgeEvent | null {
  switch (event.name) {
    case "entry_completed":
      return { category: "airbridge.user.signup", semanticAttributes: {} };
    case "episode_final_passed":
      return {
        category: "airbridge.achieveLevel",
        semanticAttributes: { level: event.episodeId, label: "episode_final" },
      };
    case "pack_purchased":
      return orderCompleted(event.product, event.price, event.currency, event.transactionId);
    default:
      return null;
  }
}

// 엽전 팩 결제 → Order Complete. 스토어 금액 · 통화를 모르면 보내지 않습니다(금액 없는 매출은 광고 최적화를 흐립니다).
function orderCompleted(
  product: string,
  price: string,
  currency: string,
  transactionId: string,
): AirbridgeEvent | null {
  const value = Number(price);
  if (price === "" || !Number.isFinite(value) || currency === "") return null;
  // ISO 4217은 대문자 — 스토어 · 호스트가 소문자로 줘도 맞춰 보냅니다.
  const code = currency.toUpperCase();
  return {
    category: "airbridge.ecommerce.order.completed",
    semanticAttributes: {
      value,
      currency: code,
      ...(transactionId === "" ? {} : { transactionID: transactionId }),
      products: [{ productID: product, name: product, price: value, quantity: 1, currency: code }],
    },
  };
}

export const airbridgeEventFrom: AirbridgeEventFrom = mapEvent;

// 원래 sink(PostHog)와 Airbridge 전달은 서로의 예외를 막지 않습니다 — 각각 삼킵니다.
function forwardTo<T extends AnalyticsEvent>(
  original: ((event: T) => void) | null,
  tracker: AirbridgeEventTracker,
): (event: T) => void {
  return (event) => {
    try {
      original?.(event);
    } catch {
      // PostHog 쪽 실패가 Airbridge 전달을 막지 않습니다.
    }
    try {
      const mapped: AirbridgeEvent | null = airbridgeEventFrom(event);
      if (mapped !== null) tracker(mapped);
    } catch {
      // Airbridge 쪽 실패가 화면을 막지 않습니다.
    }
  };
}

export const withAirbridgeEvents: WithAirbridgeEvents = (sinks, tracker) => {
  if (tracker === null) return sinks;
  const composed: AnalyticsEventSinks = {
    ...sinks,
    entryEventSink: forwardTo(sinks.entryEventSink, tracker),
    episodeIntroEventSink: forwardTo(sinks.episodeIntroEventSink, tracker),
  };
  return composed;
};
