// 요금제 결선(ADR-0144) — 기능 플래그가 켜졌고 로그인이면 요금제 표를 한 번 읽고, 설정 → Plans · 티켓 대화상자 · 메신저 판의
// 결선을 만듭니다. 꺼졌으면 undefined — 그러면 어느 자리도 바뀌지 않고 RPC도 부르지 않습니다(1단계 운영 기본).
// 구매는 `PurchaseBridge` 한 곳 — 호스트 RevenueCat 다리(2단계, 2026-11-17)가 스토어 상품 · 스토어 나라를 주고, 구매는 결제 플래그가
// 켜져야 열립니다(꺼졌으면 「곧」 안내). 이벤트는 ADR-0029 D3 공통 속성으로 냅니다.

import { useEffect, useState } from "@lynx-js/react";

import { sessionNeedsRefresh } from "../lib/account-deletion";
import { loadAuthSession } from "../lib/auth-session";
import { emitCompanionEvent } from "../lib/companion-events";
import { setPlanAccess, subscriptionUnlimitedPass } from "../lib/plan-access";
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
import { runWithServerRefresh, sleep } from "../lib/purchase-refresh";
import type {
  PurchaseBridge,
  PurchaseResult,
  RestoreResult,
  StoreOffer,
} from "../lib/purchase-bridge";
import { plansCopy } from "../lib/ui-copy-plans";
import type { UnlimitedPass } from "../lib/unlimited-pass";
import type { EpisodeIntroEventSink } from "../screens/episode-intro/episode-intro.contract";
import type { PlanOfferWiring } from "../screens/plans/plans.contract";
import { planCardsFor, type PlanPeriod, type PlanPlacement } from "../screens/plans/plans-model";
import { reportServerBalance } from "./messenger-chat-wiring";
import type { NavAction } from "./nav-state";

export type PlansWiring = {
  readonly catalog: PlansCatalog | null;
  /** 내 권한(서버 정본) — 읽기 전 · 실패면 null. 구매 · 복원 뒤 웹훅이 닿을 때까지 잠깐 다시 읽습니다. */
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
};

const surfaceOf = (placement: PlanPlacement) => (placement === "messenger" ? "chat" : "learning");

const SESSION_WAITS = 30;
const SESSION_WAIT_MS = 1000;

export function usePlans(
  signedIn: boolean,
  dispatch: (action: NavAction) => void,
  eventSink: EpisodeIntroEventSink,
  learner: { readonly learnerRecord: { readonly countryCode: string } | null },
  client: () => PlansClient = plansClient,
  bridgeOf: () => PurchaseBridge = nativePurchaseBridge,
): PlansWiring | undefined {
  const enabled = plansFeatureEnabled() && signedIn;
  const [catalog, setCatalog] = useState<PlansCatalog | null>(null);
  const [entitlements, setEntitlements] = useState<PlanEntitlements | null>(null);
  const [offers, setOffers] = useState<readonly StoreOffer[] | null>(null);
  const [storefront, setStorefront] = useState<string | null>(null);
  const region = pricingRegionFor(storefront, learner.learnerRecord?.countryCode);
  const bridge = bridgeOf();
  // 서버 권한(정본)을 티켓 · 대화 판정이 읽는 자리에 렌더마다 맞춥니다 — 결제를 열 수 없으면 권한을 읽지 않아 언제나 null(지금과 같음).
  setPlanAccess(enabled && bridge.available ? entitlements : null);
  // 구매 · 복원이 성공하면 웹훅이 서버를 바꿀 때까지 권한 · 잔액을 잠깐 다시 읽습니다(ADR-0144 2단계).
  function withServerRefresh<T extends { readonly kind: string }>(task: () => Promise<T>) {
    return runWithServerRefresh(
      {
        available: bridge.available,
        current: entitlements,
        entitlements: () => client().entitlements(),
        balance: () => client().balance(),
        onEntitlements: setEntitlements,
        onBalance: reportServerBalance,
        wait: sleep,
      },
      task,
    );
  }

  // 결선 밖에서 열리는 엽전 상점도 같은 지역 · 스토어 상품 · sink로 가격을 고르고 의향을 내며, 같은 다리로 삽니다.
  useEffect(() => {
    setPurchaseContext({
      region,
      sink: eventSink,
      storefront,
      offers,
      canBuy: enabled && bridge.available,
      buy: (productId) => withServerRefresh(() => bridge.purchase(productId)),
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
      if (bridgeOf().available)
        void client()
          .entitlements()
          .then((next) => {
            if (live) setEntitlements(next);
          });
      void bridge.offerings().then((next) => {
        if (live) setOffers(next);
      });
      void bridge.storefront().then((next) => {
        if (live) setStorefront(next);
      });
    };
    // 부팅의 세션 갱신이 끝나기 전에 부르면 같은 refresh 토큰으로 갱신을 한 번 더 보내(Auth가 재사용으로 보고 세션을 끊을
    // 수 있음) — 세션이 아직 만료 직전이면 1초씩 기다렸다가(최대 30번) 읽습니다.
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
    emitCompanionEvent(eventSink, {
      name: "plans_viewed",
      surface: surfaceOf(placement),
      placement,
      view,
    });
  const selected = (placement: PlanPlacement, plan: PlanId, period: PlanPeriod) =>
    emitCompanionEvent(eventSink, {
      name: "plan_selected",
      surface: surfaceOf(placement),
      placement,
      plan,
      period,
    });
  const openPlans = (placement: PlanPlacement, focus: PlanId | null) => {
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
        surface: surfaceOf(placement),
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

  return {
    catalog,
    entitlements,
    region,
    offers,
    openPlans,
    onSelect: async (placement, plan, period, productId) => {
      selected(placement, plan, period);
      if (productId === null) return { kind: "unavailable" };
      intent(placement, plan, period, productId);
      return withServerRefresh(() => bridge.purchase(productId));
    },
    onRestore: () => withServerRefresh(() => bridge.restore()),
    onBack: () => dispatch({ type: "back" }),
    ticketsOffer: (close) => offerFor("tickets", close),
    messengerOffer: offerFor("messenger", () => {}),
    // 요금제 이름은 스토어 상품명과 같아 모든 언어에서 영어입니다(`ui-copy-plans`).
    unlimitedPass: bridge.available
      ? subscriptionUnlimitedPass(entitlements, (plan) => plansCopy.en.names[plan])
      : undefined,
  };
}
