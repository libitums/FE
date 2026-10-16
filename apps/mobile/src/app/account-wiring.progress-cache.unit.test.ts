import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import type { AccountDeletionResult } from "../lib/account.contract";
import { saveAuthSession } from "../lib/auth-session";
import { accountWiring } from "./account-wiring";
import { cachedProgressKey } from "./cached-learning-progress";

// 기존 account-wiring.unit.test.ts의 「AW3」(reset 범위)와 다른 케이스입니다 — 계획 id가 겹쳐 파일을 나눴습니다.

const deleteAccountMock = vi.hoisted(() => vi.fn<() => Promise<AccountDeletionResult>>());

vi.mock("../lib/account-deletion", () => ({ deleteAccount: deleteAccountMock }));
vi.mock("../lib/api-client", () => ({
  signOutRemotely: vi.fn<() => Promise<void>>(async () => undefined),
}));
vi.mock("./push-wiring", () => ({ forgetPushDevice: vi.fn<() => void>() }));

const userId = "user-1";
const pendingKey = (u: string) => `libitum.progress.pending.${u}`;
let store: Map<string, string>;

function tokenFor(sub: string): string {
  const payload = btoa(JSON.stringify({ sub }))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
  return `e30.${payload}.sig`;
}

function wire() {
  const leaveApp = vi.fn<(exit: "signed-out" | "deleted") => void>();
  return {
    leaveApp,
    wiring: accountWiring({ analyticsUser: null, entryEventSink: null, leaveApp }),
  };
}

beforeEach(() => {
  store = new Map();
  vi.stubGlobal("NativeModules", {
    StorageModule: {
      get: (key: string) => store.get(key) ?? null,
      set: (key: string, value: string) => void store.set(key, value),
      remove: (key: string) => void store.delete(key),
    },
  });
  saveAuthSession({ accessToken: tokenFor(userId), refreshToken: "r", expiresAt: 9_999_999_999 });
  store.set(cachedProgressKey(userId), "cached-raw");
  store.set(pendingKey(userId), "pending-raw");
  store.set(cachedProgressKey("other"), "other-raw");
  deleteAccountMock.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("AW 저장본의 사용자 경계", () => {
  test("AW1. 계정 삭제가 성공하면 그 사용자의 저장본만 지운다", async () => {
    deleteAccountMock.mockResolvedValue({ status: "deleted" });
    const { wiring, leaveApp } = wire();

    await wiring.onDeleteAccount();

    expect(leaveApp).toHaveBeenCalledWith("deleted");
    expect(store.has(cachedProgressKey(userId))).toBe(false);
    expect(store.get(cachedProgressKey("other"))).toBe("other-raw");
  });

  test("AW2. 로그아웃은 저장본을 남긴다", () => {
    const { wiring, leaveApp } = wire();

    wiring.onSignOut();

    expect(leaveApp).toHaveBeenCalledWith("signed-out");
    expect(store.get(cachedProgressKey(userId))).toBe("cached-raw");
  });

  test("AW3. 계정 삭제가 실패하면 저장본을 남긴다", async () => {
    deleteAccountMock.mockResolvedValue({ status: "failed", reason: "network" });
    const { wiring } = wire();

    await wiring.onDeleteAccount();

    expect(store.get(cachedProgressKey(userId))).toBe("cached-raw");
  });
});
