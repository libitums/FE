import { describe, expect, test } from "vitest";

import { authProvidersFrom, authUserIdFrom } from "./auth-user-id";

function base64Url(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function tokenWith(payload: unknown): string {
  return `${base64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }))}.${base64Url(
    JSON.stringify(payload),
  )}.signature`;
}

describe("authUserIdFrom", () => {
  test("UI1: 액세스 토큰 payload의 sub를 돌려준다", () => {
    expect(authUserIdFrom(tokenWith({ sub: "ed7f0d9d-f876-43ab-b0e1-0e4da1fd4aa2" }))).toBe(
      "ed7f0d9d-f876-43ab-b0e1-0e4da1fd4aa2",
    );
  });

  test("UI1: payload에 한글 · 이모지가 있어도 sub를 읽는다", () => {
    expect(
      authUserIdFrom(tokenWith({ name: "김세현 🙂", sub: "user-1", role: "authenticated" })),
    ).toBe("user-1");
  });

  test("UI1: 패딩이 필요한 길이의 payload도 읽는다", () => {
    for (const sub of ["a", "ab", "abc", "abcd", "abcde"]) {
      expect(authUserIdFrom(tokenWith({ sub }))).toBe(sub);
    }
  });

  test.each<[label: string, token: string]>([
    ["빈 문자열", ""],
    ["JWT가 아닌 토큰", "boot-access-token"],
    ["조각 둘", "aaa.bbb"],
    ["조각 넷", "a.b.c.d"],
    ["base64url이 아닌 payload", "aaa.!!!.ccc"],
    ["JSON이 아닌 payload", `aaa.${base64Url("not json")}.ccc`],
    ["객체가 아닌 payload", `aaa.${base64Url('"text"')}.ccc`],
    ["배열 payload", `aaa.${base64Url("[1]")}.ccc`],
    ["sub 없음", tokenWith({ role: "authenticated" })],
    ["빈 sub", tokenWith({ sub: "" })],
    ["숫자 sub", tokenWith({ sub: 42 })],
  ])("UI2: %s는 null이다", (_label, token) => {
    expect(authUserIdFrom(token)).toBeNull();
  });

  test("UI3: 던지지 않는다", () => {
    expect(() => authUserIdFrom("\u0000.￿.=")).not.toThrow();
  });
});

describe("authProvidersFrom", () => {
  test("AP1: providers 배열 다음 provider, 중복 없이 합친다", () => {
    expect(
      authProvidersFrom(
        tokenWith({ app_metadata: { provider: "google", providers: ["google", "apple"] } }),
      ),
    ).toStrictEqual(["google", "apple"]);
  });

  test("AP1: providers가 provider보다 앞선다", () => {
    expect(
      authProvidersFrom(tokenWith({ app_metadata: { provider: "email", providers: ["apple"] } })),
    ).toStrictEqual(["apple", "email"]);
  });

  test("AP1: provider만 있으면 그 하나", () => {
    expect(authProvidersFrom(tokenWith({ app_metadata: { provider: "apple" } }))).toStrictEqual([
      "apple",
    ]);
  });

  test("AP1: 문자열 아닌 · 빈 원소는 버리고 중복은 하나로", () => {
    expect(
      authProvidersFrom(tokenWith({ app_metadata: { providers: ["apple", "apple", 3, ""] } })),
    ).toStrictEqual(["apple"]);
  });

  test("AP1: provider가 문자열이 아니거나 비어 있으면 무시한다", () => {
    expect(authProvidersFrom(tokenWith({ app_metadata: { provider: 7 } }))).toStrictEqual([]);
    expect(authProvidersFrom(tokenWith({ app_metadata: { provider: "" } }))).toStrictEqual([]);
  });

  test.each<[label: string, token: string]>([
    ["빈 문자열", ""],
    ["JWT가 아닌 토큰", "boot-access-token"],
    ["base64url이 아닌 payload", "aaa.!!!.ccc"],
    ["JSON이 아닌 payload", `aaa.${base64Url("not json")}.ccc`],
    ["app_metadata 없음", tokenWith({ sub: "u" })],
    ["app_metadata가 문자열", tokenWith({ app_metadata: "apple" })],
    ["app_metadata가 null", tokenWith({ app_metadata: null })],
    ["app_metadata가 배열", tokenWith({ app_metadata: ["apple"] })],
    ["providers가 배열이 아님", tokenWith({ app_metadata: { providers: "apple" } })],
  ])("AP1: %s는 []이고 던지지 않는다", (_label, token) => {
    expect(() => authProvidersFrom(token)).not.toThrow();
    expect(authProvidersFrom(token)).toStrictEqual([]);
  });
});
