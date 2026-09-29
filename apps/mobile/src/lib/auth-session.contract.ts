// 전화번호 로그인(Supabase Auth SMS OTP)의 공용 어휘입니다. 화면 둘(로그인 · 코드 검증) ·
// 결선(`app/`) · `lib/` 셋(`api-client.ts` · `auth-session.ts` · `supabase-config.ts`)이 같은
// 이름을 써서 `lib/`에 둡니다 — 소유 화면이 없는 어휘이기 때문입니다.
//
// 타입만 있습니다. 값(키 문자열 · 제한 시간 · 문구)은 구현 모듈이 가집니다.
//
// **소셜 셋(apple · google · facebook)은 이 어휘 밖입니다** — 지금처럼 `auth-token.ts`의 임시
// 토큰을 씁니다. 두 저장 항목이 공존하는 규칙은 `EntryAuthState`가 집니다.

// ------------------------------------------------------------------ 설정

/**
 * 빌드가 주입하는 Supabase 접속 값입니다. `PUBLIC_SUPABASE_URL` · `PUBLIC_SUPABASE_ANON_KEY`
 * 환경 변수(`apps/mobile/.env.local`, 추적하지 않습니다)에서 옵니다.
 *
 * `anonKey`는 공개 값(anon 또는 publishable)입니다. 비밀 키(service_role · `sb_secret_`)는
 * 이 자리에 올 수 없고, 오면 설정이 없는 것으로 봅니다.
 */
export type SupabaseConfig = {
  /** `https://`로 시작하고 끝 `/`가 없습니다. */
  readonly url: string;
  readonly anonKey: string;
};

// ------------------------------------------------------------------ 전화번호

/**
 * 로그인 화면이 만든 전화번호 한 쌍입니다. 두 값은 늘 함께 다닙니다 — 보여 줄 값과 보낼
 * 값이 갈라지면 코드 화면이 다른 번호를 보여 줄 수 있습니다.
 */
export type PhoneNumber = {
  /** Supabase에 보내는 값입니다. `+`와 숫자만 있습니다(예: `+821012345678`). */
  readonly e164: string;
  /** 코드 화면에 보여 주는 값입니다. 국가 번호와 입력값을 공백 하나로 잇습니다(예: `+82 10 1234 5678`). */
  readonly display: string;
};

// ------------------------------------------------------------------ 세션

/**
 * 검증 · 갱신이 성공하면 저장하는 세션입니다. 저장소에는 이 셋만 들어갑니다 — 사용자
 * 객체 같은 서버 응답의 나머지는 버립니다(ADR-0007 D1).
 */
export type AuthSession = {
  readonly accessToken: string;
  readonly refreshToken: string;
  /** 액세스 토큰이 만료되는 시각(epoch 밀리초)입니다. 응답의 `expires_in`으로 계산합니다. */
  readonly expiresAt: number;
};

/**
 * 스플래시가 끝날 때 저장소를 읽어 고르는 갈래입니다.
 *
 * - `refresh` — 세션이 있습니다. 갱신을 시도합니다. 임시 토큰이 함께 있어도 이쪽입니다.
 * - `temporary` — 세션이 없고 임시 토큰(소셜 셋)이 있습니다. 곧장 앱으로 들어갑니다.
 * - `none` — 둘 다 없습니다. 온보딩부터 시작합니다.
 */
export type EntryAuthState =
  | { readonly kind: "refresh"; readonly refreshToken: string }
  | { readonly kind: "temporary" }
  | { readonly kind: "none" };

/**
 * 갱신이 실패했을 때 저장된 세션을 어떻게 할지입니다. 서버가 거절한 세션만 지웁니다 —
 * 연결 실패로 지우면 다음 실행에서 다시 시도할 기회까지 버립니다.
 */
export type SessionRefreshDisposition = "clear" | "keep";

// ------------------------------------------------------------------ 실패 어휘

/**
 * 요청 하나가 실패한 이유입니다. 화면 문구는 이 값 하나에서만 나옵니다.
 *
 * - `network` — 응답을 받지 못했습니다(연결 실패 · 제한 시간 초과).
 * - `unavailable` — 5xx 이거나, 2xx인데 본문을 읽을 수 없습니다.
 * - `unconfigured` — `SupabaseConfig`가 없습니다. 요청을 보내지 않습니다.
 * - `rate-limited` — 429 이거나 오류 코드가 `over_`로 시작합니다.
 * - `rejected` — 나머지 4xx입니다(OTP 요청 · 갱신).
 * - `invalid-code` — 검증의 나머지 4xx입니다. 틀린 코드와 만료된 코드를 서버가 같은 오류로
 *   돌려주므로 둘을 가르지 않습니다.
 */
export type AuthFailureReason =
  | "network"
  | "unavailable"
  | "unconfigured"
  | "rate-limited"
  | "rejected"
  | "invalid-code";

/** OTP 요청(로그인 제출 · 재전송)이 낼 수 있는 실패입니다. */
export type PhoneOtpRequestFailure = Exclude<AuthFailureReason, "invalid-code">;

/** 코드 검증이 낼 수 있는 실패입니다. */
export type PhoneOtpVerifyFailure = Exclude<AuthFailureReason, "rejected">;

/** 세션 갱신이 낼 수 있는 실패입니다. 화면에 문구로 서지 않습니다. */
export type SessionRefreshFailure = Exclude<AuthFailureReason, "rate-limited" | "invalid-code">;

/** 코드 검증 화면이 그리는 실패입니다 — 검증과 재전송 둘 다 이 화면에서 실패합니다. */
export type VerificationCodeFailure = PhoneOtpRequestFailure | PhoneOtpVerifyFailure;

// ------------------------------------------------------------------ api-client 결과

/** `requestPhoneOtp`의 결과입니다. 던지지 않고 늘 이 둘 중 하나로 끝납니다. */
export type PhoneOtpRequestResult =
  | { readonly status: "sent" }
  | { readonly status: "failed"; readonly reason: PhoneOtpRequestFailure };

export type PhoneOtpVerifyRequest = {
  readonly phone: PhoneNumber;
  /** 숫자만, 길이는 코드 길이 그대로입니다. */
  readonly code: string;
};

/** `verifyPhoneOtp`의 결과입니다. 세션을 싣습니다 — 화면에는 내려가지 않습니다. */
export type PhoneOtpVerifyResult =
  | { readonly status: "verified"; readonly session: AuthSession }
  | { readonly status: "failed"; readonly reason: PhoneOtpVerifyFailure };

/** 코드 화면이 받는 검증 결과입니다. 세션은 결선이 저장하고 여기에는 싣지 않습니다. */
export type PhoneOtpVerifyOutcome =
  | { readonly status: "verified" }
  | { readonly status: "failed"; readonly reason: PhoneOtpVerifyFailure };

/** `refreshAuthSession`의 결과입니다. */
export type SessionRefreshResult =
  | { readonly status: "refreshed"; readonly session: AuthSession }
  | { readonly status: "failed"; readonly reason: SessionRefreshFailure };

/** `lib/api-client.ts`가 내보내는 세 함수의 모양입니다. 셋 다 던지지 않습니다. */
export type RequestPhoneOtp = (phone: PhoneNumber) => Promise<PhoneOtpRequestResult>;
export type VerifyPhoneOtp = (request: PhoneOtpVerifyRequest) => Promise<PhoneOtpVerifyResult>;
export type RefreshAuthSession = (refreshToken: string) => Promise<SessionRefreshResult>;

// ------------------------------------------------------------------ 전송 경계

/** 실패를 가를 때 어느 요청이었는지입니다 — 같은 4xx가 요청마다 다른 이유가 됩니다. */
export type AuthOperation = "request-otp" | "verify-otp" | "refresh-session";

/**
 * `api-client.ts`가 쓰는 전송 함수의 모양입니다. Lynx의 `fetch`는 웹 `fetch`의 부분집합이라
 * (ADR-0007 D2) 이 모양이 쓰는 표면만 적습니다 — `POST` · 문자열 헤더 · 문자열 본문 ·
 * `status` · `text()`입니다. `URL` · `Headers` 생성자 · `AbortController`를 쓰지 않습니다.
 */
export type HttpRequestInit = {
  readonly method: "POST";
  readonly headers: Readonly<Record<string, string>>;
  readonly body: string;
};

export type HttpResponseLike = {
  readonly status: number;
  text(): Promise<string>;
};

export type HttpTransport = (url: string, init: HttpRequestInit) => Promise<HttpResponseLike>;

// ------------------------------------------------------------------ Supabase Auth REST 스키마

/** `url` 뒤에 붙는 경로입니다. 세 요청 모두 `POST`입니다. */
export type SupabaseAuthPath =
  | "/auth/v1/otp"
  | "/auth/v1/verify"
  | "/auth/v1/token?grant_type=refresh_token";

/** `POST /auth/v1/otp` 본문입니다. 성공 응답(200)의 본문은 읽지 않습니다. */
export type SupabaseOtpRequestBody = {
  readonly phone: string;
  readonly channel: "sms";
  readonly create_user: true;
};

/** `POST /auth/v1/verify` 본문입니다. */
export type SupabaseVerifyRequestBody = {
  readonly type: "sms";
  readonly phone: string;
  readonly token: string;
};

/** `POST /auth/v1/token?grant_type=refresh_token` 본문입니다. */
export type SupabaseRefreshRequestBody = {
  readonly refresh_token: string;
};

/**
 * 검증 · 갱신 성공(200) 본문에서 **읽는** 필드입니다. 나머지(`user` · `expires_at` 등)는
 * 읽지 않습니다. 런타임 판정은 `api-client.ts`의 파서가 지고, 하나라도 모양이 다르면
 * `unavailable`입니다.
 */
export type SupabaseSessionResponseBody = {
  readonly access_token: string;
  readonly refresh_token: string;
  /** 초 단위, 0보다 큰 정수입니다. */
  readonly expires_in: number;
};

/**
 * 실패(4xx · 5xx) 본문에서 읽는 필드는 `error_code` 하나입니다. 문자열이 아니거나 없으면
 * `null`로 봅니다 — 옛 응답 모양(`error` · `error_description`)도 같은 취급입니다.
 */
export type SupabaseErrorCode = string | null;
