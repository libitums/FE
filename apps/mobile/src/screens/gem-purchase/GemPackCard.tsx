import type { ReactNode } from "@lynx-js/react";

import {
  formatGemCount,
  formatPrice,
  formatPricePerGem,
  packCaption,
  type GemPack,
  type GemPackId,
} from "./gem-purchase";
import { gemIcon } from "./gem-icon";

// 젬 구매 화면(`GemPurchaseScreen`)의 팩 카드입니다. 스타일은 화면의 CSS가 함께 집니다.

type GemPackCardProps = {
  readonly pack: GemPack;
  readonly selected: boolean;
  readonly onSelect: (id: GemPackId) => void;
};

// 팩 카드 하나입니다 — 카드 전체가 한 조작 단위(고르기)이고, 오른쪽 아래 동그라미는
// 고른 상태를 보이는 표식일 뿐 따로 누르는 자리가 아닙니다.
export function GemPackCard({ pack, selected, onSelect }: GemPackCardProps): ReactNode {
  const handleTap = () => {
    "background only";
    onSelect(pack.id);
  };
  const spoken = [
    `${formatGemCount(pack.gems)} 젬`,
    packCaption(pack),
    formatPrice(pack.priceCents),
    pack.badge,
    selected ? "선택됨" : undefined,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <view
      className={selected ? "gem-purchase-pack gem-purchase-pack-selected" : "gem-purchase-pack"}
      data-testid={`gem-purchase-pack-${pack.id}`}
      data-selected={selected ? "true" : "false"}
      accessibility-element={true}
      accessibility-traits="button"
      accessibility-label={spoken}
      bindtap={handleTap}
    >
      <view className="gem-purchase-screen-gem-box">
        <svg className="gem-purchase-screen-gem" content={gemIcon} />
      </view>
      <view className="gem-purchase-pack-main">
        {/* 숫자와 단위는 크기가 다른 한 줄이라 안쪽 `<text>`로 잇습니다 — 기준선이 맞습니다. */}
        <text className="gem-purchase-pack-amount">
          <text className="gem-purchase-pack-gems">{formatGemCount(pack.gems)}</text>
          <text className="gem-purchase-pack-unit"> GEM</text>
        </text>
        <text
          className={
            pack.bonusGems > 0
              ? "gem-purchase-pack-caption gem-purchase-pack-caption-bonus"
              : "gem-purchase-pack-caption"
          }
        >
          {packCaption(pack)}
        </text>
      </view>
      <view className="gem-purchase-pack-price">
        <text className="gem-purchase-pack-price-value">{formatPrice(pack.priceCents)}</text>
        <text className="gem-purchase-pack-per-gem">{formatPricePerGem(pack)}</text>
      </view>
      <view
        className={
          selected
            ? "gem-purchase-pack-radio gem-purchase-pack-radio-selected"
            : "gem-purchase-pack-radio"
        }
      />
      {pack.badge === undefined ? null : (
        <view className="gem-purchase-pack-badge-anchor">
          <text className="gem-purchase-pack-badge">{pack.badge}</text>
        </view>
      )}
    </view>
  );
}
