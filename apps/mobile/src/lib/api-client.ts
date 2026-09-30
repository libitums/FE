// Supabase Auth REST를 부르는 유일한 자리입니다(ADR-0007 D2). `supabase-js` 대신 Lynx `fetch`의
// 부분집합에 맞춘 손 클라이언트입니다. 세 부수효과 함수는 계약상 절대 던지지 않습니다 —
// 전송 실패 · 시간 초과 · 파싱 실패를 전부 안에서 `failed` 결과로 삼킵니다.
//
// 응답 파서 · 실패 판정 다섯은 `lib/auth-response.ts`로 옮겼습니다 — 여기서
// 다시 내보내(re-export) 기존 unit import가 안 바뀝니다.

import type {
  AccountDeletionRequest,
  AccountDeletionRequestResult,
  RequestAccountDeletion,
  SignOutRemotely,
} from "./account.contract";
import type {
  AuthSession,
  HttpRequestInit,
  HttpTransport,
  PhoneNumber,
  PhoneOtpRequestResult,
  PhoneOtpVerifyRequest,
  PhoneOtpVerifyResult,
  RefreshAuthSession,
  RequestPhoneOtp,
  SessionRefreshResult,
  SupabaseConfig,
  SupabaseOtpRequestBody,
  SupabaseRefreshRequestBody,
  SupabaseVerifyRequestBody,
  VerifyPhoneOtp,
} from "./auth-session.contract";
import {
  accountDeletionFailureFrom,
  authSessionFrom,
  errorCodeFrom,
  otpRequestFailureFrom,
  otpVerifyFailureFrom,
  pkceExchangeFailureFrom,
  sessionRefreshFailureFrom,
} from "./auth-response";
import {
  deleteAccountFunctionRequest,
  supabaseAuthRequest,
  supabaseLogoutRequest,
} from "./auth-request";
import type {
  ExchangeIdToken,
  ExchangePkceCode,
  IdTokenExchangeRequest,
  IdTokenExchangeResult,
  PkceExchangeRequest,
  PkceExchangeResult,
  SupabaseIdTokenRequestBody,
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
export { supabaseAuthPathFor, supabaseAuthRequest, supabaseAuthorizeUrl } from "./auth-request";

/** 응답이 이 안에 안 오면 `network`입니다. */
export const authRequestTimeoutMs = 10000;

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
  const outcome = await send((config) => supabaseAuthRequest(config, "exchange-pkce", body), true);
  return sessionResult(outcome, "exchanged", pkceExchangeFailureFrom);
};

/**
 * Apple ID 토큰 교환입니다(`POST /auth/v1/token?grant_type=id_token`, 본문
 * `{ provider: "apple", id_token, nonce }`). 판정은 PKCE 교환과 같습니다.
 */
export const exchangeIdToken: ExchangeIdToken = async (
  request: IdTokenExchangeRequest,
): Promise<IdTokenExchangeResult> => {
  const body: SupabaseIdTokenRequestBody = {
    provider: "apple",
    id_token: request.idToken,
    nonce: request.nonce,
  };
  const outcome = await send(
    (config) => supabaseAuthRequest(config, "exchange-id-token", body),
    true,
  );
  return sessionResult(outcome, "exchanged", pkceExchangeFailureFrom);
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
async function send(
  build: (config: SupabaseConfig) => { url: string; init: HttpRequestInit },
  readBody: boolean,
): Promise<AuthRequestOutcome> {
  const config = supabaseConfig();
  if (config === null) {
    return { ok: false, reason: "unconfigured" };
  }

  const transport = resolveTransport();
  if (transport === undefined) {
    return { ok: false, reason: "network" };
  }

  const { url, init } = build(config);

  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<AuthRequestOutcome>((resolve) => {
    timeoutId = setTimeout(() => {
      resolve({ ok: false, reason: "network" });
    }, authRequestTimeoutMs);
  });

  const send = (async (): Promise<AuthRequestOutcome> => {
    try {
      const response = await transport(url, init);
      // Lynx `fetch`는 연결 실패를 거부하지 않고 이 status로 돌려줍니다(#154 · ADR-0029 D12).
      if (response.status === 0 || response.status === 499) {
        return { ok: false, reason: "network" };
      }
      // 로그아웃 · 삭제는 상태 코드만 가르므로 본문을 읽지 않습니다.
      const bodyText = readBody ? await response.text() : "";
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

// 세션을 내는 네 교환(검증 · 갱신 · PKCE · id_token)이 공유하는 결과 매핑입니다.
// 2xx + 파싱 성공 → 세션, 파싱 실패 → `unavailable`, 그 밖 → 연산별 실패 판정.
function sessionResult<Ok extends string, Reason extends string>(
  outcome: AuthRequestOutcome,
  okStatus: Ok,
  failureFrom: (status: number, errorCode: string | null) => Reason,
):
  | { status: Ok; session: AuthSession }
  | { status: "failed"; reason: Reason | "network" | "unconfigured" | "unavailable" } {
  if (!outcome.ok) {
    return { status: "failed", reason: outcome.reason };
  }
  if (isSuccessStatus(outcome.status)) {
    const session = authSessionFrom(outcome.bodyText, Date.now());
    if (session === null) {
      return { status: "failed", reason: "unavailable" };
    }
    return { status: okStatus, session };
  }
  return { status: "failed", reason: failureFrom(outcome.status, errorCodeFrom(outcome.bodyText)) };
}

/**
 * 본문 `{ phone: e164, channel: "sms", create_user: true }`. 2xx → `sent`(본문 안 읽음).
 * 계약상 던지지 않습니다 — 실 구현은 항상 이행(resolve)된 Promise를 돌려줍니다.
 */
export const requestPhoneOtp: RequestPhoneOtp = async (
  phone: PhoneNumber,
): Promise<PhoneOtpRequestResult> => {
  const body: SupabaseOtpRequestBody = { phone: phone.e164, channel: "sms", create_user: true };
  const outcome = await send((config) => supabaseAuthRequest(config, "request-otp", body), true);
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
  const outcome = await send((config) => supabaseAuthRequest(config, "verify-otp", body), true);
  return sessionResult(outcome, "verified", otpVerifyFailureFrom);
};

/** 본문 `{ refresh_token }`. 2xx 처리는 검증과 같습니다. */
export const refreshAuthSession: RefreshAuthSession = async (
  refreshToken: string,
): Promise<SessionRefreshResult> => {
  const body: SupabaseRefreshRequestBody = { refresh_token: refreshToken };
  const outcome = await send(
    (config) => supabaseAuthRequest(config, "refresh-session", body),
    true,
  );
  return sessionResult(outcome, "refreshed", sessionRefreshFailureFrom);
};

/**
 * 로그아웃 요청을 시작만 하고 결과를 버립니다. 설정이 없으면 요청하지 않습니다. 거부하지 않습니다.
 */
export const signOutRemotely: SignOutRemotely = async (accessToken) => {
  await send((config) => supabaseLogoutRequest(config, accessToken), false);
};

/** 삭제 함수를 부릅니다. 2xx → `deleted`. 거부하지 않습니다. */
export const requestAccountDeletion: RequestAccountDeletion = async (
  request: AccountDeletionRequest,
): Promise<AccountDeletionRequestResult> => {
  const outcome = await send((config) => deleteAccountFunctionRequest(config, request), false);
  if (!outcome.ok) {
    return { status: "failed", reason: outcome.reason };
  }
  if (isSuccessStatus(outcome.status)) {
    return { status: "deleted" };
  }
  return { status: "failed", reason: accountDeletionFailureFrom(outcome.status) };
};
