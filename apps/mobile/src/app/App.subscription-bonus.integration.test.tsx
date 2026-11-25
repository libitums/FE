import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, screen, within } from "@lynx-js/react/testing-library";

import { App } from "./App";
import { authSessionStorageKey, serializeAuthSession } from "../lib/auth-session";
import { learningItemGuideSeenStorageKey } from "../lib/learning-item-guide";
import { allLearningItemGuidesSeenValue } from "../lib/learning-item-guide.test-support";
import type { PlanEntitlements } from "../lib/plans-api";
import type { SubscriptionBonusClaim } from "../lib/subscription-bonus-api";
import { catalogV1 } from "../screens/plans/plans.test-support";
import { signupRewardTestIds as ids } from "../screens/signup-reward/signup-reward.contract";
import { legacyPassedSeed } from "./test-helpers/progress-seed";
import { renderSignedInApp, signedInBootSession } from "./test-helpers/signed-in-app";

// `integration` 계층(CB-I1 ~ I4): Chat Plus 첫 구독 보너스(ADR-0196 D3 · D4) — 권한에 Chat Plus가 있으면 지도가 한가할 때 서버에 알림을 한 번 묻고,
// 알린 보너스가 있으면 가입 보상 창과 같은 틀의 모달 → Got it. 기기 기록이 생기면 다시 묻지 않는다. 체험 중(none)이면 적지 않고 권한 줄이
// 바뀌면(유료 RENEWAL) 다시 묻는다. 대역은 경계뿐(요금제 · 알림 · 가입 보상 · 엽전 RPC, 구매 모듈, 저장소, fetch).

const rpc = vi.hoisted(() => ({
  entitlements: null as unknown,
  bonus: [] as unknown[],
  asked: 0,
}));
vi.mock("../lib/plans-flag", () => ({
  plansFeatureEnabled: () => true,
  purchasesEnabled: () => true,
}));
vi.mock("../lib/plans-api", async (original) => ({
  ...(await original<typeof import("../lib/plans-api")>()),
  plansClient: () => ({
    catalog: async () => catalogV1,
    entitlements: async () => rpc.entitlements,
    balance: async () => null,
  }),
}));
vi.mock("../lib/subscription-bonus-api", async (original) => ({
  ...(await original<typeof import("../lib/subscription-bonus-api")>()),
  subscriptionBonusClient: () => ({
    claim: async () => {
      rpc.asked += 1;
      return (rpc.bonus.shift() ?? null) as SubscriptionBonusClaim | null;
    },
  }),
}));
vi.mock("../lib/signup-reward-api", async (original) => ({
  ...(await original<typeof import("../lib/signup-reward-api")>()),
  signupRewardClient: () => ({ claim: async () => ({ granted: 0, balance: 0 }) }),
}));
vi.mock("../lib/coin-wallet-api", async (original) => ({
  ...(await original<typeof import("../lib/coin-wallet-api")>()),
  coinClient: () => ({ claim: async () => null }),
}));

type Event = { name: string; [key: string]: unknown };

const chatPlus = (expiresAt: string): PlanEntitlements => ({
  tier: "chat_plus",
  unlimitedTickets: false,
  entitlements: [
    {
      id: "chat_plus",
      productId: "duru.chatplus.monthly.v1",
      status: "active",
      willRenew: true,
      expiresAt,
    },
  ],
});
const announced: SubscriptionBonusClaim = { amount: 100, reason: "announced", balance: 400 };

const base64Url = (value: unknown): string =>
  btoa(JSON.stringify(value)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const memberToken = `${base64Url({ alg: "none" })}.${base64Url({ sub: "member-cb", app_metadata: {} })}.sig`;
const memberStore = () =>
  new Map([
    [authSessionStorageKey, serializeAuthSession(signedInBootSession)],
    [learningItemGuideSeenStorageKey, allLearningItemGuidesSeenValue],
  ]);

async function boot(store: Map<string, string>, events: Event[] = []): Promise<void> {
  vi.stubGlobal("NativeModules", {
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
  await renderSignedInApp(
    <App
      progressSeed={legacyPassedSeed}
      episodeIntroEventSink={(event) => void events.push(event as never)}
    />,
    {
      refreshedAccessToken: memberToken,
      loadProgress: async () => ({ status: 200, body: "null" }),
      storageModule: {
        get: (key: string) => store.get(key) ?? null,
        set: (key: string, value: string) => void store.set(key, value),
        remove: (key: string) => void store.delete(key),
      },
    },
  );
  await flushRounds(6);
}

const flushRounds = async (rounds = 4) => {
  for (let i = 0; i < rounds; i += 1)
    await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
};
const present = (testId: string) => screen.queryByTestId(testId) !== null;
const tapGotIt = () => {
  vi.useFakeTimers();
  act(() => {
    fireEvent.tap(within(screen.getByTestId(ids.gotIt)).getByText(/./), {});
  });
  act(() => {
    vi.advanceTimersByTime(3_000);
  });
  vi.useRealTimers();
};

beforeEach(() => {
  rpc.entitlements = chatPlus("2099-01-01T00:00:00Z");
  rpc.bonus = [];
  rpc.asked = 0;
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

test("CB-I1 Chat Plus 구독자 — 알린 보너스 100이면 SUBSCRIBER GIFT 모달 · 이벤트 한 번 · Got it이면 닫히고, 다음 실행엔 묻지도 띄우지도 않음", async () => {
  rpc.bonus = [announced];
  const store = memberStore();
  const events: Event[] = [];
  await boot(store, events);
  expect(rpc.asked).toBe(1);
  const modal = screen.getByTestId(ids.modal);
  expect(modal.textContent).toContain("SUBSCRIBER GIFT");
  expect(modal.textContent).toContain("Welcome to Chat Plus!");
  expect(events.filter((event) => event.name === "subscription_bonus_shown")).toEqual([
    expect.objectContaining({ plan: "chat_plus", amount: "100", surface: "learning" }),
  ]);
  tapGotIt();
  expect(present(ids.modal)).toBe(false);

  cleanup();
  rpc.asked = 0;
  await boot(store);
  expect(present(ids.modal)).toBe(false);
  expect(rpc.asked).toBe(0);
});

test("CB-I2 구독이 없으면(무료 · Unlimited Tickets만) 묻지 않는다", async () => {
  rpc.entitlements = { tier: "free", unlimitedTickets: false, entitlements: [] };
  await boot(memberStore());
  expect(rpc.asked).toBe(0);
  cleanup();
  rpc.entitlements = {
    tier: "free",
    unlimitedTickets: true,
    entitlements: [
      {
        id: "unlimited_tickets",
        productId: "duru.tickets.monthly.v1",
        status: "active",
        willRenew: true,
        expiresAt: "2099-01-01T00:00:00Z",
      },
    ],
  };
  await boot(memberStore());
  expect(rpc.asked).toBe(0);
  expect(present(ids.modal)).toBe(false);
});

test("CB-I3 체험 중(none)이면 모달 없이 기록도 없고 — 유료로 넘어가 권한 줄이 바뀐 다음 실행에 다시 물어 모달", async () => {
  rpc.entitlements = chatPlus("2099-01-01T00:00:00Z");
  rpc.bonus = [{ amount: 0, reason: "none", balance: 0 }];
  const store = memberStore();
  await boot(store);
  expect(rpc.asked).toBe(1);
  expect(present(ids.modal)).toBe(false);

  cleanup();
  rpc.entitlements = chatPlus("2099-02-01T00:00:00Z");
  rpc.bonus = [announced];
  await boot(store);
  expect(rpc.asked).toBe(2);
  expect(screen.getByTestId(ids.modal).textContent).toContain("Welcome to Chat Plus!");
});

test("CB-I4 다른 기기에서 이미 알렸으면(already_announced) 모달 없이 끝 — 다음 실행엔 묻지 않음", async () => {
  rpc.bonus = [{ amount: 0, reason: "already_announced", balance: 400 }];
  const store = memberStore();
  await boot(store);
  expect(rpc.asked).toBe(1);
  expect(present(ids.modal)).toBe(false);
  cleanup();
  rpc.entitlements = chatPlus("2099-03-01T00:00:00Z");
  await boot(store);
  expect(rpc.asked).toBe(1);
});
