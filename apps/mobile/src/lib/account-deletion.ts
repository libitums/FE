// 계정 삭제 한 번의 흐름입니다 — 설정 확인 → (필요하면) 세션 갱신 → (Apple이면) 재인증 → 삭제 요청.
// 어휘는 `account.contract.ts`입니다. 저장소 · 분석 · 전이는 하지 않습니다(결선 `app/account-wiring.ts`의 몫).

import { refreshAuthSession, requestAccountDeletion } from "./api-client";
import { appleNonceByteCount, appleNoncePairFrom, startAppleSignIn } from "./apple-sign-in";
import type { AppleSignInResult } from "./apple-sign-in.contract";
import { accountDeletionFailureFromRefresh } from "./auth-response";
import { authProvidersFrom } from "./auth-user-id";
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
  if (requiresAppleReauthentication(authProvidersFrom(accessToken))) {
    const reauthentication = await reauthenticateWithApple();
    if (reauthentication.status === "cancelled") {
      return { status: "cancelled" };
    }
    if (reauthentication.status === "failed") {
      return { status: "failed", reason: "apple-unconfirmed" };
    }
    appleAuthorizationCode = reauthentication.authorizationCode;
  }

  const result = await requestAccountDeletion({ accessToken, appleAuthorizationCode });
  return result.status === "deleted" ? { status: "deleted" } : result;
};
