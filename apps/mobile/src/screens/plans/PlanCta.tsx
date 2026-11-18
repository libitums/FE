import type { ReactNode } from "@lynx-js/react";

import type { PlansCopy } from "../../lib/ui-copy-plans";
import type { PlanChange } from "./plan-change";
import type { PlanCardView, PlanPeriod } from "./plans-model";
import { plansTestIds as ids } from "./plans.contract";

import "./plans.css";

/**
 * CTA 두 줄의 글(ADR-0160) — 이름 줄은 바꿈 종류(구독 없음 Continue · 위 Upgrade · 아래 Switch … from 날짜 · 같은 요금제 기간 Switch to yearly),
 * 아랫줄은 가격(내림은 시작 날짜). 고른 것이 없으면(Premium 구독자) 막힌 「Choose a plan」. 가격은 스토어 글 그대로라 긴 통화도 한 줄을 지킵니다.
 */
export function planCtaText(
  card: PlanCardView | undefined,
  period: PlanPeriod,
  change: PlanChange,
  date: string | null,
  copy: PlansCopy,
): { readonly title: string; readonly detail: string | null } {
  if (card === undefined) return { title: copy.shop.cta.pick, detail: null };
  const name = copy.names[card.id];
  const price =
    card.price === null
      ? copy.priceInStore
      : period === "monthly"
        ? copy.perMonth(card.price)
        : copy.perYear(card.price);
  switch (change) {
    case "upgrade":
      return { title: copy.shop.cta.upgradeTo(name), detail: price };
    case "downgrade":
      return { title: copy.shop.cta.switchTo(name), detail: copy.shop.cta.from(date) };
    case "crossgrade":
      return { title: copy.shop.cta.switchTo(name), detail: price };
    case "period":
      return { title: copy.shop.cta.switchPeriod[period], detail: price };
    case "new":
    case "same":
      return { title: copy.shop.cta.continueWith(name), detail: price };
  }
}

export type PlanCtaProps = {
  readonly title: string;
  readonly detail: string | null;
  readonly disabled: boolean;
  readonly loading: boolean;
  readonly onPress: () => void;
};

/** 주 단추 — 이름 / 가격 두 줄(시안 P2). 막혔거나 도는 동안은 누름을 무시합니다. */
export function PlanCta({ title, detail, disabled, loading, onPress }: PlanCtaProps): ReactNode {
  const className = disabled
    ? "plan-cta plan-cta-disabled"
    : loading
      ? "plan-cta plan-cta-loading"
      : "plan-cta";
  return (
    <view
      className={className}
      data-testid={ids.continue}
      data-disabled={String(disabled)}
      data-loading={String(loading)}
      accessibility-element={true}
      accessibility-traits="button"
      accessibility-label={detail === null ? title : `${title}, ${detail}`}
      bindtap={() => {
        "background only";
        if (!disabled && !loading) onPress();
      }}
    >
      <text className="plan-cta-title" data-testid={`${ids.continue}-title`} text-maxline="1">
        {title}
      </text>
      {detail === null ? null : (
        <text className="plan-cta-detail" data-testid={`${ids.continue}-detail`} text-maxline="1">
          {detail}
        </text>
      )}
    </view>
  );
}
