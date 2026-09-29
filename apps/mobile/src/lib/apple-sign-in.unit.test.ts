import { afterEach, expect, test, vi } from "vitest";

import {
  appleNonceByteCount,
  appleNoncePairFrom,
  appleNonceHashFor,
  appleSignInResultFrom,
  startAppleSignIn,
} from "./apple-sign-in";

// 값은 test-plan §2.2(AN1~AN7)와 spec §3.2의 RFC 7636 부록 B 벡터다. 해시는
// Node `crypto.createHash("sha256")`로 대조하는 값이다.
const rfcHex = "7418dfb49799e0254ffa607dd8adbbba16d4254d69d6bff05b58055853848d79";
const rfcRaw = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
const rfcHashed = "13d31e961a1ad8ec2f16b10c4c982e0876a878ad6df144566ee1894acb70f9c3";

function rfcBytes(): Uint8Array {
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i += 1) {
    bytes[i] = Number.parseInt(rfcHex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function stubModule(
  start: (args: Record<string, unknown>, cb: (payload: unknown) => void) => void,
) {
  const fn = vi.fn(start);
  vi.stubGlobal("NativeModules", { AppleSignInModule: { start: fn } });
  return fn;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

test("AN1. appleNonceHashFor — SHA-256 소문자 16진 64자", () => {
  expect(appleNonceHashFor("")).toBe(
    "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  );
  expect(appleNonceHashFor("abc")).toBe(
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
  );
  expect(appleNonceHashFor(rfcRaw)).toMatch(/^[0-9a-f]{64}$/);
});

test("AN2. appleNoncePairFrom — RFC 32바이트 → raw(base64url 43자) · hashed(raw의 SHA-256)", () => {
  const pair = appleNoncePairFrom(rfcBytes());

  expect(pair).toEqual({ raw: rfcRaw, hashed: rfcHashed });
  expect(pair.raw).toHaveLength(43);
});

test("AN3. appleNonceByteCount는 32다", () => {
  expect(appleNonceByteCount).toBe(32);
});

test("AN4. appleSignInResultFrom — 다섯 상태는 그대로, 모르는 모양은 malformed, 던지지 않는다", () => {
  expect(appleSignInResultFrom({ status: "completed", identityToken: "jwt" })).toEqual({
    status: "completed",
    identityToken: "jwt",
  });
  for (const status of ["cancelled", "failed", "already-active", "invalid-arguments"]) {
    expect(appleSignInResultFrom({ status })).toEqual({ status });
  }

  // 모르는 키는 버린다.
  expect(
    appleSignInResultFrom({ status: "completed", identityToken: "jwt", authorizationCode: "c" }),
  ).toEqual({ status: "completed", identityToken: "jwt" });

  const malformedInputs: unknown[] = [
    { status: "completed" },
    { status: "completed", identityToken: "" },
    { status: "completed", identityToken: 42 },
    null,
    undefined,
    [],
    "completed",
    { status: "weird" },
    {},
  ];
  for (const input of malformedInputs) {
    expect(() => appleSignInResultFrom(input)).not.toThrow();
    expect(appleSignInResultFrom(input)).toEqual({ status: "malformed" });
  }
});

test("AN5. startAppleSignIn — 모듈이 없으면 unavailable, 콜백 0회, 던지지 않는다", () => {
  const onResult = vi.fn();

  // stub 없음(NativeModules 자체가 없다)
  expect(startAppleSignIn({ nonce: rfcHashed }, onResult)).toBe("unavailable");

  for (const host of [null, {}, { AppleSignInModule: null }]) {
    vi.stubGlobal("NativeModules", host);
    expect(() => startAppleSignIn({ nonce: rfcHashed }, onResult)).not.toThrow();
    expect(startAppleSignIn({ nonce: rfcHashed }, onResult)).toBe("unavailable");
  }
  expect(onResult).not.toHaveBeenCalled();
});

test("AN6. startAppleSignIn — { nonce } 정확히 한 키로 host.start 1회, 좁힌 페이로드로 onResult 1회, 반환 requested", () => {
  const start = stubModule((_args, cb) =>
    cb({ status: "completed", identityToken: "jwt", extra: 1 }),
  );
  const onResult = vi.fn();

  const outcome = startAppleSignIn({ nonce: rfcHashed }, onResult);

  expect(outcome).toBe("requested");
  expect(start).toHaveBeenCalledTimes(1);
  const [args] = start.mock.calls[0] as [Record<string, unknown>, unknown];
  expect(args).toEqual({ nonce: rfcHashed });
  expect(Object.keys(args)).toEqual(["nonce"]);
  expect(onResult).toHaveBeenCalledTimes(1);
  expect(onResult).toHaveBeenCalledWith({ status: "completed", identityToken: "jwt" });
});

test("AN7. startAppleSignIn — host.start가 던지면 unavailable, 콜백 0회", () => {
  stubModule(() => {
    throw new Error("bridge down");
  });
  const onResult = vi.fn();

  expect(startAppleSignIn({ nonce: rfcHashed }, onResult)).toBe("unavailable");
  expect(onResult).not.toHaveBeenCalled();
});
