import { afterEach, expect, test, vi } from "vitest";

import {
  bytesFromHex,
  isWebAuthenticationAvailable,
  secureRandomBytes,
  startWebAuthentication,
  webAuthenticationResultFrom,
} from "./web-authentication";

// RFC 7636 부록 B와 같은 바이트의 16진(spec §3 각주) — WA6에서 재사용한다.
const rfcBytes = new Uint8Array([
  116, 24, 223, 180, 151, 153, 224, 37, 79, 250, 96, 125, 216, 173, 187, 186, 22, 212, 37, 77, 105,
  214, 191, 240, 91, 88, 5, 88, 83, 132, 141, 121,
]);
const rfcHex = "7418dfb49799e0254ffa607dd8adbbba16d4254d69d6bff05b58055853848d79";

function stubWebAuthenticationModule(overrides: {
  start?: (args: Record<string, unknown>, callback: (payload: unknown) => void) => void;
  randomBytes?: (count: number) => unknown;
}): {
  start: ReturnType<typeof vi.fn>;
  randomBytes: ReturnType<typeof vi.fn>;
} {
  const start = vi.fn(overrides.start ?? (() => {}));
  const randomBytes = vi.fn(overrides.randomBytes ?? (() => rfcHex));
  vi.stubGlobal("NativeModules", { WebAuthenticationModule: { start, randomBytes } });
  return { start, randomBytes };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

// ------------------------------------------------------------------ 순수 함수

test("WA1. bytesFromHex — 대소문자 · 길이 · 비16진 · 타입 가드", () => {
  expect(bytesFromHex("0aff", 2)).toEqual(new Uint8Array([10, 255]));
  expect(bytesFromHex("0AFF", 2)).toEqual(new Uint8Array([10, 255]));
  expect(bytesFromHex("0af", 2)).toBeNull();
  expect(bytesFromHex("zz", 1)).toBeNull();
  expect(bytesFromHex(null, 1)).toBeNull();
  expect(bytesFromHex(42, 1)).toBeNull();
  expect(bytesFromHex("", 0)).toBeNull();
});

test("WA2. webAuthenticationResultFrom — 다섯 상태 · completed의 callbackUrl 판정 · malformed", () => {
  expect(webAuthenticationResultFrom({ status: "cancelled" })).toEqual({ status: "cancelled" });
  expect(webAuthenticationResultFrom({ status: "failed" })).toEqual({ status: "failed" });
  expect(webAuthenticationResultFrom({ status: "already-active" })).toEqual({
    status: "already-active",
  });
  expect(webAuthenticationResultFrom({ status: "invalid-arguments" })).toEqual({
    status: "invalid-arguments",
  });
  expect(webAuthenticationResultFrom({ status: "malformed" })).toEqual({ status: "malformed" });

  expect(
    webAuthenticationResultFrom({
      status: "completed",
      callbackUrl: "duru://auth-callback?code=1",
    }),
  ).toEqual({ status: "completed", callbackUrl: "duru://auth-callback?code=1" });
  expect(webAuthenticationResultFrom({ status: "completed" })).toEqual({ status: "malformed" });
  expect(webAuthenticationResultFrom({ status: "completed", callbackUrl: "" })).toEqual({
    status: "malformed",
  });

  expect(webAuthenticationResultFrom(null)).toEqual({ status: "malformed" });
  expect(webAuthenticationResultFrom([])).toEqual({ status: "malformed" });
  expect(webAuthenticationResultFrom({ status: "weird" })).toEqual({ status: "malformed" });
});

// ------------------------------------------------------------------ 모듈 해석(부수효과 경계)

test("WA3. ⭐ AC6 — NativeModules 부재 · null · 모듈 값 null: 셋 다 거짓/unavailable/null, 던지지 않는다", () => {
  const onResult = vi.fn();

  // 부재 — stubGlobal을 아예 안 부른다.
  expect(() => isWebAuthenticationAvailable()).not.toThrow();
  expect(isWebAuthenticationAvailable()).toBe(false);
  expect(startWebAuthentication({ url: "https://x", callbackScheme: "duru" }, onResult)).toBe(
    "unavailable",
  );
  expect(secureRandomBytes(32)).toBeNull();

  // null.
  vi.stubGlobal("NativeModules", null);
  expect(isWebAuthenticationAvailable()).toBe(false);
  expect(startWebAuthentication({ url: "https://x", callbackScheme: "duru" }, onResult)).toBe(
    "unavailable",
  );
  expect(secureRandomBytes(32)).toBeNull();

  // 모듈 값이 null.
  vi.stubGlobal("NativeModules", { WebAuthenticationModule: null });
  expect(isWebAuthenticationAvailable()).toBe(false);
  expect(startWebAuthentication({ url: "https://x", callbackScheme: "duru" }, onResult)).toBe(
    "unavailable",
  );
  expect(secureRandomBytes(32)).toBeNull();

  expect(onResult).not.toHaveBeenCalled();
});

test("WA4. 모듈이 있으면 host.start가 정확히 두 키로 1회 불리고, 결과가 좁혀져 onResult로 간다", () => {
  let hostCallback: ((payload: unknown) => void) | undefined;
  const { start } = stubWebAuthenticationModule({
    start: (_args, callback) => {
      hostCallback = callback;
    },
  });
  const onResult = vi.fn();

  const outcome = startWebAuthentication(
    { url: "https://test.supabase.co/auth/v1/authorize", callbackScheme: "duru" },
    onResult,
  );

  expect(outcome).toBe("requested");
  expect(start).toHaveBeenCalledTimes(1);
  const [args] = start.mock.calls[0] as [Record<string, unknown>, unknown];
  expect(Object.keys(args).sort()).toEqual(["callbackScheme", "url"]);
  expect(args).toEqual({
    url: "https://test.supabase.co/auth/v1/authorize",
    callbackScheme: "duru",
  });

  hostCallback?.({ status: "cancelled" });

  expect(onResult).toHaveBeenCalledTimes(1);
  expect(onResult).toHaveBeenCalledWith({ status: "cancelled" });
});

test("WA5. host.start가 던지면 unavailable이고 콜백 0회", () => {
  stubWebAuthenticationModule({
    start: () => {
      throw new Error("boom");
    },
  });
  const onResult = vi.fn();

  const outcome = startWebAuthentication({ url: "https://x", callbackScheme: "duru" }, onResult);

  expect(outcome).toBe("unavailable");
  expect(onResult).not.toHaveBeenCalled();
});

test("WA6. secureRandomBytes — 64자 16진 → 32바이트 · 빈 문자열 → null · 던짐 → null · count 전달", () => {
  const { randomBytes } = stubWebAuthenticationModule({ randomBytes: () => rfcHex });

  const bytes = secureRandomBytes(32);

  expect(randomBytes).toHaveBeenCalledWith(32);
  expect(bytes).toEqual(rfcBytes);

  stubWebAuthenticationModule({ randomBytes: () => "" });
  expect(secureRandomBytes(32)).toBeNull();

  stubWebAuthenticationModule({
    randomBytes: () => {
      throw new Error("boom");
    },
  });
  expect(secureRandomBytes(32)).toBeNull();
});
