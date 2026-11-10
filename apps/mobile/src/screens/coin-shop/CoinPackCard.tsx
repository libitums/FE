import type { ReactNode } from "@lynx-js/react";

import { useUiCopy } from "../../lib/ui-copy";
import {
  formatCoinCount,
  formatPrice,
  totalCoinsOf,
  type CoinPack,
  type CoinPackId,
} from "./coin-shop";

// 엽전 상점(`CoinShopScreen`)의 팩 카드입니다. 스타일은 화면의 CSS가 함께 집니다.
//
// 카드 전체가 한 조작 단위(고르기)이고, 오른쪽 동그라미는 고른 상태를 보이는 표식일 뿐 따로 누르는 자리가
// 아닙니다. 그림은 장식이라 낭독에서 뺍니다 — 카드 이름이 팩 이름 · 엽전 수 · 보너스 · 가격을 다 읽습니다.

type CoinPackCardProps = {
  readonly pack: CoinPack;
  readonly selected: boolean;
  readonly onSelect: (id: CoinPackId) => void;
};

export function CoinPackCard({ pack, selected, onSelect }: CoinPackCardProps): ReactNode {
  const copy = useUiCopy();
  const shop = copy.coinShop;
  const handleTap = () => {
    "background only";
    onSelect(pack.id);
  };
  const total = totalCoinsOf(pack);
  const bonus = pack.bonusCoins > 0 ? shop.bonus(formatCoinCount(pack.bonusCoins)) : null;
  const details = [
    shop.packName[pack.id],
    shop.packAmount(total, formatCoinCount(total)),
    bonus,
    formatPrice(pack.priceCents),
    pack.bestValue ? shop.bestValue : null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <view
      className={selected ? "coin-shop-pack coin-shop-pack-selected" : "coin-shop-pack"}
      data-testid={`coin-shop-pack-${pack.id}`}
      data-selected={selected ? "true" : "false"}
      accessibility-element={true}
      accessibility-traits="button"
      accessibility-label={selected ? copy.common.selected(details) : details}
      bindtap={handleTap}
    >
      <view
        className={
          selected ? "coin-shop-pack-art coin-shop-pack-art-selected" : "coin-shop-pack-art"
        }
        accessibility-elements-hidden={true}
      >
        <image className="coin-shop-pack-art-image" src={pack.art} mode="aspectFit" />
      </view>
      <view className="coin-shop-pack-main">
        <text className="coin-shop-pack-name">{shop.packName[pack.id]}</text>
        {/* 숫자와 단위는 크기가 다른 한 줄이라 안쪽 `<text>`로 잇습니다 — 기준선이 맞습니다. */}
        <text className="coin-shop-pack-amount">
          <text className="coin-shop-pack-coins">{formatCoinCount(total)}</text>
          <text className="coin-shop-pack-unit">{` ${shop.coinsUnit}`}</text>
        </text>
        {bonus === null ? null : (
          <view className="coin-shop-pack-bonus">
            <text className="coin-shop-pack-bonus-label">{bonus}</text>
          </view>
        )}
      </view>
      <view className="coin-shop-pack-side">
        <text className="coin-shop-pack-price">{formatPrice(pack.priceCents)}</text>
        <view
          className={
            selected ? "coin-shop-pack-radio coin-shop-pack-radio-selected" : "coin-shop-pack-radio"
          }
        />
      </view>
      {pack.bestValue ? (
        <view className="coin-shop-pack-badge-anchor">
          <text className="coin-shop-pack-badge">{shop.bestValue}</text>
        </view>
      ) : null}
    </view>
  );
}
