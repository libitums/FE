import { afterEach, expect, test, vi } from "vitest";

import type { AuthSession } from "./auth-session.contract";
import {
  authSessionStorageKey,
  clearAuthSession,
  entryAuthStateFrom,
  loadAuthSession,
  parseAuthSession,
  saveAuthSession,
  serializeAuthSession,
  sessionRefreshDisposition,
} from "./auth-session";
import { authTokenStorageKey } from "./auth-token";

// `auth-token.unit.test.ts`의 `stubHost()` 형태를 그대로 씁니다 — 테스트 환경에는
// 네이티브가 없어, 호스트가 등록하는 모듈을 대신 세웁니다.
function stubHost() {
  const store = new Map<string, string>();
  const mod = {
    get: (k: string) => store.get(k) ?? null,
    set: (k: string, v: string) => void store.set(k, v),
    remove: (k: string) => void store.delete(k),
  };
  vi.stubGlobal("NativeModules", { StorageModule: mod });
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

test("AS1. authSessionStorageKey가 libitum. 접두 · 공백 없음 · authTokenStorageKey와 다르다", () => {
  expect(authSessionStorageKey.startsWith("libitum.")).toBe(true);
  expect(authSessionStorageKey).not.toMatch(/\s/);
  expect(authSessionStorageKey).not.toBe(authTokenStorageKey);
});

test("AS2. parseAuthSession(serializeAuthSession(s))가 s와 같다", () => {
  expect(parseAuthSession(serializeAuthSession(sampleSession))).toEqual(sampleSession);
});

test("AS3. parseAuthSession이 null인 입력 여섯", () => {
  expect(parseAuthSession(null)).toBeNull();
  expect(parseAuthSession("x")).toBeNull();
  expect(parseAuthSession("{}")).toBeNull();
  expect(parseAuthSession(JSON.stringify({ ...sampleSession, accessToken: "" }))).toBeNull();
  expect(
    parseAuthSession(
      JSON.stringify({ ...sampleSession, expiresAt: String(sampleSession.expiresAt) }),
    ),
  ).toBeNull();
  expect(parseAuthSession("[]")).toBeNull();
});

test("AS4. entryAuthStateFrom — 세션이 있으면 토큰과 무관하게 refresh다", () => {
  expect(entryAuthStateFrom(sampleSession, true)).toEqual({
    kind: "refresh",
    refreshToken: sampleSession.refreshToken,
  });
  expect(entryAuthStateFrom(sampleSession, false)).toEqual({
    kind: "refresh",
    refreshToken: sampleSession.refreshToken,
  });
  expect(entryAuthStateFrom(null, true)).toEqual({ kind: "temporary" });
  expect(entryAuthStateFrom(null, false)).toEqual({ kind: "none" });
});

test("AS5. sessionRefreshDisposition — rejected만 clear, 나머지는 keep", () => {
  expect(sessionRefreshDisposition("rejected")).toBe("clear");
  expect(sessionRefreshDisposition("network")).toBe("keep");
  expect(sessionRefreshDisposition("unavailable")).toBe("keep");
  expect(sessionRefreshDisposition("unconfigured")).toBe("keep");
});

test("AS6. saveAuthSession 뒤 저장소 키가 authSessionStorageKey 하나이고 loadAuthSession이 같은 세션이다", () => {
  const store = stubHost();

  saveAuthSession(sampleSession);

  expect(Array.from(store.keys())).toEqual([authSessionStorageKey]);
  expect(loadAuthSession()).toEqual(sampleSession);
});

test("AS7. clearAuthSession 뒤 loadAuthSession이 null이고 authTokenStorageKey는 건드리지 않는다", () => {
  const store = stubHost();
  saveAuthSession(sampleSession);
  store.set(authTokenStorageKey, "existing-token");

  clearAuthSession();

  expect(loadAuthSession()).toBeNull();
  expect(store.get(authTokenStorageKey)).toBe("existing-token");
});

// stubHost()를 부르지 않아 호스트 부재를 그대로 흉내냅니다.
test("AS8. 저장소가 없는 환경에서 loadAuthSession이 null이고 저장·삭제가 던지지 않는다", () => {
  expect(loadAuthSession()).toBeNull();
  expect(() => saveAuthSession(sampleSession)).not.toThrow();
  expect(() => clearAuthSession()).not.toThrow();
});
