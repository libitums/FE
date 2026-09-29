// 네이티브 Sign in with Apple의 호스트 접점 어휘입니다. 호스트 `AppleSignInModule`
// (`ASAuthorizationAppleIDProvider`)이 ID 토큰을 받아 오고, 흐름(`social-sign-in.ts`)이 그 토큰을
// Supabase `grant_type=id_token` 교환에 넘깁니다(ADR-0028).
//
// 타입만 있습니다. 값(바이트 수)과 판정은 `apple-sign-in.ts`가 가집니다. 교환 요청 · 결과의
// 타입은 다른 교환과 함께 `social-sign-in.contract.ts`에 있습니다.

// ------------------------------------------------------------------ nonce

/**
 * 한 번의 Apple 로그인 시도에서만 사는 nonce 한 쌍입니다. **저장하지 않습니다** — 흐름 함수의
 * 지역 변수로만 삽니다(PKCE의 `PkcePair`와 같은 수명).
 */
export type AppleNoncePair = {
  /** Supabase 교환 본문의 `nonce`입니다. 32바이트 난수의 base64url(패딩 없음), 43자입니다. */
  readonly raw: string;
  /** Apple 요청에 싣는 값입니다. `raw`의 ASCII 바이트를 SHA-256한 **소문자 16진 64자**입니다. */
  readonly hashed: string;
};

// ------------------------------------------------------------------ 호스트 접점

/**
 * 호스트가 `AppleSignInModule`이라는 이름으로 등록합니다. 메서드는 하나입니다.
 *
 * - `start` — 시스템 Apple 로그인 시트를 열고, 시트가 끝날 때 **정확히 한 번** 콜백합니다.
 *
 * 난수는 이 모듈이 아니라 `WebAuthenticationModule.randomBytes`가 집니다(메서드를 늘리지
 * 않습니다). 브리지를 건너온 값은 믿지 않으므로 페이로드를 `unknown`으로 둡니다.
 */
export interface AppleSignInModule {
  start(args: Record<string, unknown>, callback: (payload: unknown) => void): void;
}

/** `start`에 넘기는 것입니다. 호스트가 읽는 키가 이것 하나뿐입니다. */
export type AppleSignInRequest = {
  /** `AppleNoncePair.hashed`입니다. `^[0-9a-f]{64}$`가 아니면 호스트가 `invalid-arguments`로 답합니다. */
  readonly nonce: string;
};

/**
 * Apple 로그인 시트 한 번의 결과입니다. `WebAuthenticationResult`와 같은 낱말을 씁니다.
 * `malformed`만 JS에서 생깁니다 — 페이로드가 아는 모양이 아닐 때입니다.
 *
 * - `completed` — Apple이 자격을 내줬습니다. `identityToken`은 ID 토큰(JWT) 문자열입니다.
 * - `cancelled` — 사용자가 시트를 닫았습니다(`ASAuthorizationError.canceled`).
 * - `failed` — 그 밖의 오류, 또는 자격에 ID 토큰이 없습니다(권한 없는 빌드 포함).
 * - `already-active` — 이미 열린 시트가 있습니다.
 * - `invalid-arguments` — `nonce`가 모양이 아닙니다.
 */
export type AppleSignInResult =
  | { readonly status: "completed"; readonly identityToken: string }
  | { readonly status: "cancelled" }
  | { readonly status: "failed" }
  | { readonly status: "already-active" }
  | { readonly status: "invalid-arguments" }
  | { readonly status: "malformed" };

/**
 * 요청이 건너갔는가입니다. `unavailable`이면 모듈이 없고(Lynx Explorer · 테스트) 콜백은
 * 오지 않습니다 — `WebAuthenticationRequestOutcome`과 같은 모양입니다.
 */
export type AppleSignInRequestOutcome = "requested" | "unavailable";
