import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { authSessionStorageKey } from "../lib/auth-session";
import type { AuthSession } from "../lib/auth-session.contract";
import { guestSessionStorageKey } from "../lib/guest-session";
import type { AccountState } from "../lib/guest-session";
import { storeSignedInSession } from "./store-session";

// 세션 저장 한 자리(ADR-0111 §2-1): 저장 → 표식 삭제 → 상태 → 진행 동기화 → 식별. 순서가 계약이다.

function tokenFor(sub: string | null): string {
  const payload = btoa(JSON.stringify(sub === null ? {} : { sub }))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
  return `e30.${payload}.sig`;
}

function sessionFor(sub: string | null): AuthSession {
  return { accessToken: tokenFor(sub), refreshToken: "refresh", expiresAt: 9_999_999_999 };
}

let store: Map<string, string>;
let log: string[];

beforeEach(() => {
  store = new Map([[guestSessionStorageKey, "1"]]);
  log = [];
  vi.stubGlobal("NativeModules", {
    StorageModule: {
      get: (key: string) => store.get(key) ?? null,
      set: (key: string, value: string) => {
        log.push(`set:${key}`);
        store.set(key, value);
      },
      remove: (key: string) => {
        log.push(`remove:${key}`);
        store.delete(key);
      },
    },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function deps(
  identify: (userId: string) => void = (userId) => void log.push(`identify:${userId}`),
) {
  return {
    analyticsUser: { identify, reset: () => undefined },
    syncProgress: () => {
      log.push("syncProgress");
      return Promise.resolve();
    },
    setAccountState: (state: AccountState) => void log.push(`state:${state}`),
  };
}

test("SS1. 세션 저장 → 표식 삭제 → 상태 signed-in → 진행 동기화 → 식별 순서이고 사용자 ID를 돌려준다", () => {
  const userId = storeSignedInSession(sessionFor("u1"), deps());

  expect(userId).toBe("u1");
  expect(log).toEqual([
    `set:${authSessionStorageKey}`,
    `remove:${guestSessionStorageKey}`,
    "state:signed-in",
    "syncProgress",
    "identify:u1",
  ]);
  expect(store.has(guestSessionStorageKey)).toBe(false);
  expect(store.has(authSessionStorageKey)).toBe(true);
});

test("SS1. 토큰에 sub가 없으면 식별 0 · null을 돌려주되 나머지는 똑같이 한다", () => {
  const userId = storeSignedInSession(sessionFor(null), deps());

  expect(userId).toBeNull();
  expect(log).toEqual([
    `set:${authSessionStorageKey}`,
    `remove:${guestSessionStorageKey}`,
    "state:signed-in",
    "syncProgress",
  ]);
});

test("SS1. identify가 던져도 던지지 않고 사용자 ID를 돌려준다", () => {
  const identify = vi.fn<(userId: string) => void>(() => {
    throw new Error("analytics down");
  });

  let userId: string | null = null;
  expect(() => {
    userId = storeSignedInSession(sessionFor("u1"), deps(identify));
  }).not.toThrow();

  expect(userId).toBe("u1");
  expect(identify).toHaveBeenCalledTimes(1);
  expect(identify).toHaveBeenCalledWith("u1");
});

test("SS1. analyticsUser가 없어도 던지지 않는다", () => {
  const withoutAnalytics = { ...deps(), analyticsUser: null };

  expect(() => storeSignedInSession(sessionFor("u1"), withoutAnalytics)).not.toThrow();
  expect(log).toContain("state:signed-in");
});
