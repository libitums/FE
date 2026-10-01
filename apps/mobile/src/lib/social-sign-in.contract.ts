// 소셜 로그인(Supabase OAuth + PKCE)의 공용 어휘입니다. 호스트 접점(`web-authentication.ts`) ·
// PKCE(`pkce.ts`) · 흐름(`social-sign-in.ts`) · `api-client.ts`의 교환 · 결선(`app/`) · 로그인
// 화면이 같은 이름을 써서 `lib/`에 둡니다 — 소유 화면이 하나로 정해지지 않는 어휘입니다.
//
// 타입만 있습니다. 값(리다이렉트 주소 · 바이트 수 · 문구)은 구현 모듈이 가집니다.
//
// 세션 · 실패 어휘의 뿌리는 `auth-session.contract.ts`입니다. 소셜로 받은 세션은 전화번호와
// **같은 `AuthSession`이고 같은 키에 저장됩니다** — 저장 · 갱신 경로가 하나입니다.

import type { AuthFailureReason, AuthSession } from "./auth-session.contract";

// ------------------------------------------------------------------ 제공자 · 리다이렉트

/**
 * Supabase `/auth/v1/authorize`의 `provider` 값입니다. 로그인 화면의 수단 이름과 철자가
 * 같지만 다른 어휘입니다 — 둘을 잇는 것은 `social-sign-in.ts`의 망라 `switch` 하나입니다.
 */
export type SupabaseOAuthProvider = "apple" | "google" | "facebook";

/**
 * 웹 OAuth(authorize → 인증 창 → PKCE 교환)를 타는 제공자입니다. Apple은 네이티브 시트가
 * 없는 Android 호스트에서 이 경로를 탑니다.
 */
export type WebOAuthProvider = SupabaseOAuthProvider;

/**
 * iOS 웹 인증 세션은 이 스킴을 창 안에서 가로채므로 Info.plist에 등록하지 않습니다.
 * Android는 브라우저 리다이렉트를 받기 위해 manifest에 등록합니다(ADR-0038).
 */
export type OAuthCallbackScheme = "duru";

/** `redirect_to`에 싣는 값입니다. Supabase 대시보드의 리다이렉트 허용 목록에 같은 문자열이 있어야 합니다. */
export type OAuthRedirectUrl = `${OAuthCallbackScheme}://auth-callback`;

// ------------------------------------------------------------------ PKCE

/**
 * 한 번의 로그인 시도에서만 사는 PKCE 한 쌍입니다. **저장하지 않습니다** — 흐름 함수의
 * 지역 변수로만 살고, 화면 · 결선 · 저장소 어디에도 내려가지 않습니다.
 */
export type PkcePair = {
  /** RFC 7636의 `code_verifier`입니다. 32바이트 난수의 base64url(패딩 없음), 43자입니다. */
  readonly verifier: string;
  /** `base64url(SHA-256(verifier))`입니다. 방식은 늘 `s256`입니다. */
  readonly challenge: string;
};

// ------------------------------------------------------------------ 호스트 접점

/**
 * 호스트가 `WebAuthenticationModule`이라는 이름으로 등록합니다(iOS
 * `ASWebAuthenticationSession`, Android Custom Tab). 메서드는 둘입니다.
 *
 * - `start` — 인증 창을 열고, 창이 닫힐 때 **정확히 한 번** 콜백합니다.
 * - `randomBytes` — 암호학적 난수 `count`바이트를 소문자 16진 문자열로 **동기** 반환합니다.
 *   Lynx 런타임에 `crypto.getRandomValues`가 없어서 호스트가 집니다. 실패하면 빈 문자열입니다.
 *
 * 브리지를 건너온 값은 믿지 않으므로 반환 · 페이로드를 `unknown`으로 둡니다.
 */
export interface WebAuthenticationModule {
  start(args: Record<string, unknown>, callback: (payload: unknown) => void): void;
  randomBytes(count: number): unknown;
}

/** `start`에 넘기는 것입니다. 호스트가 읽는 키가 이 둘뿐입니다. */
export type WebAuthenticationRequest = {
  /** `https://`로 시작하는 authorize 주소입니다. 아니면 호스트가 `invalid-arguments`로 답합니다. */
  readonly url: string;
  readonly callbackScheme: OAuthCallbackScheme;
};

/**
 * 인증 창 한 번의 결과입니다. `malformed`만 JS에서 생깁니다 — 페이로드가 아는 모양이
 * 아닐 때입니다.
 *
 * - `completed` — 창이 콜백 스킴으로 돌아왔습니다. 성공인지는 `callbackUrl`을 읽어야 압니다.
 * - `cancelled` — 사용자가 창(또는 시스템 확인 알림)을 닫았습니다.
 * - `failed` — 창을 띄우지 못했거나 시스템이 다른 오류를 냈습니다.
 * - `already-active` — 이미 열린 창이 있습니다.
 * - `invalid-arguments` — `url` · `callbackScheme`이 모양이 아닙니다.
 */
export type WebAuthenticationResult =
  | { readonly status: "completed"; readonly callbackUrl: string }
  | { readonly status: "cancelled" }
  | { readonly status: "failed" }
  | { readonly status: "already-active" }
  | { readonly status: "invalid-arguments" }
  | { readonly status: "malformed" };

/**
 * 요청이 건너갔는가입니다. `unavailable`이면 모듈이 없고(Lynx Explorer · 테스트) 콜백은
 * 오지 않습니다 — `speech-recognition.ts`의 `SpeechRequestOutcome`과 같은 모양입니다.
 */
export type WebAuthenticationRequestOutcome = "requested" | "unavailable";

// ------------------------------------------------------------------ 콜백 URL

/**
 * 콜백 URL을 읽은 결과입니다. 쿼리와 프래그먼트를 모두 읽고, `error`가 있으면 `code`보다
 * 앞섭니다.
 */
export type OAuthCallback =
  | { readonly kind: "code"; readonly code: string }
  | { readonly kind: "error"; readonly error: string }
  | { readonly kind: "malformed" };

// ------------------------------------------------------------------ 실패 · 결과

/**
 * 소셜 로그인이 낼 수 있는 실패입니다. 앞의 넷은 전화번호와 같은 뜻이고, 뒤의 둘이 소셜에만
 * 있습니다. **취소는 실패가 아닙니다** — `SocialSignInResult`의 `cancelled`입니다.
 *
 * - `sign-in-incomplete` — 콜백이 `error`를 실었거나 `code`가 없거나, 교환이 4xx로 거절됐습니다.
 * - `unsupported` — 이 환경에서 이 수단을 쓸 수 없습니다(호스트 모듈 없음 · 난수 실패 · 창을
 *   띄우지 못함 · Apple 시트 오류). Apple의 네이티브 시트도 같은 이유를 씁니다.
 */
export type SocialSignInFailure =
  | Extract<AuthFailureReason, "network" | "unavailable" | "unconfigured" | "rate-limited">
  | "sign-in-incomplete"
  | "unsupported";

/** PKCE 교환(`/auth/v1/token?grant_type=pkce`)이 낼 수 있는 실패입니다. */
export type PkceExchangeFailure = Exclude<SocialSignInFailure, "unsupported">;

export type PkceExchangeRequest = {
  /** 콜백 URL의 `code`입니다. */
  readonly authCode: string;
  readonly codeVerifier: string;
};

/** `exchangePkceCode`의 결과입니다. 던지지 않습니다. */
export type PkceExchangeResult =
  | { readonly status: "exchanged"; readonly session: AuthSession }
  | { readonly status: "failed"; readonly reason: PkceExchangeFailure };

export type ExchangePkceCode = (request: PkceExchangeRequest) => Promise<PkceExchangeResult>;

/**
 * ID 토큰 교환(`/auth/v1/token?grant_type=id_token`)이 낼 수 있는 실패입니다. 판정 규칙이 PKCE
 * 교환과 같습니다(429 · `over_*` → `rate-limited`, 5xx → `unavailable`, 4xx → `sign-in-incomplete`).
 */
export type IdTokenExchangeFailure = PkceExchangeFailure;

/** Apple 네이티브 로그인이 받은 것을 Supabase 세션으로 바꾸는 입력입니다. 제공자는 늘 `apple`입니다. */
export type IdTokenExchangeRequest = {
  /** `AppleSignInResult`의 `identityToken`입니다. */
  readonly idToken: string;
  /** `AppleNoncePair.raw`입니다 — 해시가 아니라 원본입니다. */
  readonly nonce: string;
};

/** `exchangeIdToken`의 결과입니다. 던지지 않습니다. */
export type IdTokenExchangeResult =
  | { readonly status: "exchanged"; readonly session: AuthSession }
  | { readonly status: "failed"; readonly reason: IdTokenExchangeFailure };

export type ExchangeIdToken = (request: IdTokenExchangeRequest) => Promise<IdTokenExchangeResult>;

/** 소셜 로그인 한 번의 결과입니다. 세션을 싣습니다 — 결선이 저장하고 화면에는 내려가지 않습니다. */
export type SocialSignInResult =
  | { readonly status: "signed-in"; readonly session: AuthSession }
  | { readonly status: "cancelled" }
  | { readonly status: "failed"; readonly reason: SocialSignInFailure };

/** 로그인 화면이 받는 결과입니다. `signed-in`이면 결선이 이미 다음 화면으로 옮겼습니다. */
export type SocialSignInOutcome =
  | { readonly status: "signed-in" }
  | { readonly status: "cancelled" }
  | { readonly status: "failed"; readonly reason: SocialSignInFailure };

/**
 * `social-sign-in.ts`의 흐름 함수 모양입니다. 제공자가 무엇으로 로그인하는지(웹 OAuth인지
 * 네이티브인지)를 호출자가 모르게 합니다. 던지지 않습니다.
 */
export type SignInWithSocialProvider = (
  provider: SupabaseOAuthProvider,
) => Promise<SocialSignInResult>;

// ------------------------------------------------------------------ Supabase Auth REST 스키마

/**
 * `GET /auth/v1/authorize`의 쿼리입니다. 이 주소는 앱이 부르지 않고 인증 창이 엽니다.
 * 키 순서는 이 타입의 순서로 고정하고, 값은 전부 `encodeURIComponent`를 거칩니다.
 */
export type SupabaseAuthorizeQuery = {
  readonly provider: WebOAuthProvider;
  readonly redirect_to: OAuthRedirectUrl;
  readonly code_challenge: string;
  readonly code_challenge_method: "s256";
};

/** `POST /auth/v1/token?grant_type=pkce` 본문입니다. 성공 본문은 `SupabaseSessionResponseBody`와 같습니다. */
export type SupabasePkceTokenRequestBody = {
  readonly auth_code: string;
  readonly code_verifier: string;
};

/**
 * `POST /auth/v1/token?grant_type=id_token` 본문입니다. 키는 이 셋뿐입니다 — `access_token` ·
 * `client_id` · `issuer`는 싣지 않습니다. 성공 본문은 `SupabaseSessionResponseBody`와 같습니다.
 */
export type SupabaseIdTokenRequestBody = {
  readonly provider: "apple";
  readonly id_token: string;
  /** 원본 nonce입니다. 서버가 SHA-256 16진으로 바꿔 ID 토큰의 `nonce` 클레임과 맞춰 봅니다. */
  readonly nonce: string;
};
