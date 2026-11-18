import type { ReactNode } from "@lynx-js/react";

import { color } from "@libitums/design-tokens";
import { useMotion } from "@libitums/ui-lynx/motion";

import { useUiCopy } from "../lib/ui-copy";
import type { HeaderPlanChip } from "../screens/coin-shop/shop-model";
import { infinityIcon } from "./infinity-icon";
import { bubbleIcon, crownIcon } from "./plan-icons";

import "./plan-chip.css";
import "./plan-chip-motion.css";

export type PlanChipProps = {
  readonly plan: HeaderPlanChip;
  /** 구독 성공 직후 — 둘레 고리가 한 번 반짝입니다(움직임 줄이기면 고리만 섭니다). */
  readonly pulse: boolean;
  readonly onPress: () => void;
};

const icons: Readonly<Record<HeaderPlanChip, string>> = {
  plans: crownIcon,
  premium: crownIcon,
  chat_plus: bubbleIcon,
  unlimited_tickets: infinityIcon,
};

/**
 * 머리 둘째 줄의 요금제 칩(ADR-0160 · 시안 A3 ~ A6) — 종 아래 오른쪽, 46 × 39. 구독이 없으면 흰 PLANS(주황 왕관), 구독 중이면 주황 면에
 * 그 요금제(PREMIUM 왕관 · CHAT+ 말풍선 · TICKETS ∞). 움직임 없이 늘 서 있고, 누르면 상점 Plans 탭입니다.
 */
export function PlanChip({ plan, pulse, onPress }: PlanChipProps): ReactNode {
  const copy = useUiCopy().plans;
  const alive = useMotion() === "standard";
  const subscribed = plan !== "plans";
  const label = subscribed ? copy.shop.yourPlanLabel(copy.shop.planShort[plan]) : copy.title;
  return (
    <view
      className={subscribed ? "plan-chip plan-chip-subscribed" : "plan-chip"}
      data-testid="header-plan-chip"
      data-plan={plan}
      data-subscribed={String(subscribed)}
      data-pulse={String(pulse)}
      accessibility-element={true}
      accessibility-traits="button"
      accessibility-label={label}
      bindtap={() => {
        "background only";
        onPress();
      }}
    >
      {pulse ? (
        <view className={alive ? "plan-chip-ring plan-chip-ring-pulse" : "plan-chip-ring"} />
      ) : null}
      <svg
        className={plan === "unlimited_tickets" ? "plan-chip-icon plan-chip-icon-wide" : "plan-chip-icon"}
        content={icons[plan]}
        current-color={subscribed ? color.white : color.brand.primary}
      />
      <text className={subscribed ? "plan-chip-label plan-chip-label-subscribed" : "plan-chip-label"}>
        {copy.shop.chip[plan]}
      </text>
    </view>
  );
}
