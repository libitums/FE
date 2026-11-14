// RevenueCat 웹훅 본문 → 정규화 이벤트(ADR-0144). 순수 — 던지지 않습니다.
// 종류 → 할 일은 이 표 하나가 정합니다. 상품 → 요금제는 DB(`companion.store_products`)가 정합니다 — RevenueCat의
// entitlement_ids는 읽지 않습니다(정본은 우리 표).

import type { RevenuecatEventFrom, StoreAction } from "./revenuecat-webhook.contract.ts";

const actionByType: Readonly<Record<string, StoreAction>> = {
  INITIAL_PURCHASE: "activate",
  RENEWAL: "activate",
  SUBSCRIPTION_EXTENDED: "activate",
  TEMPORARY_ENTITLEMENT_GRANT: "activate",
  UNCANCELLATION: "uncancel",
  CANCELLATION: "cancel",
  REFUND: "refund",
  BILLING_ISSUE: "billing_issue",
  EXPIRATION: "expire",
  NON_RENEWING_PURCHASE: "coins",
  PRODUCT_CHANGE: "product_change",
  TRANSFER: "transfer",
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const text = (value: unknown): string | null =>
  typeof value === "string" && value !== "" ? value : null;

const strings = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item !== "")
    : [];

const isoFromMs = (value: unknown): string | null =>
  typeof value === "number" && Number.isFinite(value) ? new Date(value).toISOString() : null;

export const revenuecatEventFrom: RevenuecatEventFrom = (body) => {
  if (!isRecord(body) || !isRecord(body["event"])) return null;
  const event = body["event"];
  const id = text(event["id"]);
  const type = text(event["type"]);
  if (id === null || type === null) return null;
  // 환불은 따로 오지 않고 CANCELLATION의 사유(CUSTOMER_SUPPORT)로 온다(앱스토어 · 플레이 고객 지원 환불).
  const action: StoreAction =
    type === "CANCELLATION" && event["cancel_reason"] === "CUSTOMER_SUPPORT"
      ? "refund"
      : (actionByType[type] ?? "record");
  const userIds = [
    ...new Set([
      ...strings([event["app_user_id"], event["original_app_user_id"]]),
      ...strings(event["aliases"]),
    ]),
  ];
  return {
    id,
    type,
    action,
    userIds,
    productId: text(event["product_id"]),
    newProductId: text(event["new_product_id"]),
    store: text(event["store"]),
    environment: event["environment"] === "SANDBOX" ? "sandbox" : "production",
    transactionId: text(event["transaction_id"]),
    purchasedAt: isoFromMs(event["purchased_at_ms"]),
    expiresAt: isoFromMs(event["expiration_at_ms"]),
    graceExpiresAt: isoFromMs(event["grace_period_expiration_at_ms"]),
    eventAt: isoFromMs(event["event_timestamp_ms"]),
    transferredFrom: strings(event["transferred_from"]),
    transferredTo: strings(event["transferred_to"]),
  };
};
