import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, screen, within } from "@lynx-js/react/testing-library";

import type { AccountDeletionResult } from "../lib/account.contract";
import { authSessionStorageKey, saveAuthSession, serializeAuthSession } from "../lib/auth-session";
import { learningItemGuideSeenStorageKey } from "../lib/learning-item-guide";
import { allLearningItemGuidesSeenValue } from "../lib/learning-item-guide.test-support";
import { setRewardTicketPass, setWelcomeTicketPass } from "../lib/reward-ticket-pass";
import { ticketsUnlimited } from "../lib/unlimited-tickets";
import { clock12 } from "../lib/welcome-gift-time";
import { signupRewardTestIds as ids } from "../screens/signup-reward/signup-reward.contract";
import {
  flushRounds,
  installGuestHost,
  jwtFor,
  present,
  renderGuestApp,
  resetGuestHost,
} from "./test-helpers/guest-entry";
import { resetMessengerChatSource } from "./test-helpers/messenger-chat-app";
import { accountWiring } from "./account-wiring";
import { legacyPassedSeed, tutorialCoverDoneProgress } from "./test-helpers/progress-seed";

// `integration` 계층(WS-I1 ~ I4, ADR-0186 개정 4 — 사용자 결정 A 2026-11-27): 첫날 무제한 24시간은 가입 보상 창이 처음 선 때부터다.
// 창 전(튜토리얼 중)에는 적용하지 않고, 창이 서면 그 시각을 계정마다 기기에 적어 칩 · 남은 시간 판 · 창의 끝 시각이 모두 그 뒤 24시간을
// 쓴다. 창이 생성 48시간 뒤에 섰거나 창보다 먼저 레슨이 티켓을 쓸 수 있는 경우(지급 물음 실패)는 계정 생성 기준이다.
// 대역은 경계뿐(가입 보상 · 엽전 RPC · 저장소 · fetch · 계정 삭제 요청). 튜토리얼 두 시간은 계정 생성 시각을 두 시간 앞으로 두어 흉내 낸다.
// WS-I5 ~ I7(개정 4 보강 — 2026-11-27 기기): 탈퇴 뒤 같은 신원으로 다시 가입하면 서버가 지급하지 않고(`identity_used`, granted 0) 그 응답이
// 튜토리얼 중에 와서, 창 전인데 계정 생성 기준으로 무제한이 켜졌다. 튜토리얼을 끝내기 전에는 지급 결과와 상관없이 창 전이다.

const HOUR = 3_600_000;
const isoHoursAgo = (hours: number): string => new Date(Date.now() - hours * HOUR).toISOString();
const shownKey = "libitum.welcome-pass.shown-at.u1";
const signupKey = "libitum.signup-reward.u1";

const reward = vi.hoisted(() => ({ result: null as { granted: number; balance: number } | null }));
const deleteAccountMock = vi.hoisted(() => vi.fn<() => Promise<AccountDeletionResult>>());
vi.mock("../lib/account-deletion", async (original) => ({
  ...(await original<typeof import("../lib/account-deletion")>()),
  deleteAccount: deleteAccountMock,
}));
vi.mock("../lib/api-client", async (original) => ({
  ...(await original<typeof import("../lib/api-client")>()),
  signOutRemotely: async () => undefined,
}));
vi.mock("../lib/signup-reward-api", async (original) => ({
  ...(await original<typeof import("../lib/signup-reward-api")>()),
  signupRewardClient: () => ({ claim: async () => reward.result }),
}));
vi.mock("../lib/coin-wallet-api", async (original) => ({
  ...(await original<typeof import("../lib/coin-wallet-api")>()),
  coinClient: () => ({ claim: async () => null }),
}));

type Event = { name: string; [key: string]: unknown };

/** 로그인한 채 저장된 세션(u1)으로 켭니다 — 부팅 갱신 응답이 계정 생성 시각을 싣습니다. */
async function bootSignedIn(options: {
  readonly createdHoursAgo: number;
  readonly tutorialDone: boolean | "cover";
  readonly extra?: readonly (readonly [string, string])[];
  /** 부팅 전에 같은 기기에서 할 일(예: 이전 계정 탈퇴) — 저장소 대역이 깔린 뒤 부릅니다. */
  readonly before?: () => Promise<void>;
}): Promise<{ readonly store: Map<string, string>; readonly events: Event[] }> {
  const store = new Map<string, string>([
    [learningItemGuideSeenStorageKey, allLearningItemGuidesSeenValue],
    ...(options.extra ?? []),
  ]);
  const host = installGuestHost({ store, accountCreatedAt: isoHoursAgo(options.createdHoursAgo) });
  await options.before?.();
  store.set(
    authSessionStorageKey,
    serializeAuthSession({
      accessToken: jwtFor("u1"),
      refreshToken: "boot",
      expiresAt: 4_102_444_800_000,
    }),
  );
  const events: Event[] = [];
  const seed =
    options.tutorialDone === true
      ? { progressSeed: legacyPassedSeed }
      : options.tutorialDone === "cover"
        ? { progressSeed: { catalogProgress: tutorialCoverDoneProgress() } }
        : {};
  await renderGuestApp(host, {
    platform: "ios",
    appProps: {
      ...seed,
      episodeIntroEventSink: (event) => void events.push(event as never),
    },
  });
  await flushRounds();
  return { store, events };
}

const chip = () => screen.getByTestId("top-bar-tickets");
const hoursLeft = () => {
  fireEvent.tap(chip(), {});
  return screen.getByTestId("unlimited-ticket-modal-days-left").textContent;
};
/** 끝 시각의 영어 표기(「tomorrow, 9:41 PM」의 시각 부분). */
const clockOf = (ms: number): string => {
  const date = new Date(ms);
  const parts = clock12(date.getHours(), date.getMinutes());
  return `${String(parts.hour)}:${parts.minutes} ${parts.pm ? "PM" : "AM"}`;
};

beforeEach(async () => {
  reward.result = null;
  deleteAccountMock.mockReset();
  await resetMessengerChatSource();
});
afterEach(() => {
  cleanup();
  resetGuestHost();
  setRewardTicketPass(0);
  setWelcomeTicketPass(0);
  (lynx as unknown as { __globalProps: unknown }).__globalProps = undefined;
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

test("[WS-I1] 가입 두 시간 뒤(튜토리얼) 창이 서면 그때부터 24시간 — 창의 끝 시각 · 기기 기록 · 칩이 24시간 남음", async () => {
  const before = Date.now();
  const { store, events } = await bootSignedIn({
    createdHoursAgo: 2,
    tutorialDone: true,
    extra: [[signupKey, JSON.stringify({ amount: 100, shown: false })]],
  });

  expect(present(ids.modal)).toBe(true);
  // 창이 선 시각을 이 계정의 기기 기록에 적는다(부팅의 가짜 시계가 몇 초 앞설 수 있어 넉넉히 본다).
  const shownAt = Number(store.get(shownKey));
  expect(shownAt).toBeGreaterThanOrEqual(before);
  expect(shownAt).toBeLessThanOrEqual(Date.now() + 60_000);
  // 끝 시각은 계정 생성 + 24시간(오늘 · 22시간 뒤)이 아니라 창이 선 때 + 24시간(내일).
  expect(screen.getByTestId(ids.unlimitedRow).textContent).toContain(
    `until tomorrow, ${clockOf(shownAt + 24 * HOUR)}.`,
  );
  expect(events.filter((event) => event.name === "signup_reward_shown")).toEqual([
    expect.objectContaining({ unlimited: "shown" }),
  ]);
  expect(ticketsUnlimited()).toBe(true);

  await act(async () => {
    fireEvent.tap(within(screen.getByTestId(ids.gotIt)).getByText(/./), {});
  });
  await flushRounds();
  expect(chip()).not.toHaveTextContent(/\d/); // 무제한 칩
  // 남은 시간은 창이 선 때부터 24시간(계정 생성 기준이면 22) — 부팅의 가짜 시계가 몇 초 앞서면 올림으로 25가 될 수 있다.
  const left = Math.ceil((shownAt + 24 * HOUR - Date.now()) / HOUR);
  expect(left).toBeGreaterThanOrEqual(24);
  expect(hoursLeft()).toBe(`${String(left)} hours left`);
});

test("[WS-I2] 창을 보기 전(튜토리얼 중)에는 첫날 무제한이 없다 — 칩은 숫자, 기기 기록도 없음", async () => {
  const { store } = await bootSignedIn({ createdHoursAgo: 2, tutorialDone: false });
  expect(present("journey-map-screen")).toBe(true);
  expect(present(ids.modal)).toBe(false);
  expect(ticketsUnlimited()).toBe(false);
  expect(chip()).toHaveTextContent(/^\d+$/);
  expect(store.has(shownKey)).toBe(false);
});

test("[WS-I3] 창이 생성 48시간 뒤에 섰으면(남용 상한) 계정 생성 기준 — 이미 끝나 칩은 숫자", async () => {
  await bootSignedIn({
    createdHoursAgo: 51,
    tutorialDone: true,
    extra: [
      [signupKey, JSON.stringify({ amount: 100, shown: true })],
      [shownKey, String(Date.now() - HOUR)],
    ],
  });
  expect(ticketsUnlimited()).toBe(false);
  expect(chip()).toHaveTextContent(/^\d+$/);
});

test("[WS-I4] 튜토리얼을 끝냈는데 지급을 모르면(물음 실패 — 창보다 먼저 레슨이 티켓을 쓸 수 있음) 계정 생성 기준 그대로", async () => {
  const { store } = await bootSignedIn({ createdHoursAgo: 2, tutorialDone: true });
  expect(present(ids.modal)).toBe(false);
  expect(ticketsUnlimited()).toBe(true);
  expect(hoursLeft()).toBe("22 hours left");
  expect(store.has(shownKey)).toBe(false);
});

/** 탈퇴 뒤 같은 신원으로 다시 가입한 계정 — 서버가 지급하지 않는다(`identity_used`). */
const identityUsed = { granted: 0, balance: 0 };

test.each([
  ["튜토리얼 시작 전", false],
  ["튜토리얼 중(u00 표지만 끝냄)", "cover"],
] as const)(
  "[WS-I5] 지급 0(identity_used)이 %s에 와도 창 전이다 — 칩은 숫자, 티켓 판정 무제한 아님, 창 기록 없음",
  async (_label, tutorialDone) => {
    reward.result = identityUsed;
    const { store } = await bootSignedIn({ createdHoursAgo: 1, tutorialDone });
    // 지급 물음이 실제로 끝났다(이 기기에서 끝난 것으로 적힘) — 응답이 오기 전의 「모름」이 아니다.
    expect(JSON.parse(store.get(signupKey) ?? "null")).toEqual({ amount: 0, shown: true });
    expect(present(ids.modal)).toBe(false);
    expect(ticketsUnlimited()).toBe(false);
    expect(chip()).toHaveTextContent(/^\d+$/);
    expect(store.has(shownKey)).toBe(false);
  },
);

test("[WS-I6] 탈퇴 → 같은 기기에서 다시 가입(튜토리얼 전) — 지운 계정의 창 · 보상 기록이 새 계정에 섞이지 않고 칩은 숫자", async () => {
  reward.result = identityUsed;
  deleteAccountMock.mockResolvedValue({ status: "deleted" });
  const { store } = await bootSignedIn({
    createdHoursAgo: 0,
    tutorialDone: false,
    extra: [
      ["libitum.signup-reward.u-old", JSON.stringify({ amount: 100, shown: true })],
      ["libitum.welcome-pass.shown-at.u-old", String(Date.now() - 30 * HOUR)],
    ],
    before: async () => {
      saveAuthSession({
        accessToken: jwtFor("u-old"),
        refreshToken: "old",
        expiresAt: 4_102_444_800_000,
      });
      await accountWiring({
        analyticsUser: null,
        entryEventSink: null,
        leaveApp: () => undefined,
      }).onDeleteAccount();
    },
  });
  expect(deleteAccountMock).toHaveBeenCalledTimes(1);
  expect(JSON.parse(store.get(signupKey) ?? "null")).toEqual({ amount: 0, shown: true });
  expect(ticketsUnlimited()).toBe(false);
  expect(chip()).toHaveTextContent(/^\d+$/);
  expect(store.has(shownKey)).toBe(false);
});

test("[WS-I7] 튜토리얼을 끝냈고 지급 0(창이 오지 않음이 확정)이면 계정 생성 기준 — 생성 한 시간 뒤 23시간 남음", async () => {
  reward.result = identityUsed;
  const { store } = await bootSignedIn({ createdHoursAgo: 1, tutorialDone: true });
  expect(present(ids.modal)).toBe(false);
  expect(ticketsUnlimited()).toBe(true);
  expect(hoursLeft()).toBe("23 hours left");
  expect(store.has(shownKey)).toBe(false);
});
