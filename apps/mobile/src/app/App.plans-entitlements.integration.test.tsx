import type { EpisodeIntroEvent } from "../screens/episode-intro/episode-intro.contract";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { App } from "./App";
import { resetPushWiringForTests } from "./push-wiring";
import { authSessionStorageKey, serializeAuthSession } from "../lib/auth-session";
import { entrySplashDurationMs } from "../lib/entry-flow";
import { learningItemGuideSeenStorageKey } from "../lib/learning-item-guide";
import { allLearningItemGuidesSeenValue } from "../lib/learning-item-guide.test-support";
import { setPlanAccess } from "../lib/plan-access";
import { plansTestIds as ids } from "../screens/plans/plans.contract";
import { catalogV1 } from "../screens/plans/plans.test-support";

// `integration` 계층(SB-E1 ~ E2, ADR-0144 D2 · 2단계 후속): 결제를 열 수 있을 때 서버 권한(정본)이 앱에 들어간다 — 머리 티켓 칩이
// 무제한, Plans의 「Current plan」 · 구독 관리. 결제를 열 수 없으면(지금 운영) 권한 RPC를 부르지 않는다. 대역은 경계뿐.

const flag = vi.hoisted(() => ({ on: true }));
const rpc = vi.hoisted(() => ({ catalog: null as unknown, calls: 0, entitlementCalls: 0 }));
const pay = vi.hoisted(() => ({ on: true }));
const learner = vi.hoisted(() => ({ country: null as string | null }));
// 호스트 구매 모듈(RevenueCat, ADR-0144 2단계) — null이면 SDK 키가 없는 빌드(모듈 없음).
const host = vi.hoisted(() => ({
  purchases: null as null | {
    storefront: string | null;
    products: readonly Record<string, unknown>[];
    configured: string[]; // 사용자 맞춤(configure)은 PU-U1 · U2가 본다 — 동기화 기억이 모듈 수명이라 여기서는 세지 않는다
  },
}));
vi.mock("../lib/plans-flag", () => ({
  plansFeatureEnabled: () => flag.on,
  purchasesEnabled: () => pay.on,
}));
vi.mock("../lib/plans-api", async (original) => ({
  ...(await original<typeof import("../lib/plans-api")>()),
  plansClient: () => ({
    catalog: async () => {
      rpc.calls += 1;
      return rpc.catalog;
    },
    entitlements: async () => {
      rpc.entitlementCalls += 1;
      return premiumNow;
    },
  }),
}));
const premiumNow = vi.hoisted(() => ({
  tier: "premium" as const,
  unlimitedTickets: true,
  entitlements: [
    {
      id: "premium" as const,
      productId: "duru.premium.monthly.v1",
      status: "active" as const,
      willRenew: true,
      expiresAt: "2099-01-01T00:00:00Z",
    },
  ],
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

let events: EpisodeIntroEvent[] = [];

async function boot(): Promise<void> {
  const store = new Map<string, string>([
    [
      authSessionStorageKey,
      serializeAuthSession({ accessToken: "a", refreshToken: "r", expiresAt: 4_102_444_800_000 }),
    ],
    [learningItemGuideSeenStorageKey, allLearningItemGuidesSeenValue],
    ...(learner.country === null
      ? []
      : ([
          [
            "libitum.learner-profile.plans-user",
            JSON.stringify({ v: 1, name: "Mina", countryCode: learner.country, sync: "synced" }),
          ],
        ] as const)),
  ]);
  const purchases = host.purchases;
  vi.stubGlobal("NativeModules", {
    StorageModule: {
      get: (key: string) => store.get(key) ?? null,
      set: (key: string, value: string) => void store.set(key, value),
      remove: (key: string) => void store.delete(key),
    },
    ...(purchases === null
      ? {}
      : {
          PurchasesModule: {
            configure: (userId: string, callback: (payload: unknown) => void) => {
              purchases.configured.push(userId);
              callback({ status: "ok" });
            },
            signOut: (callback: (payload: unknown) => void) => callback({ status: "ok" }),
            offerings: (callback: (payload: unknown) => void) =>
              callback({ status: "ok", products: purchases.products }),
            storefront: (callback: (payload: unknown) => void) =>
              callback(
                purchases.storefront === null
                  ? { status: "failed" }
                  : { status: "ok", country: purchases.storefront },
              ),
            purchase: (_id: string, callback: (payload: unknown) => void) =>
              callback({ status: "failed" }),
            restore: (callback: (payload: unknown) => void) => callback({ status: "failed" }),
          },
        }),
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
  render(<App episodeIntroEventSink={(event) => events.push(event)} />);
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
const openSettings = () => tap("ui-lynx-bottom-navigator-item-settings");
const planRow = "ui-lynx-settings-group-item-plans";

beforeEach(() => {
  flag.on = true;
  rpc.catalog = catalogV1;
  rpc.calls = 0;
  rpc.entitlementCalls = 0;
  pay.on = true;
  host.purchases = { storefront: "US", products: [], configured: [] };
  learner.country = null;
  events = [];
});
afterEach(() => {
  cleanup();
  setPlanAccess(null);
  resetPushWiringForTests();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const openPlans = async () => {
  openSettings();
  await flush();
  act(
    () =>
      void fireEvent.tap(
        within(screen.getByTestId(planRow)).getByTestId("ui-lynx-settings-cell"),
        {},
      ),
  );
  await flush();
};

test("SB-E1 결제를 열 수 있고 서버 권한이 Premium이면 — 머리 티켓 칩은 무제한, Plans는 Current plan · 계속 대신 구독 관리 · 고지", async () => {
  await boot();
  await flush();
  expect(rpc.entitlementCalls).toBe(1);
  expect(present("top-bar-tickets-infinity")).toBe(true);
  await openPlans();
  expect(screen.getByTestId(ids.currentBadge("premium"))).toHaveTextContent("Current plan");
  expect(present(ids.manage)).toBe(true);
  // 구독 중(ADR-0160): Premium이면 고를 위 등급이 없어 CTA가 막혀 있고, 고지는 지금 요금제로 섭니다.
  expect(screen.getByTestId(ids.continue).getAttribute("data-disabled")).toBe("true");
  expect(screen.getByTestId(ids.terms)).toHaveTextContent("renews automatically");
});

test("SB-E2 결제를 열 수 없으면(지금 운영) 권한 RPC를 부르지 않고 칩 · Plans는 지금 그대로", async () => {
  pay.on = false;
  await boot();
  await flush();
  expect(rpc.entitlementCalls).toBe(0);
  expect(present("top-bar-tickets-infinity")).toBe(false);
  await openPlans();
  expect(present(ids.currentBadge("premium"))).toBe(false);
  expect(present(ids.continue)).toBe(true);
});
