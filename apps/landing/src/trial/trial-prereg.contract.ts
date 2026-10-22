// 완료 화면 사전 등록의 순수 입출력 · 접점입니다. 이메일은 DB(PostgREST `pre_registrations`)에만 가고
// 분석 · 낭독 · 로그에는 싣지 않습니다 — 이벤트는 결과(`PreregOutcome`)만 압니다.

/** 빌드 때 정한 보낼 곳 — `<PUBLIC_SUPABASE_URL>/rest/v1/pre_registrations`와 공개 키. */
export type TrialPreregConfig = { readonly endpoint: string; readonly apiKey: string };
export type PreregLocale = "en" | "ko";
/** 응답 해석 — 중복은 남에게 등록 여부를 알리지 않게 화면에서 완료와 같다. */
export type PreregOutcome = "submitted" | "duplicate" | "failed";
export type PreregStatus = "idle" | "invalid" | "sending" | "done" | "failed" | "unavailable";
export type PreregEvent =
  | { readonly type: "submit"; readonly valid: boolean }
  | { readonly type: "result"; readonly outcome: PreregOutcome };

export type PreregRequest = {
  readonly url: string;
  readonly init: {
    readonly method: "POST";
    readonly headers: Readonly<Record<string, string>>;
    readonly body: string;
    readonly credentials: "omit";
  };
};

/** 앞뒤 공백을 걷고 소문자로. */
export type NormalizeEmail = (raw: string) => string;
/** 정규화된 값의 형식 — `x@y.zz` 꼴 · 254자 이하. */
export type IsValidEmail = (normalized: string) => boolean;
/** `apikey` · `Content-Type` · `Prefer: return=minimal`, 몸 `{email, locale, source: "web-trial"}`. Authorization 없음. */
export type PreregRequestOf = (
  config: TrialPreregConfig,
  email: string,
  locale: PreregLocale,
) => PreregRequest;
/** HTTP 상태(또는 "network") → 결과. 2xx → submitted, 409 → duplicate, 그 밖 → failed. */
export type PreregOutcomeOf = (status: number | "network") => PreregOutcome;
/** 바뀔 것이 없으면 같은 값. */
export type ReducePrereg = (status: PreregStatus, event: PreregEvent) => PreregStatus;
/** env 원문 → 설정. key 빈 값 + 비프로덕션 · url 빈 값 → null, key 빈 값 + 프로덕션 · 모양 틀림 → 던진다. */
export type ResolvePreregConfig = (
  url: string | undefined,
  key: string | undefined,
  production: boolean,
) => TrialPreregConfig | null;

export interface TrialPreregPort {
  /** 던지지 않는다 — 네트워크 · 상한 시간 · 그 밖 실패는 "failed". */
  submit(email: string, locale: PreregLocale): Promise<PreregOutcome>;
}
export type CreateTrialPrereg = (
  fetchFn: typeof fetch,
  config: TrialPreregConfig,
  timeoutMs?: number,
) => TrialPreregPort;
