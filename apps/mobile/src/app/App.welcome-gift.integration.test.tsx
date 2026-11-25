import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, screen } from "@lynx-js/react/testing-library";

import { learningItemGuideSeenStorageKey } from "../lib/learning-item-guide";
import { allLearningItemGuidesSeenValue } from "../lib/learning-item-guide.test-support";
import { setPlanAccess } from "../lib/plan-access";
import type { PlanEntitlements } from "../lib/plans-api";
import { setRewardTicketPass, setWelcomeTicketPass } from "../lib/reward-ticket-pass";
import { signupRewardTestIds as ids } from "../screens/signup-reward/signup-reward.contract";
import { catalogV1 } from "../screens/plans/plans.test-support";
import {
  flush,
  flushRounds,
  guestMarkerKey,
  installGuestHost,
  present,
  renderGuestApp,
  resetGuestHost,
  tapButtonIn,
} from "./test-helpers/guest-entry";
import { openTab, resetMessengerChatSource } from "./test-helpers/messenger-chat-app";
import { legacyPassedSeed } from "./test-helpers/progress-seed";

// `integration` 계층(WG-I1 ~ I4, ADR-0186 개정 3 · 시안 GiftA): 가입 직후 가입 보상 창에 선물 두 줄(엽전 · 첫날 무제한)이 선다.
// 창이 서는 순간 첫날 무제한이 적용되지 않으면(오래된 계정 · 구독 중 · 구독 상태 모름) 지금 창 그대로 엽전 한 줄이다.
// `signup_reward_shown`에 무제한 줄이 보였는지(`unlimited`)를 싣는다. 대역은 경계뿐(가입 보상 RPC · 구매 모듈 · 요금제 RPC · 저장소 · fetch).

const HOUR = 3_600_000;
const isoHoursAgo = (hours: number): string => new Date(Date.now() - hours * HOUR).toISOString();

const rpc = vi.hoisted(() => ({ entitlements: null as unknown }));
vi.mock("../lib/signup-reward-api", async (original) => ({
  ...(await original<typeof import("../lib/signup-reward-api")>()),
  signupRewardClient: () => ({ claim: async () => ({ granted: 100, balance: 100 }) }),
}));
vi.mock("../lib/coin-wallet-api", async (original) => ({
  ...(await original<typeof import("../lib/coin-wallet-api")>()),
  coinClient: () => ({ claim: async () => null }),
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

const noSubscription: PlanEntitlements = {
  tier: "free",
  unlimitedTickets: false,
  entitlements: [],
};
const chatPlus: PlanEntitlements = {
  tier: "chat_plus",
  unlimitedTickets: false,
  entitlements: [
    {
      id: "chat_plus",
      productId: "duru.chat_plus.monthly.v1",
      status: "active",
      willRenew: true,
      expiresAt: "2099-01-01T00:00:00Z",
    },
  ],
};

type Event = { name: string; [key: string]: unknown };

/** 손님이 지도 카드로 가입해 가입 보상 창까지 — 구매 모듈을 더해 요금제 결선(구독 상태)이 돈다. */
async function signUpFromCard(accountCreatedAt: string): Promise<Event[]> {
  const host = installGuestHost({
    accountCreatedAt,
    store: new Map([
      [guestMarkerKey, "1"],
      [learningItemGuideSeenStorageKey, allLearningItemGuidesSeenValue],
    ]),
  });
  const modules = (globalThis as unknown as { NativeModules: Record<string, unknown> })
    .NativeModules;
  vi.stubGlobal("NativeModules", {
    ...modules,
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
  const events: Event[] = [];
  await renderGuestApp(host, {
    platform: "ios",
    appProps: {
      progressSeed: legacyPassedSeed,
      episodeIntroEventSink: (event) => void events.push(event as never),
    },
  });
  openTab("journey");
  await flush();
  fireEvent.tap(screen.getByTestId(ids.card), {});
  await flush();
  tapButtonIn("login-screen-method-google");
  await flushRounds();
  return events;
}

const shown = (events: readonly Event[]) =>
  events.filter((event) => event.name === "signup_reward_shown");

beforeEach(async () => {
  rpc.entitlements = noSubscription;
  await resetMessengerChatSource();
});
afterEach(() => {
  cleanup();
  resetGuestHost();
  setPlanAccess(null);
  setRewardTicketPass(0);
  setWelcomeTicketPass(0);
  (lynx as unknown as { __globalProps: unknown }).__globalProps = undefined;
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

test("[WG-I1] 가입 직후(구독 없음)면 창에 두 줄 — 손님 문장은 제목 아래, 무제한 줄은 기기 시각의 끝, 이벤트 unlimited=shown", async () => {
  const events = await signUpFromCard(isoHoursAgo(0));
  const modal = screen.getByTestId(ids.modal);
  expect(modal.textContent).toContain("Your guest progress is saved to your account.");
  expect(screen.getByTestId(ids.coinsRow).textContent).toContain("Chat with the friends you meet.");
  const unlimited = screen.getByTestId(ids.unlimitedRow);
  expect(unlimited.textContent).toContain("Unlimited tickets · 24h");
  // 지금 가입했으니 끝은 내일 같은 시각(자정 근처에 돌려도 「tomorrow」).
  expect(unlimited.textContent).toMatch(
    /Every lesson is free until tomorrow, ([1-9]|1[0-2]):[0-5]\d (AM|PM)\./,
  );
  expect(shown(events)).toEqual([
    expect.objectContaining({ amount: "100", unlimited: "shown", surface: "learning" }),
  ]);
});

test("[WG-I2] 오래된 계정(생성 40일)이면 한 줄 — 지금 창 그대로, 이벤트 unlimited=none", async () => {
  const events = await signUpFromCard(isoHoursAgo(24 * 40));
  expect(present(ids.modal)).toBe(true);
  expect(present(ids.unlimitedRow)).toBe(false);
  expect(present(ids.gifts)).toBe(false);
  expect(shown(events)).toEqual([expect.objectContaining({ amount: "100", unlimited: "none" })]);
});

test("[WG-I3] 구독 중(Chat Plus)이면 새 계정이어도 한 줄", async () => {
  rpc.entitlements = chatPlus;
  const events = await signUpFromCard(isoHoursAgo(0));
  expect(present(ids.modal)).toBe(true);
  expect(present(ids.unlimitedRow)).toBe(false);
  expect(shown(events)).toEqual([expect.objectContaining({ unlimited: "none" })]);
});

test("[WG-I4] 구독 상태를 모르면(권한 읽기 실패) 한 줄 — 무제한 줄은 확실할 때만", async () => {
  rpc.entitlements = null;
  const events = await signUpFromCard(isoHoursAgo(0));
  expect(present(ids.modal)).toBe(true);
  expect(present(ids.unlimitedRow)).toBe(false);
  expect(shown(events)).toEqual([expect.objectContaining({ unlimited: "none" })]);
});
