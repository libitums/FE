import { useEffect } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { color } from "@libitums/design-tokens";

import { announce } from "../lib/accessibility";
import type { PlanId } from "../lib/plans-api";
import { dateParts, type PlanActivation } from "../screens/plans/plan-change";
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
 * 누를 것이 없어 단추가 아닙니다. 낭독은 뜰 때 한 번 알립니다. 다음 갱신으로 미뤄진 바꿈이면 시작 날짜 · 그때까지의 요금제를 씁니다.
 */
export function SubscriptionToast({
  activation,
  onDone,
}: {
  readonly activation: PlanActivation;
  readonly onDone: () => void;
}): ReactNode {
  const { plan, scheduled } = activation;
  const copy = useUiCopy().plans;
  const parts = dateParts(scheduled?.at ?? null);
  // 미뤄진 내림이면 「켜짐」이 아니라 시작 날짜와 그때까지 쓰는 지금 요금제(2026-11-19 Premium → Unlimited Tickets).
  const title =
    scheduled === null
      ? copy.shop.activated.title(copy.names[plan])
      : copy.shop.activated.startsAt(
          copy.names[plan],
          parts === null ? null : copy.shop.date(parts.month, parts.day),
        );
  const body =
    scheduled === null
      ? copy.shop.activated.body[plan]
      : copy.shop.activated.keep(copy.names[scheduled.from]);
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
      flatten={false}
      accessibility-element={true}
      accessibility-label={`${title}, ${body}`}
    >
      <view className="subscription-toast-badge">
        <svg
          className="subscription-toast-icon"
          content={icons[plan]}
          current-color={color.white}
        />
      </view>
      <view className="subscription-toast-text">
        <text className="subscription-toast-title">{title}</text>
        <text className="subscription-toast-body">{body}</text>
      </view>
    </view>
  );
}
