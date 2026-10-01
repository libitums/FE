// Supabase Auth · 삭제 함수로 나가는 요청의 순수 빌더입니다. `fetch` · `lynx`를 참조하지 않습니다 —
// 전송은 `api-client.ts`가 지는 유일한 자리입니다(ADR-0007 D2). 앞의 셋(`supabaseAuthPathFor` ·
// `supabaseAuthRequest` · `supabaseAuthorizeUrl`)은 `api-client.ts`에서 옮겨 왔고 그쪽이 다시
// 내보내(re-export) 기존 import가 안 바뀝니다.

import type {
  AuthOperation,
  HttpRequestInit,
  SupabaseAuthPath,
  SupabaseConfig,
  SupabaseOtpRequestBody,
  SupabaseRefreshRequestBody,
  SupabaseVerifyRequestBody,
} from "./auth-session.contract";
import type { AccountDeletionRequest, DeleteAccountRequestBody } from "./account.contract";
import type {
  PushDevice,
  RegisterPushDevicePath,
  UnregisterPushDevicePath,
} from "./push-notifications.contract";
import type {
  SupabaseAuthorizeQuery,
  SupabaseIdTokenRequestBody,
  SupabasePkceTokenRequestBody,
} from "./social-sign-in.contract";

// 전송 함수가 받는 본문의 합집합입니다.
export type SupabaseAuthRequestBody =
  | SupabaseOtpRequestBody
  | SupabaseVerifyRequestBody
  | SupabaseRefreshRequestBody
  | SupabasePkceTokenRequestBody
  | SupabaseIdTokenRequestBody;

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
    case "exchange-id-token": {
      return "/auth/v1/token?grant_type=id_token";
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
  body: SupabaseAuthRequestBody,
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

// ------------------------------------------------------------------ 로그아웃 · 계정 삭제

// 로그아웃 · 삭제 함수가 함께 쓰는 헤더 셋입니다. 키는 이것뿐입니다.
export function bearerHeaders(config: SupabaseConfig, accessToken: string): Record<string, string> {
  return {
    apikey: config.anonKey,
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };
}

/**
 * `url = config.url + "/auth/v1/logout?scope=local"`, `init`은 `POST` · 헤더 셋(`apikey` ·
 * `Authorization: Bearer` · `Content-Type`) · 본문 `"{}"`입니다.
 */
export function supabaseLogoutRequest(
  config: SupabaseConfig,
  accessToken: string,
): { url: string; init: HttpRequestInit } {
  return {
    url: `${config.url}/auth/v1/logout?scope=local`,
    init: { method: "POST", headers: bearerHeaders(config, accessToken), body: "{}" },
  };
}

/**
 * `url = config.url + "/functions/v1/delete-account"`, 헤더는 로그아웃과 같은 셋, 본문은
 * `{ apple_authorization_code }`의 JSON입니다.
 */
export function deleteAccountFunctionRequest(
  config: SupabaseConfig,
  request: AccountDeletionRequest,
): { url: string; init: HttpRequestInit } {
  const body: DeleteAccountRequestBody = {
    apple_authorization_code: request.appleAuthorizationCode,
    ...(request.appleProviderRefreshToken === undefined
      ? {}
      : { apple_provider_refresh_token: request.appleProviderRefreshToken }),
  };
  return {
    url: `${config.url}/functions/v1/delete-account`,
    init: {
      method: "POST",
      headers: bearerHeaders(config, request.accessToken),
      body: JSON.stringify(body),
    },
  };
}

/**
 * 이 기기의 푸시 토큰을 로그인한 사용자 것으로 등록합니다(ADR-0034). 본문 `{p_token, p_environment}`.
 * 같은 요청이 사용자의 마지막 활동 시각도 갱신합니다 — 다시 돌아오기 알림이 그 값으로 대상을 고릅니다.
 */
export function registerPushDeviceRequest(
  config: SupabaseConfig,
  accessToken: string,
  device: PushDevice,
): { url: string; init: HttpRequestInit } {
  const path: RegisterPushDevicePath = "/rest/v1/rpc/register_push_device";
  return {
    url: `${config.url}${path}`,
    init: {
      method: "POST",
      headers: bearerHeaders(config, accessToken),
      body: JSON.stringify({ p_token: device.token, p_environment: device.environment }),
    },
  };
}

/** 로그아웃할 때 이 기기의 토큰을 뗍니다. 본문 `{p_token}`. */
export function unregisterPushDeviceRequest(
  config: SupabaseConfig,
  accessToken: string,
  token: string,
): { url: string; init: HttpRequestInit } {
  const path: UnregisterPushDevicePath = "/rest/v1/rpc/unregister_push_device";
  return {
    url: `${config.url}${path}`,
    init: {
      method: "POST",
      headers: bearerHeaders(config, accessToken),
      body: JSON.stringify({ p_token: token }),
    },
  };
}
