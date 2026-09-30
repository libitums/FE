// 계정 삭제 Edge Function(`delete-account`)의 어휘입니다. 로직은 런타임 중립 TypeScript(`fetch` ·
// `Request` · `Response` · WebCrypto · `TextEncoder`만)라 Deno(배포)와 Node(vitest · tsc)에서 같은
// 코드가 돕니다. Deno 전용 API(`Deno.serve` · `Deno.env`)는 진입 파일 `delete-account/index.ts`만
// 씁니다. 이 폴더(`_shared`)의 import는 Deno 규칙대로 **확장자 `.ts`를 붙입니다**.
//
// 타입만 있습니다. 값(엔드포인트 · 제한 시간 · 수명)은 구현 모듈이 가집니다.
//
// 앱(`apps/mobile/src/lib/account.contract.ts`)과 공유하는 것은 요청 본문 모양 하나입니다 — 앱은 오류
// 코드를 읽지 않고 상태 코드만 가릅니다.

// ------------------------------------------------------------------ HTTP 계약

/**
 * `POST /functions/v1/delete-account`, `Authorization: Bearer <사용자 액세스 토큰>`,
 * `Content-Type: application/json`. 키는 하나이고 **반드시 있습니다** — 값은 비지 않은 문자열 또는
 * `null`. 빈 문자열 · 다른 타입 · 키 없음 · JSON 아님은 `invalid_body`입니다. 모르는 키는 무시합니다.
 */
export type DeleteAccountRequestBody = {
  readonly apple_authorization_code: string | null;
};

/** 오류 응답 본문입니다(`Content-Type: application/json`). 성공(204)은 본문이 없습니다. */
export type DeleteAccountErrorCode =
  | "method_not_allowed"
  | "server_misconfigured"
  | "missing_authorization"
  | "invalid_session"
  | "auth_unavailable"
  | "invalid_body"
  | "apple_authorization_code_required"
  | "apple_exchange_failed"
  | "apple_account_mismatch"
  | "apple_revoke_failed"
  | "delete_failed";

export type DeleteAccountErrorBody = { readonly error: DeleteAccountErrorCode };

/**
 * 한 요청의 결말입니다. 상태 코드와 오류 코드의 짝이 이 union으로 닫힙니다. CORS 헤더는 내지
 * 않습니다 — 호출자는 앱의 네이티브 `fetch`뿐이고 브라우저 호출을 지원하지 않습니다(`OPTIONS`도 405).
 */
export type DeleteAccountOutcome =
  | { readonly status: 204 }
  | { readonly status: 405; readonly error: "method_not_allowed" }
  | { readonly status: 401; readonly error: "missing_authorization" | "invalid_session" }
  | { readonly status: 400; readonly error: "invalid_body" | "apple_authorization_code_required" }
  | { readonly status: 403; readonly error: "apple_account_mismatch" }
  | {
      readonly status: 502;
      readonly error: "auth_unavailable" | "apple_exchange_failed" | "apple_revoke_failed";
    }
  | { readonly status: 500; readonly error: "server_misconfigured" | "delete_failed" };

/** 결말 → `Response`. 204는 `null` 본문, 405는 `Allow: POST` 헤더를 더합니다. 순수합니다. */
export type DeleteAccountResponse = (outcome: DeleteAccountOutcome) => Response;

// ------------------------------------------------------------------ 환경

export type DeleteAccountEnvName =
  | "SUPABASE_URL"
  | "SUPABASE_ANON_KEY"
  | "SUPABASE_SERVICE_ROLE_KEY"
  | "APPLE_TEAM_ID"
  | "APPLE_KEY_ID"
  | "APPLE_CLIENT_ID"
  | "APPLE_PRIVATE_KEY";

/** Sign in with Apple 서버 호출의 자격입니다. 넷이 함께 있거나 함께 없습니다. */
export type AppleClientConfig = {
  readonly teamId: string;
  readonly keyId: string;
  /** 네이티브 앱이면 번들 ID(`com.libitum.host`)입니다. */
  readonly clientId: string;
  /** `.p8` 파일 내용(PKCS#8 PEM) 그대로입니다. 줄바꿈이 `\n` 두 글자로 들어와도 받습니다. */
  readonly privateKeyPem: string;
};

/**
 * - Supabase 셋(런타임 기본 제공)이 하나라도 비면 환경 전체가 `null` → 모든 요청이 500.
 * - Apple 넷 중 하나라도 비면 `apple`이 `null` → Apple 사용자만 500(다른 사용자는 지울 수 있습니다).
 * - 값은 앞뒤 공백을 걷고, `supabaseUrl`은 끝 `/`를 뗍니다. `https://`로 시작하지 않으면 `null`.
 */
export type DeleteAccountEnv = {
  readonly supabaseUrl: string;
  readonly supabaseAnonKey: string;
  readonly supabaseServiceRoleKey: string;
  readonly apple: AppleClientConfig | null;
};

export type EnvReader = (name: DeleteAccountEnvName) => string | undefined;
export type DeleteAccountEnvFrom = (read: EnvReader) => DeleteAccountEnv | null;

// ------------------------------------------------------------------ 바깥 호출 경계

/** 핸들러가 쓰는 전송의 모양입니다. 진입 파일이 제한 시간을 건 `fetch`를 넘깁니다. */
export type OutboundRequest = {
  readonly url: string;
  readonly method: "GET" | "POST" | "DELETE";
  readonly headers: Readonly<Record<string, string>>;
  /** `GET` · `DELETE`는 `null`입니다. */
  readonly body: string | null;
};

export type OutboundResponse = {
  readonly status: number;
  text(): Promise<string>;
};

/** 연결 실패 · 제한 시간 초과는 거부(reject)로 옵니다. 핸들러가 삼킵니다. */
export type Outbound = (request: OutboundRequest) => Promise<OutboundResponse>;

/** `fetch`에 호출마다 제한 시간(`AbortSignal.timeout`)을 걸어 `Outbound`로 바꿉니다. */
export type TimedOutbound = (fetchImpl: typeof fetch, timeoutMs: number) => Outbound;

// ------------------------------------------------------------------ Supabase Auth

/**
 * `GET {url}/auth/v1/user`(apikey = anon, Bearer = 사용자 토큰) 200 본문에서 읽는 것입니다.
 * `apple`은 `identities[]` 가운데 `provider === "apple"`인 항목이 있을 때만 서고, `subject`는 그 항목의
 * `identity_data.sub` → 없으면 `id`(문자열)입니다. 둘 다 없거나 최상위 `id`가 없으면 파싱 실패.
 */
export type AuthUserSummary = {
  readonly id: string;
  readonly apple: { readonly subject: string } | null;
};

/** `Bearer <토큰>`(스킴 대소문자 무시, 앞뒤 공백 무시)만 토큰, 나머지 `null`. */
export type BearerTokenFrom = (authorization: string | null) => string | null;
export type AuthUserRequest = (env: DeleteAccountEnv, accessToken: string) => OutboundRequest;
export type AuthUserSummaryFrom = (bodyText: string) => AuthUserSummary | null;

/**
 * `DELETE {url}/auth/v1/admin/users/{encodeURIComponent(id)}`, apikey · Bearer = service role, 본문 없음
 * (하드 삭제 — `should_soft_delete`를 싣지 않습니다). 2xx · 404 → 성공(이미 없음).
 */
export type AdminDeleteUserRequest = (env: DeleteAccountEnv, userId: string) => OutboundRequest;

// ------------------------------------------------------------------ Apple

export type AppleTokenEndpoint = "https://appleid.apple.com/auth/token";
export type AppleRevokeEndpoint = "https://appleid.apple.com/auth/revoke";

/** client secret(JWT)의 헤더입니다. 키 순서가 곧 직렬화 순서입니다. */
export type AppleClientSecretHeader = { readonly alg: "ES256"; readonly kid: string };

/** client secret의 클레임입니다. 수명은 300초(`exp = iat + 300`), `iat`은 초 단위 내림. */
export type AppleClientSecretClaims = {
  readonly iss: string;
  readonly iat: number;
  readonly exp: number;
  readonly aud: "https://appleid.apple.com";
  readonly sub: string;
};

/** `-----BEGIN PRIVATE KEY-----` PEM → PKCS#8 DER 바이트. `EC PRIVATE KEY`(SEC1) · 깨진 base64는 `null`. */
export type PemToPkcs8 = (pem: string) => Uint8Array | null;

/** `base64url(JSON(header)) + "." + base64url(JSON(claims))` — 패딩 없음, UTF-8. */
export type JwtSigningInput = (
  header: AppleClientSecretHeader,
  claims: AppleClientSecretClaims,
) => string;

/**
 * WebCrypto ECDSA P-256 / SHA-256 서명입니다. 결과는 IEEE P1363(`r‖s`, 64바이트)이라 JWS에 그대로
 * 씁니다(DER 변환 없음). 키를 못 읽으면 `null`. 거부하지 않습니다.
 */
export type SignEs256 = (pkcs8: Uint8Array, signingInput: string) => Promise<Uint8Array | null>;

/** 서명까지 마친 client secret입니다. PEM · 서명 실패는 `null` → 핸들러가 500. */
export type AppleClientSecretFor = (
  config: AppleClientConfig,
  nowMs: number,
  sign: SignEs256,
) => Promise<string | null>;

/**
 * 코드 교환 요청입니다. `POST`, `Content-Type: application/x-www-form-urlencoded`, 본문 키 순서
 * `client_id` · `client_secret` · `code` · `grant_type=authorization_code`(`redirect_uri` 없음 —
 * 네이티브 앱의 코드).
 */
export type AppleTokenRequest = (
  config: AppleClientConfig,
  clientSecret: string,
  authorizationCode: string,
) => OutboundRequest;

/**
 * 철회 요청입니다. 본문 키 순서 `client_id` · `client_secret` · `token` ·
 * `token_type_hint=refresh_token`. 200 → 성공, 그 밖 → 실패.
 */
export type AppleRevokeRequest = (
  config: AppleClientConfig,
  clientSecret: string,
  refreshToken: string,
) => OutboundRequest;

/** 교환 200 본문에서 읽는 것입니다. `refresh_token`이 비지 않은 문자열이 아니면 파싱 실패. */
export type AppleTokenExchange = {
  readonly refreshToken: string;
  /** `id_token` payload의 `sub`입니다. 읽을 수 없으면 `null` → 계정 대조 실패(403). */
  readonly subject: string | null;
};

export type AppleTokenExchangeFrom = (bodyText: string) => AppleTokenExchange | null;

// ------------------------------------------------------------------ 핸들러

/** 요청마다 한 줄입니다. 토큰 · 코드 · 사용자 ID · 이메일을 싣지 않습니다. */
export type DeleteAccountLogEntry = {
  readonly event: "delete-account";
  readonly status: DeleteAccountOutcome["status"];
  readonly error: DeleteAccountErrorCode | null;
};

export type DeleteAccountDeps = {
  readonly env: DeleteAccountEnv | null;
  readonly outbound: Outbound;
  readonly nowMs: () => number;
  readonly signEs256: SignEs256;
  readonly log: (entry: DeleteAccountLogEntry) => void;
};

/**
 * 순서: 메서드(405) → 환경(500) → Bearer(401) → 사용자 조회(401 · 502) → 본문(400) →
 * [Apple 사용자: Apple 환경(500) → 코드 있음(400) → client secret(500) → 교환(502) → 계정 대조(403) →
 * 철회(502)] → admin 삭제(500) → 204. Apple 사용자가 아니면 코드가 와도 Apple을 부르지 않습니다.
 * 거부하지 않습니다 — 예상 밖 예외도 500 `delete_failed`로 끝냅니다.
 */
export type HandleDeleteAccount = (request: Request) => Promise<Response>;
export type CreateDeleteAccountHandler = (deps: DeleteAccountDeps) => HandleDeleteAccount;

/** 본문 텍스트 → 본문. 규칙은 `DeleteAccountRequestBody` 주석. */
export type DeleteAccountBodyFrom = (bodyText: string) => DeleteAccountRequestBody | null;
