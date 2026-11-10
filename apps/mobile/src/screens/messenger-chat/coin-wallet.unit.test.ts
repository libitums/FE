import { describe, expect, test, vi } from "vitest";

import { createCoinWallet } from "./coin-wallet";

// `unit` 계층(MC2-U22): 엽전 지갑 포트 + 메모리 구현(messenger-chat-1-5 spec §5.2).
// 포트(spend · canAfford · subscribe)와 syncEarned 만 본다 — 실제 엽전 수 연결은 integration 몫이다.

describe("createCoinWallet 잔액 · spend (MC2-U22)", () => {
  test("MC2-U22. 번 것 100 에서 60 을 쓰면 spent · 잔액 40 이다", () => {
    const wallet = createCoinWallet({ earned: 100 });
    expect(wallet.balance()).toBe(100);
    expect(wallet.spend(60, "photo")).toEqual({ kind: "spent", balance: 40 });
    expect(wallet.balance()).toBe(40);
  });

  test("MC2-U22. 모자라면 변화 없이 short 이고 모자란 만큼을 알려 준다", () => {
    const wallet = createCoinWallet({ earned: 100 });
    wallet.spend(60, "photo");
    expect(wallet.spend(60, "photo")).toEqual({ kind: "short", shortBy: 20 });
    expect(wallet.balance()).toBe(40);
  });

  test("MC2-U22. 정확히 남은 만큼은 쓸 수 있고 잔액은 0 이 된다", () => {
    const wallet = createCoinWallet({ earned: 40 });
    expect(wallet.spend(40, "voice")).toEqual({ kind: "spent", balance: 0 });
    expect(wallet.spend(10, "message")).toEqual({ kind: "short", shortBy: 10 });
  });

  test("MC2-U22. canAfford: 잔액 40 에서 40 은 참 · 41 은 거짓", () => {
    const wallet = createCoinWallet({ earned: 100 });
    wallet.spend(60, "photo");
    expect(wallet.canAfford(40)).toBe(true);
    expect(wallet.canAfford(41)).toBe(false);
  });

  test.each([[0], [-10], [Number.NaN], [1.5], [Number.POSITIVE_INFINITY]])(
    "MC2-U22. 가격 %s(양의 정수가 아님)는 변화 없이 spent · 지금 잔액이다",
    (price) => {
      const wallet = createCoinWallet({ earned: 100 });
      const listener = vi.fn();
      wallet.subscribe(listener);
      expect(wallet.spend(price, "message")).toEqual({ kind: "spent", balance: 100 });
      expect(wallet.balance()).toBe(100);
      expect(listener).not.toHaveBeenCalled();
    },
  );
});

describe("createCoinWallet syncEarned (MC2-U22)", () => {
  test("MC2-U22. 번 값이 쓴 값보다 작으면 잔액은 0 이다 — max(0, 30 − 60)", () => {
    const wallet = createCoinWallet({ earned: 100 });
    wallet.spend(60, "photo");
    wallet.syncEarned(30);
    expect(wallet.balance()).toBe(0);
  });

  test("MC2-U22. 번 값이 늘면 쓴 값을 뺀 만큼 잔액이 는다", () => {
    const wallet = createCoinWallet({ earned: 100 });
    wallet.spend(60, "photo");
    wallet.syncEarned(250);
    expect(wallet.balance()).toBe(190);
  });

  test("MC2-U22. 쓴 값은 syncEarned 로 지워지지 않는다(메모리 원장)", () => {
    const wallet = createCoinWallet({ earned: 100 });
    wallet.spend(60, "photo");
    wallet.syncEarned(100);
    expect(wallet.balance()).toBe(40);
  });
});

describe("createCoinWallet subscribe (MC2-U22)", () => {
  test("MC2-U22. 같은 값으로 sync 하면 알림이 없다", () => {
    const wallet = createCoinWallet({ earned: 100 });
    const listener = vi.fn();
    wallet.subscribe(listener);
    wallet.syncEarned(100);
    expect(listener).not.toHaveBeenCalled();
  });

  test("MC2-U22. 값이 바뀌는 sync 는 한 번 알린다", () => {
    const wallet = createCoinWallet({ earned: 100 });
    const listener = vi.fn();
    wallet.subscribe(listener);
    wallet.syncEarned(130);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(wallet.balance()).toBe(130);
  });

  test("MC2-U22. 잔액이 바뀌는 spend 는 한 번 알리고, short 는 알리지 않는다", () => {
    const wallet = createCoinWallet({ earned: 50 });
    const listener = vi.fn();
    wallet.subscribe(listener);
    wallet.spend(10, "message");
    expect(listener).toHaveBeenCalledTimes(1);
    wallet.spend(500, "photo");
    expect(listener).toHaveBeenCalledTimes(1);
  });

  test("MC2-U22. 구독을 해제하면 더는 알리지 않는다", () => {
    const wallet = createCoinWallet({ earned: 100 });
    const listener = vi.fn();
    const unsubscribe = wallet.subscribe(listener);
    unsubscribe();
    wallet.spend(10, "message");
    wallet.syncEarned(500);
    expect(listener).not.toHaveBeenCalled();
  });

  test("MC2-U22. 구독자 둘은 둘 다 알림을 받는다", () => {
    const wallet = createCoinWallet({ earned: 100 });
    const a = vi.fn();
    const b = vi.fn();
    wallet.subscribe(a);
    wallet.subscribe(b);
    wallet.spend(10, "message");
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
  });
});
