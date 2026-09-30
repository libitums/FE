import { describe, expect, test } from "vitest";

import { sendPushEnvFrom } from "./send-push-env.ts";
import type { SendPushEnvName } from "./send-push.contract.ts";

const full: Record<SendPushEnvName, string> = {
  SUPABASE_URL: "https://p.supabase.co/",
  SUPABASE_SERVICE_ROLE_KEY: " service ",
  APPLE_TEAM_ID: "TEAM",
  APPLE_CLIENT_ID: "com.libitum.host",
  APNS_KEY_ID: "KEY",
  APNS_PRIVATE_KEY: "pem",
};

describe("SE1 sendPushEnvFrom", () => {
  test("여섯이 다 있으면 다듬어 싣는다", () => {
    expect(sendPushEnvFrom((name) => full[name])).toEqual({
      supabaseUrl: "https://p.supabase.co",
      supabaseServiceRoleKey: "service",
      apns: { teamId: "TEAM", keyId: "KEY", topic: "com.libitum.host", privateKeyPem: "pem" },
    });
  });

  test("하나라도 비거나 https가 아니면 null", () => {
    for (const name of Object.keys(full) as SendPushEnvName[]) {
      expect(sendPushEnvFrom((n) => (n === name ? " " : full[n]))).toBeNull();
    }
    expect(
      sendPushEnvFrom((n) => (n === "SUPABASE_URL" ? "http://kong:8000" : full[n])),
    ).toBeNull();
  });
});
