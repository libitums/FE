import { describe, expect, test } from "vitest";

import type { DeleteAccountEnvName } from "./delete-account.contract.ts";
import { deleteAccountEnvFrom } from "./delete-account-env.ts";

const full: Record<DeleteAccountEnvName, string> = {
  SUPABASE_URL: "https://x.supabase.co",
  SUPABASE_ANON_KEY: "anon",
  SUPABASE_SERVICE_ROLE_KEY: "service",
  APPLE_TEAM_ID: "TEAM",
  APPLE_KEY_ID: "K",
  APPLE_CLIENT_ID: "com.libitum.host",
  APPLE_WEB_CLIENT_ID: "com.libitum.web",
  APPLE_PRIVATE_KEY: "PEM",
};

const read = (overrides: Partial<Record<DeleteAccountEnvName, string | undefined>>) => {
  const values: Partial<Record<DeleteAccountEnvName, string | undefined>> = {
    ...full,
    ...overrides,
  };
  return (name: DeleteAccountEnvName) => values[name];
};

describe("FE1 deleteAccountEnvFrom", () => {
  test("일곱이 다 있으면 apple까지 선다", () => {
    expect(deleteAccountEnvFrom(read({}))).toEqual({
      supabaseUrl: "https://x.supabase.co",
      supabaseAnonKey: "anon",
      supabaseServiceRoleKey: "service",
      apple: {
        teamId: "TEAM",
        keyId: "K",
        clientId: "com.libitum.host",
        webClientId: "com.libitum.web",
        privateKeyPem: "PEM",
      },
    });
  });

  test.each(["APPLE_TEAM_ID", "APPLE_KEY_ID", "APPLE_CLIENT_ID", "APPLE_PRIVATE_KEY"] as const)(
    "Apple 넷 중 %s가 비면 apple만 null이다",
    (name) => {
      for (const empty of [undefined, "", "   "]) {
        expect(deleteAccountEnvFrom(read({ [name]: empty }))).toEqual({
          supabaseUrl: "https://x.supabase.co",
          supabaseAnonKey: "anon",
          supabaseServiceRoleKey: "service",
          apple: null,
        });
      }
    },
  );

  test.each(["SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"] as const)(
    "Supabase 셋 중 %s가 비면 환경 전체가 null이다",
    (name) => {
      expect(deleteAccountEnvFrom(read({ [name]: undefined }))).toBeNull();
      expect(deleteAccountEnvFrom(read({ [name]: "  " }))).toBeNull();
    },
  );

  test("https가 아닌 URL은 null이다", () => {
    expect(deleteAccountEnvFrom(read({ SUPABASE_URL: "http://x.supabase.co" }))).toBeNull();
  });

  test("앞뒤 공백을 걷고 URL 끝 /를 뗀다", () => {
    const env = deleteAccountEnvFrom(
      read({
        SUPABASE_URL: "  https://x.supabase.co/  ",
        SUPABASE_ANON_KEY: " anon ",
        APPLE_KEY_ID: " K ",
      }),
    );
    expect(env?.supabaseUrl).toBe("https://x.supabase.co");
    expect(env?.supabaseAnonKey).toBe("anon");
    expect(env?.apple?.keyId).toBe("K");
  });
});
