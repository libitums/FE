import type { ReactNode } from "@lynx-js/react";

import { color } from "@libitums/design-tokens";

import { crownIcon } from "../../components/plan-icons";
import { SkeletonValue } from "../../components/SkeletonValue";
import { useUiCopy } from "../../lib/ui-copy";
import type { CurrentPlan } from "./plan-change";
import { plansTestIds as ids } from "./plans.contract";

import "./plans.css";

/**
 * 오른쪽 위 「Your plan」 카드(ADR-0160 · 시안 S2 · L1) — 엽전 탭 「You have」 카드와 같은 틀(아이콘 30 · 두 줄 · 황동 면)이라 탭을 바꿔도
 * 위 줄 높이가 그대로입니다. 구독이 없으면 Free. 구매 뒤 서버를 기다리는 동안은 값 자리가 스켈레톤입니다(ADR-0163).
 */
export function YourPlanChip({
  current,
  updating = false,
}: {
  readonly current: CurrentPlan | null;
  /** 구매 뒤 서버 확인 대기(ADR-0163) — 값 대신 스켈레톤. */
  readonly updating?: boolean;
}): ReactNode {
  const copy = useUiCopy();
  const shop = copy.plans.shop;
  const plan = shop.planShort[current?.id ?? "free"];
  const label = shop.yourPlanLabel(plan);
  return (
    <view
      className="plans-your-plan"
      data-testid={ids.yourPlan}
      flatten={false}
      accessibility-element={true}
      accessibility-label={
        updating ? `${copy.coinShop.purchaseWait.updating}, ${label}` : label
      }
    >
      <svg
        className="plans-your-plan-icon"
        content={crownIcon}
        current-color={color.brand.primary}
      />
      <view className="plans-your-plan-text">
        <text className="plans-your-plan-label">{shop.yourPlan}</text>
        {updating ? (
          <SkeletonValue width={56} lineHeight={22} testId={ids.yourPlanUpdating} />
        ) : (
          <text className="plans-your-plan-value">{plan}</text>
        )}
      </view>
    </view>
  );
}
