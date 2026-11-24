import { describe, expect, test, vi } from "vitest";

import type { AnalyticsEvent, AnalyticsEventSinks } from "./analytics.contract";
import { airbridgeEventFrom, withAirbridgeEvents } from "./airbridge-events";
import { packPurchasedExample } from "./purchase-intent.test-support";
import {
  allEventNames,
  entryCompleted,
  episodeFinalPassed,
  episodeFinalPassedU01,
  nullSinks,
  retiredSpecialUnitEvents,
  unmappedEvents,
} from "./airbridge-events.test-support";
import {
  chatMessageSent,
  firstChatMessageSent,
  packCheckoutExample,
  planSelectedExample,
  plansViewedExample,
  ticketsRanOut,
} from "./airbridge-funnel-events.test-support";
import { purchaseIntentExample } from "./purchase-intent.test-support";

const mappedNames = [
  "entry_completed",
  "episode_final_passed",
  "pack_purchased",
  "tickets_ran_out",
  "first_chat_message_sent",
  "plans_viewed",
  "plan_selected",
  "purchase_intent",
] as const;

// `unit` 계층: 제품 이벤트 → Airbridge 매핑 · sink 합성. 매핑은 가입(signup)과 에피소드 최종 통과(achieveLevel) 둘뿐.

function liveSinks(order: string[] = []) {
  const fns = {
    entry: vi.fn<() => void>(() => void order.push("sink")),
    notification: vi.fn<() => void>(),
    settings: vi.fn<() => void>(),
    episodeIntro: vi.fn<() => void>(() => void order.push("sink")),
  };
  const sinks = {
    entryEventSink: fns.entry,
    notificationEventSink: fns.notification,
    settingsEventSink: fns.settings,
    episodeIntroEventSink: fns.episodeIntro,
  } as unknown as AnalyticsEventSinks;
  return { sinks, fns };
}

describe("airbridgeEventFrom", () => {
  test("AB1. episode_final_passed는 achieveLevel { level: 에피소드 id, label: episode_final }이다", () => {
    expect(airbridgeEventFrom(episodeFinalPassed)).toStrictEqual({
      category: "airbridge.achieveLevel",
      semanticAttributes: { level: "u00-tutorial", label: "episode_final" },
    });
    expect(airbridgeEventFrom(episodeFinalPassedU01)).toStrictEqual({
      category: "airbridge.achieveLevel",
      semanticAttributes: { level: "u01-water", label: "episode_final" },
    });
  });

  test("AB2. entry_completed는 파라미터 없는 signup이다", () => {
    const mapped = airbridgeEventFrom(entryCompleted);
    expect(mapped).toEqual({ category: "airbridge.user.signup", semanticAttributes: {} });
    expect(Object.keys(mapped?.semanticAttributes ?? { x: 1 })).toHaveLength(0);
  });

  // ⟨ADR-0146 앱 연결⟩ `chat_media_completed`가 더해져 59 · 57이다.
  // ⟨ADR-0159⟩ 온보딩 이벤트 둘이 더해져 62 · 60이다. ⟨ADR-0160⟩ `shop_tab_switched`가 더해져 63 · 61이다.
  // ⟨ADR-0162⟩ 추천 친구 이벤트 셋이 더해져 66 · 64다.
  // ⟨ADR-0162 D5⟩ `early_access_completed`가 더해져 67 · 65다.
  // ⟨ADR-0063 2026-11-19⟩ 엽전 팩 결제 `pack_purchased`가 더해져 68이고, 매핑되는 것은 셋이다(표는 65 그대로).
  // ⟨ADR-0164⟩ 추천 친구 프로필 열기 `suggested_friend_opened`가 더해져 69 · 66이다(Airbridge로 나가지 않음 — PostHog만).
  // ⟨ADR-0166⟩ 비회원 로그인 권유 `chat_sign_in_prompt_closed`가 더해져 70 · 67이다.
  // ⟨ADR-0176⟩ 입장 선택 이벤트 셋이 더해져 73 · 70이다(Airbridge로 나가지 않음 — 가입 완료는 `entry_completed` 그대로).
  // ⟨ADR-0178 D8⟩ 친구 스토리 이벤트 넷이 더해져 77 · 74다(Airbridge로 나가지 않음 — PostHog만).
  // ⟨ADR-0190⟩ 방 안내 키보드 단계 `messenger_guide_keyboard`가 더해져 79 · 76이다(PostHog만).
  // ⟨ADR-0063 2026-11-24⟩ 소재 테스트 깔때기 다섯(티켓 소진 · 첫 채팅 · 요금제 보기 · 고름 · 구매 단추)이 매핑되어 표는 71, 매핑은 여덟이다.
  test("AB3. 이름 79개는 표의 71개와 매핑되는 여덟로 나뉜다", () => {
    const tableNames = new Set<string>(unmappedEvents.map((e) => e.name));
    expect(tableNames.size).toBe(71);
    expect(allEventNames).toHaveLength(79);
    expect([...tableNames, ...mappedNames].sort()).toEqual([...allEventNames].sort());
  });

  test("AB4. pack_purchased는 Order Complete { value · currency · transactionID · products[1] }이다", () => {
    expect(airbridgeEventFrom(packPurchasedExample)).toStrictEqual({
      category: "airbridge.ecommerce.order.completed",
      semanticAttributes: {
        value: 4.99,
        currency: "USD",
        transactionID: "2000000812345678",
        products: [
          {
            productID: "duru.coins.1200.v1",
            name: "duru.coins.1200.v1",
            price: 4.99,
            quantity: 1,
            currency: "USD",
          },
        ],
      },
    });
  });

  test("AB5. 스토어 금액 · 통화를 모르면 보내지 않고, 거래 id가 없으면 그 속성만 뺀다", () => {
    expect(airbridgeEventFrom({ ...packPurchasedExample, price: "" })).toBeNull();
    expect(airbridgeEventFrom({ ...packPurchasedExample, price: "abc" })).toBeNull();
    expect(airbridgeEventFrom({ ...packPurchasedExample, currency: "" })).toBeNull();
    const noId = airbridgeEventFrom({ ...packPurchasedExample, transactionId: "" });
    expect(noId?.category).toBe("airbridge.ecommerce.order.completed");
    expect(Object.keys(noId?.semanticAttributes ?? {})).toEqual(["value", "currency", "products"]);
  });

  test("AB6. 통화 코드는 대문자 ISO로 맞춰 보낸다(스토어가 소문자로 줘도)", () => {
    const event = airbridgeEventFrom({ ...packPurchasedExample, currency: "vnd" });
    expect(event?.semanticAttributes).toMatchObject({
      currency: "VND",
      products: [expect.objectContaining({ currency: "VND" })],
    });
  });

  test.each(unmappedEvents.map((e) => [e.name, e] as const))(
    "AB3. %s는 null이다",
    (_name, event) => {
      expect(airbridgeEventFrom(event)).toBeNull();
    },
  );

  test("AB3. 지운 메신저 · 비주얼 노벨 완료 이벤트는 어떤 출처여도 null이다", () => {
    for (const event of retiredSpecialUnitEvents) {
      expect(airbridgeEventFrom(event)).toBeNull();
    }
  });

  test("AB3. 얼린 입력도 받고 결과는 새 객체로 같은 값이다", () => {
    for (const event of [entryCompleted, episodeFinalPassed]) {
      const frozen = Object.freeze({ ...event });
      const first = airbridgeEventFrom(frozen);
      const second = airbridgeEventFrom(frozen);
      expect(first).not.toBeNull();
      expect(first).toEqual(second);
      expect(first).not.toBe(second);
      expect(frozen).toEqual(event);
    }
  });
});

describe("airbridgeEventFrom — 소재 테스트 깔때기(2026-11-24)", () => {
  test("AB7. tickets_ran_out · first_chat_message_sent는 같은 이름의 커스텀 이벤트이고 속성이 없다", () => {
    expect(airbridgeEventFrom(ticketsRanOut)).toStrictEqual({
      category: "tickets_ran_out",
      semanticAttributes: {},
    });
    expect(airbridgeEventFrom(firstChatMessageSent)).toStrictEqual({
      category: "first_chat_message_sent",
      semanticAttributes: {},
    });
  });

  test("AB8. chat_message_sent(메시지마다)는 보내지 않는다", () => {
    expect(airbridgeEventFrom(chatMessageSent)).toBeNull();
  });

  test("AB9. plans_viewed는 Product List View { productListID: plans_<view>, label: 자리 }이다", () => {
    expect(airbridgeEventFrom(plansViewedExample)).toStrictEqual({
      category: "airbridge.ecommerce.productList.viewed",
      semanticAttributes: { productListID: "plans_compare", label: "settings" },
    });
    expect(
      airbridgeEventFrom({ ...plansViewedExample, view: "offer", placement: "tickets" }),
    ).toStrictEqual({
      category: "airbridge.ecommerce.productList.viewed",
      semanticAttributes: { productListID: "plans_offer", label: "tickets" },
    });
  });

  test("AB10. plan_selected는 커스텀 plan_selected { label: 자리, action: 요금제.기간 }이다", () => {
    expect(airbridgeEventFrom(planSelectedExample)).toStrictEqual({
      category: "plan_selected",
      semanticAttributes: { label: "messenger", action: "premium.monthly" },
    });
  });

  test("AB11. purchase_intent(「곧」 안내)는 Initiate Checkout type preview이고 가격 · 통화를 상품 줄에 싣는다", () => {
    expect(airbridgeEventFrom(purchaseIntentExample)).toStrictEqual({
      category: "airbridge.initiateCheckout",
      semanticAttributes: {
        label: "settings",
        action: "plan",
        type: "preview",
        products: [
          {
            productID: "duru.premium.monthly.v1",
            name: "duru.premium.monthly.v1",
            quantity: 1,
            price: 179000,
            currency: "VND",
          },
        ],
      },
    });
  });

  test("AB12. 결제를 연 엽전 팩은 type checkout · action pack이고 통화는 대문자다", () => {
    expect(airbridgeEventFrom(packCheckoutExample)).toStrictEqual({
      category: "airbridge.initiateCheckout",
      semanticAttributes: {
        label: "coin_shop",
        action: "pack",
        type: "checkout",
        products: [
          {
            productID: "duru.coins.1200.v1",
            name: "duru.coins.1200.v1",
            quantity: 1,
            price: 4.99,
            currency: "USD",
          },
        ],
      },
    });
  });

  test("AB13. 가격을 모르거나 수가 아니거나 통화가 없으면 상품 줄에서 가격 · 통화만 빠지고 이벤트는 간다", () => {
    for (const changed of [{ price: "" }, { price: "abc" }, { currency: "" }]) {
      const event = airbridgeEventFrom({ ...purchaseIntentExample, ...changed });
      expect(event?.category).toBe("airbridge.initiateCheckout");
      expect(event?.semanticAttributes).toMatchObject({
        products: [
          { productID: "duru.premium.monthly.v1", name: "duru.premium.monthly.v1", quantity: 1 },
        ],
      });
      const attributes = event?.semanticAttributes as
        | { readonly products: readonly object[] }
        | undefined;
      const row = attributes?.products[0];
      expect(Object.keys(row ?? {}).sort()).toEqual(["name", "productID", "quantity"]);
    }
  });

  test("AB14. 깔때기 속성에는 최상위 value · 사용자 식별 · 나라 · 날 수가 없다", () => {
    const forbidden = [
      "value",
      "userId",
      "country",
      "daysSinceFirstOpen",
      "characterId",
      "surface",
    ];
    for (const source of [
      ticketsRanOut,
      firstChatMessageSent,
      plansViewedExample,
      planSelectedExample,
      purchaseIntentExample,
      packCheckoutExample,
    ]) {
      const keys = Object.keys(airbridgeEventFrom(source)?.semanticAttributes ?? { x: 1 });
      for (const key of forbidden) expect(keys).not.toContain(key);
    }
  });
});

describe("withAirbridgeEvents", () => {
  test("AB4. tracker가 있으면 entry · episodeIntro sink만 새 함수이고 나머지 둘은 같은 참조다", () => {
    const { sinks } = liveSinks();
    const composed = withAirbridgeEvents(sinks, vi.fn<() => void>());
    expect(composed.entryEventSink).not.toBe(sinks.entryEventSink);
    expect(composed.episodeIntroEventSink).not.toBe(sinks.episodeIntroEventSink);
    expect(composed.notificationEventSink).toBe(sinks.notificationEventSink);
    expect(composed.settingsEventSink).toBe(sinks.settingsEventSink);
    expect(Object.keys(composed).sort()).toEqual(Object.keys(sinks).sort());
  });

  test("AB4. tracker가 null이면 받은 묶음 그대로다", () => {
    const { sinks } = liveSinks();
    expect(withAirbridgeEvents(sinks, null)).toBe(sinks);
    expect(withAirbridgeEvents(nullSinks, null)).toBe(nullSinks);
  });

  test("AB4. 비어 있는 sink 넷에서도 entry · episodeIntro 둘은 tracker에 닿는다", () => {
    const tracker = vi.fn<() => void>();
    const composed = withAirbridgeEvents(nullSinks, tracker);
    expect(typeof composed.entryEventSink).toBe("function");
    expect(typeof composed.episodeIntroEventSink).toBe("function");
    expect(composed.notificationEventSink).toBeNull();
    expect(composed.settingsEventSink).toBeNull();
    composed.entryEventSink?.(entryCompleted);
    (composed.episodeIntroEventSink as unknown as (event: AnalyticsEvent) => void)(
      episodeFinalPassed,
    );
    expect(tracker).toHaveBeenCalledTimes(2);
    expect(tracker).toHaveBeenNthCalledWith(2, {
      category: "airbridge.achieveLevel",
      semanticAttributes: { level: "u00-tutorial", label: "episode_final" },
    });
  });

  test("AB4. 원래 sink가 던져도 tracker는 불리고, tracker가 던져도 밖으로 나가지 않는다", () => {
    const first = liveSinks();
    first.fns.episodeIntro.mockImplementation(() => {
      throw new Error("posthog down");
    });
    const tracker = vi.fn<() => void>();
    const composed = withAirbridgeEvents(first.sinks, tracker);
    const intro = composed.episodeIntroEventSink as unknown as (event: AnalyticsEvent) => void;
    expect(() => intro(episodeFinalPassed)).not.toThrow();
    expect(tracker).toHaveBeenCalledTimes(1);

    const second = liveSinks();
    const broken = vi.fn<() => void>(() => {
      throw new Error("host down");
    });
    const secondIntro = withAirbridgeEvents(second.sinks, broken)
      .episodeIntroEventSink as unknown as (event: AnalyticsEvent) => void;
    expect(() => secondIntro(episodeFinalPassed)).not.toThrow();
    expect(second.fns.episodeIntro).toHaveBeenCalledTimes(1);
  });

  test("AB4. 매핑되는 이벤트는 원래 sink 한 번 뒤 tracker 한 번, 매핑 안 되는 이벤트는 tracker 0이다", () => {
    const order: string[] = [];
    const { sinks, fns } = liveSinks(order);
    const tracker = vi.fn<() => void>(() => void order.push("tracker"));
    const composed = withAirbridgeEvents(sinks, tracker);
    composed.entryEventSink?.(entryCompleted);
    (composed.episodeIntroEventSink as unknown as (event: AnalyticsEvent) => void)(
      episodeFinalPassed,
    );
    expect(order).toEqual(["sink", "tracker", "sink", "tracker"]);
    expect(fns.entry).toHaveBeenCalledTimes(1);
    expect(fns.episodeIntro).toHaveBeenCalledTimes(1);

    tracker.mockClear();
    composed.entryEventSink?.({ name: "entry_screen_viewed", screen: "onboarding" });
    expect(fns.entry).toHaveBeenCalledTimes(2);
    expect(tracker).not.toHaveBeenCalled();
  });
});
