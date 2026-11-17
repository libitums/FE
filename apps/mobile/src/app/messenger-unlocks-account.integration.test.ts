import { afterEach, beforeEach, expect, test, vi } from "vitest";

import type { AccountDeletionResult } from "../lib/account.contract";
import { saveAuthSession } from "../lib/auth-session";
import type { ChatRemote } from "../screens/messenger-chat/chat-remote.contract";
import { accountWiring } from "./account-wiring";
import {
  messengerChatSource,
  messengerUnlockStore,
  resetMessengerChatSourceForTests,
  setMessengerChatRemote,
} from "./messenger-chat-wiring";

// `integration` 계층(UA-I1): 결선 경계 — 계정 A가 연 인물이, 같은 기기에서 A를 지우고 새로 가입한 B의 채팅 목록에 남지 않는다
// (2026-11-17 기기 — 탈퇴 뒤 튜토리얼만 깼는데 정윤경 · 미나가 채팅에 있었다). 로그아웃은 해금을 남겨 다시 로그인하면 돌아온다.

const deleteAccountMock = vi.hoisted(() => vi.fn<() => Promise<AccountDeletionResult>>());
vi.mock("../lib/account-deletion", () => ({ deleteAccount: deleteAccountMock }));
vi.mock("../lib/api-client", () => ({
  signOutRemotely: vi.fn<() => Promise<void>>(async () => undefined),
}));
vi.mock("./push-wiring", () => ({ forgetPushDevice: vi.fn<() => void>() }));

let store: Map<string, string>;

function tokenFor(sub: string): string {
  const payload = btoa(JSON.stringify({ sub }))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
  return `e30.${payload}.sig`;
}

const signIn = (sub: string) =>
  saveAuthSession({ accessToken: tokenFor(sub), refreshToken: "r", expiresAt: 9_999_999_999 });

const remote: ChatRemote = {
  loadHistory: async () => null,
  greet: async () => null,
  openTurn: () => ({ cancel: () => undefined }),
};

const roomIds = () =>
  messengerChatSource((path) => path)
    .snapshot()
    .rooms.filter((room) => room.access.kind === "open")
    .map((room) => room.roomId)
    .sort();

const wiring = () =>
  accountWiring({ analyticsUser: null, entryEventSink: null, leaveApp: () => undefined });

beforeEach(() => {
  store = new Map();
  vi.stubGlobal("NativeModules", {
    StorageModule: {
      get: (key: string) => store.get(key) ?? null,
      set: (key: string, value: string) => void store.set(key, value),
      remove: (key: string) => void store.delete(key),
    },
  });
  resetMessengerChatSourceForTests();
  setMessengerChatRemote(() => remote);
  deleteAccountMock.mockReset();
});

afterEach(() => {
  resetMessengerChatSourceForTests();
  setMessengerChatRemote(null);
  vi.unstubAllGlobals();
});

test("UA-I1 A가 연 정윤경 · 미나는 A를 지우고 새로 가입한 B의 목록에 없다(덕수쌤만)", async () => {
  signIn("user-a");
  messengerUnlockStore().add("yoonkyung");
  messengerUnlockStore().add("mina");
  expect(roomIds()).toEqual(["duksu", "mina", "yoonkyung"]);

  deleteAccountMock.mockResolvedValue({ status: "deleted" });
  await wiring().onDeleteAccount();
  signIn("user-b");

  expect(roomIds()).toEqual(["duksu"]);
});

test("UA-I2 로그아웃은 해금을 남긴다 — 다른 계정에는 없고, 같은 계정으로 돌아오면 다시 열린다", () => {
  signIn("user-a");
  messengerUnlockStore().add("mina");
  wiring().onSignOut();

  signIn("user-b");
  expect(roomIds()).toEqual(["duksu"]);

  signIn("user-a");
  expect(roomIds()).toEqual(["duksu", "mina"]);
});
