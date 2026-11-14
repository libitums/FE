// RevenueCat 웹훅(ADR-0144)의 계약 — 이벤트 정규화 · 환경 · 처리기 의존성. 타입만 둡니다.
// 스토어 결제 · 영수증 검증은 RevenueCat이 하고, 등급 · 엽전의 정본은 우리 DB입니다. 이 함수는 RevenueCat이 보낸 이벤트를
// 정규화해 `public.companion_apply_store_event(p_event)` 한 번으로 넘깁니다 — 상품 → 요금제 매핑은 DB 표가 합니다.

import type { Outbound } from "./delete-account.contract.ts";

/** DB가 이벤트마다 할 일입니다(spec 이벤트 처리 표). */
export type StoreAction =
  | "activate"
  | "uncancel"
  | "cancel"
  | "refund"
  | "billing_issue"
  | "expire"
  | "coins"
  | "product_change"
  | "transfer"
  | "record";

/** DB로 넘기는 정규화 이벤트입니다. 시각은 ISO 8601(UTC), 없으면 null. 원문(구독자 속성 등)은 싣지 않습니다. */
export type StoreEvent = {
  readonly id: string;
  readonly type: string;
  readonly action: StoreAction;
  /** app_user_id · original_app_user_id · aliases — 중복 없이 이 순서. DB가 auth.users에 있는 첫 uuid를 고릅니다. */
  readonly userIds: readonly string[];
  readonly productId: string | null;
  readonly newProductId: string | null;
  readonly store: string | null;
  readonly environment: "production" | "sandbox";
  readonly transactionId: string | null;
  readonly purchasedAt: string | null;
  readonly expiresAt: string | null;
  readonly graceExpiresAt: string | null;
  readonly eventAt: string | null;
  readonly transferredFrom: readonly string[];
  readonly transferredTo: readonly string[];
};

export type RevenuecatEventFrom = (body: unknown) => StoreEvent | null;

export type RevenuecatWebhookEnvName =
  | "SUPABASE_URL"
  | "SUPABASE_SERVICE_ROLE_KEY"
  | "REVENUECAT_WEBHOOK_AUTH"
  | "REVENUECAT_ACCEPT_SANDBOX";

export type RevenuecatWebhookEnv = {
  readonly supabaseUrl: string;
  readonly supabaseServiceRoleKey: string;
  /** RevenueCat 대시보드의 웹훅 「Authorization header value」와 같은 값입니다. */
  readonly webhookAuth: string;
  /** 샌드박스 이벤트도 DB에 반영하는가 — 개발 프로젝트(QA)만 `true`. */
  readonly acceptSandbox: boolean;
};

export type RevenuecatWebhookEnvFrom = (
  read: (name: RevenuecatWebhookEnvName) => string | undefined,
) => RevenuecatWebhookEnv | null;

export type RevenuecatWebhookLogEntry = {
  readonly event: "revenuecat_webhook";
  readonly status: number;
  readonly outcome: string;
  readonly type?: string;
  readonly environment?: string;
};

export type RevenuecatWebhookDeps = {
  readonly env: RevenuecatWebhookEnv | null;
  readonly outbound: Outbound;
  readonly log: (entry: RevenuecatWebhookLogEntry) => void;
};

export type CreateRevenuecatWebhookHandler = (
  deps: RevenuecatWebhookDeps,
) => (request: Request) => Promise<Response>;
