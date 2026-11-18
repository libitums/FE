import { afterEach, describe, expect, test, vi } from "vitest";

import {
  createNativePurchaseBridge,
  storefrontFrom,
  storeOffersFrom,
  type PurchasesModule,
} from "./native-purchase-bridge";

// `unit` 계층(NP-U1 ~ NP-U7, ADR-0144 2단계 앞부분 2026-11-17): 호스트 `PurchasesModule`(RevenueCat)을 감싼 구매 다리 —
// 페이로드를 좁히고, 모듈이 없으면(SDK 키 없음) 꺼진 다리와 같게, 결제 플래그가 꺼졌으면 구매 · 복원을 열지 않는다.

type Reply = Record<string, unknown>;

function fakeModule(replies: Partial<Record<keyof PurchasesModule, Reply>>): PurchasesModule {
  const answer =
    (name: keyof PurchasesModule) =>
    (...args: unknown[]) => {
      const callback = args[args.length - 1] as (payload: unknown) => void;
      callback(replies[name] ?? { status: "failed" });
    };
  return {
    configure: vi.fn(answer("configure")),
    signOut: vi.fn(answer("signOut")),
    offerings: vi.fn(answer("offerings")),
    storefront: vi.fn(answer("storefront")),
    purchase: vi.fn(answer("purchase")),
    restore: vi.fn(answer("restore")),
  } as unknown as PurchasesModule;
}

afterEach(() => {
  vi.useRealTimers();
});

describe("NP-U1 상품 페이로드", () => {
  test("상품 id · 가격 글 · 금액 · 통화를 좁히고, Play 구독의 `id:기본요금제`는 앞부분으로 맞춘다", () => {
    expect(
      storeOffersFrom({
        status: "ok",
        products: [
          {
            productId: "duru.premium.monthly.v1:monthly",
            price: "179.000 ₫",
            amount: 179000,
            currency: "VND",
          },
          { productId: "duru.coins.500.v1", price: "$4.99", amount: 4.99, currency: "usd" },
        ],
      }),
    ).toEqual([
      { productId: "duru.premium.monthly.v1", price: "179.000 ₫", amount: 179000, currency: "VND" },
      { productId: "duru.coins.500.v1", price: "$4.99", amount: 4.99, currency: "USD" },
    ]);
  });

  test("가격 글이 없는 상품은 버리고, 금액 · 통화를 모르면 null", () => {
    expect(
      storeOffersFrom({
        status: "ok",
        products: [
          { productId: "duru.tickets.monthly.v1", price: "" },
          { productId: "duru.tickets.yearly.v1", price: "$39.99", amount: "x" },
          "nope",
        ],
      }),
    ).toEqual([
      { productId: "duru.tickets.yearly.v1", price: "$39.99", amount: null, currency: null },
    ]);
  });

  test("실패 · 모르는 모양이면 null", () => {
    expect(storeOffersFrom({ status: "failed" })).toBeNull();
    expect(storeOffersFrom(null)).toBeNull();
    expect(storeOffersFrom({ status: "ok", products: "x" })).toBeNull();
  });
});

describe("NP-U2 스토어 나라", () => {
  test("두 글자는 대문자로, iOS의 세 글자는 두 글자로 맞춘다", () => {
    expect(storefrontFrom({ status: "ok", country: "vn" })).toBe("VN");
    expect(storefrontFrom({ status: "ok", country: "VNM" })).toBe("VN");
    expect(storefrontFrom({ status: "ok", country: "PHL" })).toBe("PH");
    expect(storefrontFrom({ status: "ok", country: "USA" })).toBe("US");
    expect(storefrontFrom({ status: "ok", country: "KOR" })).toBe("KOR");
  });

  test("비었거나 실패면 null", () => {
    expect(storefrontFrom({ status: "ok", country: "" })).toBeNull();
    expect(storefrontFrom({ status: "failed" })).toBeNull();
    expect(storefrontFrom(undefined)).toBeNull();
  });
});

test("NP-U3 모듈이 없으면(SDK 키 없음) 꺼진 다리와 같다", async () => {
  const bridge = createNativePurchaseBridge(
    () => undefined,
    () => true,
  );
  expect(bridge.available).toBe(false);
  expect(await bridge.configure("u1")).toBe(false);
  expect(await bridge.offerings()).toBeNull();
  expect(await bridge.storefront()).toBeNull();
  expect(await bridge.purchase("duru.premium.monthly.v1")).toEqual({ kind: "unavailable" });
  expect(await bridge.restore()).toEqual({ kind: "unavailable" });
});

test("NP-U4 모듈이 있으면 상품 · 나라 · 로그인을 잇는다", async () => {
  const module = fakeModule({
    configure: { status: "ok" },
    offerings: {
      status: "ok",
      products: [
        {
          productId: "duru.tickets.monthly.v1",
          price: "Rp 29.000",
          amount: 29000,
          currency: "IDR",
        },
      ],
    },
    storefront: { status: "ok", country: "IDN" },
  });
  const bridge = createNativePurchaseBridge(
    () => module,
    () => false,
  );
  expect(await bridge.configure("u1")).toBe(true);
  expect(module.configure).toHaveBeenCalledWith("u1", expect.any(Function));
  expect(await bridge.offerings()).toEqual([
    { productId: "duru.tickets.monthly.v1", price: "Rp 29.000", amount: 29000, currency: "IDR" },
  ]);
  expect(await bridge.storefront()).toBe("ID");
  await bridge.signOut();
  expect(module.signOut).toHaveBeenCalledTimes(1);
});

test("NP-U5 결제 플래그가 꺼졌으면 모듈이 있어도 구매 · 복원을 열지 않는다", async () => {
  const module = fakeModule({ purchase: { status: "purchased", productId: "duru.coins.500.v1" } });
  const bridge = createNativePurchaseBridge(
    () => module,
    () => false,
  );
  expect(bridge.available).toBe(false);
  expect(await bridge.purchase("duru.coins.500.v1")).toEqual({ kind: "unavailable" });
  expect(await bridge.restore()).toEqual({ kind: "unavailable" });
  expect(module.purchase).not.toHaveBeenCalled();
});

test("NP-U6 결제 플래그가 켜졌으면 구매 · 복원 결과를 좁힌다", async () => {
  const module = fakeModule({
    purchase: { status: "purchased", productId: "duru.premium.yearly.v1:yearly" },
    restore: { status: "restored", active: 2 },
  });
  const bridge = createNativePurchaseBridge(
    () => module,
    () => true,
  );
  expect(bridge.available).toBe(true);
  expect(await bridge.purchase("duru.premium.yearly.v1")).toEqual({
    kind: "purchased",
    productId: "duru.premium.yearly.v1",
  });
  expect(await bridge.restore()).toEqual({ kind: "restored", active: 2 });
  const cancelled = createNativePurchaseBridge(
    () => fakeModule({ purchase: { status: "cancelled" } }),
    () => true,
  );
  expect(await cancelled.purchase("duru.coins.500.v1")).toEqual({ kind: "cancelled" });
});

test("NP-U7 호스트가 답하지 않거나 던지면 상품 · 나라는 null로 끝난다(멈추지 않음)", async () => {
  vi.useFakeTimers();
  const silent = {
    offerings: vi.fn(),
    storefront: vi.fn(() => {
      throw new Error("bridge");
    }),
  } as unknown as PurchasesModule;
  const bridge = createNativePurchaseBridge(
    () => silent,
    () => false,
  );
  const offers = bridge.offerings();
  const country = bridge.storefront();
  await vi.advanceTimersByTimeAsync(20_000);
  expect(await offers).toBeNull();
  expect(await country).toBeNull();
});
