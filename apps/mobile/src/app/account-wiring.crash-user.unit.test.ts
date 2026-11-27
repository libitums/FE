import { afterEach, beforeEach, expect, test, vi } from "vitest";

import type { AccountDeletionResult } from "../lib/account.contract";
import { saveAuthSession } from "../lib/auth-session";
import { accountWiring } from "./account-wiring";

// 로그아웃 · 계정 삭제는 오류 수집의 사용자도 지운다(ADR-0207 D3). 삭제가 실패하면 남는다(계정이 그대로다).

const deleteAccountMock = vi.hoisted(() => vi.fn<() => Promise<AccountDeletionResult>>());

vi.mock("../lib/account-deletion", () => ({ deleteAccount: deleteAccountMock }));
vi.mock("../lib/api-client", () => ({
  signOutRemotely: vi.fn<() => Promise<void>>(async () => undefined),
}));
vi.mock("./push-wiring", () => ({ forgetPushDevice: vi.fn<() => void>() }));

let store: Map<string, string>;
let crashCalls: string[];

function tokenFor(sub: string): string {
  const payload = btoa(JSON.stringify({ sub }))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
  return `e30.${payload}.sig`;
}

function wire() {
  const leaveApp = vi.fn<(exit: "signed-out" | "deleted") => void>();
  return accountWiring({ analyticsUser: null, entryEventSink: null, leaveApp });
}

beforeEach(() => {
  store = new Map();
  crashCalls = [];
  vi.stubGlobal("NativeModules", {
    StorageModule: {
      get: (key: string) => store.get(key) ?? null,
      set: (key: string, value: string) => void store.set(key, value),
      remove: (key: string) => void store.delete(key),
    },
    CrashReportingModule: {
      setUser: (userId: string) => crashCalls.push(`setUser:${userId}`),
      clearUser: () => crashCalls.push("clearUser"),
    },
  });
  saveAuthSession({
    accessToken: tokenFor("3f2a9c1e-7b4d-4e8a-9c0f-1a2b3c4d5e6f"),
    refreshToken: "r",
    expiresAt: 9_999_999_999,
  });
  deleteAccountMock.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

test("AW-C1. 로그아웃하면 오류 수집의 사용자를 지운다 — 세션이 없어도", () => {
  wire().onSignOut();
  store.clear();
  wire().onSignOut();

  expect(crashCalls).toEqual(["clearUser", "clearUser"]);
});

test("AW-C2. 계정 삭제가 성공하면 지운다", async () => {
  deleteAccountMock.mockResolvedValue({ status: "deleted" });

  await wire().onDeleteAccount();

  expect(crashCalls).toEqual(["clearUser"]);
});

test("AW-C3. 계정 삭제가 실패하면 그대로 둔다", async () => {
  deleteAccountMock.mockResolvedValue({ status: "failed", reason: "network" });

  await wire().onDeleteAccount();

  expect(crashCalls).toEqual([]);
});
