import type { ReactNode } from "@lynx-js/react";

import { color } from "@libitums/design-tokens";

import { bubbleIcon, crownIcon } from "../../components/plan-icons";
import { useUiCopy } from "../../lib/ui-copy";
import { formatCoinCount } from "./coin-shop";
import type { ShopPromo } from "./shop-model";

import "./shop.css";

/**
 * 엽전 팩 아래 요금제 한 줄(ADR-0160 · 시안 S1) — 배너 대신 한 줄. 누르면 Plans 탭(그 요금제를 고른 채). 닫기 없음 · 움직임 없음이라
 * 귀찮게 하지 않습니다. 구독자가 이미 가진 혜택이면 줄이 없습니다(`shopPromoOf`).
 */
export function ShopPromoRow({
  promo,
  onPress,
}: {
  readonly promo: ShopPromo;
  readonly onPress: () => void;
}): ReactNode {
  const shop = useUiCopy().plans.shop;
  const line =
    promo.plan === "premium"
      ? shop.promo.premium(formatCoinCount(promo.coins))
      : shop.promo.chatPlus(promo.perDay);
  return (
    <view
      className="shop-promo"
      data-testid="shop-promo"
      accessibility-element={true}
      accessibility-traits="button"
      accessibility-label={`${line}, ${shop.tabs.plans}`}
      bindtap={() => {
        "background only";
        onPress();
      }}
    >
      <svg
        className="shop-promo-icon"
        content={promo.plan === "premium" ? crownIcon : bubbleIcon}
        current-color={color.brand.primary}
      />
      <text className="shop-promo-text">{line}</text>
      <text className="shop-promo-action">{shop.promo.action}</text>
    </view>
  );
}
