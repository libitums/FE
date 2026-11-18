import { useEffect } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { color } from "@libitums/design-tokens";

import { announce } from "../lib/accessibility";
import type { PlanId } from "../lib/plans-api";
import { useUiCopy } from "../lib/ui-copy";
import { infinityIcon } from "./infinity-icon";
import { bubbleIcon, crownIcon } from "./plan-icons";

import "./subscription-toast.css";

/** 알림이 떠 있는 시간(시안 T6b). */
export const subscriptionToastMs = 4000;

const icons: Readonly<Record<PlanId, string>> = {
  unlimited_tickets: infinityIcon,
  chat_plus: bubbleIcon,
  premium: crownIcon,
};

/**
 * 구독 성공 알림(ADR-0160 · 시안 T6b) — 결제 뒤 서버 권한이 새 요금제를 보이면 한 번, 두 줄 머리 아래에 4초 섭니다. 칩을 가리지 않고
 * 누를 것이 없어 단추가 아닙니다. 낭독은 뜰 때 한 번 알립니다.
 */
export function SubscriptionToast({
  plan,
  onDone,
}: {
  readonly plan: PlanId;
  readonly onDone: () => void;
}): ReactNode {
  const copy = useUiCopy().plans;
  const title = copy.shop.activated.title(copy.names[plan]);
  const body = copy.shop.activated.body[plan];
  useEffect(() => {
    announce(`${title}. ${body}`);
    const timer = setTimeout(() => onDone(), subscriptionToastMs);
    return () => clearTimeout(timer);
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [plan]);
  return (
    <view
      className="subscription-toast"
      data-testid="subscription-toast"
      accessibility-element={true}
      accessibility-label={`${title}, ${body}`}
    >
      <view className="subscription-toast-badge">
        <svg className="subscription-toast-icon" content={icons[plan]} current-color={color.white} />
      </view>
      <view className="subscription-toast-text">
        <text className="subscription-toast-title">{title}</text>
        <text className="subscription-toast-body">{body}</text>
      </view>
    </view>
  );
}
