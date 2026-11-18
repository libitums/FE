import type { ReactNode } from "@lynx-js/react";

import { color } from "@libitums/design-tokens";

import { bubbleIcon, crownIcon, waveTicketIcon } from "../../components/plan-icons";
import type { PlanId } from "../../lib/plans-api";
import { useUiCopy } from "../../lib/ui-copy";
import type { PlansCopy } from "../../lib/ui-copy-plans";
import { formatCoinCount } from "../coin-shop/coin-shop";
import {
  planCardLinesOf,
  priceSizeOf,
  type PlanBenefit,
  type PlanDetail,
  type PlanHeadline,
} from "./plans-model";
import type { PlanCardProps } from "./plans.contract";

import "./plan-card.css";

/** 혜택 한 줄의 글(낭독) — 숫자는 서버 표에서 옵니다. */
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

function headlineText(headline: PlanHeadline, copy: PlansCopy): string {
  switch (headline.kind) {
    case "everything":
      return copy.shop.headline.everything;
    case "chats":
      return copy.shop.headline.chats(headline.perDay);
    case "unlimited-chat":
      return copy.shop.headline.unlimitedChat;
    case "learn":
      return copy.shop.headline.learn;
  }
}

/** 세부 줄 — 월 엽전 하나뿐이면 긴 글을 주황으로(시안 Premium), 아니면 짧은 글을 「 · 」로 잇습니다. */
function detailText(
  details: readonly PlanDetail[],
  copy: PlansCopy,
): { readonly text: string; readonly accent: boolean } | null {
  const only = details.length === 1 ? details[0] : undefined;
  if (only?.kind === "coins")
    return { text: copy.shop.detail.coinsLong(formatCoinCount(only.coins)), accent: true };
  const parts = details.map((detail) =>
    detail.kind === "every-unit"
      ? copy.shop.detail.everyUnit
      : detail.kind === "all-friends"
        ? copy.shop.detail.allFriends
        : copy.shop.detail.coinsShort(formatCoinCount(detail.coins)),
  );
  return parts.length === 0 ? null : { text: parts.join(" · "), accent: false };
}

const icons: Readonly<Record<PlanId, string>> = {
  unlimited_tickets: waveTicketIcon,
  chat_plus: bubbleIcon,
  premium: crownIcon,
};

/**
 * 요금제 카드(ADR-0160 · 시안 S2) — 그림 · 이름 · 제목 · 세부 · (지금 글 | 바꿈 태그) · 가격 칸(금액 한 줄 + 기간 아랫줄) · 라디오. 카드 전체가
 * 단추 하나이고 낭독은 한 요소로 묶습니다(Android는 `flatten={false}`여야 요소가 남습니다). 지금 구독(`current`)은 고를 수 없는 회색 카드라
 * 단추가 아니고 라디오 · BEST 배지가 없습니다. 맥락 카드(`selected` 없음)는 라디오 없이 BEST를 테두리로 보입니다.
 */
export function PlanCard({
  card,
  period,
  testId,
  selected,
  current,
  tag,
  onPress,
}: PlanCardProps): ReactNode {
  const copy = useUiCopy();
  const text = copy.plans;
  const name = text.names[card.id];
  const price =
    card.price === null
      ? text.priceInStore
      : period === "monthly"
        ? text.perMonth(card.price)
        : text.perYear(card.price);
  const lines = planCardLinesOf(card.benefits);
  const detail = detailText(lines.details, text);
  const isCurrent = current !== undefined;
  const best = card.best && !isCurrent;
  const bordered = isCurrent ? false : (selected ?? card.best);
  const size = priceSizeOf(card.price);
  const label = [
    name,
    current ?? null,
    best ? copy.coinShop.bestValue : null,
    tag ?? null,
    price,
    ...card.benefits.map((benefit) => planBenefitText(benefit, text)),
    selected === true && !isCurrent ? text.selected : null,
  ]
    .filter((part): part is string => part !== null)
    .join(", ");
  const className = isCurrent
    ? "plan-card plan-card-current"
    : bordered
      ? "plan-card plan-card-on"
      : "plan-card";

  return (
    <view
      className={className}
      data-testid={testId}
      {...(selected === undefined ? {} : { "data-selected": String(selected === true && !isCurrent) })}
      data-current={String(isCurrent)}
      data-best={String(card.best)}
      flatten={false}
      accessibility-element={true}
      accessibility-label={label}
      // 지금 카드는 단추가 아닙니다. 값을 늘 적습니다 — 속성을 빼면 Lynx에서 앞 값이 남습니다.
      accessibility-traits={isCurrent ? "none" : "button"}
      bindtap={() => {
        "background only";
        if (!isCurrent) onPress();
      }}
    >
      <view className="plan-card-art" accessibility-elements-hidden={true}>
        <svg
          className="plan-card-art-icon"
          content={icons[card.id]}
          current-color={color.brand.primary}
        />
      </view>
      <view className="plan-card-main">
        <text className="plan-card-name">{name}</text>
        <text className="plan-card-headline">{headlineText(lines.headline, text)}</text>
        {detail === null ? null : (
          <text className={detail.accent ? "plan-card-detail plan-card-detail-accent" : "plan-card-detail"}>
            {detail.text}
          </text>
        )}
        {isCurrent ? (
          <view className="plan-card-pill plan-card-pill-current" data-testid={`${testId}-current`}>
            <text className="plan-card-pill-label plan-card-pill-label-current">{current}</text>
          </view>
        ) : tag === undefined ? null : (
          <view className="plan-card-pill" data-testid={`${testId}-tag`}>
            <text className="plan-card-pill-label">{tag}</text>
          </view>
        )}
      </view>
      <view className="plan-card-side">
        <view className="plan-card-price" data-testid={`${testId}-price`}>
          {card.price === null ? (
            <text className="plan-card-price-pending">{text.priceInStore}</text>
          ) : (
            <>
              <text
                className={`plan-card-amount plan-card-amount-${size}`}
                data-testid={`${testId}-amount`}
                data-size={size}
                text-maxline="1"
              >
                {card.price}
              </text>
              <text className="plan-card-period">
                {period === "monthly" ? text.shop.perMonthShort : text.shop.perYearShort}
              </text>
            </>
          )}
        </view>
        {selected === undefined || isCurrent ? null : (
          <view
            className={selected ? "plan-card-radio plan-card-radio-on" : "plan-card-radio"}
            data-testid={`${testId}-radio`}
            data-on={String(selected)}
          />
        )}
      </view>
      {best ? (
        <view className="plan-card-badge-anchor">
          <text className="plan-card-badge">{copy.coinShop.bestValue}</text>
        </view>
      ) : null}
    </view>
  );
}
