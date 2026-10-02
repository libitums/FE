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
  FIREBASE_SERVICE_ACCOUNT_JSON: "",
};

describe("SE1 sendPushEnvFrom", () => {
  test("여섯이 다 있으면 다듬어 싣는다", () => {
    expect(sendPushEnvFrom((name) => full[name])).toEqual({
      supabaseUrl: "https://p.supabase.co",
      supabaseServiceRoleKey: "service",
      apns: { teamId: "TEAM", keyId: "KEY", topic: "com.libitum.host", privateKeyPem: "pem" },
      fcm: null,
    });
  });

  test("필수 값이 비거나 https가 아니면 null", () => {
    for (const name of Object.keys(full).filter(
      (n) => n !== "FIREBASE_SERVICE_ACCOUNT_JSON",
    ) as SendPushEnvName[]) {
      expect(sendPushEnvFrom((n) => (n === name ? " " : full[n]))).toBeNull();
    }
    expect(
      sendPushEnvFrom((n) => (n === "SUPABASE_URL" ? "http://kong:8000" : full[n])),
    ).toBeNull();
  });

  test("FCM 설정은 선택적이며 잘못 설정하면 실패한다", () => {
    expect(sendPushEnvFrom((name) => full[name])).toMatchObject({ fcm: null });
    const configured = sendPushEnvFrom((name) =>
      name === "FIREBASE_SERVICE_ACCOUNT_JSON"
        ? JSON.stringify({
            project_id: "duru-prod",
            client_email: "push@duru.iam.gserviceaccount.com",
            private_key: "pem",
          })
        : full[name],
    );
    expect(configured?.fcm).toEqual({
      projectId: "duru-prod",
      clientEmail: "push@duru.iam.gserviceaccount.com",
      privateKeyPem: "pem",
    });
    expect(
      sendPushEnvFrom((name) => (name === "FIREBASE_SERVICE_ACCOUNT_JSON" ? "{}" : full[name])),
    ).toBeNull();
  });
});
