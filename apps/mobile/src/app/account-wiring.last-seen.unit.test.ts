import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import type { AccountDeletionResult } from "../lib/account.contract";
import { saveAuthSession } from "../lib/auth-session";
import { LAST_SEEN_KEY } from "../screens/messenger-chat/chat-last-seen-store";
import { accountWiring } from "./account-wiring";

// `unit` 계층(LSN-U10 ~ U11): 본 마지막 인물 메시지(ADR-0213 개정)는 로그아웃 · 계정 삭제에 그 계정 것만 지운다.

const deleteAccountMock = vi.hoisted(() => vi.fn<() => Promise<AccountDeletionResult>>());

vi.mock("../lib/account-deletion", () => ({ deleteAccount: deleteAccountMock }));
vi.mock("../lib/api-client", () => ({
  signOutRemotely: vi.fn<() => Promise<void>>(async () => undefined),
}));
vi.mock("./push-wiring", () => ({ forgetPushDevice: vi.fn<() => void>() }));

let store: Map<string, string>;

const tokenFor = (sub: string): string =>
  `e30.${btoa(JSON.stringify({ sub })).split("=").join("")}.sig`;

const wiring = () =>
  accountWiring({ analyticsUser: null, entryEventSink: null, leaveApp: vi.fn() });

const saved = (): Record<string, unknown> =>
  JSON.parse(store.get(LAST_SEEN_KEY) ?? "{}") as Record<string, unknown>;

beforeEach(() => {
  store = new Map();
  vi.stubGlobal("NativeModules", {
    StorageModule: {
      get: (key: string) => store.get(key) ?? null,
      set: (key: string, value: string) => void store.set(key, value),
      remove: (key: string) => void store.delete(key),
    },
  });
  saveAuthSession({ accessToken: tokenFor("user-1"), refreshToken: "r", expiresAt: 9_999_999_999 });
  store.set(
    LAST_SEEN_KEY,
    JSON.stringify({
      "server:user-1": { mina: { id: "m-1", at: 1 } },
      "server:other": { mina: { id: "o-1", at: 2 } },
    }),
  );
  deleteAccountMock.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("본 마지막 인물 메시지의 계정 경계", () => {
  test("LSN-U10 로그아웃하면 그 계정 것만 지운다", () => {
    wiring().onSignOut();
    expect(saved()).toEqual({ "server:other": { mina: { id: "o-1", at: 2 } } });
  });

  test("LSN-U11 계정 삭제가 성공하면 그 계정 것만 지운다", async () => {
    deleteAccountMock.mockResolvedValue({ status: "deleted" });
    await wiring().onDeleteAccount();
    expect(saved()).toEqual({ "server:other": { mina: { id: "o-1", at: 2 } } });
  });
});
