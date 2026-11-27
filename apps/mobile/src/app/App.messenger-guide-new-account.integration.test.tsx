import { act, cleanup, fireEvent, screen, within } from "@lynx-js/react/testing-library";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import type { AccountDeletionResult } from "../lib/account.contract";
import { authSessionStorageKey, saveAuthSession, serializeAuthSession } from "../lib/auth-session";
import { learningItemGuideSeenStorageKey } from "../lib/learning-item-guide";
import { allLearningItemGuidesSeenValue } from "../lib/learning-item-guide.test-support";
import { memoryUnlockStore } from "../screens/messenger-chat/chat-local-stores";
import type { ChatRemote } from "../screens/messenger-chat/chat-remote.contract";
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
import { openTab, present, renderTesterApp } from "./test-helpers/messenger-chat-app";
import { signedInBootSession } from "./test-helpers/signed-in-app";

// `integration` 계층(GA-I3 ~ I4): 같은 기기에서 계정을 지우고 새로 가입한 사람이 튜토리얼 전에 메신저에 들어가면 목록 안내 ·
// 덕수쌤 방 안내가 처음부터 선다(2026-11-27 기기 — 탈퇴 후 재가입한 새 계정에 안내가 뜨지 않았다). 안내 기록은 기기 저장소에
// 계정과 상관없이 남아, 지운 계정이 본 기록이 다음 계정의 안내를 막았다. 튜토리얼 진행은 안내 조건이 아니다(씨앗 없음 = 새 계정).
// 대역은 경계뿐 — `StorageModule` · `ChatRemote` · 계정 삭제 요청.

const deleteAccountMock = vi.hoisted(() => vi.fn<() => Promise<AccountDeletionResult>>());
vi.mock("../lib/account-deletion", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/account-deletion")>()),
  deleteAccount: deleteAccountMock,
}));
vi.mock("../lib/api-client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/api-client")>()),
  signOutRemotely: async () => undefined,
}));

const COACH = "messenger-chat-guide-coach";
const LIST_GUIDE = "messenger-chat-guide-list";
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
  greet: async () => ({
    messages: [{ id: "g#0", at: 1, kind: "text", from: "them", text: { ko: "안녕", en: "Hi" } }],
    ideas: null,
  }),
  openTurn: () => ({ cancel: () => undefined }),
};

/** 지운 계정이 이 기기에서 안내를 모두 본 기록 — 목록 · 방 · 예시 둘 · 키보드 · 탭 NEW. */
function seedPreviousAccountGuides(): void {
  store.set(messengerGuideSeenStorageKey, JSON.stringify(["list", "room", "snapshot", "voice"]));
  store.set(messengerKeyboardGuideSeenStorageKey, "1");
  store.set(messengerTabVisitedStorageKey, "1");
}

/** 새 계정(튜토리얼 전, 진행 씨앗 없음)으로 부팅해 메신저 탭에 들어갑니다. */
async function bootNewAccount(): Promise<void> {
  store.set(authSessionStorageKey, serializeAuthSession(signedInBootSession));
  store.set(learningItemGuideSeenStorageKey, allLearningItemGuidesSeenValue);
  await renderTesterApp(<App />, { storageModule: storageModule() });
  messengerChatSource((path) => path).setBirthYear(2000);
  await flush();
  openTab("messenger");
  await flush();
}

async function openDuksu(): Promise<void> {
  act(() => {
    fireEvent.tap(
      within(screen.getByTestId("messenger-list-list")).getByTestId("messenger-list-row-duksu"),
      {},
    );
  });
  await flush();
}

beforeEach(() => {
  store = new Map();
  vi.stubGlobal("NativeModules", { StorageModule: storageModule() });
  resetMessengerChatSourceForTests();
  setMessengerChatStoresForTests({
    unlock: memoryUnlockStore([]),
    now: () => Date.now(),
    tier: "free",
  });
  setMessengerChatRemote(() => remote);
  deleteAccountMock.mockReset();
});

afterEach(() => {
  cleanup();
  setMessengerChatRemote(null);
  resetMessengerChatSourceForTests();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

test("GA-I3 계정을 지우고 새로 가입하면 튜토리얼 전에도 목록 안내와 덕수쌤 방 안내(키보드 단계부터)가 선다", async () => {
  seedPreviousAccountGuides();
  saveAuthSession({ ...signedInBootSession, accessToken: "e30.eyJzdWIiOiJ1c2VyLWEifQ.sig" });
  deleteAccountMock.mockResolvedValue({ status: "deleted" });
  await accountWiring({
    analyticsUser: null,
    entryEventSink: null,
    leaveApp: () => undefined,
  }).onDeleteAccount();

  await bootNewAccount();
  expect(present(LIST_GUIDE)).toBe(true);
  await openDuksu();
  expect(screen.getByTestId(COACH).getAttribute("data-step")).toBe("keyboard");
});

test("GA-I4 로그아웃만 했으면 기기의 안내 기록은 남는다 — 같은 기기에 다시 들어온 사람에게 안내가 다시 서지 않는다", async () => {
  seedPreviousAccountGuides();
  saveAuthSession({ ...signedInBootSession, accessToken: "e30.eyJzdWIiOiJ1c2VyLWEifQ.sig" });
  accountWiring({
    analyticsUser: null,
    entryEventSink: null,
    leaveApp: () => undefined,
  }).onSignOut();

  await bootNewAccount();
  expect(present(LIST_GUIDE)).toBe(false);
  await openDuksu();
  expect(present(COACH)).toBe(false);
});
