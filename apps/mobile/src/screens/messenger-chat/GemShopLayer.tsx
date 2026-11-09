import type { ReactNode } from "@lynx-js/react";

import { useLayerBack } from "../../lib/use-back-handler";
import { GemPurchaseScreen } from "../gem-purchase/GemPurchaseScreen";

import "./chat-overlays.css";

export type GemShopLayerProps = {
  readonly gemBalance: number;
  readonly onClose: () => void;
};

/** 젬 화면을 겹침으로 띄웁니다. 시스템 뒤로가기는 한 층이 되어 이 겹침만 닫습니다. */
export function GemShopLayer({ gemBalance, onClose }: GemShopLayerProps): ReactNode {
  useLayerBack(onClose);
  return <GemPurchaseScreen gemBalance={gemBalance} onClose={onClose} />;
}
