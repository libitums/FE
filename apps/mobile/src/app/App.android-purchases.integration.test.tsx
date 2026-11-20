import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { App } from "./App";
import type { AnalyticsEventSinks } from "../lib/analytics.contract";
import { withAirbridgeEvents } from "../lib/airbridge-events";
import { resolveAirbridgeEventTracker } from "../lib/airbridge-events-module";
import { resetPushWiringForTests } from "./push-wiring";
import { authSessionStorageKey, serializeAuthSession } from "../lib/auth-session";
import { entrySplashDurationMs } from "../lib/entry-flow";
import { learningItemGuideSeenStorageKey } from "../lib/learning-item-guide";
import { allLearningItemGuidesSeenValue } from "../lib/learning-item-guide.test-support";
import { setPlanAccess } from "../lib/plan-access";
import { catalogV1 } from "../screens/plans/plans.test-support";

// `integration` 계층(AP-I1 ~ AP-I2, ADR-0144 「Android 결제 준비」): Android 호스트(`PurchasesModule.java`)의 답 모양으로 요금제 결선
// (`usePlans`) → 상점 · Plans · Airbridge가 iOS와 같게 움직이는지. 대역은 경계뿐(플래그 · 요금제 RPC · 호스트 모듈 · `StorageModule` · `fetch`).

const rpc = vi.hoisted(() => ({ catalog: null as unknown, balances: [] as (number | null)[] }));
const host = vi.hoisted(() => ({
  purchase: { status: "failed" } as unknown,
  bought: [] as string[],
}));
const airbridge = vi.hoisted(() => ({ calls: [] as [string, unknown][] }));
vi.mock("../lib/plans-flag", () => ({
  plansFeatureEnabled: () => true,
  purchasesEnabled: () => true,
}));
vi.mock("../lib/plans-api", async (original) => ({
  ...(await original<typeof import("../lib/plans-api")>()),
  plansClient: () => ({
    catalog: async () => rpc.catalog,
    entitlements: async () => ({ tier: "free", unlimitedTickets: false, entitlements: [] }),
    balance: async () => (rpc.balances.length > 1 ? rpc.balances.shift() : rpc.balances[0]) ?? null,
  }),
}));
// 따라잡기의 기다림은 풀지 않습니다 — 보류 결제는 기다림을 시작하지 않아야 하고, 성공은 첫 칸에서 멈춰 있습니다.
vi.mock("../lib/purchase-refresh", async (original) => ({
  ...(await original<typeof import("../lib/purchase-refresh")>()),
  sleep: () => new Promise<void>(() => {}),
}));
vi.mock("../lib/coin-wallet-api", () => ({
  coinClient: () => ({ claim: async () => null }),
}));

// Play 상품 그대로: 구독은 RevenueCat이 `구독id:기본요금제id`로, 인앱 상품은 id 그대로, 통화는 대문자 · 가격 글은 Play가 매긴 값.
const playProducts = [
  { productId: "duru.coins.1200.v1", price: "₫249.000", amount: 249000, currency: "VND" },
  { productId: "duru.premium.monthly.v1:base", price: "₫299.000", amount: 299000, currency: "VND" },
];

const refreshedBody = JSON.stringify({
  access_token: `e30.${btoa(JSON.stringify({ sub: "plans-user" })).replace(/=+$/, "")}.sig`,
  refresh_token: "refreshed-refresh",
  expires_in: 3600,
  token_type: "bearer",
  user: { id: "plans-user" },
});

async function boot(): Promise<void> {
  const store = new Map<string, string>([
    [
      authSessionStorageKey,
      serializeAuthSession({ accessToken: "a", refreshToken: "r", expiresAt: 4_102_444_800_000 }),
    ],
    [learningItemGuideSeenStorageKey, allLearningItemGuidesSeenValue],
  ]);
  vi.stubGlobal("NativeModules", {
    AirbridgeEventsModule: {
      trackEvent: (category: string, attributes: unknown) =>
        void airbridge.calls.push([category, attributes]),
    },
    StorageModule: {
      get: (key: string) => store.get(key) ?? null,
      set: (key: string, value: string) => void store.set(key, value),
      remove: (key: string) => void store.delete(key),
    },
    PurchasesModule: {
      configure: (_userId: string, callback: (payload: unknown) => void) =>
        callback({ status: "ok" }),
      signOut: (callback: (payload: unknown) => void) => callback({ status: "ok" }),
      offerings: (callback: (payload: unknown) => void) =>
        callback({ status: "ok", products: playProducts }),
      // Play 계정 나라는 두 글자(ISO 3166-1 alpha-2)로 옵니다.
      storefront: (callback: (payload: unknown) => void) =>
        callback({ status: "ok", country: "VN" }),
      purchase: (id: string, callback: (payload: unknown) => void) => {
        host.bought.push(id);
        callback(host.purchase);
      },
      restore: (callback: (payload: unknown) => void) =>
        callback({ status: "restored", active: 0 }),
    },
  });
  vi.stubEnv("PUBLIC_SUPABASE_URL", "https://test.supabase.co");
  vi.stubEnv("PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
  vi.stubGlobal("fetch", (url: string) => {
    if (url.includes("grant_type=refresh_token"))
      return Promise.resolve({ status: 200, text: async () => refreshedBody });
    const name = url.split("/rest/v1/rpc/")[1] ?? url;
    const body = name === "load_learning_progress" ? "null" : "";
    return Promise.resolve({ status: body === "" ? 204 : 200, text: async () => body });
  });
  vi.useFakeTimers();
  const sinks = withAirbridgeEvents(
    {
      entryEventSink: null,
      notificationEventSink: null,
      settingsEventSink: null,
      episodeIntroEventSink: () => {},
    } as unknown as AnalyticsEventSinks,
    resolveAirbridgeEventTracker(),
  );
  render(<App episodeIntroEventSink={sinks.episodeIntroEventSink} />);
  act(() => {
    vi.advanceTimersByTime(entrySplashDurationMs);
  });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
  vi.useRealTimers();
  await flush();
}

const flush = () => act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
const present = (testId: string) => screen.queryByTestId(testId) !== null;
const tap = (testId: string) => act(() => void fireEvent.tap(screen.getByTestId(testId), {}));
const orderCompleted = () =>
  airbridge.calls.filter(([category]) => category === "airbridge.ecommerce.order.completed");
async function buyPouch(): Promise<void> {
  tap("top-bar-coins");
  tap("coin-shop-pack-pouch");
  await act(async () => {
    fireEvent.tap(
      within(screen.getByTestId("coin-shop-screen-buy")).getByTestId("ui-lynx-button"),
      {},
    );
  });
  for (let i = 0; i < 3; i += 1) await flush();
}

beforeEach(() => {
  rpc.catalog = catalogV1;
  rpc.balances = [100];
  host.purchase = { status: "failed" };
  host.bought = [];
  airbridge.calls = [];
});
afterEach(() => {
  cleanup();
  setPlanAccess(null);
  resetPushWiringForTests();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

test("AP-I1 Play 보류 결제(pending)는 실패 줄 · 확인 대기 알약 · Order Complete 없이 조용히 끝나고 다시 살 수 있다", async () => {
  host.purchase = { status: "pending" };
  await boot();
  await buyPouch();
  expect(host.bought).toEqual(["duru.coins.1200.v1"]);
  expect(present("coin-shop-screen-failed")).toBe(false);
  expect(present("purchase-pill")).toBe(false);
  expect(present("coin-shop-screen-balance-updating")).toBe(false);
  expect(orderCompleted()).toEqual([]);
  // 같은 결제가 「실패」였다면 실패 줄이 섭니다 — 대조.
  host.purchase = { status: "failed" };
  await act(async () => {
    fireEvent.tap(
      within(screen.getByTestId("coin-shop-screen-buy")).getByTestId("ui-lynx-button"),
      {},
    );
  });
  for (let i = 0; i < 3; i += 1) await flush();
  expect(host.bought).toHaveLength(2);
  expect(present("coin-shop-screen-failed")).toBe(true);
});

test("AP-I2 Play 모양의 답(`:base` 구독 id · VND · GPA 주문 id) — 카드에 Play 가격, 팩 Order Complete는 앞부분 id, 구독은 꼬리 없는 id로 산다", async () => {
  host.purchase = {
    status: "purchased",
    productId: "duru.coins.1200.v1",
    transactionId: "GPA.3312-4455-6677-88990",
  };
  await boot();
  await buyPouch();
  expect(orderCompleted()).toEqual([
    [
      "airbridge.ecommerce.order.completed",
      {
        value: 249000,
        currency: "VND",
        transactionID: "GPA.3312-4455-6677-88990",
        products: [
          {
            productID: "duru.coins.1200.v1",
            name: "duru.coins.1200.v1",
            price: 249000,
            quantity: 1,
            currency: "VND",
          },
        ],
      },
    ],
  ]);
  tap("shop-tab-plans");
  expect(screen.getByTestId("plans-card-premium-price")).toHaveTextContent("₫299.000");
  host.purchase = { status: "purchased", productId: "duru.premium.monthly.v1:base" };
  tap("plans-card-premium");
  await act(async () => {
    fireEvent.tap(screen.getByTestId("plans-continue"), {});
  });
  await flush();
  expect(host.bought).toEqual(["duru.coins.1200.v1", "duru.premium.monthly.v1"]);
  expect(screen.getByTestId("purchase-pill")).toHaveTextContent("Confirming your purchase…");
  expect(orderCompleted()).toHaveLength(1);
});
