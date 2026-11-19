import { useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { Button } from "@libitums/ui-lynx/button";

import {
  purchaseIntentOf,
  purchasePack,
  purchaseRegion,
  purchaseStore,
  reportPurchaseIntent,
} from "../../lib/purchase-intent";
import { idleWait, packAdding, type PurchaseWait } from "../../lib/purchase-wait";
import { useUiCopy } from "../../lib/ui-copy";
import {
  coinPacks,
  findCoinPack,
  initialCoinPackId,
  packPriceOf,
  type CoinPackId,
} from "./coin-shop";
import { CoinPackCard } from "./CoinPackCard";
import type { ShopPromo } from "./shop-model";
import { ShopPromoRow } from "./ShopPromoRow";

import "./coin-shop-screen.css";

export type CoinShopPanelProps = {
  /** 연 자리 — 구매 의향 이벤트의 `surface`. */
  readonly surface: "learning" | "chat";
  readonly bottomInset: number;
  /** 안내(결제 준비 중)가 떠 있으면 뒤쪽을 낭독에서 가립니다. */
  readonly obscured: boolean;
  /** 결제를 열 수 없어 「결제 준비 중」 안내를 띄웁니다(상점 틀이 대화상자를 집니다). */
  readonly onUnavailable: () => void;
  /** 팩 아래 요금제 한 줄(ADR-0160) — 없으면 줄 없음. */
  readonly promo: ShopPromo | null;
  readonly onPromo: () => void;
  /** 구매 뒤 서버 확인 대기(ADR-0163) — 산 팩 카드에 「Adding to your wallet」. */
  readonly wait?: PurchaseWait;
};

/**
 * 상점의 엽전 탭(ADR-0116 · ADR-0160 시안 S1) — 제목 · 팩 셋 · 요금제 한 줄이 스크롤되고 바닥에 사기 단추 · 스토어 안내. 사기는 결제를 열 수
 * 있으면(ADR-0144 2단계) 스토어 결제 시트를 열고, 엽전은 서버가 웹훅을 받아 늘립니다. 열 수 없으면 「결제 준비 중」 안내로 끝납니다.
 */
export function CoinShopPanel({
  surface,
  bottomInset,
  obscured,
  onUnavailable,
  promo,
  onPromo,
  wait = idleWait,
}: CoinShopPanelProps): ReactNode {
  const shop = useUiCopy().coinShop;
  const [selectedId, setSelectedId] = useState<CoinPackId>(initialCoinPackId);
  const selected = findCoinPack(selectedId);
  // 가격 지역은 요금제 결선이 적은 학습자 나라(ADR-0144 추가 2026-11-17).
  const region = purchaseRegion();
  const store = purchaseStore();
  const selectedPrice = packPriceOf(selected, region, store.offers);
  // 결제 시트가 떠 있는 동안 — 사기 단추에 로딩을 보이고 다시 누름을 막습니다.
  const [buying, setBuying] = useState(false);
  // 결제가 실패했을 때(취소 아님) 버튼 아래 짧은 안내 — 막지 않고, 다시 사면 걷힙니다.
  const [failed, setFailed] = useState(false);
  const handleBuy = () => {
    "background only";
    if (buying) return;
    const purchase = purchasePack();
    // 결제를 열지 못하고 「결제 준비 중」 안내로 끝나도 구매 의향은 남깁니다.
    reportPurchaseIntent(
      purchaseIntentOf({
        surface,
        placement: "coin_shop",
        kind: "pack",
        product: selected.productId,
        period: "once",
        shown: selectedPrice,
        region,
        storefront: store.storefront,
        preview: !purchase.available,
      }),
    );
    if (!purchase.available) {
      onUnavailable();
      return;
    }
    setBuying(true);
    setFailed(false);
    void purchase
      .buy(selected.productId)
      .then((result) => {
        if (result.kind === "unavailable") onUnavailable();
        if (result.kind === "failed") setFailed(true);
      })
      .catch(() => setFailed(true))
      .finally(() => setBuying(false));
  };

  return (
    <>
      <scroll-view
        className="coin-shop-screen-scroll"
        scroll-orientation="vertical"
        scroll-bar-enable={false}
        accessibility-elements-hidden={obscured}
      >
        <view className="coin-shop-screen-body">
          <view className="coin-shop-screen-titles">
            <text
              className="coin-shop-screen-title"
              accessibility-element={true}
              accessibility-traits="header"
            >
              {shop.title}
            </text>
            <text className="coin-shop-screen-subtitle">{shop.subtitle}</text>
          </view>
          <view className="coin-shop-screen-packs">
            {coinPacks.map((pack) => (
              <CoinPackCard
                region={region}
                offers={store.offers}
                key={pack.id}
                pack={pack}
                selected={pack.id === selectedId}
                adding={packAdding(wait, pack.productId)}
                onSelect={setSelectedId}
              />
            ))}
          </view>
          {promo === null ? null : <ShopPromoRow promo={promo} onPress={onPromo} />}
        </view>
      </scroll-view>
      <view
        className="coin-shop-screen-footer"
        style={{ paddingBottom: `${bottomInset + 24}px` }}
        accessibility-elements-hidden={obscured}
      >
        <view data-testid="coin-shop-screen-buy">
          <Button
            label={shop.buy(selectedPrice.text)}
            variant="brand"
            size="xl"
            width="fill"
            loading={buying}
            bindtap={handleBuy}
          />
        </view>
        {failed ? (
          <text
            className="coin-shop-screen-store-note"
            data-testid="coin-shop-screen-failed"
            accessibility-element={true}
          >
            {shop.purchaseFailed}
          </text>
        ) : null}
        <text className="coin-shop-screen-store-note">{shop.storeNote}</text>
      </view>
    </>
  );
}
