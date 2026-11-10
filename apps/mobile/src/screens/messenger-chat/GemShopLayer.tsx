import type { ReactNode } from "@lynx-js/react";

import { useLayerBack } from "../../lib/use-back-handler";
import { GemPurchaseScreen } from "../gem-purchase/GemPurchaseScreen";

import "./chat-overlays.css";

export type GemShopLayerProps = {
  readonly gemBalance: number;
  readonly onClose: () => void;
  /** 시스템 뒤로가기를 이 층이 직접 올릴지입니다. 방 안에서는 `useChatRoom`이 주인이라 끕니다(기본은 켬 — 목록 화면). */
  readonly ownsBack?: boolean;
};

/** 젬 화면을 겹침으로 띄웁니다. 시스템 뒤로가기는 한 층이 되어 이 겹침만 닫습니다. */
export function GemShopLayer({
  gemBalance,
  onClose,
  ownsBack = true,
}: GemShopLayerProps): ReactNode {
  useLayerBack(ownsBack ? onClose : null);
  return <GemPurchaseScreen gemBalance={gemBalance} onClose={onClose} />;
}
