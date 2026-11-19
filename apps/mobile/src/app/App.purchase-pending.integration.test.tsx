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
import { REFRESH_SCHEDULE_MS } from "../lib/purchase-refresh";
import { subscribedTo } from "../screens/plans/plans-subscribed.test-support";
import { catalogV1 } from "../screens/plans/plans.test-support";

// `integration` 계층(PP-I1 ~ PP-I4, ADR-0163 · ADR-0063 Order Complete): 구매 뒤 서버 확인 대기 — 요금제 결선(`usePlans` · `usePurchaseWait`) → 상점 · 머리.
// 대역은 경계뿐(플래그 · 요금제 RPC · 호스트 구매 모듈 · `StorageModule` · `fetch`). 따라잡기의 기다림(`sleep`)은 테스트가 한 칸씩 풉니다.

const flag = vi.hoisted(() => ({ on: true }));
const rpc = vi.hoisted(() => ({
  catalog: null as unknown,
  // 권한 · 잔액 RPC가 차례로 돌려줄 값 — 마지막 값이 남습니다.
  entitlements: [] as unknown[],
  balances: [] as (number | null)[],
}));
// 따라잡기의 기다림 — 풀어 줄 때까지 멈춥니다. 기다린 ms를 적습니다.
const clock = vi.hoisted(() => ({ waits: [] as number[], pending: [] as (() => void)[] }));
vi.mock("../lib/plans-flag", () => ({
  plansFeatureEnabled: () => flag.on,
  purchasesEnabled: () => true,
}));
vi.mock("../lib/plans-api", async (original) => ({
  ...(await original<typeof import("../lib/plans-api")>()),
  plansClient: () => ({
    catalog: async () => rpc.catalog,
    entitlements: async () =>
      rpc.entitlements.length > 1 ? rpc.entitlements.shift() : rpc.entitlements[0],
    balance: async () => (rpc.balances.length > 1 ? rpc.balances.shift() : rpc.balances[0]) ?? null,
  }),
}));
vi.mock("../lib/purchase-refresh", async (original) => ({
  ...(await original<typeof import("../lib/purchase-refresh")>()),
  sleep: (ms: number) =>
    new Promise<void>((resolve) => {
      clock.waits.push(ms);
      clock.pending.push(resolve);
    }),
}));
vi.mock("../lib/coin-wallet-api", () => ({
  coinClient: () => ({ claim: async () => null }),
}));

const refreshedBody = JSON.stringify({
  access_token: `e30.${btoa(JSON.stringify({ sub: "plans-user" })).replace(/=+$/, "")}.sig`,
  refresh_token: "refreshed-refresh",
  expires_in: 3600,
  token_type: "bearer",
  user: { id: "plans-user" },
});

// 호스트 Airbridge 모듈 대역(ADR-0063) — 진입점처럼 제품 sink에 Airbridge 전달을 겹치면 여기로 옵니다.
const airbridge = vi.hoisted(() => ({ calls: [] as [string, unknown][] }));
const storeProducts = [
  { productId: "duru.coins.1200.v1", price: "$4.99", amount: 4.99, currency: "usd" },
  { productId: "duru.premium.monthly.v1", price: "$12.99", amount: 12.99, currency: "usd" },
];

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
        callback({ status: "ok", products: storeProducts }),
      storefront: (callback: (payload: unknown) => void) =>
        callback({ status: "ok", country: "US" }),
      purchase: (id: string, callback: (payload: unknown) => void) =>
        callback({ status: "purchased", productId: id, transactionId: `tx-${id}` }),
      restore: (callback: (payload: unknown) => void) =>
        callback({ status: "restored", active: 1 }),
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
  // 진입점의 조립(`productEventSinks`)처럼 Airbridge 전달을 겹칩니다 — PostHog는 없음.
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
/** 따라잡기 기다림 한 칸을 풉니다. */
async function tick(): Promise<void> {
  for (let i = 0; i < 3; i += 1) await flush();
  const next = clock.pending.shift();
  next?.();
  for (let i = 0; i < 3; i += 1) await flush();
}
const free = { tier: "free", unlimitedTickets: false, entitlements: [] };

beforeEach(() => {
  flag.on = true;
  rpc.catalog = catalogV1;
  rpc.entitlements = [free];
  rpc.balances = [100];
  clock.waits = [];
  clock.pending = [];
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

test("PP-I1 엽전 팩을 사면 알약 · 「You have」 스켈레톤 · 산 팩 Adding, 서버 잔액이 오르면 「+1,200 coins added」 · 머리 칩 새 값", async () => {
  await boot();
  tap("top-bar-coins");
  tap("coin-shop-pack-pouch");
  rpc.balances = [100, 100, 1300];
  await act(async () => {
    fireEvent.tap(
      within(screen.getByTestId("coin-shop-screen-buy")).getByTestId("ui-lynx-button"),
      {},
    );
  });
  await flush();
  expect(screen.getByTestId("purchase-pill")).toHaveTextContent("Confirming your purchase…");
  expect(present("coin-shop-screen-balance-updating")).toBe(true);
  expect(present("coin-shop-pack-pouch-adding")).toBe(true);
  await tick(); // 1초 — 그대로
  expect(present("coin-shop-screen-balance-updating")).toBe(true);
  await tick(); // 2초 — 1,300
  expect(clock.waits).toEqual([REFRESH_SCHEDULE_MS[0], REFRESH_SCHEDULE_MS[1]]);
  expect(screen.getByTestId("purchase-pill")).toHaveTextContent("+1,200 coins added");
  expect(present("coin-shop-screen-balance-updating")).toBe(false);
  expect(present("coin-shop-pack-pouch-adding")).toBe(false);
  expect(present("coin-shop-screen")).toBe(true);
  act(
    () =>
      void fireEvent.tap(
        within(screen.getByTestId("coin-shop-screen-close")).getByTestId("ui-lynx-round-button"),
        {},
      ),
  );
  // 머리 칩은 999 넘으면 「999+」라 이름으로 봅니다.
  expect(screen.getByTestId("top-bar-coins").getAttribute("accessibility-label")).toBe(
    "1300 coins, get more",
  );
});

test("PP-I2 구독을 사면 상점이 열린 채 Your plan 스켈레톤, 서버 권한이 바뀌면 상점이 닫히고 구독 성공 알림 · 칩 PREMIUM", async () => {
  rpc.entitlements = [free];
  await boot();
  tap("header-plan-chip");
  tap("plans-card-premium");
  // 첫 다시 읽기는 그대로, 둘째에 Premium(목록은 하나 남을 때까지 앞에서 뺍니다).
  rpc.entitlements = [free, subscribedTo("premium")];
  await act(async () => {
    fireEvent.tap(screen.getByTestId("plans-continue"), {});
  });
  await flush();
  expect(present("coin-shop-screen")).toBe(true);
  expect(screen.getByTestId("purchase-pill")).toHaveTextContent("Confirming your purchase…");
  expect(present("plans-your-plan-updating")).toBe(true);
  await tick();
  expect(present("coin-shop-screen")).toBe(true);
  await tick();
  expect(present("coin-shop-screen")).toBe(false);
  act(
    () =>
      void fireEvent.tap(screen.getByTestId("first-unit-guide-map"), { eventType: "catchEvent" }),
  );
  expect(screen.getByTestId("subscription-toast")).toHaveTextContent("Premium is on");
  expect(screen.getByTestId("header-plan-chip")).toHaveTextContent("PREMIUM");
});

test("PP-I3 60초 동안 서버가 그대로면 스켈레톤을 걷고 마지막 값 · 「Your purchase is safe」, 상점은 열린 채", async () => {
  await boot();
  tap("header-plan-chip");
  tap("plans-card-premium");
  await act(async () => {
    fireEvent.tap(screen.getByTestId("plans-continue"), {});
  });
  for (let i = 0; i < REFRESH_SCHEDULE_MS.length; i += 1) await tick();
  expect(clock.waits).toEqual([...REFRESH_SCHEDULE_MS]);
  expect(present("coin-shop-screen")).toBe(true);
  expect(screen.getByTestId("purchase-pill")).toHaveTextContent(
    "Your purchase is safe. It'll appear shortly.",
  );
  expect(present("plans-your-plan-updating")).toBe(false);
  expect(screen.getByTestId("plans-your-plan")).toHaveTextContent("Free");
});

const orderCompleted = () =>
  airbridge.calls.filter(([category]) => category === "airbridge.ecommerce.order.completed");

test("PP-I4 엽전 팩 결제 → Airbridge Order Complete 한 번(스토어 금액 · 통화 · 거래 id), 구독 결제는 보내지 않는다(RevenueCat 몫)", async () => {
  await boot();
  tap("top-bar-coins");
  tap("coin-shop-pack-pouch");
  await act(async () => {
    fireEvent.tap(
      within(screen.getByTestId("coin-shop-screen-buy")).getByTestId("ui-lynx-button"),
      {},
    );
  });
  await flush();
  expect(orderCompleted()).toEqual([
    [
      "airbridge.ecommerce.order.completed",
      {
        value: 4.99,
        currency: "USD",
        transactionID: "tx-duru.coins.1200.v1",
        products: [
          {
            productID: "duru.coins.1200.v1",
            name: "duru.coins.1200.v1",
            price: 4.99,
            quantity: 1,
            currency: "USD",
          },
        ],
      },
    ],
  ]);
  tap("shop-tab-plans");
  tap("plans-card-premium");
  await act(async () => {
    fireEvent.tap(screen.getByTestId("plans-continue"), {});
  });
  await flush();
  expect(orderCompleted()).toHaveLength(1);
});
