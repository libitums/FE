// 세션 층의 상점 열림(ADR-0160) — 머리 칩(엽전 · 요금제) · 티켓 모달 · 티켓 다 씀 대화상자 · 메신저 판이 같은 상점을 엽니다.
// 화면 전환(`Nav`)이 아니라 겹침이라 여기서만 듭니다. 채팅방 안의 상점은 방의 겹침 상태가 따로 듭니다(`CoinShopLayer`).

import { useState } from "@lynx-js/react";

import type { ShopRequest } from "../screens/coin-shop/shop-model";

export type ShopControl = {
  readonly request: ShopRequest | null;
  readonly open: (request: ShopRequest) => void;
  readonly close: () => void;
};

export function useShop(): ShopControl {
  const [request, setRequest] = useState<ShopRequest | null>(null);
  return { request, open: setRequest, close: () => setRequest(null) };
}
