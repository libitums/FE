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

// 오류 수집의 사용자(ADR-0207 D3) — 분석과 같은 ID를, 분석 클라이언트가 없어도 넘긴다.
const crashUserId = "3f2a9c1e-7b4d-4e8a-9c0f-1a2b3c4d5e6f";

function stubCrashHost(): string[] {
  const calls: string[] = [];
  const modules = (globalThis as { NativeModules?: Record<string, unknown> }).NativeModules ?? {};
  vi.stubGlobal("NativeModules", {
    ...modules,
    CrashReportingModule: {
      setUser: (userId: string) => calls.push(`setUser:${userId}`),
      clearUser: () => calls.push("clearUser"),
    },
  });
  return calls;
}

test("SS2. 세션을 저장하면 오류 수집에 같은 사용자 ID를 넘긴다 — 분석 클라이언트가 없어도", () => {
  const calls = stubCrashHost();

  storeSignedInSession(sessionFor(crashUserId), { ...deps(), analyticsUser: null });

  expect(calls).toEqual([`setUser:${crashUserId}`]);
});

test("SS2. 식별이 던져도 오류 수집에는 넘긴다", () => {
  const calls = stubCrashHost();

  storeSignedInSession(
    sessionFor(crashUserId),
    deps(() => {
      throw new Error("analytics down");
    }),
  );

  expect(calls).toEqual([`setUser:${crashUserId}`]);
});

test("SS2. 토큰에 sub가 없으면 오류 수집도 부르지 않는다", () => {
  const calls = stubCrashHost();

  storeSignedInSession(sessionFor(null), deps());

  expect(calls).toEqual([]);
});
