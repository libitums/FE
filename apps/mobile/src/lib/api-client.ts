// Supabase Auth REST를 부르는 유일한 자리입니다(ADR-0007 D2). `supabase-js` 대신 Lynx `fetch`의
// 부분집합에 맞춘 손 클라이언트입니다. 세 부수효과 함수는 계약상 절대 던지지 않습니다 —
// 전송 실패 · 시간 초과 · 파싱 실패를 전부 안에서 `failed` 결과로 삼킵니다.

import type {
  AuthOperation,
  AuthSession,
  HttpRequestInit,
  HttpTransport,
  PhoneNumber,
  PhoneOtpRequestFailure,
  PhoneOtpRequestResult,
  PhoneOtpVerifyFailure,
  PhoneOtpVerifyRequest,
  PhoneOtpVerifyResult,
  RefreshAuthSession,
  RequestPhoneOtp,
  SessionRefreshFailure,
  SessionRefreshResult,
  SupabaseAuthPath,
  SupabaseConfig,
  SupabaseErrorCode,
  SupabaseOtpRequestBody,
  SupabaseRefreshRequestBody,
  SupabaseVerifyRequestBody,
  VerifyPhoneOtp,
} from "./auth-session.contract";
import { supabaseConfig } from "./supabase-config";

/** 응답이 이 안에 안 오면 `network`입니다. */
export const authRequestTimeoutMs = 10000;

/** `default` 없는 `switch`로 세 연산 전부를 망라합니다. */
export function supabaseAuthPathFor(operation: AuthOperation): SupabaseAuthPath {
  switch (operation) {
    case "request-otp": {
      return "/auth/v1/otp";
    }
    case "verify-otp": {
      return "/auth/v1/verify";
    }
    case "refresh-session": {
      return "/auth/v1/token?grant_type=refresh_token";
    }
  }
}

/**
 * `url = config.url + path`, `init`은 `POST` · `apikey` · `Content-Type` 헤더 ·
 * JSON 본문입니다. `Authorization` 헤더를 싣지 않습니다.
 */
export function supabaseAuthRequest(
  config: SupabaseConfig,
  operation: AuthOperation,
  body: SupabaseOtpRequestBody | SupabaseVerifyRequestBody | SupabaseRefreshRequestBody,
): { url: string; init: HttpRequestInit } {
  return {
    url: `${config.url}${supabaseAuthPathFor(operation)}`,
    init: {
      method: "POST",
      headers: { apikey: config.anonKey, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  };
}

/** JSON 파싱 실패 · 객체 아님 · `error_code`가 문자열 아님 → `null`. */
export function errorCodeFrom(bodyText: string): SupabaseErrorCode {
  let parsed: unknown;
  try {
    parsed = JSON.parse(bodyText);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) {
    return null;
  }
  const errorCode = (parsed as Record<string, unknown>)["error_code"];
  return typeof errorCode === "string" ? errorCode : null;
}

/**
 * `access_token` · `refresh_token`이 비지 않은 문자열이고 `expires_in`이 양의 유한수일 때만
 * `AuthSession`을 돌려줍니다. `expiresAt = nowMs + expires_in × 1000`.
 */
export function authSessionFrom(bodyText: string, nowMs: number): AuthSession | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(bodyText);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) {
    return null;
  }
  const body = parsed as Record<string, unknown>;
  const accessToken = body["access_token"];
  const refreshToken = body["refresh_token"];
  const expiresIn = body["expires_in"];
  if (typeof accessToken !== "string" || accessToken.length === 0) {
    return null;
  }
  if (typeof refreshToken !== "string" || refreshToken.length === 0) {
    return null;
  }
  if (typeof expiresIn !== "number" || !Number.isFinite(expiresIn) || expiresIn <= 0) {
    return null;
  }
  return { accessToken, refreshToken, expiresAt: nowMs + expiresIn * 1000 };
}

/** 429 또는 `over_` 코드 → `rate-limited` · 5xx → `unavailable` · 4xx → `rejected`. */
export function otpRequestFailureFrom(
  status: number,
  errorCode: SupabaseErrorCode,
): Extract<PhoneOtpRequestFailure, "unavailable" | "rate-limited" | "rejected"> {
  if (status === 429 || (errorCode !== null && errorCode.startsWith("over_"))) {
    return "rate-limited";
  }
  if (status >= 500) {
    return "unavailable";
  }
  if (status >= 400) {
    return "rejected";
  }
  return "unavailable";
}

/** `otpRequestFailureFrom`과 같고 4xx → `invalid-code`. */
export function otpVerifyFailureFrom(
  status: number,
  errorCode: SupabaseErrorCode,
): Extract<PhoneOtpVerifyFailure, "unavailable" | "rate-limited" | "invalid-code"> {
  if (status === 429 || (errorCode !== null && errorCode.startsWith("over_"))) {
    return "rate-limited";
  }
  if (status >= 500) {
    return "unavailable";
  }
  if (status >= 400) {
    return "invalid-code";
  }
  return "unavailable";
}

/** 5xx · 429 · `over_*` → `unavailable`(세션을 지킨다) · 4xx → `rejected`. */
export function sessionRefreshFailureFrom(
  status: number,
  errorCode: SupabaseErrorCode,
): Extract<SessionRefreshFailure, "unavailable" | "rejected"> {
  if (status >= 500) {
    return "unavailable";
  }
  if (status === 429 || (errorCode !== null && errorCode.startsWith("over_"))) {
    return "unavailable";
  }
  if (status >= 400) {
    return "rejected";
  }
  return "unavailable";
}

// ------------------------------------------------------------------ 전송

// `globalThis.fetch` → `lynx.fetch` → 없음. 캐스팅은 `tsconfig`의 `lib`이 `ES2022`뿐이라
// DOM의 `fetch` · `RequestInit` 선언이 없어서입니다(`storage.ts`의 `NativeModules`와 같은 근거).
function resolveTransport(): HttpTransport | undefined {
  const globalFetch = (globalThis as unknown as Record<string, unknown>)["fetch"];
  if (typeof globalFetch === "function") {
    return globalFetch as unknown as HttpTransport;
  }
  if (typeof lynx !== "undefined" && typeof lynx.fetch === "function") {
    // 넘기는 값은 계약의 `HttpRequestInit`(문자열 헤더 · 본문)뿐이라 함수째 캐스팅합니다.
    return lynx.fetch.bind(lynx) as unknown as HttpTransport;
  }
  return undefined;
}

type AuthRequestOutcome =
  | { readonly ok: true; readonly status: number; readonly bodyText: string }
  | { readonly ok: false; readonly reason: "network" | "unconfigured" };

// 설정 확인 → 전송 함수 해석 → 전송과 제한 시간의 경주. **어떤 경우에도 던지지 않습니다.**
async function sendAuthRequest(
  operation: AuthOperation,
  body: SupabaseOtpRequestBody | SupabaseVerifyRequestBody | SupabaseRefreshRequestBody,
): Promise<AuthRequestOutcome> {
  const config = supabaseConfig();
  if (config === null) {
    return { ok: false, reason: "unconfigured" };
  }

  const transport = resolveTransport();
  if (transport === undefined) {
    return { ok: false, reason: "network" };
  }

  const { url, init } = supabaseAuthRequest(config, operation, body);

  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<AuthRequestOutcome>((resolve) => {
    timeoutId = setTimeout(() => {
      resolve({ ok: false, reason: "network" });
    }, authRequestTimeoutMs);
  });

  const send = (async (): Promise<AuthRequestOutcome> => {
    try {
      const response = await transport(url, init);
      const bodyText = await response.text();
      return { ok: true, status: response.status, bodyText };
    } catch {
      return { ok: false, reason: "network" };
    }
  })();

  const outcome = await Promise.race([send, timeout]);
  if (timeoutId !== undefined) {
    clearTimeout(timeoutId);
  }
  return outcome;
}

function isSuccessStatus(status: number): boolean {
  return status >= 200 && status < 300;
}

/**
 * 본문 `{ phone: e164, channel: "sms", create_user: true }`. 2xx → `sent`(본문 안 읽음).
 * 계약상 던지지 않습니다 — 실 구현은 항상 이행(resolve)된 Promise를 돌려줍니다.
 */
export const requestPhoneOtp: RequestPhoneOtp = async (
  phone: PhoneNumber,
): Promise<PhoneOtpRequestResult> => {
  const body: SupabaseOtpRequestBody = { phone: phone.e164, channel: "sms", create_user: true };
  const outcome = await sendAuthRequest("request-otp", body);
  if (!outcome.ok) {
    return { status: "failed", reason: outcome.reason };
  }
  if (isSuccessStatus(outcome.status)) {
    return { status: "sent" };
  }
  return {
    status: "failed",
    reason: otpRequestFailureFrom(outcome.status, errorCodeFrom(outcome.bodyText)),
  };
};

/**
 * 본문 `{ type: "sms", phone: e164, token: code }`. 2xx + `authSessionFrom` 성공 → `verified`,
 * 파싱 실패 → `unavailable`.
 */
export const verifyPhoneOtp: VerifyPhoneOtp = async (
  request: PhoneOtpVerifyRequest,
): Promise<PhoneOtpVerifyResult> => {
  const body: SupabaseVerifyRequestBody = {
    type: "sms",
    phone: request.phone.e164,
    token: request.code,
  };
  const outcome = await sendAuthRequest("verify-otp", body);
  if (!outcome.ok) {
    return { status: "failed", reason: outcome.reason };
  }
  if (isSuccessStatus(outcome.status)) {
    const session = authSessionFrom(outcome.bodyText, Date.now());
    if (session === null) {
      return { status: "failed", reason: "unavailable" };
    }
    return { status: "verified", session };
  }
  return {
    status: "failed",
    reason: otpVerifyFailureFrom(outcome.status, errorCodeFrom(outcome.bodyText)),
  };
};

/** 본문 `{ refresh_token }`. 2xx 처리는 검증과 같습니다. */
export const refreshAuthSession: RefreshAuthSession = async (
  refreshToken: string,
): Promise<SessionRefreshResult> => {
  const body: SupabaseRefreshRequestBody = { refresh_token: refreshToken };
  const outcome = await sendAuthRequest("refresh-session", body);
  if (!outcome.ok) {
    return { status: "failed", reason: outcome.reason };
  }
  if (isSuccessStatus(outcome.status)) {
    const session = authSessionFrom(outcome.bodyText, Date.now());
    if (session === null) {
      return { status: "failed", reason: "unavailable" };
    }
    return { status: "refreshed", session };
  }
  return {
    status: "failed",
    reason: sessionRefreshFailureFrom(outcome.status, errorCodeFrom(outcome.bodyText)),
  };
};
