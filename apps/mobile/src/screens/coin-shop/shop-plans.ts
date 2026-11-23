// 상점 Plans 탭의 결선(ADR-0160) — 요금제 결선(`usePlans`)이 세션 층에서 내리고, 어디서 열린 상점이든(머리 · 채팅방 겹침) 읽습니다.
// 없으면(요금제 플래그 꺼짐 · 로그아웃) 상점은 지금처럼 엽전만 보입니다 — 탭 · 요금제 줄이 서지 않습니다.

import { createContext, useContext } from "@lynx-js/react";

import type { PlanId } from "../../lib/plans-api";
import type { PurchaseResult } from "../../lib/purchase-bridge";
import type { PlanPeriod, PlanPlacement } from "../plans/plans-model";
import type { PlansData } from "../plans/plans.contract";
import type { ShopTab } from "./shop-model";

export type ShopPlans = Omit<PlansData, "onSelect"> & {
  /** 구매 — 자리를 실어 plan_selected · purchase_intent를 냅니다. */
  readonly onSelect: (
    placement: PlanPlacement,
    plan: PlanId,
    period: PlanPeriod,
    productId: string | null,
  ) => Promise<PurchaseResult>;
  /** Plans 탭이 보일 때마다 한 번(plans_viewed compare). */
  readonly onViewed: (placement: PlanPlacement) => void;
  readonly onTabSwitched: (from: ShopTab, to: ShopTab, surface: "learning" | "chat") => void;
};

export const ShopPlansContext = createContext<ShopPlans | undefined>(undefined);

export function useShopPlans(): ShopPlans | undefined {
  return useContext(ShopPlansContext);
}
