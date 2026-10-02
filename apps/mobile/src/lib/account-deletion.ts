// 계정 삭제 한 번의 흐름입니다 — 설정 확인 → (필요하면) 세션 갱신 → (Apple이면) 재인증 → 삭제 요청.
// 어휘는 `account.contract.ts`입니다. 저장소 · 분석 · 전이는 하지 않습니다(결선 `app/account-wiring.ts`의 몫).

import {
  exchangeAppleReauthenticationCode,
  refreshAuthSession,
  requestAccountDeletion,
} from "./api-client";
import {
  appleNonceByteCount,
  appleNoncePairFrom,
  isAppleSignInAvailable,
  startAppleSignIn,
} from "./apple-sign-in";
import type { AppleSignInResult } from "./apple-sign-in.contract";
import { accountDeletionFailureFromRefresh } from "./auth-response";
import { authProvidersFrom, authUserIdFrom } from "./auth-user-id";
import { openWebOAuth } from "./social-sign-in";
import { supabaseConfig } from "./supabase-config";
import { secureRandomBytes } from "./web-authentication";
import type {
  AppleReauthenticationResult,
  DeleteAccount,
  ReauthenticateWithApple,
  RequiresAppleReauthentication,
  SessionNeedsRefresh,
} from "./account.contract";

/** 액세스 토큰 만료가 이 안(밀리초)이면 삭제 전에 세션을 갱신합니다. */
export const accessTokenRefreshMarginMs = 60_000;

export const sessionNeedsRefresh: SessionNeedsRefresh = (session, nowMs) =>
  session.expiresAt - nowMs <= accessTokenRefreshMarginMs;

export const requiresAppleReauthentication: RequiresAppleReauthentication = (providers) =>
  providers.includes("apple");

const failedReauthentication: AppleReauthenticationResult = { status: "failed" };

// nonce는 호스트 시트가 요구해 싣지만(A2), 돌려받는 ID 토큰은 쓰지 않고 버립니다.
export const reauthenticateWithApple: ReauthenticateWithApple = async () => {
  const bytes = secureRandomBytes(appleNonceByteCount);
  if (bytes === null) {
    return failedReauthentication;
  }
  const nonce = appleNoncePairFrom(bytes);
  const result = await new Promise<AppleSignInResult>((resolve) => {
    const outcome = startAppleSignIn({ nonce: nonce.hashed }, resolve);
    if (outcome === "unavailable") {
      resolve({ status: "failed" });
    }
  });
  if (result.status === "cancelled") {
    return { status: "cancelled" };
  }
  if (result.status === "completed" && result.authorizationCode !== null) {
    return { status: "confirmed", authorizationCode: result.authorizationCode };
  }
  return failedReauthentication;
};

/** Android는 Apple 네이티브 시트가 없으므로 Supabase 웹 OAuth를 새로 열어 일회성 토큰을 받습니다. */
async function reauthenticateWithAppleWeb(
  accessToken: string,
): Promise<AppleReauthenticationResult> {
  const opened = await openWebOAuth("apple");
  if (opened.status === "cancelled") return { status: "cancelled" };
  if (opened.status !== "completed") return failedReauthentication;
  const exchanged = await exchangeAppleReauthenticationCode({
    authCode: opened.authCode,
    codeVerifier: opened.codeVerifier,
  });
  if (exchanged.status !== "exchanged") return failedReauthentication;
  const currentUser = authUserIdFrom(accessToken);
  if (currentUser === null || currentUser !== authUserIdFrom(exchanged.accessToken)) {
    return failedReauthentication;
  }
  return { status: "confirmed", providerRefreshToken: exchanged.providerRefreshToken };
}

export const deleteAccount: DeleteAccount = async (session, persistRefreshedSession) => {
  if (supabaseConfig() === null) {
    return { status: "failed", reason: "unconfigured" };
  }

  let accessToken = session.accessToken;
  if (sessionNeedsRefresh(session, Date.now())) {
    const refreshed = await refreshAuthSession(session.refreshToken);
    if (refreshed.status === "failed") {
      return { status: "failed", reason: accountDeletionFailureFromRefresh(refreshed.reason) };
    }
    persistRefreshedSession(refreshed.session);
    accessToken = refreshed.session.accessToken;
  }

  let appleAuthorizationCode: string | null = null;
  let appleProviderRefreshToken: string | undefined;
  if (requiresAppleReauthentication(authProvidersFrom(accessToken))) {
    const reauthentication = isAppleSignInAvailable()
      ? await reauthenticateWithApple()
      : await reauthenticateWithAppleWeb(accessToken);
    if (reauthentication.status === "cancelled") {
      return { status: "cancelled" };
    }
    if (reauthentication.status === "failed") {
      return { status: "failed", reason: "apple-unconfirmed" };
    }
    if ("authorizationCode" in reauthentication) {
      appleAuthorizationCode = reauthentication.authorizationCode;
    } else {
      appleProviderRefreshToken = reauthentication.providerRefreshToken;
    }
  }

  const result = await requestAccountDeletion({
    accessToken,
    appleAuthorizationCode,
    appleProviderRefreshToken,
  });
  return result.status === "deleted" ? { status: "deleted" } : result;
};
