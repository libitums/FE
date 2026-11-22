import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, screen, within } from "@lynx-js/react/testing-library";

import { App } from "./App";
import { learningItemGuideSeenStorageKey } from "../lib/learning-item-guide";
import { allLearningItemGuidesSeenValue } from "../lib/learning-item-guide.test-support";
import { authSessionStorageKey, serializeAuthSession } from "../lib/auth-session";
import type { PushRewardClaim } from "../lib/push-reward-api";
import { setRewardTicketPass } from "../lib/reward-ticket-pass";
import { launchTestIds as launch } from "../screens/launch/launch.contract";
import { signupRewardTestIds as ids } from "../screens/signup-reward/signup-reward.contract";
import { resetPushWiringForTests } from "./push-wiring";
import { pushOpenedEventName } from "./use-opened-push";
import { pushRewardStorageKey } from "./push-reward-record";
import {
  flush,
  flushRounds,
  guestMarkerKey,
  installGuestHost,
  present,
  renderGuestApp,
  resetGuestHost,
} from "./test-helpers/guest-entry";
import { resetMessengerChatSource } from "./test-helpers/messenger-chat-app";
import { legacyPassedSeed } from "./test-helpers/progress-seed";
import { renderSignedInApp, signedInBootSession } from "./test-helpers/signed-in-app";

// `integration` 계층(PR-I1 ~ I6): 푸시 캠페인 보상(ADR-0175) — 알림 누름(호스트 대역) → claim(서버 경계 목) → 보상 모달 → 엽전 날기 ·
// 무제한 티켓 칩. 경계만 대역입니다: `PushNotificationModule` · claim · 가입 보상 · 엽전 출시 RPC.

const HOUR = 3_600_000;
const calls = vi.hoisted(() => ({ order: [] as string[], asked: [] as string[] }));
const push = vi.hoisted(() => ({ result: null as PushRewardClaim | null }));
const coins = vi.hoisted(() => ({ bonus: 0 }));
const signup = vi.hoisted(() => ({ granted: 0 }));
vi.mock("../lib/push-reward-api", async (original) => ({
  ...(await original<typeof import("../lib/push-reward-api")>()),
  pushRewardClient: () => ({
    claim: async (campaignId: string) => {
      calls.order.push("push");
      calls.asked.push(campaignId);
      return push.result;
    },
  }),
}));
// 기존 회원 — 가입 보상은 0(모달 없음), 출시 보너스는 시험마다 정합니다.
vi.mock("../lib/signup-reward-api", async (original) => ({
  ...(await original<typeof import("../lib/signup-reward-api")>()),
  signupRewardClient: () => ({
    claim: async () => {
      calls.order.push("signup");
      return { granted: signup.granted, balance: 30 + signup.granted };
    },
  }),
}));
vi.mock("../lib/coin-wallet-api", async (original) => ({
  ...(await original<typeof import("../lib/coin-wallet-api")>()),
  coinClient: () => ({
    claim: async () => {
      calls.order.push("coins");
      return { learning: 0, bonus: coins.bonus, balance: 30 + coins.bonus, newAccount: false };
    },
  }),
}));

type Event = { name: string; [key: string]: unknown };
const rewardEvents = (events: readonly Event[]) =>
  events.filter((event) => event.name.startsWith("push_reward_"));

/** 호스트 푸시 모듈 — 누른 알림 하나를 들고 있다가 한 번 내줍니다. */
function stubOpenedPush(target: unknown): { open: (next: unknown) => void } {
  let opened: unknown = target;
  vi.stubGlobal("NativeModules", {
    PushNotificationModule: {
      getStatus: (callback: (payload: unknown) => void) => callback({ permission: "denied" }),
      takeOpened: (callback: (payload: unknown) => void) => {
        const next = opened;
        opened = null;
        callback({ target: next });
      },
    },
  });
  return { open: (next) => void (opened = next) };
}

const memberStore = () =>
  new Map([
    [authSessionStorageKey, serializeAuthSession(signedInBootSession)],
    [learningItemGuideSeenStorageKey, allLearningItemGuidesSeenValue],
  ]);
const base64Url = (value: unknown): string =>
  btoa(JSON.stringify(value)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const memberToken = `${base64Url({ alg: "none" })}.${base64Url({ sub: "member-1", app_metadata: {} })}.sig`;
const boot = (store: Map<string, string>) => ({
  refreshedAccessToken: memberToken,
  loadProgress: async () => ({ status: 200, body: "null" }),
  storageModule: {
    get: (key: string) => store.get(key) ?? null,
    set: (key: string, value: string) => void store.set(key, value),
    remove: (key: string) => void store.delete(key),
  },
});
const renderMember = async (store = memberStore(), events: Event[] = []) => {
  await renderSignedInApp(
    <App
      progressSeed={legacyPassedSeed}
      episodeIntroEventSink={(event) => void events.push(event as never)}
    />,
    boot(store),
  );
  await flushRounds(4);
  return { store, events };
};
const tapGotIt = () =>
  act(() => {
    fireEvent.tap(within(screen.getByTestId(ids.gotIt)).getByText(/./), {});
  });

const granted = (reward: PushRewardClaim["reward"]): PushRewardClaim => ({
  status: "granted",
  campaignId: "c1",
  reward,
  balance: 130,
});

beforeEach(async () => {
  calls.order = [];
  calls.asked = [];
  coins.bonus = 0;
  signup.granted = 0;
  push.result = granted({ kind: "coins", amount: 100 });
  await resetMessengerChatSource();
});
afterEach(() => {
  cleanup();
  resetGuestHost();
  resetPushWiringForTests();
  setRewardTicketPass(0);
  (lynx as unknown as { __globalProps: unknown }).__globalProps = undefined;
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

test("PR-I1 엽전 보상 알림을 눌러 켜면 그 캠페인을 묻고, 보상 모달 → Got it이면 칩으로 날아가 닫힌다 · 받음 이벤트", async () => {
  stubOpenedPush({ kind: "journey-map", campaignId: "c1" });
  const { events, store } = await renderMember();
  expect(calls.asked).toEqual(["c1"]);
  const modal = screen.getByTestId(ids.modal);
  expect(modal.textContent).toContain("Your gift is here!");
  expect(rewardEvents(events)[0]).not.toHaveProperty("via");
  expect(rewardEvents(events)).toEqual([
    expect.objectContaining({
      name: "push_reward_claimed",
      kind: "coins",
      amount: "100",
      surface: "learning",
    }),
  ]);
  vi.useFakeTimers();
  tapGotIt();
  act(() => {
    vi.advanceTimersByTime(3_000);
  });
  vi.useRealTimers();
  expect(present(ids.modal)).toBe(false);
  // 본 모달은 기록에서 지워 다음 실행에 다시 서지 않는다.
  expect(JSON.parse(store.get(pushRewardStorageKey("member-1")) ?? "{}")).toMatchObject({
    modal: null,
  });
});

test("PR-I2 무제한 티켓 보상 — 시간 모달, 닫으면 머리 칩이 무제한이고 누르면 남은 시간 판", async () => {
  push.result = granted({ kind: "tickets", hours: 24, untilMs: Date.now() + 24 * HOUR });
  stubOpenedPush({ kind: "journey-map", campaignId: "c1" });
  await renderMember();
  expect(screen.getByTestId(ids.amount).textContent).toBe("24h");
  tapGotIt();
  await flush();
  expect(present(ids.modal)).toBe(false);
  fireEvent.tap(screen.getByTestId("top-bar-tickets"), {});
  await flush();
  expect(screen.getByTestId("unlimited-ticket-modal-days-left").textContent).toMatch(
    /^2[34] hours left$/,
  );
});

test("PR-I3 대조군 · 기한 지남은 모달 없이 실패 이유만 남긴다", async () => {
  push.result = { status: "not_recipient", campaignId: null, reward: null, balance: null };
  stubOpenedPush({ kind: "journey-map", campaignId: "c1" });
  const { events } = await renderMember();
  expect(present(ids.modal)).toBe(false);
  expect(rewardEvents(events)).toEqual([
    expect.objectContaining({ name: "push_reward_failed", reason: "not_recipient" }),
  ]);
});

test.each([
  ["목적지 없음", {}],
  ["id 없는 여정 맵", { kind: "journey-map" }],
  ["형식이 틀린 id", { kind: "journey-map", campaignId: "../x" }],
])(
  "PR-I4 보상 알림이 아니면(%s) 받을 보상이 있어도 묻지 않고, 뒤 안내도 미루지 않는다",
  async (_name, target) => {
    coins.bonus = 100;
    stubOpenedPush(target);
    const { events } = await renderMember();
    expect(calls.asked).toEqual([]);
    expect(present(ids.modal)).toBe(false);
    expect(rewardEvents(events)).toEqual([]);
    expect(present(launch.coins)).toBe(true);
  },
);

test("PR-I5 엽전 출시 모달보다 푸시 보상이 먼저 — 닫은 뒤 출시 모달", async () => {
  coins.bonus = 100;
  stubOpenedPush({ kind: "journey-map", campaignId: "c1" });
  await renderMember();
  expect(present(ids.modal)).toBe(true);
  expect(present(launch.coins)).toBe(false);
  vi.useFakeTimers();
  tapGotIt();
  act(() => {
    vi.advanceTimersByTime(3_000);
  });
  vi.useRealTimers();
  await flushRounds(4);
  expect(present(ids.modal)).toBe(false);
  expect(present(launch.coins)).toBe(true);
});

test("PR-I7 새 계정의 가입 보상이 푸시 보상보다 먼저 — 가입 모달을 닫은 뒤 푸시 보상 모달", async () => {
  signup.granted = 100;
  stubOpenedPush({ kind: "journey-map", campaignId: "c1" });
  await renderMember();
  expect(screen.getByTestId(ids.modal).textContent).toContain("You're signed up!");
  vi.useFakeTimers();
  tapGotIt();
  act(() => {
    vi.advanceTimersByTime(3_000);
  });
  vi.useRealTimers();
  await flushRounds(4);
  expect(screen.getByTestId(ids.modal).textContent).toContain("Your gift is here!");
});

test("PR-I6 손님으로 누르면 묻지 않고(받지 않음) 실패 이유 guest", async () => {
  const host = installGuestHost({
    store: new Map([
      [guestMarkerKey, "1"],
      [learningItemGuideSeenStorageKey, allLearningItemGuidesSeenValue],
    ]),
  });
  const events: Event[] = [];
  await renderGuestApp(host, {
    platform: "ios",
    appProps: {
      progressSeed: legacyPassedSeed,
      episodeIntroEventSink: (event) => void events.push(event as never),
    },
  });
  await flush();
  act(() => {
    stubOpenedPushOnHost({ kind: "journey-map", campaignId: "c1" });
    lynx.getJSModule("GlobalEventEmitter").emit(pushOpenedEventName, []);
  });
  await flushRounds(2);
  expect(calls.asked).toEqual([]);
  expect(present(ids.modal)).toBe(false);
  expect(rewardEvents(events)).toEqual([
    expect.objectContaining({ name: "push_reward_failed", reason: "guest" }),
  ]);
});

/** 손님 호스트 대역 위에 누른 알림만 바꿔 얹습니다. */
function stubOpenedPushOnHost(target: unknown): void {
  const modules = (globalThis as { NativeModules?: Record<string, unknown> }).NativeModules ?? {};
  let opened: unknown = target;
  vi.stubGlobal("NativeModules", {
    ...modules,
    PushNotificationModule: {
      getStatus: (callback: (payload: unknown) => void) => callback({ permission: "denied" }),
      takeOpened: (callback: (payload: unknown) => void) => {
        const next = opened;
        opened = null;
        callback({ target: next });
      },
    },
  });
}

test("PR-I13 손님이 보통 알림을 누르면 보상 실패 이벤트도 없다", async () => {
  const host = installGuestHost({
    store: new Map([
      [guestMarkerKey, "1"],
      [learningItemGuideSeenStorageKey, allLearningItemGuidesSeenValue],
    ]),
  });
  const events: Event[] = [];
  await renderGuestApp(host, {
    platform: "ios",
    appProps: {
      progressSeed: legacyPassedSeed,
      episodeIntroEventSink: (event) => void events.push(event as never),
    },
  });
  await flush();
  act(() => {
    stubOpenedPushOnHost({ kind: "journey-map" });
    lynx.getJSModule("GlobalEventEmitter").emit(pushOpenedEventName, []);
  });
  await flushRounds(2);
  expect(rewardEvents(events)).toEqual([]);
});
