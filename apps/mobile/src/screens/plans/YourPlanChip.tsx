import type { ReactNode } from "@lynx-js/react";

import { useUiCopy } from "../../lib/ui-copy";
import type { CurrentPlan } from "./plan-change";
import { plansTestIds as ids } from "./plans.contract";

import "./plans.css";

/** 오른쪽 위 「Your plan」 카드(ADR-0160 · 시안 S2 · L1) — 엽전 탭 「You have」 자리. 구독이 없으면 Free. */
export function YourPlanChip({ current }: { readonly current: CurrentPlan | null }): ReactNode {
  const shop = useUiCopy().plans.shop;
  const plan = shop.planShort[current?.id ?? "free"];
  return (
    <view
      className="plans-your-plan"
      data-testid={ids.yourPlan}
      flatten={false}
      accessibility-element={true}
      accessibility-label={shop.yourPlanLabel(plan)}
    >
      <text className="plans-your-plan-label">{shop.yourPlan}</text>
      <text className="plans-your-plan-value">{plan}</text>
    </view>
  );
}
