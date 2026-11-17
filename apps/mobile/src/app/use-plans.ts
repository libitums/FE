// 요금제 결선(ADR-0144) — 기능 플래그가 켜졌고 로그인이면 요금제 표를 한 번 읽고, 설정 → Plans · 티켓 대화상자 · 메신저 판의
// 결선을 만듭니다. 꺼졌으면 undefined — 그러면 어느 자리도 바뀌지 않고 RPC도 부르지 않습니다(1단계 운영 기본).
// 구매는 `PurchaseBridge` 한 곳 — 1단계는 꺼진 구현이라 「아직 안 됨」으로 끝납니다. 이벤트는 ADR-0029 D3 공통 속성으로 냅니다.

import { useEffect, useState } from "@lynx-js/react";

import { sessionNeedsRefresh } from "../lib/account-deletion";
import { loadAuthSession } from "../lib/auth-session";
import { emitCompanionEvent } from "../lib/companion-events";
import { plansFeatureEnabled } from "../lib/plans-flag";
import { plansClient, type PlanId, type PlansCatalog, type PlansClient } from "../lib/plans-api";
import { pricingRegionOf, type PricingRegion } from "../lib/provisional-prices";
import { purchaseIntentOf, setPurchaseContext } from "../lib/purchase-intent";
import {
  disabledPurchaseBridge,
  type PurchaseBridge,
  type PurchaseResult,
  type RestoreResult,
  type StoreOffer,
} from "../lib/purchase-bridge";
import type { EpisodeIntroEventSink } from "../screens/episode-intro/episode-intro.contract";
import type { PlanOfferWiring } from "../screens/plans/plans.contract";
import { planCardsFor, type PlanPeriod, type PlanPlacement } from "../screens/plans/plans-model";
import type { NavAction } from "./nav-state";

export type PlansWiring = {
  readonly catalog: PlansCatalog | null;
  /** 임시 추천 가격의 지역 — 학습자 프로필의 나라(ADR-0144 추가 2026-11-17). */
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
  bridge: PurchaseBridge = disabledPurchaseBridge,
): PlansWiring | undefined {
  const enabled = plansFeatureEnabled() && signedIn;
  const region = pricingRegionOf(learner.learnerRecord?.countryCode);

  // 결선 밖에서 열리는 엽전 상점도 같은 지역 · sink로 가격을 고르고 의향을 냅니다.
  useEffect(() => {
    setPurchaseContext({ region, sink: eventSink });
  }, [region, eventSink]);
  const [catalog, setCatalog] = useState<PlansCatalog | null>(null);
  const [offers, setOffers] = useState<readonly StoreOffer[] | null>(null);

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
      void bridge.offerings().then((next) => {
        if (live) setOffers(next);
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

  // 구매 단추 — 결제를 열 수 없으면(2단계 전) 「곧」 안내로 끝나도 의향은 남깁니다.
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
        preview: !bridge.available,
      }),
    );
  };

  return {
    catalog,
    region,
    offers,
    openPlans,
    onSelect: async (placement, plan, period, productId) => {
      selected(placement, plan, period);
      if (productId === null) return { kind: "unavailable" };
      intent(placement, plan, period, productId);
      return bridge.purchase(productId);
    },
    onRestore: () => bridge.restore(),
    onBack: () => dispatch({ type: "back" }),
    ticketsOffer: (close) => offerFor("tickets", close),
    messengerOffer: offerFor("messenger", () => {}),
  };
}
