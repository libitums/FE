import { describe, expect, test } from "vitest";

import type { DeleteAccountEnv } from "./delete-account.contract.ts";
import {
  adminDeleteUserRequest,
  authUserRequest,
  authUserSummaryFrom,
  bearerTokenFrom,
} from "./supabase-auth.ts";

const env: DeleteAccountEnv = {
  supabaseUrl: "https://x.supabase.co",
  supabaseAnonKey: "anon",
  supabaseServiceRoleKey: "service",
  apple: null,
};

describe("FA1 bearerTokenFrom", () => {
  test.each(["Bearer t", "bearer t", "  Bearer   t  "])("%j → t", (header) => {
    expect(bearerTokenFrom(header)).toBe("t");
  });

  test.each([null, "", "Basic t", "Bearer ", "Bearert"])("%j → null", (header) => {
    expect(bearerTokenFrom(header)).toBeNull();
  });
});

describe("FA2 authUserRequest", () => {
  test("anon apikey와 사용자 Bearer만 싣는 GET이다", () => {
    expect(authUserRequest(env, "t")).toEqual({
      url: "https://x.supabase.co/auth/v1/user",
      method: "GET",
      headers: { apikey: "anon", Authorization: "Bearer t" },
      body: null,
    });
  });
});

describe("FA3 authUserSummaryFrom", () => {
  test("apple identity의 identity_data.sub를 subject로 읽는다", () => {
    expect(
      authUserSummaryFrom(
        JSON.stringify({
          id: "u1",
          identities: [
            { provider: "google", identity_data: { sub: "G" } },
            { provider: "apple", id: "ignored", identity_data: { sub: "A" } },
          ],
        }),
      ),
    ).toEqual({ id: "u1", apple: { subject: "A" } });
  });

  test("identity_data가 없으면 identity의 id를 subject로 쓴다", () => {
    expect(
      authUserSummaryFrom(
        JSON.stringify({ id: "u1", identities: [{ provider: "apple", id: "A2" }] }),
      ),
    ).toEqual({ id: "u1", apple: { subject: "A2" } });
  });

  test("google만 있으면 apple은 null이다", () => {
    expect(
      authUserSummaryFrom(
        JSON.stringify({ id: "u1", identities: [{ provider: "google", id: "G" }] }),
      ),
    ).toEqual({ id: "u1", apple: null });
  });

  test("identities가 없어도 apple은 null이다", () => {
    expect(authUserSummaryFrom(JSON.stringify({ id: "u1" }))).toEqual({ id: "u1", apple: null });
  });

  test.each([
    ["최상위 id 없음", JSON.stringify({ identities: [] })],
    ["빈 id", JSON.stringify({ id: "" })],
    [
      "apple 항목에 subject 없음",
      JSON.stringify({ id: "u1", identities: [{ provider: "apple", identity_data: {} }] }),
    ],
    ["JSON 아님", "nope"],
  ])("%s → null", (_name, body) => {
    expect(authUserSummaryFrom(body)).toBeNull();
  });
});

describe("FA4 adminDeleteUserRequest", () => {
  test("service role로 사용자 ID를 인코딩한 DELETE다", () => {
    expect(adminDeleteUserRequest(env, "u/1")).toEqual({
      url: "https://x.supabase.co/auth/v1/admin/users/u%2F1",
      method: "DELETE",
      headers: { apikey: "service", Authorization: "Bearer service" },
      body: null,
    });
  });
});
