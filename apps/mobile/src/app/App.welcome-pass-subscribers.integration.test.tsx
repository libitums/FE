import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { App } from "./App";
import { resetPushWiringForTests } from "./push-wiring";
import { authSessionStorageKey, serializeAuthSession } from "../lib/auth-session";
import { entrySplashDurationMs } from "../lib/entry-flow";
import { learningItemGuideSeenStorageKey } from "../lib/learning-item-guide";
import { allLearningItemGuidesSeenValue } from "../lib/learning-item-guide.test-support";
import { setPlanAccess } from "../lib/plan-access";
import type { PlanEntitlements } from "../lib/plans-api";
import { setRewardTicketPass, setWelcomeTicketPass } from "../lib/reward-ticket-pass";
import { ticketsUnlimited } from "../lib/unlimited-tickets";
import { catalogV1 } from "../screens/plans/plans.test-support";

// `integration` 계층(WP-I5 ~ I9, ADR-0186 개정 2 — 2026-11-25 사용자 「이미 구독한 사람한텐 뜨면 안된다」): 만든 지 한 시간 된
// 계정이라도 활성 구독이 하나라도 있으면(요금제 종류 무관) 첫날 무제한 칩 · 남은 시간 판 · 티켓 판정이 없다. 구독 상태를 아직
// 모르는 동안에는 첫날 칩을 그리지 않고(깜빡임 없음) 티켓은 쓰지 않는다. 대역은 경계뿐(구매 모듈 · 요금제 RPC · 저장소 · fetch).

const HOUR = 3_600_000;
const pending = <T,>() => {
  let resolve: (value: T) => void = () => {};
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};
const rpc = vi.hoisted(() => ({
  // null이면 권한 읽기 실패, "hold"면 테스트가 풀 때까지 답하지 않음.
  entitlements: null as unknown,
  release: null as null | ((value: unknown) => void),
}));
vi.mock("../lib/plans-flag", () => ({
  plansFeatureEnabled: () => true,
  purchasesEnabled: () => true,
}));
vi.mock("../lib/plans-api", async (original) => ({
  ...(await original<typeof import("../lib/plans-api")>()),
  plansClient: () => ({
    catalog: async () => catalogV1,
    entitlements: () => {
      if (rpc.entitlements !== "hold") return Promise.resolve(rpc.entitlements);
      const wait = pending<unknown>();
      rpc.release = wait.resolve;
      return wait.promise;
    },
    balance: async () => null,
  }),
}));
vi.mock("../lib/coin-wallet-api", () => ({
  coinClient: () => ({ claim: async () => null }),
}));

const subscribed = (
  tier: PlanEntitlements["tier"],
  unlimitedTickets: boolean,
  id: "chat_plus" | "premium" | "unlimited_tickets",
): PlanEntitlements => ({
  tier,
  unlimitedTickets,
  entitlements: [
    {
      id,
      productId: `duru.${id}.monthly.v1`,
      status: "active",
      willRenew: true,
      expiresAt: "2099-01-01T00:00:00Z",
    },
  ],
});
const noSubscription: PlanEntitlements = {
  tier: "free",
  unlimitedTickets: false,
  entitlements: [],
};

async function boot(): Promise<void> {
  const createdAt = Date.now() - HOUR; // 만든 지 한 시간 된 계정 — 첫날 24시간 안
  const store = new Map<string, string>([
    [
      authSessionStorageKey,
      serializeAuthSession({
        accessToken: "a",
        refreshToken: "r",
        expiresAt: 4_102_444_800_000,
        accountCreatedAt: createdAt,
      }),
    ],
    [learningItemGuideSeenStorageKey, allLearningItemGuidesSeenValue],
  ]);
  const refreshedBody = JSON.stringify({
    access_token: `e30.${btoa(JSON.stringify({ sub: "wp-user" })).replace(/=+$/, "")}.sig`,
    refresh_token: "refreshed-refresh",
    expires_in: 3600,
    token_type: "bearer",
    user: { id: "wp-user", created_at: new Date(createdAt).toISOString() },
  });
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
  render(<App />);
  act(() => {
    vi.advanceTimersByTime(entrySplashDurationMs);
  });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
  vi.useRealTimers();
  await flush();
  await flush();
}

const flush = () => act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
const present = (testId: string) => screen.queryByTestId(testId) !== null;
const chip = () => screen.getByTestId("top-bar-tickets");

beforeEach(() => {
  rpc.entitlements = noSubscription;
  rpc.release = null;
});
afterEach(() => {
  cleanup();
  setPlanAccess(null);
  setRewardTicketPass(0);
  setWelcomeTicketPass(0);
  resetPushWiringForTests();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

test("[WP-I5] 구독 없는 새 회원은 그대로 — 첫날 무제한 칩 · 남은 시간 판 · 티켓을 쓰지 않음", async () => {
  await boot();
  expect(present("top-bar-tickets-infinity")).toBe(true);
  expect(ticketsUnlimited()).toBe(true);
  fireEvent.tap(chip(), {});
  expect(screen.getByTestId("unlimited-ticket-modal-days-left")).toHaveTextContent(/hours left/);
});

test("[WP-I6] 무제한 티켓이 들지 않은 구독(Chat Plus)이면 첫날 무제한이 없다 — 숫자 칩, 티켓 판정도 일반", async () => {
  rpc.entitlements = subscribed("chat_plus", false, "chat_plus");
  await boot();
  expect(present("top-bar-tickets-infinity")).toBe(false);
  expect(chip()).toHaveTextContent(/^\d+$/);
  expect(ticketsUnlimited()).toBe(false);
});

test("[WP-I7] 티켓 무제한 구독(Unlimited Tickets)이면 칩은 구독 판 — 첫날 남은 시간 판이 아니다", async () => {
  rpc.entitlements = subscribed("free", true, "unlimited_tickets");
  await boot();
  expect(present("top-bar-tickets-infinity")).toBe(true);
  fireEvent.tap(chip(), {});
  expect(screen.getByTestId("unlimited-ticket-modal")).not.toHaveTextContent(/hours left/);
});

test("[WP-I8] 구독 상태를 아직 모르는 동안 첫날 칩을 그리지 않는다(티켓은 쓰지 않음) — 답이 구독 없음이면 그때 무제한 칩", async () => {
  rpc.entitlements = "hold";
  await boot();
  expect(present("top-bar-tickets-infinity")).toBe(false);
  expect(chip()).toHaveTextContent(/^\d+$/);
  expect(ticketsUnlimited()).toBe(true); // 모르는 동안 차감하지 않음 — 사용자에게 손해 없는 쪽

  await act(async () => rpc.release?.(noSubscription));
  await flush();
  expect(present("top-bar-tickets-infinity")).toBe(true);
});

test("[WP-I9] 구독 상태를 기다리다 구독(Chat Plus)으로 답이 오면 첫날 칩은 한 번도 서지 않고 판정도 일반", async () => {
  rpc.entitlements = "hold";
  await boot();
  expect(present("top-bar-tickets-infinity")).toBe(false);

  await act(async () => rpc.release?.(subscribed("chat_plus", false, "chat_plus")));
  await flush();
  expect(present("top-bar-tickets-infinity")).toBe(false);
  expect(ticketsUnlimited()).toBe(false);
  expect(chip()).toHaveTextContent(/^\d+$/);
});
