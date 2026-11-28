import { act, cleanup, fireEvent, screen } from "@lynx-js/react/testing-library";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { authSessionStorageKey, serializeAuthSession } from "../lib/auth-session";
import { learningItemGuideSeenStorageKey } from "../lib/learning-item-guide";
import { allLearningItemGuidesSeenValue } from "../lib/learning-item-guide.test-support";
import { memoryUnlockStore } from "../screens/messenger-chat/chat-local-stores";
import type { ChatRemote } from "../screens/messenger-chat/chat-remote.contract";
import { messengerChatTestIds as room } from "../screens/messenger-chat/messenger-chat.contract";
import {
  messengerGuideSeenStorageKey,
  messengerKeyboardGuideSeenStorageKey,
  messengerTabVisitedStorageKey,
} from "../screens/messenger-chat/messenger-guide";
import { accountWiring } from "./account-wiring";
import { App } from "./App";
import {
  messengerChatSource,
  resetMessengerChatSourceForTests,
  setMessengerChatRemote,
  setMessengerChatStoresForTests,
} from "./messenger-chat-wiring";
import { openTab, present } from "./test-helpers/messenger-chat-app";
import { renderSignedInApp } from "./test-helpers/signed-in-app";

// `integration` 계층(GR-I1 ~ I2): 안내 기록이 계정마다 따로 남는다(사용자 결정 2026-11-27). 로그아웃 뒤 같은 기기에서 다른 계정으로
// 들어오면 그 계정에 안내가 처음부터 서고, 처음 계정으로 돌아오면 서지 않는다. 업데이트 전 기기 하나짜리 기록은 업데이트 뒤 처음
// 들어온 계정이 물려받는다. 대역은 경계뿐 — `StorageModule` · `ChatRemote` · 세션 갱신 응답.

vi.mock("../lib/api-client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/api-client")>()),
  signOutRemotely: async () => undefined,
}));

const base64Url = (value: unknown): string =>
  btoa(JSON.stringify(value)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
/** 메신저 목록이 열리는 시험 계정 토큰(ADR-0128) — 계정마다 `sub`가 다릅니다. */
const testerToken = (sub: string): string =>
  `${base64Url({ alg: "none" })}.${base64Url({ sub, app_metadata: { duru_tester: true } })}.sig`;

let store: Map<string, string>;

const storageModule = () => ({
  get: (key: string) => store.get(key) ?? null,
  set: (key: string, value: string) => void store.set(key, value),
  remove: (key: string) => void store.delete(key),
});

const flush = () =>
  act(async () => {
    for (let i = 0; i < 8; i += 1) await new Promise((resolve) => setTimeout(resolve, 0));
  });

const remote: ChatRemote = {
  loadHistory: async () => ({ messages: [], corrections: {}, ideas: null }),
  greet: async () => ({ messages: [], ideas: null }),
  openTurn: () => ({ cancel: () => undefined }),
};

/** 그 계정으로 로그인된 설치를 부팅해 메신저 탭에 들어갑니다 — 학습 문항 안내는 업데이트 전 기기 기록으로 모두 본 설치. */
async function bootAs(sub: string): Promise<void> {
  const token = testerToken(sub);
  store.set(
    authSessionStorageKey,
    serializeAuthSession({ accessToken: token, refreshToken: "r", expiresAt: 4_102_444_800_000 }),
  );
  resetMessengerChatSourceForTests();
  setMessengerChatStoresForTests({
    unlock: memoryUnlockStore([]),
    now: () => Date.now(),
    tier: "free",
  });
  setMessengerChatRemote(() => remote);
  await renderSignedInApp(<App />, { storageModule: storageModule(), refreshedAccessToken: token });
  messengerChatSource((path) => path).setBirthYear(2000);
  await flush();
  openTab("messenger");
  await flush();
}

/** 앱을 내리고 로그아웃합니다(설정의 로그아웃과 같은 뒤처리). */
async function signOut(): Promise<void> {
  cleanup();
  accountWiring({
    analyticsUser: null,
    entryEventSink: null,
    leaveApp: () => undefined,
  }).onSignOut();
  await flush();
}

const skipListGuide = () =>
  act(() => {
    fireEvent.tap(screen.getByTestId(room.guideListSkip), { eventType: "catchEvent" });
  });

beforeEach(() => {
  store = new Map([[learningItemGuideSeenStorageKey, allLearningItemGuidesSeenValue]]);
  vi.stubGlobal("NativeModules", { StorageModule: storageModule() });
});

afterEach(() => {
  cleanup();
  setMessengerChatRemote(null);
  resetMessengerChatSourceForTests();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

test("GR-I1 A가 목록 안내를 봄 → 로그아웃 → B로 들어오면 안내가 선다 → 다시 A면 서지 않는다", async () => {
  await bootAs("user-a");
  expect(present(room.guideList)).toBe(true);
  skipListGuide();
  await flush();
  expect(present(room.guideList)).toBe(false);
  await signOut();

  await bootAs("user-b");
  expect(present(room.guideList)).toBe(true);
  await signOut();

  await bootAs("user-a");
  expect(present(room.guideList)).toBe(false);
  expect(store.has(`${messengerGuideSeenStorageKey}.user-a`)).toBe(true);
  expect(store.has(messengerGuideSeenStorageKey)).toBe(false);
});

test("GR-I2 업데이트 전 기기 기록은 업데이트 뒤 처음 들어온 계정이 물려받고, 다른 계정은 처음부터 본다", async () => {
  store.set(messengerGuideSeenStorageKey, JSON.stringify(["list", "room", "snapshot", "voice"]));
  store.set(messengerKeyboardGuideSeenStorageKey, "1");
  store.set(messengerTabVisitedStorageKey, "1");

  await bootAs("user-a");
  expect(present(room.guideList)).toBe(false);
  for (const key of [
    messengerGuideSeenStorageKey,
    messengerKeyboardGuideSeenStorageKey,
    messengerTabVisitedStorageKey,
    learningItemGuideSeenStorageKey,
  ]) {
    expect(store.has(key)).toBe(false);
    expect(store.has(`${key}.user-a`)).toBe(true);
  }
  await signOut();

  await bootAs("user-b");
  expect(present(room.guideList)).toBe(true);
});
