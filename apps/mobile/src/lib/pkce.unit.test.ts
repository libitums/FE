import { expect, test } from "vitest";

import {
  asciiBytesFrom,
  base64UrlFromBytes,
  codeChallengeFor,
  codeVerifierByteCount,
  pkcePairFrom,
  sha256,
} from "./pkce";

// 값은 test-plan §2.1(PK1~PK6)과 spec §3의 RFC 7636 부록 B 벡터다. FIPS 벡터·패딩 경계
// 값은 2026-09-29 Node 22 `crypto.createHash("sha256")`로 대조했다(spec §3 각주 — 기억한
// 값은 한 번 틀렸으므로 이 파일의 리터럴을 믿는다).

function hexFromBytes(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function asciiBytes(text: string): Uint8Array {
  const bytes = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i += 1) {
    bytes[i] = text.charCodeAt(i);
  }
  return bytes;
}

test("PK1. sha256 16진이 FIPS 벡터와 같다 — 빈 문자열 · abc · 56자", () => {
  expect(hexFromBytes(sha256(asciiBytes("")))).toBe(
    "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  );
  expect(hexFromBytes(sha256(asciiBytes("abc")))).toBe(
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
  );
  expect(
    hexFromBytes(sha256(asciiBytes("abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq"))),
  ).toBe("248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1");
});

test("PK2. 패딩 경계 — 55 · 56 · 64바이트 메시지", () => {
  expect(hexFromBytes(sha256(asciiBytes("a".repeat(55))))).toBe(
    "9f4390f8d30c2dd92ec9f095b65e2b9ae9b0a925a5258e241c9f1e910f734318",
  );
  expect(hexFromBytes(sha256(asciiBytes("a".repeat(56))))).toBe(
    "b35439a4ac6f0948b6d6f9e3c6af0f5f590ce20f1bde7090ef7970686ec6738a",
  );
  expect(hexFromBytes(sha256(asciiBytes("a".repeat(64))))).toBe(
    "ffe054fe7ae0cb6dc65c3af9b61d5209f439851db43d0ba5997337df154668eb",
  );
});

test("PK3. base64UrlFromBytes — 빈 배열과 치환 · 패딩 없음", () => {
  expect(base64UrlFromBytes(new Uint8Array([]))).toBe("");
  expect(base64UrlFromBytes(new Uint8Array([0xfb, 0xff]))).toBe("-_8");
});

test("PK4. RFC 7636 부록 B — pkcePairFrom이 verifier · challenge를 낸다", () => {
  const bytes = new Uint8Array([
    116, 24, 223, 180, 151, 153, 224, 37, 79, 250, 96, 125, 216, 173, 187, 186, 22, 212, 37, 77,
    105, 214, 191, 240, 91, 88, 5, 88, 83, 132, 141, 121,
  ]);

  expect(pkcePairFrom(bytes)).toEqual({
    verifier: "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk",
    challenge: "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
  });
});

test("PK5. codeChallengeFor가 PK4의 challenge와 같고 verifier 길이가 43이다", () => {
  const verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";

  expect(verifier.length).toBe(43);
  expect(codeChallengeFor(verifier)).toBe("E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
});

// ⚠ 파수꾼 — 상수는 이미 실값이라 스캐폴드에서도 초록이다.
test("PK6. codeVerifierByteCount가 32다", () => {
  expect(codeVerifierByteCount).toBe(32);
});

test("PK7. asciiBytesFrom — 빈 문자열은 길이 0, 문자열은 ASCII 코드 그대로이며 던지지 않는다", () => {
  expect(() => asciiBytesFrom("")).not.toThrow();
  expect(asciiBytesFrom("").length).toBe(0);
  expect(Array.from(asciiBytesFrom("Az-_09"))).toEqual([65, 122, 45, 95, 48, 57]);
});
