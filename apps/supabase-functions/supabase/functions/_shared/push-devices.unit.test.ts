import { describe, expect, test } from "vitest";

import {
  allDevicesRequest,
  pushDevicesFrom,
  reengagementDevicesRequest,
  removeDevicesRequest,
  serviceKeyCheckRequest,
  userDevicesRequest,
} from "./push-devices.ts";
import type { SendPushEnv } from "./send-push.contract.ts";
import { fcmStoredTokenFrom } from "./fcm.ts";

const env: SendPushEnv = {
  supabaseUrl: "https://p.supabase.co",
  supabaseServiceRoleKey: "service",
  apns: { teamId: "T", keyId: "K", topic: "com.libitum.host", privateKeyPem: "pem" },
};
const token = "b".repeat(64);

describe("PD1 요청", () => {
  test("service role로 PostgREST를 부른다", () => {
    const all = allDevicesRequest(env);
    expect(all.url).toBe("https://p.supabase.co/rest/v1/push_devices?select=token,environment");
    expect(all.headers).toEqual({ apikey: "service", "Content-Type": "application/json" });
    const check = serviceKeyCheckRequest(env, "eyJh.eyJi.sig");
    expect(check.url).toBe("https://p.supabase.co/auth/v1/admin/users?page=1&per_page=1");
    expect(check.headers).toEqual({
      apikey: "eyJh.eyJi.sig",
      Authorization: "Bearer eyJh.eyJi.sig",
    });
    expect(userDevicesRequest(env, ["u1", "u2"]).url).toContain("user_id=in.(u1,u2)");
    const reengagement = reengagementDevicesRequest(env, 7);
    expect(reengagement.url).toBe("https://p.supabase.co/rest/v1/rpc/reengagement_devices");
    expect(reengagement.body).toBe('{"p_days":7}');
    const remove = removeDevicesRequest(env, [token]);
    expect(remove.method).toBe("DELETE");
    expect(remove.url).toContain(`token=in.(${token})`);
  });
});

describe("PD2 pushDevicesFrom", () => {
  test("모양이 맞는 행만 남긴다", () => {
    expect(
      pushDevicesFrom(
        JSON.stringify([
          { token, environment: "sandbox" },
          { token: "XYZ", environment: "sandbox" },
          { token, environment: "staging" },
          null,
          { token, environment: "production" },
        ]),
      ),
    ).toEqual([
      { token, environment: "sandbox" },
      { token, environment: "production" },
    ]);
  });

  test("배열이 아니면 null", () => {
    expect(pushDevicesFrom("{}")).toBeNull();
    expect(pushDevicesFrom("nope")).toBeNull();
  });

  test("FCM 저장 토큰은 환경과 함께 검증한다", () => {
    const fcm = fcmStoredTokenFrom("bk3RNwTe3H0:CI2k_HHwgIpoDKCIZvvDMExUdFQ3P1")!;
    expect(
      pushDevicesFrom(
        JSON.stringify([
          { token: fcm, environment: "fcm" },
          { token: fcm, environment: "production" },
          { token, environment: "fcm" },
        ]),
      ),
    ).toEqual([{ token: fcm, environment: "fcm" }]);
  });
});
