import { describe, expect, test } from "vitest";

import type { DeleteAccountOutcome } from "./delete-account.contract.ts";
import { deleteAccountBodyFrom, deleteAccountResponse } from "./delete-account-handler.ts";

describe("FH1 deleteAccountBodyFrom", () => {
  test.each([
    ['{"apple_authorization_code":null}', { apple_authorization_code: null }],
    ['{"apple_authorization_code":"c"}', { apple_authorization_code: "c" }],
    ['{"apple_authorization_code":"c","extra":1}', { apple_authorization_code: "c" }],
    [
      '{"apple_authorization_code":null,"apple_provider_refresh_token":"r"}',
      { apple_authorization_code: null, apple_provider_refresh_token: "r" },
    ],
  ])("%s → 본문", (text, expected) => {
    expect(deleteAccountBodyFrom(text)).toEqual(expected);
  });

  test.each([
    "{}",
    '{"apple_authorization_code":""}',
    '{"apple_authorization_code":1}',
    '{"apple_authorization_code":null,"apple_provider_refresh_token":""}',
    '{"apple_authorization_code":"c","apple_provider_refresh_token":"r"}',
    "[]",
    '[{"apple_authorization_code":"c"}]',
    "not json",
    "",
  ])("%j → null", (text) => {
    expect(deleteAccountBodyFrom(text)).toBeNull();
  });
});

const errorOutcomes: readonly Exclude<DeleteAccountOutcome, { status: 204 }>[] = [
  { status: 405, error: "method_not_allowed" },
  { status: 401, error: "missing_authorization" },
  { status: 401, error: "invalid_session" },
  { status: 400, error: "invalid_body" },
  { status: 400, error: "apple_authorization_code_required" },
  { status: 403, error: "apple_account_mismatch" },
  { status: 502, error: "auth_unavailable" },
  { status: 502, error: "apple_exchange_failed" },
  { status: 502, error: "apple_revoke_failed" },
  { status: 500, error: "server_misconfigured" },
  { status: 500, error: "delete_failed" },
];

describe("FH2 deleteAccountResponse", () => {
  test("204는 본문이 없다", async () => {
    const response = deleteAccountResponse({ status: 204 });
    expect(response.status).toBe(204);
    expect(response.body).toBeNull();
    await expect(response.text()).resolves.toBe("");
  });

  test.each(errorOutcomes)("$status $error 는 JSON 오류 본문이다", async (outcome) => {
    const response = deleteAccountResponse(outcome);
    expect(response.status).toBe(outcome.status);
    expect(response.headers.get("Content-Type")).toBe("application/json");
    await expect(response.json()).resolves.toEqual({ error: outcome.error });
  });

  test("405만 Allow: POST를 싣는다", () => {
    expect(
      deleteAccountResponse({ status: 405, error: "method_not_allowed" }).headers.get("Allow"),
    ).toBe("POST");
    expect(
      deleteAccountResponse({ status: 500, error: "delete_failed" }).headers.get("Allow"),
    ).toBeNull();
  });
});
