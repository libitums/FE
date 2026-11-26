import { expect, test } from "vitest";

import {
  accountCreatedAtFrom,
  accountDeletionFailureFrom,
  accountDeletionFailureFromRefresh,
  authSessionFrom,
} from "./auth-response";

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

// 첫날 무제한 티켓 — 회원만(ADR-0186 개정 1): 토큰 응답의 `user.created_at`이 계정 생성 시각입니다.

test("AF3. accountCreatedAtFrom — Supabase의 ISO 시각(소수 6자리 · Z · ±hh:mm)을 ms로", () => {
  expect(accountCreatedAtFrom("2026-11-24T01:02:03.456789Z")).toBe(
    Date.UTC(2026, 10, 24, 1, 2, 3, 456),
  );
  expect(accountCreatedAtFrom("2026-11-24T01:02:03Z")).toBe(Date.UTC(2026, 10, 24, 1, 2, 3));
  expect(accountCreatedAtFrom("2026-11-24T10:02:03.5+09:00")).toBe(
    Date.UTC(2026, 10, 24, 1, 2, 3, 500),
  );
  expect(accountCreatedAtFrom("2026-11-23T20:02:03-05:00")).toBe(Date.UTC(2026, 10, 24, 1, 2, 3));
});

test.each([
  undefined,
  null,
  0,
  "",
  "yesterday",
  "2026-11-24",
  "2026-13-01T00:00:00Z",
  "2026-11-24T25:00:00Z",
  "1969-12-31T23:59:59Z",
])("AF4. accountCreatedAtFrom — 시각이 아닌 %s는 undefined", (value) => {
  expect(accountCreatedAtFrom(value)).toBeUndefined();
});

test("AF5. authSessionFrom — user.created_at이 있으면 accountCreatedAt을 싣고, 없거나 틀리면 싣지 않되 세션은 선다", () => {
  const body = (user: unknown) =>
    JSON.stringify({ access_token: "a", refresh_token: "r", expires_in: 60, user });
  expect(authSessionFrom(body({ id: "u", created_at: "2026-11-24T01:00:00.000000Z" }), 0)).toEqual({
    accessToken: "a",
    refreshToken: "r",
    expiresAt: 60_000,
    accountCreatedAt: Date.UTC(2026, 10, 24, 1),
  });
  for (const user of [undefined, null, { id: "u" }, { created_at: "bad" }, "u"]) {
    const session = authSessionFrom(body(user), 0);
    expect(session).toEqual({ accessToken: "a", refreshToken: "r", expiresAt: 60_000 });
    expect(Object.keys(session ?? {})).not.toContain("accountCreatedAt");
  }
});
