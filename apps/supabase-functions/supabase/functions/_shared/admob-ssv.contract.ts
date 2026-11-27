// AdMob 보상형 광고 서버 검증(SSV) 콜백의 계약 — 쿼리 · 환경 · 키 · 처리기 의존성(ADR-0208). 타입만 둡니다.
// Google이 광고를 끝까지 본 사용자마다 GET 한 번을 보냅니다. 서명을 Google 공개키로 확인한 뒤에만
// `public.ad_ticket_grant`를 부릅니다 — 티켓 1장 지급 판정(스위치 · 대상 · 하루 상한 · 거래 멱등)은 DB가 합니다.

import type { Outbound } from "./delete-account.contract.ts";

/** 콜백 쿼리에서 읽는 값입니다. `signedContent`는 `signature=` 앞까지의 원문(서명 대상)입니다. */
export type AdmobSsvQuery = {
  readonly adUnit: string;
  /** 앱이 실은 「광고 시작」 요청 id(`ad_ticket_start`가 발급한 uuid)입니다. */
  readonly customData: string;
  readonly keyId: string;
  readonly transactionId: string;
  /** 앱이 실은 Supabase 사용자 id입니다. */
  readonly userId: string;
  readonly signature: string;
  readonly signedContent: string;
};

/** 쿼리 문자열(앞 `?` 없이)을 읽습니다. 필수 값이 없거나 순서가 어긋나면(서명 · key_id가 끝이 아님) `null`. */
export type ParseAdmobSsvQuery = (rawQuery: string) => AdmobSsvQuery | null;

/** SPKI DER(base64) 공개키로 서명(base64url DER ECDSA)을 확인합니다. 던지지 않습니다. */
export type VerifyAdmobSignature = (
  signedContent: string,
  signature: string,
  publicKeyBase64: string,
) => Promise<boolean>;

/** key_id → 공개키(SPKI DER base64). 모르면 `null`, 키 목록을 못 읽으면 거부(reject)합니다. */
export type AdmobKeys = { readonly keyFor: (keyId: string) => Promise<string | null> };

export type CreateAdmobKeys = (deps: {
  readonly outbound: Outbound;
  readonly nowMs: () => number;
  readonly url?: string;
  /** 키 목록을 다시 읽기 전 기다리는 시간입니다. 기본 24시간. */
  readonly ttlMs?: number;
  /** 모르는 key_id로 다시 읽기 전 기다리는 시간입니다. 기본 1분 — 아무나 부를 수 있는 주소라 Google 호출을 늘리지 않게. */
  readonly minReloadMs?: number;
}) => AdmobKeys;

export type AdmobSsvEnvName = "SUPABASE_URL" | "SUPABASE_SERVICE_ROLE_KEY" | "ADMOB_AD_UNIT_IDS";

export type AdmobSsvEnv = {
  readonly supabaseUrl: string;
  readonly supabaseServiceRoleKey: string;
  /**
   * 받을 광고 단위 id 목록(쉼표, 콜백 `ad_unit` 값 — 광고 단위 id의 `/` 뒤 숫자). **필수** — 비면 환경이 null(500). Google SSV 공개키는
   * 모든 게시자가 함께 쓰므로, 남의 광고 단위 콜백을 우리 주소로 돌려 티켓을 받지 못하게 합니다.
   */
  readonly adUnitIds: readonly string[];
};

export type AdmobSsvEnvFrom = (
  read: (name: AdmobSsvEnvName) => string | undefined,
) => AdmobSsvEnv | null;

/** DB가 낸 결과입니다(`public.ad_ticket_grant`). */
export type AdTicketGrantOutcome =
  | "granted"
  | "duplicate"
  | "unknown_request"
  | "expired"
  | "already_granted"
  | "off"
  | "anonymous"
  | "new_account"
  | "subscribed"
  | "limit";

/** 요청당 한 줄. 사용자 id · 거래 id · 서명은 싣지 않습니다. */
export type AdmobSsvLogEntry = {
  readonly event: "admob_ssv";
  readonly status: number;
  readonly outcome: string;
};

export type CreateAdmobSsvHandler = (deps: {
  readonly env: AdmobSsvEnv | null;
  readonly outbound: Outbound;
  readonly keys: AdmobKeys;
  readonly log: (entry: AdmobSsvLogEntry) => void;
}) => (request: Request) => Promise<Response>;
