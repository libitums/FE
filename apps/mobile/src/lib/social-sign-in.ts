// 소셜 로그인(Supabase OAuth + PKCE) 한 번의 시도 전부를 진 자리입니다. 설정 확인 →
// 난수 → PKCE → authorize URL → 창 → 콜백 파싱 → 교환을 한 함수로 집니다.
// `pair`(PKCE)는 이 함수의 지역 변수로만 삽니다 — 반환값에 싣지 않습니다.

import {
  appleNonceByteCount,
  appleNoncePairFrom,
  isAppleSignInAvailable,
  startAppleSignIn,
} from "./apple-sign-in";
import type { AppleSignInResult } from "./apple-sign-in.contract";
import { exchangeIdToken, exchangePkceCode, supabaseAuthorizeUrl } from "./api-client";
import type { EntryLoginMethod } from "./entry-flow";
import { codeVerifierByteCount, pkcePairFrom } from "./pkce";
import type {
  OAuthCallback,
  OAuthCallbackScheme,
  OAuthRedirectUrl,
  SignInWithSocialProvider,
  SocialSignInResult,
  SupabaseOAuthProvider,
  WebAuthenticationResult,
  WebOAuthProvider,
} from "./social-sign-in.contract";
import { supabaseConfig } from "./supabase-config";
import { secureRandomBytes, startWebAuthentication } from "./web-authentication";

/** iOS 세션이 가로채고 Android manifest가 딥링크로 받는 스킴입니다(ADR-0038). */
export const oauthCallbackScheme: OAuthCallbackScheme = "duru";

/** `redirect_to`에 싣는 값입니다. Supabase 대시보드의 리다이렉트 허용 목록과 같아야 합니다. */
export const oauthRedirectUrl: OAuthRedirectUrl = `${oauthCallbackScheme}://auth-callback`;

/** `default` 없는 `switch`로 세 수단 전부를 망라합니다. */
export function oauthProviderFor(
  method: Exclude<EntryLoginMethod, "phone">,
): SupabaseOAuthProvider {
  switch (method) {
    case "apple": {
      return "apple";
    }
    case "google": {
      return "google";
    }
    case "facebook": {
      return "facebook";
    }
  }
}

/** `key=value` 쌍 목록을 읽습니다. `+`를 공백으로 바꾼 뒤 `decodeURIComponent` — 던지면 그 쌍을 버립니다. */
function paramsFrom(section: string): Map<string, string> {
  const params = new Map<string, string>();
  if (section.length === 0) {
    return params;
  }
  for (const pair of section.split("&")) {
    if (pair.length === 0) {
      continue;
    }
    const eqIndex = pair.indexOf("=");
    const rawKey = eqIndex === -1 ? pair : pair.slice(0, eqIndex);
    const rawValue = eqIndex === -1 ? "" : pair.slice(eqIndex + 1);
    try {
      const key = decodeURIComponent(rawKey.replace(/\+/g, " "));
      const value = decodeURIComponent(rawValue.replace(/\+/g, " "));
      params.set(key, value);
    } catch {
      // 깨진 퍼센트 인코딩 — 그 쌍을 버립니다(던지지 않습니다).
    }
  }
  return params;
}

/** 콜백 URL(쿼리 · 프래그먼트)을 읽어 `code` · `error` · `malformed`로 좁힙니다. 던지지 않습니다. */
export function oauthCallbackFrom(callbackUrl: string, redirectUrl: string): OAuthCallback {
  if (!callbackUrl.startsWith(redirectUrl)) {
    return { kind: "malformed" };
  }
  const rest = callbackUrl.slice(redirectUrl.length);
  if (rest.length > 0 && rest[0] !== "?" && rest[0] !== "#") {
    return { kind: "malformed" };
  }

  let queryPart = "";
  let fragmentPart = "";
  if (rest.startsWith("?")) {
    const hashIndex = rest.indexOf("#");
    if (hashIndex === -1) {
      queryPart = rest.slice(1);
    } else {
      queryPart = rest.slice(1, hashIndex);
      fragmentPart = rest.slice(hashIndex + 1);
    }
  } else if (rest.startsWith("#")) {
    fragmentPart = rest.slice(1);
  }

  const queryParams = paramsFrom(queryPart);
  const fragmentParams = paramsFrom(fragmentPart);

  const error = queryParams.get("error") ?? fragmentParams.get("error");
  if (error !== undefined && error.length > 0) {
    return { kind: "error", error };
  }

  const code = queryParams.get("code") ?? fragmentParams.get("code");
  if (code !== undefined && code.length > 0) {
    return { kind: "code", code };
  }

  return { kind: "malformed" };
}

/**
 * 한 번의 소셜 로그인 시도 전부입니다. 어떤 경우에도 거부(reject)하지 않습니다 — 실패는
 * 전부 `SocialSignInResult`의 `failed` 값으로 옵니다.
 */
export const signInWithSocialProvider: SignInWithSocialProvider = (
  provider: SupabaseOAuthProvider,
): Promise<SocialSignInResult> => {
  switch (provider) {
    case "apple": {
      return isAppleSignInAvailable() ? signInWithApple() : signInWithWebOAuth(provider);
    }
    case "google":
    case "facebook": {
      return signInWithWebOAuth(provider);
    }
  }
};

// 네이티브 Apple 시트 + id_token 교환입니다. `WebAuthenticationModule.start`를 부르지 않습니다
// (`randomBytes`만). `nonce`는 이 함수의 지역 변수로만 삽니다 — 결과에 싣지 않습니다.
async function signInWithApple(): Promise<SocialSignInResult> {
  const config = supabaseConfig();
  if (config === null) {
    return { status: "failed", reason: "unconfigured" };
  }

  const bytes = secureRandomBytes(appleNonceByteCount);
  if (bytes === null) {
    return { status: "failed", reason: "unsupported" };
  }

  const nonce = appleNoncePairFrom(bytes);

  const result = await new Promise<AppleSignInResult>((resolve) => {
    const outcome = startAppleSignIn({ nonce: nonce.hashed }, resolve);
    if (outcome === "unavailable") {
      // 이 경로에서는 호스트 콜백이 오지 않습니다 — 시트를 못 연 것과 같은 결과로 잇습니다.
      resolve({ status: "failed" });
    }
  });

  switch (result.status) {
    case "cancelled": {
      return { status: "cancelled" };
    }
    case "failed":
    case "already-active":
    case "invalid-arguments":
    case "malformed": {
      return { status: "failed", reason: "unsupported" };
    }
    case "completed": {
      const exchangeResult = await exchangeIdToken({
        idToken: result.identityToken,
        nonce: nonce.raw,
      });
      if (exchangeResult.status === "exchanged") {
        return { status: "signed-in", session: exchangeResult.session };
      }
      return { status: "failed", reason: exchangeResult.reason };
    }
  }
}

async function signInWithWebOAuth(provider: WebOAuthProvider): Promise<SocialSignInResult> {
  const config = supabaseConfig();
  if (config === null) {
    return { status: "failed", reason: "unconfigured" };
  }

  const bytes = secureRandomBytes(codeVerifierByteCount);
  if (bytes === null) {
    return { status: "failed", reason: "unsupported" };
  }

  const pair = pkcePairFrom(bytes);
  const url = supabaseAuthorizeUrl(config, {
    provider,
    redirect_to: oauthRedirectUrl,
    code_challenge: pair.challenge,
    code_challenge_method: "s256",
  });

  const result = await new Promise<WebAuthenticationResult>((resolve) => {
    const outcome = startWebAuthentication({ url, callbackScheme: oauthCallbackScheme }, resolve);
    if (outcome === "unavailable") {
      // 계약상 이 경로에서는 호스트 콜백이 오지 않습니다 — 창을 못 띄운 것과
      // 같은 결과(failed/unsupported)로 흐름을 잇기 위해 같은 상태로 스스로
      // 마무리합니다.
      resolve({ status: "failed" });
    }
  });

  switch (result.status) {
    case "cancelled": {
      return { status: "cancelled" };
    }
    case "failed":
    case "already-active":
    case "invalid-arguments":
    case "malformed": {
      return { status: "failed", reason: "unsupported" };
    }
    case "completed": {
      const callback = oauthCallbackFrom(result.callbackUrl, oauthRedirectUrl);
      if (callback.kind !== "code") {
        return { status: "failed", reason: "sign-in-incomplete" };
      }

      const exchangeResult = await exchangePkceCode({
        authCode: callback.code,
        codeVerifier: pair.verifier,
      });
      if (exchangeResult.status === "exchanged") {
        return { status: "signed-in", session: exchangeResult.session };
      }
      return { status: "failed", reason: exchangeResult.reason };
    }
  }
}
