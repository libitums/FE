import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, render, screen } from "@lynx-js/react/testing-library";

import { App } from "./App";
import { resetPushWiringForTests } from "./push-wiring";
import { contentSyncEventName } from "./use-episode-content-refresh";
import { authSessionStorageKey, serializeAuthSession } from "../lib/auth-session";
import { entrySplashDurationMs } from "../lib/entry-flow";
import { learningItemGuideSeenStorageKey } from "../lib/learning-item-guide";
import { allLearningItemGuidesSeenValue } from "../lib/learning-item-guide.test-support";
import { setPlanAccess } from "../lib/plan-access";
import { catalogV1 } from "../screens/plans/plans.test-support";

// `integration` 계층(PB-I1 ~ I3, ADR-0144 D2): 2026-11-19 샌드박스 — Premium → Unlimited Tickets 내림은 Premium 기간 끝으로 미뤄진다.
// 세션이 그 경계를 넘으면 권한을 한 번 다시 읽어 머리 칩이 PREMIUM에 남지 않고, 앱이 앞으로 와도(호스트 `contentSyncOpportunity`)
// 다시 읽는다. 결제를 열 수 없으면 둘 다 부르지 않는다. 대역은 경계뿐(플래그 · 요금제 RPC · 호스트 구매 모듈 · `StorageModule` · `fetch`) —
// 시각은 가짜 타이머로 앞당긴다.

const flag = vi.hoisted(() => ({ on: true }));
const pay = vi.hoisted(() => ({ on: true }));
const rpc = vi.hoisted(() => ({
  entitlementCalls: 0,
  firstAt: null as number | null,
  // 권한 RPC가 차례로 돌려줄 값(부를 때 지금 시각으로 만듦) — 마지막 값이 남습니다.
  entitlements: [] as (() => unknown)[],
}));
vi.mock("../lib/plans-flag", () => ({
  plansFeatureEnabled: () => flag.on,
  purchasesEnabled: () => pay.on,
}));
vi.mock("../lib/plans-api", async (original) => ({
  ...(await original<typeof import("../lib/plans-api")>()),
  plansClient: () => ({
    catalog: async () => catalogV1,
    entitlements: async () => {
      rpc.entitlementCalls += 1;
      rpc.firstAt ??= Date.now();
      const next = rpc.entitlements.length > 1 ? rpc.entitlements.shift() : rpc.entitlements[0];
      return next?.() ?? null;
    },
    balance: async () => null,
  }),
}));
vi.mock("../lib/coin-wallet-api", () => ({
  coinClient: () => ({ claim: async () => null }),
}));

const BOUNDARY_MS = 45_000;
const at = (offsetMs: number) => new Date(Date.now() + offsetMs).toISOString();
const row = (id: string, productId: string, expiresAt: string, extra: object = {}) => ({
  id,
  productId,
  status: "active",
  willRenew: true,
  expiresAt,
  ...extra,
});
/** 내림 직후 — Premium 줄에 pending, Tickets 줄은 경계에서 시작(서버는 활성으로 돌려줌). */
const premiumPendingTickets = () => ({
  tier: "premium",
  unlimitedTickets: true,
  entitlements: [
    row("premium", "duru.premium.monthly.v1", at(BOUNDARY_MS), {
      pendingProductId: "duru.tickets.monthly.v1",
    }),
    row("unlimited_tickets", "duru.tickets.monthly.v1", at(BOUNDARY_MS + 300_000)),
  ],
});
/** 경계 뒤 서버(07:28:46 실측) — tier free + Unlimited Tickets. */
const ticketsOnly = () => ({
  tier: "free",
  unlimitedTickets: true,
  entitlements: [row("unlimited_tickets", "duru.tickets.monthly.v1", at(300_000))],
});
const premiumYear = () => ({
  tier: "premium",
  unlimitedTickets: true,
  entitlements: [row("premium", "duru.premium.yearly.v1", at(300 * 86_400_000))],
});

const refreshedBody = JSON.stringify({
  access_token: `e30.${btoa(JSON.stringify({ sub: "plans-user" })).replace(/=+$/, "")}.sig`,
  refresh_token: "refreshed-refresh",
  expires_in: 3600,
  token_type: "bearer",
  user: { id: "plans-user" },
});

const advance = (ms: number) =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });

/** 가짜 타이머로 부팅하고 그대로 둡니다 — 경계 타이머를 앞당기려고. */
async function boot(): Promise<void> {
  const store = new Map<string, string>([
    [
      authSessionStorageKey,
      serializeAuthSession({ accessToken: "a", refreshToken: "r", expiresAt: 4_102_444_800_000 }),
    ],
    [learningItemGuideSeenStorageKey, allLearningItemGuidesSeenValue],
  ]);
  vi.stubGlobal("NativeModules", {
    StorageModule: {
      get: (key: string) => store.get(key) ?? null,
      set: (key: string, value: string) => void store.set(key, value),
      remove: (key: string) => void store.delete(key),
    },
    PurchasesModule: {
      configure: (_userId: string, callback: (payload: unknown) => void) =>
        callback({ status: "ok" }),
      signOut: (callback: (payload: unknown) => void) => callback({ status: "ok" }),
      offerings: (callback: (payload: unknown) => void) => callback({ status: "ok", products: [] }),
      storefront: (callback: (payload: unknown) => void) =>
        callback({ status: "ok", country: "US" }),
      purchase: (_id: string, callback: (payload: unknown) => void) =>
        callback({ status: "failed" }),
      restore: (callback: (payload: unknown) => void) => callback({ status: "failed" }),
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
  render(<App episodeIntroEventSink={() => {}} />);
  act(() => {
    vi.advanceTimersByTime(entrySplashDurationMs);
  });
  await advance(0);
  await advance(0);
}

const chip = () => screen.getByTestId("header-plan-chip");
const foreground = () =>
  act(() => {
    lynx.getJSModule("GlobalEventEmitter").emit(contentSyncEventName, []);
  });

beforeEach(() => {
  flag.on = true;
  pay.on = true;
  rpc.entitlementCalls = 0;
  rpc.firstAt = null;
  rpc.entitlements = [premiumPendingTickets, ticketsOnly];
});
afterEach(() => {
  cleanup();
  setPlanAccess(null);
  resetPushWiringForTests();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

test("PB-I1 미뤄진 내림 — 세션이 Premium 만료를 넘으면 권한을 한 번 다시 읽어 칩이 PREMIUM → TICKETS", async () => {
  await boot();
  expect(rpc.entitlementCalls).toBe(1);
  expect(chip()).toHaveTextContent("PREMIUM");
  // 경계는 첫 응답 시각 + 45초(부팅의 스플래시 시간이 이미 지났음).
  await advance((rpc.firstAt ?? 0) + BOUNDARY_MS - Date.now() - 1000);
  expect(rpc.entitlementCalls).toBe(1);
  expect(chip()).toHaveTextContent("PREMIUM");
  await advance(4000);
  expect(rpc.entitlementCalls).toBe(2);
  expect(chip()).toHaveTextContent("TICKETS");
});

test("PB-I2 앱이 앞으로 오면 다시 읽는다 — 경계를 기다리지 않음", async () => {
  rpc.entitlements = [premiumYear, ticketsOnly];
  await boot();
  expect(chip()).toHaveTextContent("PREMIUM");
  foreground();
  await advance(0);
  expect(rpc.entitlementCalls).toBe(2);
  expect(chip()).toHaveTextContent("TICKETS");
});

test("PB-I3 결제를 열 수 없으면(지금 운영) 경계 · 앞으로 옴 어느 쪽도 권한 RPC를 부르지 않는다", async () => {
  pay.on = false;
  await boot();
  foreground();
  await advance(BOUNDARY_MS + 4000);
  expect(rpc.entitlementCalls).toBe(0);
});
