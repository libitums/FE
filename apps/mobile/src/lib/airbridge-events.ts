// 제품 이벤트 → Airbridge 이벤트 매핑 · sink 합성 — 순수 · SDK import 0. 계약: docs/adr/0063-airbridge-events.md.
import type { AnalyticsEvent, AnalyticsEventSinks } from "./analytics.contract";
import type {
  AirbridgeCheckoutProduct,
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
    // ⟨2026-11-24⟩ 소재 테스트 깔때기 — 표준이 뜻에 맞지 않는 셋은 앱 이벤트 이름 그대로 커스텀으로.
    case "tickets_ran_out":
    case "first_chat_message_sent":
      return { category: event.name, semanticAttributes: {} };
    case "plans_viewed":
      return {
        category: "airbridge.ecommerce.productList.viewed",
        semanticAttributes: { productListID: `plans_${event.view}`, label: event.placement },
      };
    case "plan_selected":
      return {
        category: "plan_selected",
        semanticAttributes: { label: event.placement, action: `${event.plan}.${event.period}` },
      };
    case "purchase_intent":
      return {
        category: "airbridge.initiateCheckout",
        semanticAttributes: {
          label: event.placement,
          action: event.kind,
          type: event.preview ? "preview" : "checkout",
          products: [checkoutProduct(event.product, event.price, event.currency)],
        },
      };
    default:
      return null;
  }
}

// 구매 단추의 상품 한 줄 — 가격은 수로 읽히고 통화가 있을 때만 싣습니다(보인 가격 · 임시 추천 가격 포함, 매출 아님).
function checkoutProduct(
  product: string,
  price: string,
  currency: string,
): AirbridgeCheckoutProduct {
  const value = Number(price);
  const row = { productID: product, name: product, quantity: 1 };
  if (price === "" || !Number.isFinite(value) || currency === "") return row;
  return { ...row, price: value, currency: currency.toUpperCase() };
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
