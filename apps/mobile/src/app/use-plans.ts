// 요금제 결선(ADR-0144 · 상점 입구 ADR-0160) — 플래그가 켜졌고 로그인이면 표를 한 번 읽고 설정 · 상점 · 티켓 · 메신저 결선을 만듭니다.
// 꺼졌으면 undefined(RPC 없음). 구매는 `PurchaseBridge` 한 곳이고 결제 플래그가 켜져야 열립니다. 이벤트는 ADR-0029 D3 공통 속성.

import { useEffect, useState } from "@lynx-js/react";

import { sessionNeedsRefresh } from "../lib/account-deletion";
import { loadAuthSession } from "../lib/auth-session";
import { emitCompanionEvent } from "../lib/companion-events";
import {
  setPlanAccess,
  subscriptionStateOf,
  subscriptionUnlimitedPass,
  type SubscriptionState,
} from "../lib/plan-access";
import { plansFeatureEnabled } from "../lib/plans-flag";
import {
  plansClient,
  type PlanEntitlements,
  type PlanId,
  type PlansCatalog,
  type PlansClient,
} from "../lib/plans-api";
import { nativePurchaseBridge } from "../lib/native-purchase-bridge";
import { pricingRegionFor, type PricingRegion } from "../lib/provisional-prices";
import { purchaseIntentOf, setPurchaseContext } from "../lib/purchase-intent";
import type { PurchaseWait } from "../lib/purchase-wait";
import type {
  PurchaseBridge,
  PurchaseResult,
  RestoreResult,
  StoreOffer,
} from "../lib/purchase-bridge";
import { plansCopy } from "../lib/ui-copy-plans";
import type { UnlimitedPass } from "../lib/unlimited-pass";
import type { EpisodeIntroEventSink } from "../screens/episode-intro/episode-intro.contract";
import type { ShopRequest } from "../screens/coin-shop/shop-model";
import type { ShopPlans } from "../screens/coin-shop/shop-plans";
import { currentPlanOf, type CurrentPlan, type PlanActivation } from "../screens/plans/plan-change";
import type { PlanOfferWiring } from "../screens/plans/plans.contract";
import { planCardsFor, type PlanPeriod, type PlanPlacement } from "../screens/plans/plans-model";
import { armOnPurchased, usePlanActivation } from "./use-plan-activation";
import { usePurchaseWait } from "./use-purchase-wait";
import { useServerEntitlements } from "./use-server-entitlements";
import type { NavAction } from "./nav-state";
import {
  planSelectedEvent,
  planSurfaceOf,
  plansViewedEvent,
  shopTabSwitchedEvent,
} from "./plans-events";

export type PlansWiring = {
  readonly catalog: PlansCatalog | null;
  /** 내 권한(서버 정본) — 읽기 전 · 실패면 null. 구매 · 복원 뒤 웹훅이 닿을 때까지 다시 읽습니다(최대 60초, ADR-0163). */
  readonly entitlements: PlanEntitlements | null;
  /** 임시 추천 가격의 지역 — 스토어 계정 나라, 모르면 학습자 프로필의 나라(ADR-0144 2단계 2026-11-17). */
  readonly region: PricingRegion;
  readonly offers: readonly StoreOffer[] | null;
  readonly openPlans: (placement: PlanPlacement, focus: PlanId | null) => void;
  readonly onSelect: (
    placement: PlanPlacement,
    plan: PlanId,
    period: PlanPeriod,
    productId: string | null,
  ) => Promise<PurchaseResult>;
  readonly onRestore: () => Promise<RestoreResult>;
  readonly onBack: () => void;
  /** 티켓 대화상자 카드 — 누르면 대화상자를 닫고(`close`) Plans를 엽니다. 표를 못 읽었으면 undefined. */
  readonly ticketsOffer: (close: () => void) => PlanOfferWiring | undefined;
  /** 메신저 무료 다 씀 판 카드. 표를 못 읽었으면 undefined. */
  readonly messengerOffer: PlanOfferWiring | undefined;
  /** 티켓 무제한 구독이면 머리 칩의 무제한 모달 구독 판(ADR-0115 · ADR-0144). 아니면 undefined. */
  readonly unlimitedPass: UnlimitedPass | undefined;
  /** 활성 구독이 있나(요금제 종류 무관) — 권한을 아직 못 읽었으면 unknown. 첫날 무제한(ADR-0186 개정 2)이 읽습니다. */
  readonly subscription: SubscriptionState;
  /** 지금 요금제(서버 권한에서 등급 높은 것, ADR-0160) — 머리 칩 · 상점 칩 · 바꿈의 기준. */
  readonly current: CurrentPlan | null;
  /** 상점 Plans 탭의 결선(`ShopPlansContext`). */
  readonly shop: ShopPlans;
  /** 티켓 모달의 「Go unlimited」 줄 — Unlimited Tickets 월 가격 글. 표가 없거나 이미 티켓 무제한이면 undefined. */
  readonly goUnlimited: { readonly price: string | null } | undefined;
  /** 구독 성공 알림 한 번(T6, `usePlanActivation`) — 미뤄진 내림이면 scheduled. 보이면 `onActivatedShown`. */
  readonly activated: PlanActivation | null;
  readonly onActivatedShown: () => void;
  /** 구매 뒤 서버 확인 대기(ADR-0163) — 상점 · 설정 Plans · 머리 칩이 읽습니다. */
  readonly wait: PurchaseWait;
};

const SESSION_WAITS = 30;
const SESSION_WAIT_MS = 1000;

export function usePlans(
  signedIn: boolean,
  dispatch: (action: NavAction) => void,
  eventSink: EpisodeIntroEventSink,
  learner: { readonly learnerRecord: { readonly countryCode: string } | null },
  openShop: (request: ShopRequest) => void = () => {},
  client: () => PlansClient = plansClient,
  bridgeOf: () => PurchaseBridge = nativePurchaseBridge,
): PlansWiring | undefined {
  const enabled = plansFeatureEnabled() && signedIn;
  const [catalog, setCatalog] = useState<PlansCatalog | null>(null);
  const bridge = bridgeOf();
  // 내 권한 — 화면 진입 · 구매 뒤, 그리고 만료 경계 · 앱이 앞으로 올 때 다시 읽습니다(미뤄진 내림이 칩에 늦게 닿지 않게).
  const [entitlements, setEntitlements, rereadEntitlements] = useServerEntitlements(
    enabled && bridge.available,
    client,
  );
  const [offers, setOffers] = useState<readonly StoreOffer[] | null>(null);
  const [storefront, setStorefront] = useState<string | null>(null);
  const activation = usePlanActivation(entitlements);
  const current = currentPlanOf(entitlements);
  const region = pricingRegionFor(storefront, learner.learnerRecord?.countryCode);
  // 서버 권한(정본)을 티켓 · 대화 판정이 읽는 자리에 렌더마다 맞춥니다 — 결제를 열 수 없으면 권한을 읽지 않아 언제나 null(지금과 같음).
  setPlanAccess(enabled && bridge.available ? entitlements : null);
  // 구매 · 복원이 성공하면 웹훅이 서버를 바꿀 때까지 권한 · 잔액을 다시 읽고, 그 동안 화면은 확인 대기를 보입니다(ADR-0144 2단계 · ADR-0163).
  const refresh = usePurchaseWait({
    available: bridge.available,
    current: entitlements,
    client,
    onEntitlements: (next) => {
      activation.observe(next);
      setEntitlements(next);
    },
  });

  // 결선 밖에서 열리는 엽전 상점도 같은 지역 · 스토어 상품 · sink로 가격을 고르고 의향을 내며, 같은 다리로 삽니다.
  useEffect(() => {
    setPurchaseContext({
      region,
      sink: eventSink,
      storefront,
      offers,
      canBuy: enabled && bridge.available,
      buy: (productId) => {
        activation.disarm();
        return refresh.run(() => bridge.purchase(productId), "balance", productId);
      },
    });
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [region, eventSink, storefront, offers, enabled, entitlements]);

  useEffect(() => {
    if (!enabled) return;
    let live = true;
    let waits = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const load = () => {
      void client()
        .catalog()
        .then((next) => {
          if (live) setCatalog(next);
        });
      // 내 권한은 결제를 열 수 있을 때만 읽습니다 — 결제 전에는 구독이 없어 로그인마다 RPC를 하나 더 부를 까닭이 없습니다.
      rereadEntitlements();
      void bridge.offerings().then((next) => {
        if (live) setOffers(next);
      });
      void bridge.storefront().then((next) => {
        if (live) setStorefront(next);
      });
    };
    // 부팅의 세션 갱신 전에 부르면 같은 refresh 토큰을 두 번 보내 세션이 끊길 수 있어 — 만료 직전이면 1초씩(최대 30번) 기다립니다.
    const whenFresh = () => {
      if (!live) return;
      const session = loadAuthSession();
      if (session !== null && sessionNeedsRefresh(session, Date.now()) && waits < SESSION_WAITS) {
        waits += 1;
        timer = setTimeout(whenFresh, SESSION_WAIT_MS);
        return;
      }
      load();
    };
    whenFresh();
    return () => {
      live = false;
      if (timer !== undefined) clearTimeout(timer);
    };
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  if (!enabled) return undefined;

  const viewed = (placement: PlanPlacement, view: "offer" | "compare") =>
    emitCompanionEvent(eventSink, plansViewedEvent(placement, view, current));
  const selected = (placement: PlanPlacement, plan: PlanId, period: PlanPeriod) =>
    emitCompanionEvent(eventSink, planSelectedEvent(placement, plan, period, current));
  // 설정만 화면(밝은 판)이고, 나머지 입구는 상점 Plans 탭(ADR-0160) — 상점이 탭을 보일 때 plans_viewed를 냅니다.
  const openPlans = (placement: PlanPlacement, focus: PlanId | null) => {
    if (placement !== "settings") return openShop({ tab: "plans", placement, focus });
    viewed(placement, "compare");
    dispatch({ type: "push", screen: { name: "plans", placement, focus } });
  };
  const offerFor = (
    placement: "tickets" | "messenger",
    close: () => void,
  ): PlanOfferWiring | undefined => {
    if (catalog === null) return undefined;
    const cards = planCardsFor(catalog, placement, "monthly", offers, region);
    if (cards.length === 0) return undefined;
    return {
      cards,
      onSelect: (plan) => {
        selected(placement, plan, "monthly");
        close();
        openPlans(placement, plan);
      },
      onCompare: () => {
        close();
        openPlans(placement, cards[0]?.id ?? null);
      },
      onShown: () => viewed(placement, "offer"),
    };
  };

  // 구매 단추 — 결제를 열 수 없으면(결제 플래그 꺼짐 · SDK 없음) 「곧」 안내로 끝나도 의향은 남깁니다.
  const intent = (placement: PlanPlacement, plan: PlanId, period: PlanPeriod, product: string) => {
    const card = (
      catalog === null ? [] : planCardsFor(catalog, "settings", period, offers, region)
    ).find((item) => item.id === plan);
    emitCompanionEvent(
      eventSink,
      purchaseIntentOf({
        surface: planSurfaceOf(placement),
        placement,
        kind: "plan",
        product,
        period,
        shown: card?.shown ?? null,
        region,
        storefront,
        preview: !bridge.available,
      }),
    );
  };

  const onSelect = async (
    placement: PlanPlacement,
    plan: PlanId,
    period: PlanPeriod,
    productId: string | null,
  ): Promise<PurchaseResult> => {
    selected(placement, plan, period);
    if (productId === null) return { kind: "unavailable" };
    intent(placement, plan, period, productId);
    return refresh.run(
      armOnPurchased(activation, () => bridge.purchase(productId)),
      "entitlements",
      productId,
    );
  };
  const onRestore = () => {
    activation.disarm();
    return refresh.run(() => bridge.restore());
  };
  const ticketsCard =
    catalog === null
      ? undefined
      : planCardsFor(catalog, "tickets", "monthly", offers, region).find(
          (card) => card.id === "unlimited_tickets",
        );

  return {
    catalog,
    entitlements,
    region,
    offers,
    openPlans,
    onSelect,
    onRestore,
    onBack: () => dispatch({ type: "back" }),
    ticketsOffer: (close) => offerFor("tickets", close),
    messengerOffer: offerFor("messenger", () => {}),
    // 요금제 이름은 스토어 상품명과 같아 모든 언어에서 영어입니다(`ui-copy-plans`).
    unlimitedPass: bridge.available
      ? subscriptionUnlimitedPass(entitlements, (plan) => plansCopy.en.names[plan])
      : undefined,
    subscription: subscriptionStateOf(bridge.available, entitlements),
    current,
    shop: {
      catalog,
      offers,
      region,
      current: entitlements,
      wait: refresh.wait,
      onSelect,
      onRestore,
      onViewed: (placement) => viewed(placement, "compare"),
      onTabSwitched: (from, to, surface) =>
        emitCompanionEvent(eventSink, shopTabSwitchedEvent(from, to, surface)),
    },
    goUnlimited:
      ticketsCard === undefined || entitlements?.unlimitedTickets === true
        ? undefined
        : { price: ticketsCard.price },
    activated: activation.activated,
    onActivatedShown: activation.onActivatedShown,
    wait: refresh.wait,
  };
}
