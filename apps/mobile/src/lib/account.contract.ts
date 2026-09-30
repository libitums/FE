// 로그아웃 · 계정 삭제의 공용 어휘입니다. 요청 빌더(`auth-request.ts`) · 전송(`api-client.ts`) ·
// 응답 판정(`auth-response.ts`) · 흐름(`account-deletion.ts`) · 결선(`app/account-wiring.ts`) · 설정
// 화면이 같은 이름을 써서 `lib/`에 둡니다 — 소유 화면이 하나로 정해지지 않는 어휘입니다.
//
// 타입만 있습니다. 값(경로 문자열 · 여유 시간 · 문구)은 구현 모듈이 가집니다.
//
// 삭제 함수(`apps/supabase-functions`)의 오류 코드는 이 앱이 읽지 않습니다 — 앱은 **상태 코드만**
// 가릅니다. 그래서 두 앱이 공유하는 어휘는 요청 본문 하나이고, 양쪽 계약에 같은 모양으로 적습니다
// (앱끼리 import하지 않습니다, ADR-0004 D4).

import type { AuthFailureReason, AuthSession } from "./auth-session.contract";

// ------------------------------------------------------------------ 요청 경계

/**
 * 로그아웃 경로입니다. `scope=local`이라 **이 기기의 세션만** 끝냅니다 — 기본값(`global`)은 그
 * 사용자의 모든 기기 세션을 끊습니다. `POST`, `Authorization: Bearer <액세스 토큰>`.
 */
export type SupabaseLogoutPath = "/auth/v1/logout?scope=local";

/** 계정 삭제 Edge Function의 경로입니다. `POST`, `Authorization: Bearer <액세스 토큰>`. */
export type DeleteAccountFunctionPath = "/functions/v1/delete-account";

/**
 * 삭제 함수의 요청 본문입니다. 키는 이것 하나이고 **늘 싣습니다** — Apple 사용자가 아니면 `null`.
 * 값은 Apple 시트가 방금 준 `authorizationCode`(한 번 쓰면 끝, 5분 유효)이고 저장하지 않습니다.
 */
export type DeleteAccountRequestBody = {
  readonly apple_authorization_code: string | null;
};

// ------------------------------------------------------------------ 실패 어휘

/**
 * 계정 삭제 한 번이 실패한 이유입니다. 앞의 셋은 로그인과 같은 뜻입니다.
 *
 * - `session-expired` — 함수가 401을 줬거나, 삭제 전 세션 갱신을 서버가 거절했습니다.
 * - `apple-unconfirmed` — Apple 재인증이 안 됐습니다(시트 오류 · 모듈 없음 · 코드 없음 · 난수 실패),
 *   또는 함수가 403(다른 Apple ID)을 줬습니다.
 *
 * **취소는 실패가 아닙니다** — `AccountDeletionResult`의 `cancelled`입니다.
 */
export type AccountDeletionFailure =
  | Extract<AuthFailureReason, "network" | "unavailable" | "unconfigured">
  | "session-expired"
  | "apple-unconfirmed";

// ------------------------------------------------------------------ api-client 결과

export type AccountDeletionRequest = {
  readonly accessToken: string;
  readonly appleAuthorizationCode: string | null;
};

/** `requestAccountDeletion`의 결과입니다. 던지지 않습니다. */
export type AccountDeletionRequestResult =
  | { readonly status: "deleted" }
  | { readonly status: "failed"; readonly reason: AccountDeletionFailure };

/** `lib/api-client.ts`의 삭제 요청입니다. 2xx → `deleted`. 던지지 않습니다. */
export type RequestAccountDeletion = (
  request: AccountDeletionRequest,
) => Promise<AccountDeletionRequestResult>;

/**
 * `lib/api-client.ts`의 로그아웃 요청입니다. **결과를 돌려주지 않습니다** — 로그아웃은 서버 응답과
 * 무관하게 늘 성공하고(요구사항 D6), 호출자는 기다리지 않습니다. 설정이 없으면 요청하지 않습니다.
 * 거부(reject)하지 않습니다.
 */
export type SignOutRemotely = (accessToken: string) => Promise<void>;

// ------------------------------------------------------------------ Apple 재인증

/**
 * 삭제 확인 뒤 Apple 시트를 한 번 더 열어 받은 결과입니다. ID 토큰은 쓰지 않고 버립니다.
 *
 * - `confirmed` — 시트가 끝났고 `authorizationCode`가 비지 않은 문자열입니다.
 * - `cancelled` — 사용자가 시트를 닫았습니다(`.canceled`).
 * - `failed` — 그 밖 전부(난수 실패 · 모듈 없음 · 시트 오류 · 이미 떠 있음 · 인자 오류 · 모양 오류 ·
 *   `authorizationCode` 없음).
 */
export type AppleReauthenticationResult =
  | { readonly status: "confirmed"; readonly authorizationCode: string }
  | { readonly status: "cancelled" }
  | { readonly status: "failed" };

export type ReauthenticateWithApple = () => Promise<AppleReauthenticationResult>;

// ------------------------------------------------------------------ 흐름

/**
 * 계정 삭제 한 번의 결과입니다. 세션을 싣지 않습니다 — 설정 화면이 이 값을 그대로 받습니다.
 * `deleted`이면 결선이 이미 뒤처리(세션 · 분석 · 이동)를 끝냈습니다.
 */
export type AccountDeletionResult =
  | { readonly status: "deleted" }
  | { readonly status: "cancelled" }
  | { readonly status: "failed"; readonly reason: AccountDeletionFailure };

/**
 * 삭제 전 갱신으로 받은 새 세션을 저장하는 자리입니다. refresh 토큰이 회전하므로 삭제가 실패해도
 * 새 세션이 남아야 다음 부팅의 갱신이 거절되지 않습니다. 결선이 `saveAuthSession`을 넘깁니다.
 */
export type PersistRefreshedSession = (session: AuthSession) => void;

/**
 * `lib/account-deletion.ts`의 흐름 함수입니다. 설정 확인 → (필요하면) 세션 갱신 → (Apple이면)
 * 재인증 → 삭제 요청을 한 함수가 끝까지 집니다. 저장소 · 분석 · 전이는 하지 않습니다(결선의 몫).
 * 거부(reject)하지 않습니다.
 */
export type DeleteAccount = (
  session: AuthSession,
  persistRefreshedSession: PersistRefreshedSession,
) => Promise<AccountDeletionResult>;

// ------------------------------------------------------------------ 순수 함수 모양

/** `expiresAt - nowMs`가 여유(`accessTokenRefreshMarginMs`) 이하이면 `true`입니다. */
export type SessionNeedsRefresh = (session: AuthSession, nowMs: number) => boolean;

/**
 * 액세스 토큰(JWT) payload의 `app_metadata.providers`(문자열 배열)와 `app_metadata.provider`(문자열)를
 * 합친 목록입니다. 중복 없음, 순서는 `providers` 다음 `provider`. JWT가 아니거나 읽을 수 없으면 `[]`.
 * 서명을 검증하지 않습니다 — 접근 판정이 아니라 재인증을 띄울지의 힌트이고, 함수가 다시 확인합니다.
 */
export type AuthProvidersFrom = (accessToken: string) => readonly string[];

/** 목록에 `"apple"`이 있으면 `true`입니다. */
export type RequiresAppleReauthentication = (providers: readonly string[]) => boolean;

/**
 * 삭제 함수의 2xx 밖 상태 → 실패 이유입니다. 401 → `session-expired`, 403 → `apple-unconfirmed`,
 * 나머지 전부 → `unavailable`. 본문은 읽지 않습니다. 연결 실패(0 · 499 · 거부 · 시간 초과)는 이
 * 함수에 오지 않고 전송이 `network`로 삼킵니다.
 */
export type AccountDeletionFailureFrom = (status: number) => AccountDeletionFailure;

/** 삭제 전 갱신 실패 → 삭제 실패입니다. `rejected` → `session-expired`, 나머지는 같은 낱말. */
export type AccountDeletionFailureFromRefresh = (
  reason: Extract<AuthFailureReason, "network" | "unavailable" | "unconfigured" | "rejected">,
) => AccountDeletionFailure;
