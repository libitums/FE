import type { ReactNode } from "@lynx-js/react";

import { color } from "@libitums/design-tokens";

import { crownIcon } from "../../components/plan-icons";
import { useUiCopy } from "../../lib/ui-copy";
import type { CurrentPlan } from "./plan-change";
import { plansTestIds as ids } from "./plans.contract";

import "./plans.css";

/**
 * 오른쪽 위 「Your plan」 카드(ADR-0160 · 시안 S2 · L1) — 엽전 탭 「You have」 카드와 같은 틀(아이콘 30 · 두 줄 · 황동 면)이라 탭을 바꿔도
 * 위 줄 높이가 그대로입니다. 구독이 없으면 Free.
 */
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
      <svg
        className="plans-your-plan-icon"
        content={crownIcon}
        current-color={color.brand.primary}
      />
      <view className="plans-your-plan-text">
        <text className="plans-your-plan-label">{shop.yourPlan}</text>
        <text className="plans-your-plan-value">{plan}</text>
      </view>
    </view>
  );
}
