// 요금제 테스트 대역(ADR-0144) — 서버 `companion_plans()` 1판 응답과 그것을 읽은 값. 서버 seed와 같은 숫자입니다.

import type { PlansCatalog } from "../../lib/plans-api";
import type { StoreOffer } from "../../lib/purchase-bridge";

export const serverPlansV1 = {
  version: 1,
  free: { dailyFreeMessages: 3 },
  plans: [
    {
      id: "unlimited_tickets",
      sortOrder: 1,
      chatRank: null,
      dailyFreeMessages: null,
      dailyMessageCap: null,
      monthlyCoins: 0,
      unlimitedTickets: true,
      allCharacters: false,
      highlight: false,
      products: { monthly: "duru.tickets.monthly.v1", yearly: "duru.tickets.yearly.v1" },
    },
    {
      id: "chat_plus",
      sortOrder: 2,
      chatRank: 1,
      dailyFreeMessages: 30,
      dailyMessageCap: null,
      monthlyCoins: 300,
      unlimitedTickets: false,
      allCharacters: true,
      highlight: false,
      products: { monthly: "duru.chatplus.monthly.v1", yearly: "duru.chatplus.yearly.v1" },
    },
    {
      id: "premium",
      sortOrder: 3,
      chatRank: 2,
      dailyFreeMessages: null,
      dailyMessageCap: 200,
      monthlyCoins: 800,
      unlimitedTickets: true,
      allCharacters: true,
      highlight: true,
      products: { monthly: "duru.premium.monthly.v1", yearly: "duru.premium.yearly.v1" },
    },
  ],
  coinPacks: [
    { productId: "duru.coins.500.v1", coins: 500, bonusCoins: 0 },
    { productId: "duru.coins.1200.v1", coins: 1000, bonusCoins: 200 },
    { productId: "duru.coins.3000.v1", coins: 2000, bonusCoins: 1000 },
  ],
};

export const catalogV1: PlansCatalog = {
  version: 1,
  freeDailyMessages: 3,
  plans: serverPlansV1.plans as PlansCatalog["plans"],
  coinPacks: serverPlansV1.coinPacks,
};

/** 2단계 다리가 돌려줄 법한 스토어 가격(테스트용). */
export const usdOffers: readonly StoreOffer[] = [
  { productId: "duru.tickets.monthly.v1", price: "$3.99" },
  { productId: "duru.tickets.yearly.v1", price: "$39.90" },
  { productId: "duru.chatplus.monthly.v1", price: "$6.99" },
  { productId: "duru.chatplus.yearly.v1", price: "$69.90" },
  { productId: "duru.premium.monthly.v1", price: "$11.99" },
  { productId: "duru.premium.yearly.v1", price: "$119.90" },
];
