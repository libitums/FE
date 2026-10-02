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
  registerPushDeviceRequest,
  supabaseAuthRequest,
  supabaseLogoutRequest,
  unregisterPushDeviceRequest,
} from "./auth-request";
import type { PushDevice } from "./push-notifications.contract";
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
import { isSuccessStatus, send } from "./supabase-transport";
import type { AuthRequestOutcome } from "./supabase-transport";

export { authRequestTimeoutMs } from "./supabase-transport";

export {
  authSessionFrom,
  errorCodeFrom,
  otpRequestFailureFrom,
  otpVerifyFailureFrom,
  sessionRefreshFailureFrom,
} from "./auth-response";
export { supabaseAuthPathFor, supabaseAuthRequest, supabaseAuthorizeUrl } from "./auth-request";

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

/** Android Apple 삭제 재인증: Supabase 세션을 저장하지 않고 제공자 토큰만 이번 요청에 사용합니다. */
export async function exchangeAppleReauthenticationCode(
  request: PkceExchangeRequest,
): Promise<
  { status: "exchanged"; accessToken: string; providerRefreshToken: string } | { status: "failed" }
> {
  const body: SupabasePkceTokenRequestBody = {
    auth_code: request.authCode,
    code_verifier: request.codeVerifier,
  };
  const outcome = await send((config) => supabaseAuthRequest(config, "exchange-pkce", body), true);
  if (!outcome.ok || !isSuccessStatus(outcome.status)) return { status: "failed" };
  const session = authSessionFrom(outcome.bodyText, Date.now());
  if (session === null) return { status: "failed" };
  try {
    const parsed: unknown = JSON.parse(outcome.bodyText);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return { status: "failed" };
    }
    const token = (parsed as Record<string, unknown>)["provider_refresh_token"];
    return typeof token === "string" && token !== ""
      ? { status: "exchanged", accessToken: session.accessToken, providerRefreshToken: token }
      : { status: "failed" };
  } catch {
    return { status: "failed" };
  }
}

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

/** 푸시 기기 등록입니다(ADR-0034). 2xx → `true`. 실패는 삼킵니다 — 알림은 로그인을 막지 않습니다. */
export async function registerPushDevice(
  accessToken: string,
  device: PushDevice,
): Promise<boolean> {
  const outcome = await send(
    (config) => registerPushDeviceRequest(config, accessToken, device),
    false,
  );
  return outcome.ok && isSuccessStatus(outcome.status);
}

/** 푸시 기기 해제입니다. 결과를 버립니다. */
export async function unregisterPushDevice(accessToken: string, token: string): Promise<void> {
  await send((config) => unregisterPushDeviceRequest(config, accessToken, token), false);
}
