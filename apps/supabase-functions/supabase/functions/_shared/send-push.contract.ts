// 푸시 발송 Edge Function(`send-push`)의 어휘입니다(ADR-0034). 로직은 런타임 중립 TypeScript라 Deno(배포)와
// Node(vitest · tsc)에서 같은 코드가 돕니다. 바깥 호출 경계(`Outbound`)는 삭제 함수와 같은 것을 씁니다.
//
// 타입만 있습니다. 값(엔드포인트 · 문구 · 동시성)은 구현 모듈이 가집니다.

import type { Outbound, SignEs256 } from "./delete-account.contract.ts";

// ------------------------------------------------------------------ 목적지

/**
 * 알림을 눌렀을 때 앱이 갈 곳입니다. **URL이 아닙니다** — 앱이 아는 목적지 이름이고, 앱이 다시 검증합니다
 * (`apps/mobile/src/lib/push-target.ts`). 두 앱이 같은 모양을 각자 적습니다(ADR-0004 D4).
 */
export type PushTarget =
  | { readonly kind: "journey-map" }
  | { readonly kind: "notifications" }
  | { readonly kind: "roleplay-list" }
  | { readonly kind: "messenger"; readonly unitId: string }
  | { readonly kind: "phone-call"; readonly unitId: string }
  | { readonly kind: "visual-novel"; readonly unitId: string };

// ------------------------------------------------------------------ HTTP 계약

/** 다시 돌아오기 알림의 쉰 날 수입니다. 문구는 함수가 가집니다. */
export type ReengagementDays = 3 | 7;

/**
 * `POST /functions/v1/send-push`, `Authorization: Bearer <service role 키>`.
 *
 * - `reengagement` — 정확히 `days`일 전 하루 동안 마지막으로 앱을 연 사용자에게 보냅니다. 하루 한 번 부릅니다
 *   (cron — `supabase/cron/reengagement.sql`).
 * - `announcement` — 운영 공지 · 새 에피소드. `audience`가 `"all"`이거나 사용자 ID 목록(1~1000)입니다.
 *   제목 1~100자, 본문 1~500자. `target`이 없으면 앱이 여정 맵으로 갑니다.
 */
export type SendPushRequestBody =
  | { readonly kind: "reengagement"; readonly days: ReengagementDays }
  | {
      readonly kind: "announcement";
      readonly audience: "all" | { readonly userIds: readonly string[] };
      readonly title: string;
      readonly body: string;
      readonly target: PushTarget | null;
    };

export type SendPushBodyFrom = (bodyText: string) => SendPushRequestBody | null;

/** 알림 한 통의 내용입니다. */
export type PushMessage = {
  readonly title: string;
  readonly body: string;
  readonly target: PushTarget;
};

/** 다시 돌아오기 문구입니다(영어 — 앱 UI 언어를 서버가 모릅니다). */
export type ReengagementMessageFor = (days: ReengagementDays) => PushMessage;

export type SendPushErrorCode =
  | "method_not_allowed"
  | "server_misconfigured"
  | "unauthorized"
  | "invalid_body"
  | "devices_unavailable";

/** 성공 본문입니다(200). 한 통도 못 보내도 200이고 수를 셉니다. */
export type SendPushSummary = {
  readonly devices: number;
  readonly sent: number;
  readonly failed: number;
  /** APNs가 더는 유효하지 않다고 답해 표에서 지운 토큰 수입니다. */
  readonly removed: number;
};

export type SendPushOutcome =
  | { readonly status: 200; readonly summary: SendPushSummary }
  | { readonly status: 405; readonly error: "method_not_allowed" }
  | { readonly status: 401; readonly error: "unauthorized" }
  | { readonly status: 400; readonly error: "invalid_body" }
  | { readonly status: 502; readonly error: "devices_unavailable" }
  | { readonly status: 500; readonly error: "server_misconfigured" };

// ------------------------------------------------------------------ 환경

export type SendPushEnvName =
  | "SUPABASE_URL"
  | "SUPABASE_SERVICE_ROLE_KEY"
  | "APPLE_TEAM_ID"
  | "APPLE_CLIENT_ID"
  | "APNS_KEY_ID"
  | "APNS_PRIVATE_KEY";

/** 하나라도 비면 환경 전체가 `null`이고 모든 요청이 500입니다. `topic`은 번들 ID(`APPLE_CLIENT_ID`)입니다. */
export type SendPushEnv = {
  readonly supabaseUrl: string;
  readonly supabaseServiceRoleKey: string;
  readonly apns: {
    readonly teamId: string;
    readonly keyId: string;
    readonly topic: string;
    readonly privateKeyPem: string;
  };
};

export type SendPushEnvFrom = (
  read: (name: SendPushEnvName) => string | undefined,
) => SendPushEnv | null;

// ------------------------------------------------------------------ 기기

export type PushEnvironment = "sandbox" | "production";

export type PushDevice = { readonly token: string; readonly environment: PushEnvironment };

/** PostgREST 응답 본문 → 기기 목록. 모양이 틀린 행은 버립니다. 배열이 아니면 `null`. */
export type PushDevicesFrom = (bodyText: string) => readonly PushDevice[] | null;

// ------------------------------------------------------------------ APNs

/**
 * APNs 응답 → 결말. 200 → `sent`. 410, 또는 400이면서 `reason`이 `BadDeviceToken` · `DeviceTokenNotForTopic` →
 * `invalid-token`(표에서 지웁니다). 그 밖 → `failed`.
 */
export type ApnsResult = "sent" | "invalid-token" | "failed";
export type ApnsResultFrom = (status: number, bodyText: string) => ApnsResult;

// ------------------------------------------------------------------ 핸들러

export type SendPushLogEntry = {
  readonly event: "send-push";
  readonly status: SendPushOutcome["status"];
  readonly kind: SendPushRequestBody["kind"] | null;
  readonly summary: SendPushSummary | null;
};

export type SendPushDeps = {
  readonly env: SendPushEnv | null;
  readonly outbound: Outbound;
  readonly nowMs: () => number;
  readonly signEs256: SignEs256;
  readonly log: (entry: SendPushLogEntry) => void;
};

/**
 * 순서: 메서드(405) → 환경(500) → Bearer = service role(401) → 본문(400) → 기기 조회(502) → 발송(기기마다,
 * 동시에 최대 `apnsConcurrency`) → 무효 토큰 지우기 → 200. 거부하지 않습니다.
 */
export type CreateSendPushHandler = (deps: SendPushDeps) => (request: Request) => Promise<Response>;
