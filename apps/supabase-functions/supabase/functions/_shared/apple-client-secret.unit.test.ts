import { beforeAll, describe, expect, test } from "vitest";

import {
  appleClientSecretClaims,
  appleClientSecretFor,
  jwtSigningInput,
  pemToPkcs8,
  signEs256,
} from "./apple-client-secret.ts";
import { base64UrlFromBytes, bytesFromBase64Url } from "./base64.ts";
import type { AppleClientConfig } from "./delete-account.contract.ts";

const begin = "-----BEGIN PRIVATE KEY-----";
const end = "-----END PRIVATE KEY-----";

let keyPair: CryptoKeyPair;
let der: Uint8Array;
let body: string;

beforeAll(async () => {
  keyPair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, [
    "sign",
    "verify",
  ]);
  der = new Uint8Array(await crypto.subtle.exportKey("pkcs8", keyPair.privateKey));
  let binary = "";
  for (const byte of der) binary += String.fromCharCode(byte);
  body = btoa(binary);
});

const pemWith = (newline: string) => {
  const lines = body.match(/.{1,64}/g) ?? [];
  return [begin, ...lines, end].join(newline);
};

const decodeText = (part: string) =>
  new TextDecoder().decode(bytesFromBase64Url(part) ?? new Uint8Array());

const config = (pem: string): AppleClientConfig => ({
  teamId: "TEAM",
  keyId: "K",
  clientId: "com.libitum.host",
  privateKeyPem: pem,
});

const verifies = async (signature: Uint8Array, input: string) =>
  crypto.subtle.verify(
    { name: "ECDSA", hash: "SHA-256" },
    keyPair.publicKey,
    signature as Uint8Array<ArrayBuffer>,
    new TextEncoder().encode(input),
  );

describe("FS1 pemToPkcs8", () => {
  test.each([
    ["실제 줄바꿈", "\n"],
    ["CRLF", "\r\n"],
  ])("%s PEM은 export한 DER과 같은 바이트다", (_name, newline) => {
    expect(Array.from(pemToPkcs8(pemWith(newline)) ?? [])).toEqual(Array.from(der));
  });

  test("줄바꿈이 \\n 두 글자로 들어와도 같은 바이트다", () => {
    expect(Array.from(pemToPkcs8(pemWith("\\n")) ?? [])).toEqual(Array.from(der));
  });

  test("앞뒤 공백을 걷는다", () => {
    expect(Array.from(pemToPkcs8(`  \n${pemWith("\n")}\n  `) ?? [])).toEqual(Array.from(der));
  });

  test.each([
    ["머리 없음", () => body],
    [
      "EC PRIVATE KEY(SEC1)",
      () => `-----BEGIN EC PRIVATE KEY-----\n${body}\n-----END EC PRIVATE KEY-----`,
    ],
    ["빈 몸통", () => `${begin}\n${end}`],
    ["깨진 base64", () => `${begin}\n!!!not-base64!!!\n${end}`],
  ])("%s → null", (_name, make) => {
    expect(pemToPkcs8(make())).toBeNull();
  });
});

describe("FS2 jwtSigningInput", () => {
  test("두 조각을 디코드하면 헤더 · 클레임 JSON이 이 키 순서 그대로다", () => {
    const claims = {
      iss: "TEAM",
      iat: 1_700_000_000,
      exp: 1_700_000_300,
      aud: "https://appleid.apple.com",
      sub: "com.libitum.host",
    } as const;
    const input = jwtSigningInput({ alg: "ES256", kid: "K" }, claims);
    const parts = input.split(".");
    expect(parts).toHaveLength(2);
    expect(decodeText(parts[0]!)).toBe('{"alg":"ES256","kid":"K"}');
    expect(decodeText(parts[1]!)).toBe(
      '{"iss":"TEAM","iat":1700000000,"exp":1700000300,"aud":"https://appleid.apple.com","sub":"com.libitum.host"}',
    );
    expect(input).not.toContain("=");
  });
});

describe("FS3 appleClientSecretClaims", () => {
  test("iat은 초 단위 내림, exp는 iat + 300이다", () => {
    expect(
      appleClientSecretClaims({ teamId: "TEAM", clientId: "com.libitum.host" }, 1_700_000_000_999),
    ).toEqual({
      iss: "TEAM",
      iat: 1_700_000_000,
      exp: 1_700_000_300,
      aud: "https://appleid.apple.com",
      sub: "com.libitum.host",
    });
  });
});

describe("FS4 signEs256", () => {
  test("64바이트 r‖s를 내고 공개키로 검증된다", async () => {
    const signature = await signEs256(der, "a.b");
    expect(signature).not.toBeNull();
    expect(signature?.byteLength).toBe(64);
    expect(await verifies(signature ?? new Uint8Array(), "a.b")).toBe(true);
  });

  test("깨진 DER은 거부하지 않고 null이다", async () => {
    await expect(signEs256(new Uint8Array([1, 2, 3]), "a.b")).resolves.toBeNull();
  });
});

describe("FS5 appleClientSecretFor", () => {
  test("세 조각 JWT이고 헤더 · 클레임이 FS2 · FS3과 같으며 서명이 검증된다", async () => {
    const secret = await appleClientSecretFor(config(pemWith("\n")), 1_700_000_000_999, signEs256);
    const parts = (secret ?? "").split(".");
    expect(parts).toHaveLength(3);
    expect(JSON.parse(decodeText(parts[0]!))).toEqual({ alg: "ES256", kid: "K" });
    expect(JSON.parse(decodeText(parts[1]!))).toEqual({
      iss: "TEAM",
      iat: 1_700_000_000,
      exp: 1_700_000_300,
      aud: "https://appleid.apple.com",
      sub: "com.libitum.host",
    });
    const signature = bytesFromBase64Url(parts[2]!);
    expect(signature?.byteLength).toBe(64);
    expect(await verifies(signature ?? new Uint8Array(), `${parts[0]}.${parts[1]}`)).toBe(true);
  });

  test("PEM이 깨졌으면 null이다", async () => {
    await expect(appleClientSecretFor(config("garbage"), 0, signEs256)).resolves.toBeNull();
  });

  test("서명이 null이면 null이다", async () => {
    await expect(
      appleClientSecretFor(config(pemWith("\n")), 0, async () => null),
    ).resolves.toBeNull();
  });

  test("서명 결과를 base64url로 그대로 싣는다", async () => {
    const fixed = new Uint8Array(64).fill(7);
    const secret = await appleClientSecretFor(config(pemWith("\n")), 0, async () => fixed);
    expect(secret?.split(".")[2]).toBe(base64UrlFromBytes(fixed));
  });
});
