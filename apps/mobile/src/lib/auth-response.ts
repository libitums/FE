// Supabase Auth REST 응답 본문 → 계약 값입니다. 순수 함수만 있습니다 — `fetch` · `lynx`를
// 참조하면 계약 위반입니다. `api-client.ts`에서 옮겨 왔습니다 — 298줄 +
// PKCE 교환이면 oxlint `max-lines`(300)를 넘겨서입니다. `api-client.ts`가 이 파일의 다섯을
// 그대로 다시 내보내(re-export) 기존 unit import가 안 바뀝니다.

import type {
  AccountDeletionFailureFrom,
  AccountDeletionFailureFromRefresh,
} from "./account.contract";
import type {
  AuthSession,
  PhoneOtpRequestFailure,
  PhoneOtpVerifyFailure,
  SessionRefreshFailure,
  SupabaseErrorCode,
} from "./auth-session.contract";
import type { PkceExchangeFailure } from "./social-sign-in.contract";

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

/**
 * PKCE 교환(`/auth/v1/token?grant_type=pkce`)의 실패 판정입니다. 429 또는 `over_*` →
 * `rate-limited` · 5xx → `unavailable` · 4xx → `sign-in-incomplete` · 그 밖 → `unavailable`.
 */
export function pkceExchangeFailureFrom(
  status: number,
  errorCode: SupabaseErrorCode,
): Extract<PkceExchangeFailure, "unavailable" | "rate-limited" | "sign-in-incomplete"> {
  if (status === 429 || (errorCode !== null && errorCode.startsWith("over_"))) {
    return "rate-limited";
  }
  if (status >= 500) {
    return "unavailable";
  }
  if (status >= 400) {
    return "sign-in-incomplete";
  }
  return "unavailable";
}

/** 401 → `session-expired` · 403 → `apple-unconfirmed` · 그 밖 → `unavailable`. */
export const accountDeletionFailureFrom: AccountDeletionFailureFrom = (status) => {
  if (status === 401) {
    return "session-expired";
  }
  if (status === 403) {
    return "apple-unconfirmed";
  }
  return "unavailable";
};

/** `rejected` → `session-expired` · 나머지는 같은 낱말. */
export const accountDeletionFailureFromRefresh: AccountDeletionFailureFromRefresh = (reason) => {
  switch (reason) {
    case "rejected": {
      return "session-expired";
    }
    case "network": {
      return "network";
    }
    case "unavailable": {
      return "unavailable";
    }
    case "unconfigured": {
      return "unconfigured";
    }
  }
};
