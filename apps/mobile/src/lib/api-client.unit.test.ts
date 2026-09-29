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

test("AC1. supabaseAuthPathFor가 세 연산을 세 경로로 옮긴다", () => {
  expect(supabaseAuthPathFor("request-otp")).toBe("/auth/v1/otp");
  expect(supabaseAuthPathFor("verify-otp")).toBe("/auth/v1/verify");
  expect(supabaseAuthPathFor("refresh-session")).toBe("/auth/v1/token?grant_type=refresh_token");
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
