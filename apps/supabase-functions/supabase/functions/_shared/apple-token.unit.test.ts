import { describe, expect, test } from "vitest";

import {
  appleRevokeEndpoint,
  appleRevokeRequest,
  appleTokenEndpoint,
  appleTokenExchangeFrom,
  appleTokenRequest,
  formBody,
  jwtSubjectFrom,
} from "./apple-token.ts";
import type { AppleClientConfig } from "./delete-account.contract.ts";

const config: AppleClientConfig = {
  teamId: "TEAM",
  keyId: "K",
  clientId: "com.libitum.host",
  privateKeyPem: "unused",
};

const b64u = (text: string) =>
  btoa(text).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const jwtWith = (payload: unknown) =>
  `${b64u('{"alg":"none"}')}.${b64u(JSON.stringify(payload))}.sig`;

describe("FT1 formBody", () => {
  test("키 · 값을 각각 퍼센트 인코딩하고 순서를 보존한다", () => {
    expect(
      formBody([
        ["a", "x y"],
        ["b", "+=&"],
        ["c", "한"],
      ]),
    ).toBe("a=x%20y&b=%2B%3D%26&c=%ED%95%9C");
  });
});

describe("FT2 appleTokenRequest", () => {
  test("교환 엔드포인트로 form POST를 만든다", () => {
    expect(appleTokenEndpoint).toBe("https://appleid.apple.com/auth/token");
    expect(appleTokenRequest(config, "S", "C")).toEqual({
      url: "https://appleid.apple.com/auth/token",
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "client_id=com.libitum.host&client_secret=S&code=C&grant_type=authorization_code",
    });
  });
});

describe("FT3 appleRevokeRequest", () => {
  test("철회 엔드포인트로 form POST를 만든다", () => {
    expect(appleRevokeEndpoint).toBe("https://appleid.apple.com/auth/revoke");
    expect(appleRevokeRequest(config, "S", "R")).toEqual({
      url: "https://appleid.apple.com/auth/revoke",
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "client_id=com.libitum.host&client_secret=S&token=R&token_type_hint=refresh_token",
    });
  });
});

describe("FT4 appleTokenExchangeFrom", () => {
  test("refresh_token과 id_token의 sub를 읽는다", () => {
    expect(
      appleTokenExchangeFrom(
        JSON.stringify({ refresh_token: "R", id_token: jwtWith({ sub: "A" }) }),
      ),
    ).toEqual({ refreshToken: "R", subject: "A" });
  });

  test.each([
    ["id_token 없음", JSON.stringify({ refresh_token: "R" })],
    ["id_token 깨짐", JSON.stringify({ refresh_token: "R", id_token: "garbage" })],
  ])("%s → subject null", (_name, body) => {
    expect(appleTokenExchangeFrom(body)).toEqual({ refreshToken: "R", subject: null });
  });

  test.each([
    ["refresh_token 없음", JSON.stringify({ id_token: jwtWith({ sub: "A" }) })],
    ["빈 refresh_token", JSON.stringify({ refresh_token: "" })],
    ["숫자 refresh_token", JSON.stringify({ refresh_token: 1 })],
    ["JSON 아님", "not json"],
  ])("%s → null", (_name, body) => {
    expect(appleTokenExchangeFrom(body)).toBeNull();
  });
});

describe("FT5 jwtSubjectFrom", () => {
  test("세 조각 JWT의 sub를 읽는다", () => {
    expect(jwtSubjectFrom(jwtWith({ sub: "A" }))).toBe("A");
  });

  test.each([
    ["두 조각", `${b64u("{}")}.${b64u('{"sub":"A"}')}`],
    ["payload가 JSON 아님", `h.${b64u("nope")}.s`],
    ["sub가 숫자", jwtWith({ sub: 1 })],
  ])("%s → null", (_name, jwt) => {
    expect(jwtSubjectFrom(jwt)).toBeNull();
  });
});
