// 요금제 결선(ADR-0144) — 기능 플래그가 켜졌고 로그인이면 요금제 표를 한 번 읽고, 설정 → Plans · 티켓 대화상자 · 메신저 판의
// 결선을 만듭니다. 꺼졌으면 undefined — 그러면 어느 자리도 바뀌지 않고 RPC도 부르지 않습니다(1단계 운영 기본).
// 구매는 `PurchaseBridge` 한 곳 — 1단계는 꺼진 구현이라 「아직 안 됨」으로 끝납니다. 이벤트는 ADR-0029 D3 공통 속성으로 냅니다.

import { useEffect, useState } from "@lynx-js/react";

import { emitCompanionEvent } from "../lib/companion-events";
import { plansFeatureEnabled } from "../lib/plans-flag";
import { plansClient, type PlanId, type PlansCatalog, type PlansClient } from "../lib/plans-api";
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

export function usePlans(
  signedIn: boolean,
  dispatch: (action: NavAction) => void,
  eventSink: EpisodeIntroEventSink,
  client: () => PlansClient = plansClient,
  bridge: PurchaseBridge = disabledPurchaseBridge,
): PlansWiring | undefined {
  const enabled = plansFeatureEnabled() && signedIn;
  const [catalog, setCatalog] = useState<PlansCatalog | null>(null);
  const [offers, setOffers] = useState<readonly StoreOffer[] | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let live = true;
    void client()
      .catalog()
      .then((next) => {
        if (live) setCatalog(next);
      });
    void bridge.offerings().then((next) => {
      if (live) setOffers(next);
    });
    return () => {
      live = false;
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
    const cards = planCardsFor(catalog, placement, "monthly", offers);
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

  return {
    catalog,
    offers,
    openPlans,
    onSelect: async (placement, plan, period, productId) => {
      selected(placement, plan, period);
      return productId === null ? { kind: "unavailable" } : bridge.purchase(productId);
    },
    onRestore: () => bridge.restore(),
    onBack: () => dispatch({ type: "back" }),
    ticketsOffer: (close) => offerFor("tickets", close),
    messengerOffer: offerFor("messenger", () => {}),
  };
}
