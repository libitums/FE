import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, screen, within } from "@lynx-js/react/testing-library";

import { App } from "./App";
import {
  present,
  renderTesterApp,
  resetMessengerChatSource,
} from "./test-helpers/messenger-chat-app";
import { renderSignedInApp, signedInBootSession } from "./test-helpers/signed-in-app";
import { authSessionStorageKey, serializeAuthSession } from "../lib/auth-session";
import { learningItemGuideSeenStorageKey } from "../lib/learning-item-guide";
import { allLearningItemGuidesSeenValue } from "../lib/learning-item-guide.test-support";
import { legacyPassedSeed } from "./test-helpers/progress-seed";
import { launchTestIds as ids } from "../screens/launch/launch.contract";

// `integration` 계층(YL-I1 ~ I3): 엽전 출시 안내(ADR-0140) — 서버 한 번 지급 → 엽전 모달 → 채팅 모달 → 메신저 탭,
// 머리 엽전 칩은 엽전 모달을 닫은 뒤 서버 잔액. 서버 경계(companion_claim_coins)만 목.

const claim = vi.hoisted(() => ({
  result: { learning: 370, bonus: 100, balance: 470 } as {
    learning: number;
    bonus: number;
    balance: number;
  } | null,
  calls: 0,
}));
vi.mock("../lib/coin-wallet-api", () => ({
  coinClient: () => ({
    claim: async () => {
      claim.calls += 1;
      return claim.result;
    },
  }),
}));

// 서버에 저장된 진행이 없음 — 진행 읽기가 끝나(loaded) 지도가 한가해진다.
const noRemote = async () => ({ status: 200, body: "null" });
let store = new Map<string, string>();
const base64Url = (value: unknown): string =>
  btoa(JSON.stringify(value)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
// 시험 표시가 없는 회원 토큰 — 진행 읽기가 끝나려면 새로 받은 토큰이 있어야 한다.
const memberToken = `${base64Url({ alg: "none" })}.${base64Url({ sub: "member-1", app_metadata: {} })}.sig`;
const boot = () => ({
  loadProgress: noRemote,
  storageModule: {
    get: (key: string) => store.get(key) ?? null,
    set: (key: string, value: string) => void store.set(key, value),
    remove: (key: string) => void store.delete(key),
  },
});
const flush = () => act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
const tapButton = (testId: string) =>
  act(() => {
    fireEvent.tap(within(screen.getByTestId(testId)).getByText(/./), {});
  });

beforeEach(async () => {
  claim.result = { learning: 370, bonus: 100, balance: 470 };
  claim.calls = 0;
  store = new Map([
    [authSessionStorageKey, serializeAuthSession(signedInBootSession)],
    [learningItemGuideSeenStorageKey, allLearningItemGuidesSeenValue],
  ]);
  await resetMessengerChatSource();
});
afterEach(() => {
  cleanup();
  (lynx as unknown as { __globalProps: unknown }).__globalProps = undefined;
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

test("YL-I1 시험 계정: 지급 → 엽전 모달 → 날아간 뒤 채팅 모달 → Start chatting이면 메신저 탭", async () => {
  await renderTesterApp(<App progressSeed={legacyPassedSeed} />, boot());
  await flush();
  expect(claim.calls).toBe(1);
  expect(screen.getByTestId(ids.coins).textContent).toContain("Launch bonus");
  vi.useFakeTimers();
  tapButton(ids.gotIt);
  act(() => {
    vi.advanceTimersByTime(1_000);
  });
  vi.useRealTimers();
  expect(present(ids.coins)).toBe(false);
  expect(screen.getByTestId(ids.chat)).toBeTruthy();
  tapButton(ids.start);
  expect(present(ids.chat)).toBe(false);
  expect(present("messenger-list-screen")).toBe(true);
});

test("YL-I2 시험 계정이 아닌 회원은 엽전 모달만, 이미 받은 보너스(두 번째 지급)는 모달 없음", async () => {
  await renderSignedInApp(<App progressSeed={legacyPassedSeed} />, {
    ...boot(),
    refreshedAccessToken: memberToken,
  });
  await flush();
  expect(present(ids.coins)).toBe(true);
  vi.useFakeTimers();
  tapButton(ids.gotIt);
  act(() => {
    vi.advanceTimersByTime(1_000);
  });
  vi.useRealTimers();
  expect(present(ids.coins)).toBe(false);
  expect(present(ids.chat)).toBe(false);
  cleanup();
  claim.result = { learning: 0, bonus: 0, balance: 470 };
  await renderSignedInApp(<App progressSeed={legacyPassedSeed} />, {
    ...boot(),
    refreshedAccessToken: memberToken,
  });
  await flush();
  expect(present(ids.coins)).toBe(false);
});

test("YL-I3 튜토리얼 전 새 사용자는 지급 · 모달을 미룬다", async () => {
  await renderTesterApp(<App />, boot());
  await flush();
  expect(claim.calls).toBe(0);
  expect(present(ids.coins)).toBe(false);
});
