// 엽전 가격표 · 낼 수 있나 판정입니다(messenger-chat-1-5 spec §4.2).

export const CHAT_COIN_PRICES = { message: 3, voice: 15, photo: 35 } as const;
export type CoinSpendReason = keyof typeof CHAT_COIN_PRICES;
export type CoinPlan =
  | { readonly kind: "pay"; readonly price: number }
  | { readonly kind: "top-up"; readonly price: number; readonly shortBy: number };

/** 유한 · 양 아닌 balance는 0. balance ≥ price → pay, 아니면 shortBy = price − balance. */
export function coinPlanFor(balance: number, price: number): CoinPlan {
  const have = Number.isFinite(balance) && balance > 0 ? balance : 0;
  if (have >= price) return { kind: "pay", price };
  return { kind: "top-up", price, shortBy: price - have };
}
