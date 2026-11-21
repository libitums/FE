import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, screen, within } from "@lynx-js/react/testing-library";

import { App } from "./App";
import { learningItemGuideSeenStorageKey } from "../lib/learning-item-guide";
import { allLearningItemGuidesSeenValue } from "../lib/learning-item-guide.test-support";
import { authSessionStorageKey, serializeAuthSession } from "../lib/auth-session";
import { launchTestIds as launch } from "../screens/launch/launch.contract";
import { signupRewardTestIds as ids } from "../screens/signup-reward/signup-reward.contract";
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
import { renderSignedInApp, signedInBootSession } from "./test-helpers/signed-in-app";

// `integration` 계층(SR-I1 ~ I4): 가입 보상(ADR-0174) — 손님 카드 → 로그인 → 서버 한 번 지급 → 보상 모달 → 엽전 날기.
// 서버 경계(companion_claim_signup_reward · companion_claim_coins)만 목.

const calls = vi.hoisted(() => ({ order: [] as string[] }));
const reward = vi.hoisted(() => ({
  result: { granted: 100, balance: 100 } as { granted: number; balance: number } | null,
}));
const coins = vi.hoisted(() => ({
  result: { learning: 0, bonus: 100, balance: 200 } as {
    learning: number;
    bonus: number;
    balance: number;
  } | null,
}));
vi.mock("../lib/signup-reward-api", async (original) => ({
  ...(await original<typeof import("../lib/signup-reward-api")>()),
  signupRewardClient: () => ({
    claim: async () => {
      calls.order.push("signup");
      return reward.result;
    },
  }),
}));
vi.mock("../lib/coin-wallet-api", async (original) => ({
  ...(await original<typeof import("../lib/coin-wallet-api")>()),
  coinClient: () => ({
    claim: async () => {
      calls.order.push("coins");
      return coins.result;
    },
  }),
}));

type Event = { name: string; [key: string]: unknown };
const named = (events: readonly Event[], prefix: string) =>
  events.filter((event) => event.name.startsWith(prefix));
const tapGotIt = () =>
  act(() => {
    fireEvent.tap(within(screen.getByTestId(ids.gotIt)).getByText(/./), {});
  });

beforeEach(async () => {
  calls.order = [];
  reward.result = { granted: 100, balance: 100 };
  coins.result = { learning: 0, bonus: 100, balance: 200 };
  await resetMessengerChatSource();
});
afterEach(() => {
  cleanup();
  resetGuestHost();
  (lynx as unknown as { __globalProps: unknown }).__globalProps = undefined;
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

test("SR-I1 손님 지도엔 카드 — 보임 한 번, 누르면 로그인 화면 · 가입하면 지도로 돌아와 손님 문구의 보상 모달, 카드는 사라진다", async () => {
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
      // 튜토리얼 전이면 첫 유닛 안내가 지도를 덮어 지도가 한가하지 않다 — 카드 · 모달은 그 뒤에 선다.
      progressSeed: legacyPassedSeed,
      episodeIntroEventSink: (event) => void events.push(event as never),
    },
  });
  openTab("journey");
  await flush();

  expect(screen.getByTestId(ids.card).textContent).toContain("Get 100 Yeopjeon free");
  expect(calls.order).toEqual([]);
  openTab("messenger");
  await flush();
  expect(present(ids.card)).toBe(false);
  openTab("journey");
  await flush();
  expect(named(events, "signup_reward_card").map((event) => event.name)).toEqual([
    "signup_reward_card_shown",
  ]);
  expect(named(events, "signup_reward_card")[0]).toMatchObject({ surface: "learning" });

  fireEvent.tap(screen.getByTestId(ids.card), {});
  await flush();
  expect(present("login-screen-title")).toBe(true);
  expect(named(events, "signup_reward_card").map((event) => event.name)).toEqual([
    "signup_reward_card_shown",
    "signup_reward_card_tapped",
  ]);

  tapButtonIn("login-screen-method-google");
  await flushRounds();
  expect(present("login-screen-title")).toBe(false);
  expect(present(ids.card)).toBe(false);
  expect(screen.getByTestId(ids.modal).textContent).toContain(
    "Your guest progress is saved to your account.",
  );
  expect(calls.order[0]).toBe("signup");
  expect(named(events, "signup_reward_shown")).toEqual([
    expect.objectContaining({ amount: "100", surface: "learning" }),
  ]);
});

const memberStore = () =>
  new Map([
    [authSessionStorageKey, serializeAuthSession(signedInBootSession)],
    [learningItemGuideSeenStorageKey, allLearningItemGuidesSeenValue],
  ]);
const base64Url = (value: unknown): string =>
  btoa(JSON.stringify(value)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
// 시험 표시가 없는 회원 토큰 — 진행 읽기가 끝나려면 새로 받은 토큰이 있어야 한다(App.launch-coins와 같은 꼴).
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

test("SR-I2 새 계정 회원: 지급 100 → 처음부터 가입한 문구의 모달 → Got it이면 날아간 뒤 닫힘, 다음 실행엔 묻지도 띄우지도 않음 · 카드 없음", async () => {
  const store = memberStore();
  await renderSignedInApp(<App progressSeed={legacyPassedSeed} />, boot(store));
  await flushRounds(4);
  expect(present(ids.card)).toBe(false);
  expect(screen.getByTestId(ids.modal).textContent).toContain(
    "Use Yeopjeon to chat with the friends you meet.",
  );
  vi.useFakeTimers();
  tapGotIt();
  act(() => {
    vi.advanceTimersByTime(3_000);
  });
  vi.useRealTimers();
  expect(present(ids.modal)).toBe(false);

  cleanup();
  calls.order = [];
  await renderSignedInApp(<App progressSeed={legacyPassedSeed} />, boot(store));
  await flushRounds(4);
  expect(present(ids.modal)).toBe(false);
  expect(calls.order).not.toContain("signup");
});

test("SR-I3 기존 회원(지급 0)은 모달 없이 엽전 출시 모달이 그대로 — 가입 보상을 먼저 묻는다", async () => {
  reward.result = { granted: 0, balance: 0 };
  await renderSignedInApp(<App progressSeed={legacyPassedSeed} />, boot(memberStore()));
  await flushRounds(4);
  expect(present(ids.modal)).toBe(false);
  expect(present(launch.coins)).toBe(true);
  expect(calls.order.slice(0, 2)).toEqual(["signup", "coins"]);
});

test("SR-I4 가입 보상과 출시 보너스를 둘 다 받으면 가입 모달이 먼저, 닫은 뒤 출시 모달", async () => {
  await renderSignedInApp(<App progressSeed={legacyPassedSeed} />, boot(memberStore()));
  await flushRounds(4);
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
