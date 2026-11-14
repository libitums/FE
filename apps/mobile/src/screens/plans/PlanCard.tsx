import type { ReactNode } from "@lynx-js/react";

import { useUiCopy } from "../../lib/ui-copy";
import type { PlansCopy } from "../../lib/ui-copy-plans";
import type { PlanBenefit } from "./plans-model";
import type { PlanCardProps } from "./plans.contract";

import "./plans.css";

/** 혜택 한 줄의 글 — 숫자는 서버 표에서 옵니다. */
export function planBenefitText(benefit: PlanBenefit, copy: PlansCopy): string {
  switch (benefit.kind) {
    case "unlimited-lessons":
      return copy.benefit.unlimitedLessons;
    case "free-messages":
      return copy.benefit.freeMessages(benefit.perDay);
    case "unlimited-chat":
      return copy.benefit.unlimitedChat(benefit.fairUse);
    case "monthly-coins":
      return copy.benefit.monthlyCoins(benefit.coins);
    case "all-characters":
      return copy.benefit.allCharacters;
  }
}

/**
 * 요금제 카드(시안 `.plan`) — 이름 · BEST 배지 · 가격(스토어 가격이 없으면 안내) · 혜택 줄. 카드 전체가 단추 하나이고 낭독은
 * 한 요소로 묶습니다(Android는 `flatten={false}`여야 요소가 남습니다). 설정 화면은 고름(`selected`)을, 맥락 카드는 BEST를 테두리로 보입니다.
 */
export function PlanCard({ card, period, testId, selected, onPress }: PlanCardProps): ReactNode {
  const copy = useUiCopy().plans;
  const name = copy.names[card.id];
  const price =
    card.price === null
      ? copy.priceInStore
      : period === "monthly"
        ? copy.perMonth(card.price)
        : copy.perYear(card.price);
  const benefits = card.benefits.map((benefit) => planBenefitText(benefit, copy));
  const label = [name, card.best ? copy.best : null, price, ...benefits]
    .concat(selected === true ? [copy.selected] : [])
    .filter((part): part is string => part !== null)
    .join(", ");
  const on = selected ?? card.best;

  return (
    <view
      className={on ? "plan-card plan-card-on" : "plan-card"}
      data-testid={testId}
      {...(selected === undefined ? {} : { "data-selected": String(selected) })}
      data-best={String(card.best)}
      flatten={false}
      accessibility-element={true}
      accessibility-traits="button"
      accessibility-label={label}
      bindtap={() => {
        "background only";
        onPress();
      }}
    >
      <view className="plan-card-head">
        <text className="plan-card-name">{name}</text>
        {card.best ? (
          <view className="plan-card-badge">
            <text className="plan-card-badge-label">{copy.best}</text>
          </view>
        ) : null}
      </view>
      <text
        className={card.price === null ? "plan-card-price-pending" : "plan-card-price"}
        data-testid={`${testId}-price`}
      >
        {price}
      </text>
      {benefits.map((line) => (
        <text key={line} className="plan-card-benefit">
          {line}
        </text>
      ))}
    </view>
  );
}
