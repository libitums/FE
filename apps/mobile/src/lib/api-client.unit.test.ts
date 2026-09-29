import { afterEach, expect, test, vi } from "vitest";

import type { PhoneNumber, SupabaseConfig } from "./auth-session.contract";
import {
  authRequestTimeoutMs,
  authSessionFrom,
  errorCodeFrom,
  otpRequestFailureFrom,
  otpVerifyFailureFrom,
  refreshAuthSession,
  requestPhoneOtp,
  sessionRefreshFailureFrom,
  supabaseAuthPathFor,
  supabaseAuthRequest,
  verifyPhoneOtp,
} from "./api-client";
// 소셜 로그인(신규 · test-plan §2.4) — exchangePkceCode · supabaseAuthorizeUrl은
// api-client.ts, pkceExchangeFailureFrom은 auth-response.ts가 소유한다(spec S6).
import { exchangeIdToken, exchangePkceCode, supabaseAuthorizeUrl } from "./api-client";
import { pkceExchangeFailureFrom } from "./auth-response";
import type { SupabaseAuthorizeQuery } from "./social-sign-in.contract";

// §6 규약: 설정 대역을 세우는 케이스는 fetch 대역도 반드시 세운다. 부수효과
// 함수들의 전송 함수 해석 순서가 `globalThis.fetch` 먼저이므로(spec §3) 이
// 전역을 세우는 자리가 호스트 경계 하나다.
function stubConfig(): void {
  vi.stubEnv("PUBLIC_SUPABASE_URL", "https://test.supabase.co");
  vi.stubEnv("PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
}

function jsonResponse(status: number, body: unknown) {
  return { status, text: async () => JSON.stringify(body) };
}

const samplePhone: PhoneNumber = { e164: "+821012345678", display: "+82 10 1234 5678" };
const sampleConfig: SupabaseConfig = { url: "https://test.supabase.co", anonKey: "test-anon-key" };

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

// ------------------------------------------------------------------ 순수 함수

test("AC1. supabaseAuthPathFor가 네 연산을 네 경로로 옮긴다", () => {
  expect(supabaseAuthPathFor("request-otp")).toBe("/auth/v1/otp");
  expect(supabaseAuthPathFor("verify-otp")).toBe("/auth/v1/verify");
  expect(supabaseAuthPathFor("refresh-session")).toBe("/auth/v1/token?grant_type=refresh_token");
  expect(supabaseAuthPathFor("exchange-pkce")).toBe("/auth/v1/token?grant_type=pkce");
  expect(supabaseAuthPathFor("exchange-id-token")).toBe("/auth/v1/token?grant_type=id_token");
});

test("AC2. supabaseAuthRequest가 url·method·헤더(정확히 둘)·본문을 짓는다", () => {
  const body = { phone: samplePhone.e164, channel: "sms" as const, create_user: true as const };

  const { url, init } = supabaseAuthRequest(sampleConfig, "request-otp", body);

  expect(url).toBe("https://test.supabase.co/auth/v1/otp");
  expect(init.method).toBe("POST");
  expect(Object.keys(init.headers).sort()).toEqual(["Content-Type", "apikey"]);
  expect(init.headers["apikey"]).toBe(sampleConfig.anonKey);
  expect(init.headers["Content-Type"]).toBe("application/json");
  expect(init.headers["Authorization"]).toBeUndefined();
  expect(init.body).toBe(JSON.stringify(body));
});

test("AC3. errorCodeFrom — error_code 문자열만 읽고 나머지는 null이다", () => {
  expect(errorCodeFrom('{"error_code":"otp_expired"}')).toBe("otp_expired");
  expect(errorCodeFrom("not json")).toBeNull();
  expect(errorCodeFrom('{"error":"x"}')).toBeNull();
  expect(errorCodeFrom("")).toBeNull();
});

test("AC4. authSessionFrom이 세 필드만 남기고 expiresAt을 계산한다", () => {
  const bodyText = JSON.stringify({
    access_token: "access-token",
    refresh_token: "refresh-token",
    expires_in: 3600,
    user: { id: "u1" },
    expires_at: 1234567890,
  });

  const session = authSessionFrom(bodyText, 1000);

  expect(session).not.toBeNull();
  expect(session).toEqual({
    accessToken: "access-token",
    refreshToken: "refresh-token",
    expiresAt: 1000 + 3600 * 1000,
  });
  expect(Object.keys(session ?? {}).sort()).toEqual(["accessToken", "expiresAt", "refreshToken"]);
});

test("AC5. authSessionFrom이 null인 본문 다섯", () => {
  expect(authSessionFrom("not json", 1000)).toBeNull();
  expect(
    authSessionFrom(JSON.stringify({ refresh_token: "r", expires_in: 3600 }), 1000),
  ).toBeNull();
  expect(
    authSessionFrom(
      JSON.stringify({ access_token: "a", refresh_token: "", expires_in: 3600 }),
      1000,
    ),
  ).toBeNull();
  expect(
    authSessionFrom(JSON.stringify({ access_token: "a", refresh_token: "r", expires_in: 0 }), 1000),
  ).toBeNull();
  expect(
    authSessionFrom(
      JSON.stringify({ access_token: "a", refresh_token: "r", expires_in: "3600" }),
      1000,
    ),
  ).toBeNull();
});

test("AC6. otpRequestFailureFrom — 429·over_*→rate-limited, 5xx→unavailable, 4xx→rejected", () => {
  expect(otpRequestFailureFrom(429, null)).toBe("rate-limited");
  expect(otpRequestFailureFrom(400, "over_sms_send_rate_limit")).toBe("rate-limited");
  expect(otpRequestFailureFrom(500, null)).toBe("unavailable");
  expect(otpRequestFailureFrom(400, null)).toBe("rejected");
  expect(otpRequestFailureFrom(302, null)).toBe("unavailable");
});

test("AC7. otpVerifyFailureFrom — 4xx→invalid-code, 429→rate-limited, 5xx→unavailable", () => {
  expect(otpVerifyFailureFrom(403, "otp_expired")).toBe("invalid-code");
  expect(otpVerifyFailureFrom(400, null)).toBe("invalid-code");
  expect(otpVerifyFailureFrom(429, null)).toBe("rate-limited");
  expect(otpVerifyFailureFrom(503, null)).toBe("unavailable");
});

test("AC8. sessionRefreshFailureFrom — 4xx→rejected, 429·5xx→unavailable", () => {
  expect(sessionRefreshFailureFrom(400, "refresh_token_not_found")).toBe("rejected");
  expect(sessionRefreshFailureFrom(429, null)).toBe("unavailable");
  expect(sessionRefreshFailureFrom(500, null)).toBe("unavailable");
});

// ------------------------------------------------------------------ 부수효과 함수

test("AC9. requestPhoneOtp가 fetch를 1회, otp 경로로, 정확한 본문으로 부르고 200 → sent", async () => {
  stubConfig();
  const fetchMock = vi.fn(async () => jsonResponse(200, {}));
  vi.stubGlobal("fetch", fetchMock);

  const result = await requestPhoneOtp(samplePhone);

  expect(fetchMock).toHaveBeenCalledTimes(1);
  const [url, init] = fetchMock.mock.calls[0] as unknown as [string, { body: string }];
  expect(url).toBe("https://test.supabase.co/auth/v1/otp");
  expect(JSON.parse(init.body)).toEqual({
    phone: samplePhone.e164,
    channel: "sms",
    create_user: true,
  });
  expect(result).toEqual({ status: "sent" });
});

test("AC10. verifyPhoneOtp — 200+세션 본문 → verified, 200+깨진 본문 → unavailable", async () => {
  stubConfig();
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      jsonResponse(200, { access_token: "at", refresh_token: "rt", expires_in: 3600 }),
    ),
  );

  const verified = await verifyPhoneOtp({ phone: samplePhone, code: "123456" });

  expect(verified.status).toBe("verified");
  if (verified.status === "verified") {
    expect(verified.session.accessToken).toBe("at");
    expect(verified.session.refreshToken).toBe("rt");
    expect(typeof verified.session.expiresAt).toBe("number");
  }

  vi.stubGlobal(
    "fetch",
    vi.fn(async () => jsonResponse(200, { unexpected: "shape" })),
  );

  const broken = await verifyPhoneOtp({ phone: samplePhone, code: "123456" });

  expect(broken).toEqual({ status: "failed", reason: "unavailable" });
});

test("AC11. refreshAuthSession — 200 → refreshed, 400 → rejected", async () => {
  stubConfig();
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      jsonResponse(200, { access_token: "at", refresh_token: "rt", expires_in: 3600 }),
    ),
  );

  const refreshed = await refreshAuthSession("old-refresh-token");

  expect(refreshed.status).toBe("refreshed");

  vi.stubGlobal(
    "fetch",
    vi.fn(async () => jsonResponse(400, { error_code: "refresh_token_not_found" })),
  );

  const rejected = await refreshAuthSession("old-refresh-token");

  expect(rejected).toEqual({ status: "failed", reason: "rejected" });
});

test("AC12. 설정이 없으면 세 함수 모두 fetch 0회이고 unconfigured다", async () => {
  vi.stubEnv("PUBLIC_SUPABASE_URL", "");
  vi.stubEnv("PUBLIC_SUPABASE_ANON_KEY", "");
  const fetchMock = vi.fn(async () => jsonResponse(200, {}));
  vi.stubGlobal("fetch", fetchMock);

  const otpResult = await requestPhoneOtp(samplePhone);
  const verifyResult = await verifyPhoneOtp({ phone: samplePhone, code: "123456" });
  const refreshResult = await refreshAuthSession("old-refresh-token");

  expect(fetchMock).not.toHaveBeenCalled();
  expect(otpResult).toEqual({ status: "failed", reason: "unconfigured" });
  expect(verifyResult).toEqual({ status: "failed", reason: "unconfigured" });
  expect(refreshResult).toEqual({ status: "failed", reason: "unconfigured" });
});

test("AC13. fetch가 던지면 network이고 세 함수 모두 거부하지 않는다", async () => {
  stubConfig();
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      throw new Error("connection refused");
    }),
  );

  await expect(requestPhoneOtp(samplePhone)).resolves.toEqual({
    status: "failed",
    reason: "network",
  });
  await expect(verifyPhoneOtp({ phone: samplePhone, code: "123456" })).resolves.toEqual({
    status: "failed",
    reason: "network",
  });
  await expect(refreshAuthSession("old-refresh-token")).resolves.toEqual({
    status: "failed",
    reason: "network",
  });
});

test("AC14. 제한 시간 안에 안 끝나면 network — 1ms 모자란 시점에는 아직 안 끝난다", async () => {
  vi.useFakeTimers();
  stubConfig();
  vi.stubGlobal(
    "fetch",
    vi.fn(() => new Promise(() => {})),
  );

  let settled = false;
  const promise = requestPhoneOtp(samplePhone).then((result) => {
    settled = true;
    return result;
  });

  await vi.advanceTimersByTimeAsync(authRequestTimeoutMs - 1);
  expect(settled).toBe(false);

  await vi.advanceTimersByTimeAsync(1);
  const result = await promise;

  expect(settled).toBe(true);
  expect(result).toEqual({ status: "failed", reason: "network" });
});

test("AC15. 성공 응답 뒤 제한 시간 타이머가 남지 않는다", async () => {
  vi.useFakeTimers();
  stubConfig();
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => jsonResponse(200, {})),
  );

  await requestPhoneOtp(samplePhone);

  expect(vi.getTimerCount()).toBe(0);
});

// ------------------------------------------------------------------ 소셜 로그인(신규)

const sampleAuthorizeQuery: SupabaseAuthorizeQuery = {
  provider: "google",
  redirect_to: "duru://auth-callback",
  code_challenge: "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
  code_challenge_method: "s256",
};

test("AP1. supabaseAuthorizeUrl — 키 순서 고정 · 값마다 encodeURIComponent", () => {
  expect(supabaseAuthorizeUrl(sampleConfig, sampleAuthorizeQuery)).toBe(
    "https://test.supabase.co/auth/v1/authorize?provider=google&redirect_to=duru%3A%2F%2Fauth-callback&code_challenge=E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM&code_challenge_method=s256",
  );

  expect(
    supabaseAuthorizeUrl(sampleConfig, { ...sampleAuthorizeQuery, code_challenge: "a&b=c" }),
  ).toContain("code_challenge=a%26b%3Dc");
});

test("AP2. pkceExchangeFailureFrom — 429 · over_* → rate-limited, 5xx → unavailable, 4xx → sign-in-incomplete, 그 밖 → unavailable", () => {
  expect(pkceExchangeFailureFrom(429, null)).toBe("rate-limited");
  expect(pkceExchangeFailureFrom(400, "over_request_rate_limit")).toBe("rate-limited");
  expect(pkceExchangeFailureFrom(500, null)).toBe("unavailable");
  expect(pkceExchangeFailureFrom(400, "flow_state_not_found")).toBe("sign-in-incomplete");
  expect(pkceExchangeFailureFrom(403, null)).toBe("sign-in-incomplete");
  expect(pkceExchangeFailureFrom(302, null)).toBe("unavailable");
});

test("AP3. exchangePkceCode — 200 → exchanged, 200+깨진 본문 → unavailable, 헤더가 정확히 둘", async () => {
  stubConfig();
  const fetchMock = vi.fn(async () =>
    jsonResponse(200, { access_token: "at", refresh_token: "rt", expires_in: 3600 }),
  );
  vi.stubGlobal("fetch", fetchMock);

  const exchanged = await exchangePkceCode({ authCode: "abc", codeVerifier: "verifier-value" });

  expect(exchanged.status).toBe("exchanged");
  expect(fetchMock).toHaveBeenCalledTimes(1);
  const [url, init] = fetchMock.mock.calls[0] as unknown as [
    string,
    { headers: Record<string, string>; body: string },
  ];
  expect(url).toBe("https://test.supabase.co/auth/v1/token?grant_type=pkce");
  expect(Object.keys(init.headers).sort()).toEqual(["Content-Type", "apikey"]);
  expect(JSON.parse(init.body)).toEqual({ auth_code: "abc", code_verifier: "verifier-value" });

  vi.stubGlobal(
    "fetch",
    vi.fn(async () => jsonResponse(200, { unexpected: "shape" })),
  );

  const broken = await exchangePkceCode({ authCode: "abc", codeVerifier: "verifier-value" });

  expect(broken).toEqual({ status: "failed", reason: "unavailable" });
});

test("AP4. exchangePkceCode — 설정 없음 · 던짐 · 제한 시간 · 성공 뒤 타이머 0개", async () => {
  vi.stubEnv("PUBLIC_SUPABASE_URL", "");
  vi.stubEnv("PUBLIC_SUPABASE_ANON_KEY", "");
  const fetchMock = vi.fn(async () => jsonResponse(200, {}));
  vi.stubGlobal("fetch", fetchMock);

  await expect(exchangePkceCode({ authCode: "abc", codeVerifier: "v" })).resolves.toEqual({
    status: "failed",
    reason: "unconfigured",
  });
  expect(fetchMock).not.toHaveBeenCalled();

  stubConfig();
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      throw new Error("connection refused");
    }),
  );
  await expect(exchangePkceCode({ authCode: "abc", codeVerifier: "v" })).resolves.toEqual({
    status: "failed",
    reason: "network",
  });

  vi.useFakeTimers();
  stubConfig();
  vi.stubGlobal(
    "fetch",
    vi.fn(() => new Promise(() => {})),
  );

  let settled = false;
  const pending = exchangePkceCode({ authCode: "abc", codeVerifier: "v" }).then((result) => {
    settled = true;
    return result;
  });

  await vi.advanceTimersByTimeAsync(authRequestTimeoutMs - 1);
  expect(settled).toBe(false);
  await vi.advanceTimersByTimeAsync(1);
  const timedOut = await pending;

  expect(settled).toBe(true);
  expect(timedOut).toEqual({ status: "failed", reason: "network" });

  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      jsonResponse(200, { access_token: "at", refresh_token: "rt", expires_in: 3600 }),
    ),
  );
  await exchangePkceCode({ authCode: "abc", codeVerifier: "v" });

  expect(vi.getTimerCount()).toBe(0);
});

// ------------------------------------------------------------------ ID 토큰 교환(test-plan §2.4 AI1~AI3)

const sampleSessionBody = { access_token: "at", refresh_token: "rt", expires_in: 3600 };

test("AI1. exchangeIdToken — 200 → exchanged, 200+깨진 본문 → unavailable, 요청 URL · 본문 · 헤더가 정확하다", async () => {
  stubConfig();
  const fetchMock = vi.fn(async () => jsonResponse(200, sampleSessionBody));
  vi.stubGlobal("fetch", fetchMock);

  const exchanged = await exchangeIdToken({ idToken: "t", nonce: "n" });

  expect(exchanged).toEqual({
    status: "exchanged",
    session: { accessToken: "at", refreshToken: "rt", expiresAt: expect.any(Number) },
  });
  expect(fetchMock).toHaveBeenCalledTimes(1);
  const [url, init] = fetchMock.mock.calls[0] as unknown as [
    string,
    { method: string; headers: Record<string, string>; body: string },
  ];
  expect(url).toBe("https://test.supabase.co/auth/v1/token?grant_type=id_token");
  expect(init.method).toBe("POST");
  expect(init.body).toBe(JSON.stringify({ provider: "apple", id_token: "t", nonce: "n" }));
  expect(init.headers).toEqual({ apikey: "test-anon-key", "Content-Type": "application/json" });

  vi.stubGlobal(
    "fetch",
    vi.fn(async () => jsonResponse(200, { unexpected: "shape" })),
  );

  await expect(exchangeIdToken({ idToken: "t", nonce: "n" })).resolves.toEqual({
    status: "failed",
    reason: "unavailable",
  });
});

test("AI2. exchangeIdToken 실패 판정 — 400(error_code 무관) · 403 → sign-in-incomplete, 429 · over_* → rate-limited, 5xx → unavailable", async () => {
  stubConfig();
  const cases: ReadonlyArray<[number, unknown, string]> = [
    [400, { error_code: "bad_jwt" }, "sign-in-incomplete"],
    [400, { error_code: "anything_else" }, "sign-in-incomplete"],
    [400, {}, "sign-in-incomplete"],
    [403, {}, "sign-in-incomplete"],
    [429, {}, "rate-limited"],
    [400, { error_code: "over_request_rate_limit" }, "rate-limited"],
    [500, {}, "unavailable"],
  ];

  for (const [status, body, reason] of cases) {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse(status, body)),
    );

    await expect(exchangeIdToken({ idToken: "t", nonce: "n" })).resolves.toEqual({
      status: "failed",
      reason,
    });
  }
});

test("AI3. exchangeIdToken — 설정 없음 · 던짐 · 제한 시간 · 성공 뒤 타이머 0개, 거부하지 않는다", async () => {
  vi.stubEnv("PUBLIC_SUPABASE_URL", "");
  vi.stubEnv("PUBLIC_SUPABASE_ANON_KEY", "");
  const fetchMock = vi.fn(async () => jsonResponse(200, sampleSessionBody));
  vi.stubGlobal("fetch", fetchMock);

  await expect(exchangeIdToken({ idToken: "t", nonce: "n" })).resolves.toEqual({
    status: "failed",
    reason: "unconfigured",
  });
  expect(fetchMock).not.toHaveBeenCalled();

  stubConfig();
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      throw new Error("connection refused");
    }),
  );
  await expect(exchangeIdToken({ idToken: "t", nonce: "n" })).resolves.toEqual({
    status: "failed",
    reason: "network",
  });

  vi.useFakeTimers();
  vi.stubGlobal(
    "fetch",
    vi.fn(() => new Promise(() => {})),
  );
  let settled = false;
  const pending = exchangeIdToken({ idToken: "t", nonce: "n" }).then((result) => {
    settled = true;
    return result;
  });
  await vi.advanceTimersByTimeAsync(authRequestTimeoutMs - 1);
  expect(settled).toBe(false);
  await vi.advanceTimersByTimeAsync(1);
  await expect(pending).resolves.toEqual({ status: "failed", reason: "network" });

  vi.stubGlobal(
    "fetch",
    vi.fn(async () => jsonResponse(200, sampleSessionBody)),
  );
  await exchangeIdToken({ idToken: "t", nonce: "n" });
  expect(vi.getTimerCount()).toBe(0);
});

// ------------------------------------------------------------------ 연결 실패 응답(#154)
//
// Lynx `fetch`는 연결에 실패해도 거부하지 않고 status 499(또는 0) 응답을 돌려줍니다. 4xx로
// 분류하면 오프라인이 「번호가 틀렸다」 · 「코드가 틀렸다」로 보이고, 세션 갱신은 세션을 지웁니다.

for (const status of [0, 499]) {
  test(`AN1. status ${String(status)} 응답은 다섯 연산 모두 network다`, async () => {
    stubConfig();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ status, text: async () => "" })),
    );

    await expect(requestPhoneOtp(samplePhone)).resolves.toEqual({
      status: "failed",
      reason: "network",
    });
    await expect(verifyPhoneOtp({ phone: samplePhone, code: "123456" })).resolves.toEqual({
      status: "failed",
      reason: "network",
    });
    await expect(refreshAuthSession("refresh-token")).resolves.toEqual({
      status: "failed",
      reason: "network",
    });
    await expect(exchangePkceCode({ authCode: "code", codeVerifier: "verifier" })).resolves.toEqual(
      { status: "failed", reason: "network" },
    );
    await expect(exchangeIdToken({ idToken: "token", nonce: "nonce" })).resolves.toEqual({
      status: "failed",
      reason: "network",
    });
  });
}

test("AN2. 진짜 4xx(400 · 403 · 498)는 여전히 연산별 실패로 분류한다", async () => {
  stubConfig();
  for (const status of [400, 403, 498]) {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse(status, {})),
    );
    await expect(refreshAuthSession("refresh-token")).resolves.toEqual({
      status: "failed",
      reason: "rejected",
    });
  }
});
