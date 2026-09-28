// Supabase Auth REST를 부르는 유일한 자리입니다(ADR-0007 D2). `supabase-js` 대신 Lynx `fetch`의
// 부분집합에 맞춘 손 클라이언트입니다. 세 부수효과 함수는 계약상 절대 던지지 않습니다 —
// 전송 실패 · 시간 초과 · 파싱 실패를 전부 안에서 `failed` 결과로 삼킵니다.
//
// 응답 파서 · 실패 판정 다섯은 `lib/auth-response.ts`로 옮겼습니다 — 여기서
// 다시 내보내(re-export) 기존 unit import가 안 바뀝니다.

import type {
  AuthOperation,
  HttpRequestInit,
  HttpTransport,
  PhoneNumber,
  PhoneOtpRequestResult,
  PhoneOtpVerifyRequest,
  PhoneOtpVerifyResult,
  RefreshAuthSession,
  RequestPhoneOtp,
  SessionRefreshResult,
  SupabaseAuthPath,
  SupabaseConfig,
  SupabaseOtpRequestBody,
  SupabaseRefreshRequestBody,
  SupabaseVerifyRequestBody,
  VerifyPhoneOtp,
} from "./auth-session.contract";
import {
  authSessionFrom,
  errorCodeFrom,
  otpRequestFailureFrom,
  otpVerifyFailureFrom,
  pkceExchangeFailureFrom,
  sessionRefreshFailureFrom,
} from "./auth-response";
import type {
  ExchangePkceCode,
  PkceExchangeRequest,
  PkceExchangeResult,
  SupabaseAuthorizeQuery,
  SupabasePkceTokenRequestBody,
} from "./social-sign-in.contract";
import { supabaseConfig } from "./supabase-config";

export {
  authSessionFrom,
  errorCodeFrom,
  otpRequestFailureFrom,
  otpVerifyFailureFrom,
  sessionRefreshFailureFrom,
} from "./auth-response";

/** 응답이 이 안에 안 오면 `network`입니다. */
export const authRequestTimeoutMs = 10000;

/** `default` 없는 `switch`로 네 연산 전부를 망라합니다. */
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
    case "exchange-pkce": {
      return "/auth/v1/token?grant_type=pkce";
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
  body:
    | SupabaseOtpRequestBody
    | SupabaseVerifyRequestBody
    | SupabaseRefreshRequestBody
    | SupabasePkceTokenRequestBody,
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

// ------------------------------------------------------------------ 소셜 로그인

/**
 * `GET /auth/v1/authorize`의 주소입니다. 앱이 부르지 않고 인증 창이 엽니다. 키 순서는
 * `SupabaseAuthorizeQuery`의 순서로 고정하고, 값은 전부 `encodeURIComponent`를 거칩니다.
 * `apikey`를 싣지 않습니다(브라우저가 여는 GET).
 */
export function supabaseAuthorizeUrl(
  config: SupabaseConfig,
  query: SupabaseAuthorizeQuery,
): string {
  const params = [
    `provider=${encodeURIComponent(query.provider)}`,
    `redirect_to=${encodeURIComponent(query.redirect_to)}`,
    `code_challenge=${encodeURIComponent(query.code_challenge)}`,
    `code_challenge_method=${encodeURIComponent(query.code_challenge_method)}`,
  ].join("&");
  return `${config.url}/auth/v1/authorize?${params}`;
}

/**
 * PKCE 코드 교환입니다(`POST /auth/v1/token?grant_type=pkce`, 본문 `{ auth_code, code_verifier }`).
 * 다른 부수효과 함수와 같은 순서(설정 → 전송 해석 →
 * 제한 시간 경주 → 던지지 않음)를 따릅니다.
 */
export const exchangePkceCode: ExchangePkceCode = async (
  request: PkceExchangeRequest,
): Promise<PkceExchangeResult> => {
  const body: SupabasePkceTokenRequestBody = {
    auth_code: request.authCode,
    code_verifier: request.codeVerifier,
  };
  const outcome = await sendAuthRequest("exchange-pkce", body);
  if (!outcome.ok) {
    return { status: "failed", reason: outcome.reason };
  }
  if (isSuccessStatus(outcome.status)) {
    const session = authSessionFrom(outcome.bodyText, Date.now());
    if (session === null) {
      return { status: "failed", reason: "unavailable" };
    }
    return { status: "exchanged", session };
  }
  return {
    status: "failed",
    reason: pkceExchangeFailureFrom(outcome.status, errorCodeFrom(outcome.bodyText)),
  };
};

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
  body:
    | SupabaseOtpRequestBody
    | SupabaseVerifyRequestBody
    | SupabaseRefreshRequestBody
    | SupabasePkceTokenRequestBody,
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
