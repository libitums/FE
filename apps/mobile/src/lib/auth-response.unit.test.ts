import { expect, test } from "vitest";

import { accountDeletionFailureFrom, accountDeletionFailureFromRefresh } from "./auth-response";

// test-plan §2.2 AF1 · AF2 — 계정 삭제 실패 판정.

test("AF1. accountDeletionFailureFrom — 401 · 403은 각자, 그 밖은 unavailable", () => {
  expect(accountDeletionFailureFrom(401)).toBe("session-expired");
  expect(accountDeletionFailureFrom(403)).toBe("apple-unconfirmed");
  for (const status of [400, 404, 405, 418, 500, 502, 503]) {
    expect(accountDeletionFailureFrom(status)).toBe("unavailable");
  }
});

test("AF2. accountDeletionFailureFromRefresh — rejected → session-expired, 나머지는 같은 낱말", () => {
  expect(accountDeletionFailureFromRefresh("rejected")).toBe("session-expired");
  expect(accountDeletionFailureFromRefresh("network")).toBe("network");
  expect(accountDeletionFailureFromRefresh("unavailable")).toBe("unavailable");
  expect(accountDeletionFailureFromRefresh("unconfigured")).toBe("unconfigured");
});
