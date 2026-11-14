import { describe, expect, test } from "vitest";
import { revenuecatEventFrom } from "./revenuecat-event.ts";

// RevenueCat 웹훅 본문 → 정규화 이벤트(ADR-0144, spec 이벤트 처리 표).
const user = "00000000-0000-4000-8000-0000000000a1";
const base = {
  id: "evt-1",
  app_user_id: user,
  original_app_user_id: user,
  aliases: [user],
  product_id: "duru.premium.monthly.v1",
  store: "APP_STORE",
  environment: "PRODUCTION",
  transaction_id: "tx-1",
  purchased_at_ms: Date.UTC(2026, 10, 14, 0, 0, 0),
  expiration_at_ms: Date.UTC(2026, 11, 14, 0, 0, 0),
  event_timestamp_ms: Date.UTC(2026, 10, 14, 0, 0, 5),
};
const body = (event: Record<string, unknown>) => ({
  api_version: "1.0",
  event: { ...base, ...event },
});

describe("SB-W1 종류 → action", () => {
  test.each([
    ["INITIAL_PURCHASE", {}, "activate"],
    ["RENEWAL", {}, "activate"],
    ["SUBSCRIPTION_EXTENDED", {}, "activate"],
    ["TEMPORARY_ENTITLEMENT_GRANT", {}, "activate"],
    ["UNCANCELLATION", {}, "uncancel"],
    ["CANCELLATION", { cancel_reason: "UNSUBSCRIBE" }, "cancel"],
    ["CANCELLATION", { cancel_reason: "BILLING_ERROR" }, "cancel"],
    ["CANCELLATION", { cancel_reason: "CUSTOMER_SUPPORT" }, "refund"],
    ["REFUND", {}, "refund"],
    ["BILLING_ISSUE", {}, "billing_issue"],
    ["EXPIRATION", {}, "expire"],
    ["NON_RENEWING_PURCHASE", {}, "coins"],
    ["PRODUCT_CHANGE", { new_product_id: "duru.premium.yearly.v1" }, "product_change"],
    ["TRANSFER", {}, "transfer"],
    ["TEST", {}, "record"],
    ["SUBSCRIPTION_PAUSED", {}, "record"],
    ["REFUND_REVERSED", {}, "record"],
    ["SOMETHING_NEW", {}, "record"],
  ] as const)("%s %o → %s", (type, extra, action) => {
    expect(revenuecatEventFrom(body({ type, ...extra }))?.action).toBe(action);
  });
});

test("SB-W2 필드 정규화 — ms → ISO, 환경, 사용자 후보 중복 없이, 거래 · 상품", () => {
  expect(
    revenuecatEventFrom(
      body({
        type: "BILLING_ISSUE",
        environment: "SANDBOX",
        aliases: [user, "$RCAnonymousID:abc"],
        grace_period_expiration_at_ms: Date.UTC(2026, 11, 20),
      }),
    ),
  ).toEqual({
    id: "evt-1",
    type: "BILLING_ISSUE",
    action: "billing_issue",
    userIds: [user, "$RCAnonymousID:abc"],
    productId: "duru.premium.monthly.v1",
    newProductId: null,
    store: "APP_STORE",
    environment: "sandbox",
    transactionId: "tx-1",
    purchasedAt: "2026-11-14T00:00:00.000Z",
    expiresAt: "2026-12-14T00:00:00.000Z",
    graceExpiresAt: "2026-12-20T00:00:00.000Z",
    eventAt: "2026-11-14T00:00:05.000Z",
    transferredFrom: [],
    transferredTo: [],
  });
});

test("SB-W2b TRANSFER는 옮길 사용자 둘을 싣고, 없는 시각 · 상품은 null", () => {
  const event = revenuecatEventFrom({
    event: {
      id: "evt-t",
      type: "TRANSFER",
      transferred_from: ["old-user"],
      transferred_to: [user],
      event_timestamp_ms: 0,
    },
  });
  expect(event).toMatchObject({
    action: "transfer",
    userIds: [],
    productId: null,
    expiresAt: null,
    environment: "production",
    transferredFrom: ["old-user"],
    transferredTo: [user],
    eventAt: "1970-01-01T00:00:00.000Z",
  });
});

test("SB-W3 깨진 본문은 null", () => {
  expect(revenuecatEventFrom(null)).toBeNull();
  expect(revenuecatEventFrom("text")).toBeNull();
  expect(revenuecatEventFrom({})).toBeNull();
  expect(revenuecatEventFrom({ event: [] })).toBeNull();
  expect(revenuecatEventFrom({ event: { type: "RENEWAL" } })).toBeNull();
  expect(revenuecatEventFrom({ event: { id: "x" } })).toBeNull();
  expect(revenuecatEventFrom({ event: { id: "", type: "RENEWAL" } })).toBeNull();
});
