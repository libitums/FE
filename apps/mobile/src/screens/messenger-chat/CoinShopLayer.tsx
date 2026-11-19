import type { ReactNode } from "@lynx-js/react";

import { CoinShopScreen } from "../coin-shop/CoinShopScreen";
import type { ShopFrom } from "../coin-shop/shop-model";

import "./chat-overlays.css";

export type CoinShopLayerProps = {
  readonly coinBalance: number;
  readonly onClose: () => void;
  /** 시스템 뒤로가기를 이 층이 직접 올릴지입니다. 방 안에서는 `useChatRoom`이 주인이라 끕니다(기본은 켬 — 목록 화면). */
  readonly ownsBack?: boolean;
  /** 메시지 전송에서 엽전이 모자라 열렸으면 send — 엽전 탭 아래 줄이 Chat Plus입니다(ADR-0160). */
  readonly from?: ShopFrom;
};

/**
 * 엽전 상점(ADR-0116)을 겹침으로 띄웁니다 — 옛 젬 화면 자리입니다. 시스템 뒤로가기는 상점이 한 층으로 올려 이 겹침만
 * 닫습니다(방 안에서는 `useChatRoom`이 주인이라 끕니다).
 */
export function CoinShopLayer({
  coinBalance,
  onClose,
  ownsBack = true,
  from = null,
}: CoinShopLayerProps): ReactNode {
  return (
    <CoinShopScreen
      coinBalance={coinBalance}
      onClose={onClose}
      ownsBack={ownsBack}
      surface="chat"
      from={from}
    />
  );
}
