import { afterEach, expect, test, vi } from "vitest";

import type { AuthSession } from "./auth-session.contract";
import {
  accountStateFrom,
  clearGuestSession,
  guestSessionMarker,
  guestSessionStorageKey,
  isGuestSessionMarker,
  loadGuestSession,
  saveGuestSession,
} from "./guest-session";

// 테스트 환경에는 네이티브가 없어, 호스트가 등록하는 모듈을 대신 세웁니다(auth-session.unit.test.ts와 같은 꼴).
function stubHost() {
  const store = new Map<string, string>();
  vi.stubGlobal("NativeModules", {
    StorageModule: {
      get: (k: string) => store.get(k) ?? null,
      set: (k: string, v: string) => void store.set(k, v),
      remove: (k: string) => void store.delete(k),
    },
  });
  return store;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

const sampleSession: AuthSession = {
  accessToken: "access-token",
  refreshToken: "refresh-token",
  expiresAt: 1_700_000_000_000,
};

test("GS1. 저장 키는 libitum.auth.guest이고, 표식은 정확히 '1'일 때만 참이다", () => {
  expect(guestSessionStorageKey).toBe("libitum.auth.guest");
  expect(guestSessionStorageKey.startsWith("libitum.")).toBe(true);
  expect(guestSessionStorageKey).not.toMatch(/\s/);
  expect(guestSessionMarker).toBe("1");

  expect(isGuestSessionMarker("1")).toBe(true);
  expect(isGuestSessionMarker(null)).toBe(false);
  expect(isGuestSessionMarker("")).toBe(false);
  expect(isGuestSessionMarker("true")).toBe(false);
  expect(isGuestSessionMarker("0")).toBe(false);
});

test("GS2. saveGuestSession 뒤 저장소 키는 그 하나 · 값 '1'이고 load가 참, clear 뒤에는 거짓 · 저장소가 빈다", () => {
  const store = stubHost();
  expect(loadGuestSession()).toBe(false);

  saveGuestSession();

  expect(Array.from(store.entries())).toEqual([[guestSessionStorageKey, "1"]]);
  expect(loadGuestSession()).toBe(true);

  clearGuestSession();

  expect(loadGuestSession()).toBe(false);
  expect(store.size).toBe(0);
});

test("GS2. 저장소가 다른 값을 갖고 있으면 load는 거짓이다", () => {
  const store = stubHost();
  store.set(guestSessionStorageKey, "true");

  expect(loadGuestSession()).toBe(false);
});

// stubHost()를 부르지 않아 호스트 부재를 그대로 흉내냅니다.
test("GS2. 저장소가 없는 환경에서 셋이 던지지 않고 load는 거짓이다", () => {
  expect(loadGuestSession()).toBe(false);
  expect(() => saveGuestSession()).not.toThrow();
  expect(() => clearGuestSession()).not.toThrow();
  expect(loadGuestSession()).toBe(false);
});

test("GS3. accountStateFrom — 세션이 표식을 이기고, 둘 다 없으면 signed-out이다", () => {
  expect(accountStateFrom(sampleSession, true)).toBe("signed-in");
  expect(accountStateFrom(null, true)).toBe("guest");
  expect(accountStateFrom(null, false)).toBe("signed-out");
  expect(accountStateFrom(sampleSession, false)).toBe("signed-in");
});
