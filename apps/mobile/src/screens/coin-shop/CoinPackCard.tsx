import type { ReactNode } from "@lynx-js/react";

import { useMotion } from "@libitums/ui-lynx/motion";

import type { PricingRegion } from "../../lib/provisional-prices";
import type { StoreOffer } from "../../lib/purchase-bridge";
import { useUiCopy } from "../../lib/ui-copy";
import {
  formatCoinCount,
  packPriceOf,
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
  /** 임시 추천 가격의 지역 — 없으면 US. */
  readonly region?: PricingRegion;
  /** 스토어 상품(ADR-0144 2단계) — 있으면 스토어 가격 글이 이깁니다. */
  readonly offers?: readonly StoreOffer[] | null;
  readonly onSelect: (id: CoinPackId) => void;
  /** 이 팩을 산 뒤 서버가 엽전을 넣는 중(ADR-0163) — 보너스 자리에 「Adding to your wallet」. */
  readonly adding?: boolean;
};

export function CoinPackCard({
  pack,
  selected,
  onSelect,
  region = "US",
  offers = null,
  adding = false,
}: CoinPackCardProps): ReactNode {
  const copy = useUiCopy();
  const shop = copy.coinShop;
  const still = useMotion() === "reduced";
  const handleTap = () => {
    "background only";
    onSelect(pack.id);
  };
  const total = totalCoinsOf(pack);
  const price = packPriceOf(pack, region, offers).text;
  const bonus = pack.bonusCoins > 0 ? shop.bonus(formatCoinCount(pack.bonusCoins)) : null;
  const details = [
    shop.packName[pack.id],
    shop.packAmount(total, formatCoinCount(total)),
    bonus,
    price,
    pack.bestValue ? shop.bestValue : null,
    adding ? shop.purchaseWait.adding : null,
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
        {/* 산 뒤 서버가 엽전을 넣는 동안 보너스 자리(없으면 그 줄)에 「Adding」 — 카드 최소 높이 100 안이라 커지지 않습니다(ADR-0163). */}
        {adding ? (
          <view
            className="coin-shop-pack-bonus coin-shop-pack-adding"
            data-testid={`coin-shop-pack-${pack.id}-adding`}
          >
            <view
              className={
                still
                  ? "coin-shop-pack-adding-spinner"
                  : "coin-shop-pack-adding-spinner coin-shop-pack-adding-spin"
              }
            />
            <text className="coin-shop-pack-bonus-label">{shop.purchaseWait.adding}</text>
          </view>
        ) : bonus === null ? null : (
          <view className="coin-shop-pack-bonus">
            <text className="coin-shop-pack-bonus-label">{bonus}</text>
          </view>
        )}
      </view>
      <view className="coin-shop-pack-side">
        <text className="coin-shop-pack-price">{price}</text>
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
