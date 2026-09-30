import { expect, test } from "vitest";

import * as apiClient from "./api-client";
import * as authRequest from "./auth-request";
import type { SupabaseConfig } from "./auth-session.contract";

// test-plan §2.2 AR1 · AR2 · AR3 — 로그아웃 · 계정 삭제 요청 쌍.

const config: SupabaseConfig = { url: "https://x.supabase.co", anonKey: "anon-key" };

const expectedHeaders = (token: string) => ({
  apikey: "anon-key",
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
});

test("AR1. supabaseLogoutRequest — scope=local URL · POST · 헤더 정확히 셋 · 본문 {}", () => {
  const { url, init } = authRequest.supabaseLogoutRequest(config, "t");

  expect(url).toBe("https://x.supabase.co/auth/v1/logout?scope=local");
  expect(init.method).toBe("POST");
  expect(init.headers).toStrictEqual(expectedHeaders("t"));
  expect(Object.keys(init.headers).sort()).toStrictEqual([
    "Authorization",
    "Content-Type",
    "apikey",
  ]);
  expect(init.body).toBe("{}");
});

test("AR2. deleteAccountFunctionRequest — Apple 코드 null · 문자열 모두 본문에 늘 싣는다", () => {
  const withoutCode = authRequest.deleteAccountFunctionRequest(config, {
    accessToken: "t",
    appleAuthorizationCode: null,
  });
  expect(withoutCode.url).toBe("https://x.supabase.co/functions/v1/delete-account");
  expect(withoutCode.init.method).toBe("POST");
  expect(withoutCode.init.headers).toStrictEqual(expectedHeaders("t"));
  expect(withoutCode.init.body).toBe('{"apple_authorization_code":null}');

  const withCode = authRequest.deleteAccountFunctionRequest(config, {
    accessToken: "t2",
    appleAuthorizationCode: "c",
  });
  expect(withCode.init.headers).toStrictEqual(expectedHeaders("t2"));
  expect(withCode.init.body).toBe('{"apple_authorization_code":"c"}');
});

test("AR3. 옮긴 빌더 셋은 api-client에서 다시 내보낸 것과 참조가 같다(파수꾼)", () => {
  expect(apiClient.supabaseAuthPathFor).toBe(authRequest.supabaseAuthPathFor);
  expect(apiClient.supabaseAuthRequest).toBe(authRequest.supabaseAuthRequest);
  expect(apiClient.supabaseAuthorizeUrl).toBe(authRequest.supabaseAuthorizeUrl);
});
