// 머리의 요금제 입구(ADR-0160) — 요금제 결선에서 둘째 줄 칩 · 티켓 모달 줄 · 구독 성공 알림 · 확인 대기 스켈레톤(ADR-0163)을 고릅니다. 칩은 여정 지도에서만 섭니다
// (다른 탭 루트는 둘째 줄 자리에 화면 머리가 있음). 결선이 없으면(플래그 꺼짐) undefined — 머리는 지금 그대로입니다. 순수.

import { chipUpdating } from "../lib/purchase-wait";
import { headerPlanChipOf, type HeaderPlanChip } from "../screens/coin-shop/shop-model";
import type { PlanActivation } from "../screens/plans/plan-change";
import type { PlansWiring } from "./use-plans";

/** 머리의 요금제 입구(ADR-0160) — 요금제 결선이 있을 때만. */
export type HeaderPlans = {
  /** 둘째 줄 칩 — null이면 줄이 없습니다(여정 지도 밖 탭). */
  readonly chip: HeaderPlanChip | null;
  /** 티켓 모달의 「Go unlimited」 줄 가격 — undefined면 줄이 없습니다(표 없음 · 이미 티켓 무제한). */
  readonly goUnlimited: { readonly price: string | null } | undefined;
  /** 구독 성공 알림 한 번 — 새로 켜진 요금제(미뤄진 내림이면 scheduled). */
  readonly activated: PlanActivation | null;
  readonly onActivatedShown: () => void;
  /** 구매 뒤 서버 확인 대기(ADR-0163) — 바뀔 칩은 값 대신 스켈레톤입니다. */
  readonly updating?: { readonly coins: boolean; readonly plan: boolean };
};

export function headerPlansOf(
  plans: PlansWiring | undefined,
  onMap: boolean,
): HeaderPlans | undefined {
  if (plans === undefined) return undefined;
  return {
    chip: onMap ? headerPlanChipOf(plans.current) : null,
    goUnlimited: plans.goUnlimited,
    activated: plans.activated,
    onActivatedShown: plans.onActivatedShown,
    updating: { coins: chipUpdating(plans.wait, "coins"), plan: chipUpdating(plans.wait, "plan") },
  };
}
