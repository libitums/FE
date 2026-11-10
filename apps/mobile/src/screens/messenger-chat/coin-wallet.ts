// 엽전 지갑 포트 + 메모리 구현입니다(messenger-chat-1-5 spec §5.2 · §17 Q2). #405 파일은 import하지 않습니다.
// 번 엽전(earned)은 결선이 syncEarned로 넣고, 쓴 엽전(spent)은 이번 실행 메모리에만 둡니다(2단계에서 서버 차감으로 바뀜).

import { coinPlanFor, type CoinSpendReason } from "./chat-coins";

export type CoinSpendResult =
  | { readonly kind: "spent"; readonly balance: number }
  | { readonly kind: "short"; readonly shortBy: number };

export type CoinWallet = {
  /** 같은 값이면 알리지 않음. */
  readonly balance: () => number;
  readonly subscribe: (listener: () => void) => () => void;
  readonly canAfford: (price: number) => boolean;
  /** 모자라면 변화 없이 short. reason은 2단계 서버 차감 요청의 사유 자리. */
  readonly spend: (price: number, reason: CoinSpendReason) => CoinSpendResult;
};
export type SyncedCoinWallet = CoinWallet & {
  readonly syncEarned: (earned: number) => void;
  /** 쓴 양을 0으로 되돌립니다 — 계정이 바뀔 때(리뷰 P2-2). */
  readonly resetSpent: () => void;
};

const cleanEarned = (value: number): number =>
  Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;

/** balance = max(0, earned − spent). spent는 메모리에만. */
export function createCoinWallet(options: { readonly earned: number }): SyncedCoinWallet {
  let earned = cleanEarned(options.earned);
  let spent = 0;
  const listeners = new Set<() => void>();
  const balance = (): number => Math.max(0, earned - spent);
  const notifyIfChanged = (before: number): void => {
    if (balance() === before) return;
    for (const listener of [...listeners]) listener();
  };
  return {
    balance,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    canAfford: (price) => coinPlanFor(balance(), price).kind === "pay",
    spend: (price, _reason) => {
      if (!Number.isInteger(price) || price <= 0) return { kind: "spent", balance: balance() };
      const before = balance();
      if (before < price) return { kind: "short", shortBy: price - before };
      spent += price;
      notifyIfChanged(before);
      return { kind: "spent", balance: balance() };
    },
    resetSpent: () => {
      const before = balance();
      spent = 0;
      notifyIfChanged(before);
    },
    syncEarned: (next) => {
      const before = balance();
      earned = cleanEarned(next);
      notifyIfChanged(before);
    },
  };
}
