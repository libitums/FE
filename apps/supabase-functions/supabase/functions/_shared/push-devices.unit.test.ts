import { describe, expect, test } from "vitest";

import {
  allDevicesRequest,
  pushDevicesFrom,
  reengagementDevicesRequest,
  removeDevicesRequest,
  userDevicesRequest,
} from "./push-devices.ts";
import type { SendPushEnv } from "./send-push.contract.ts";

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
    expect(all.headers).toMatchObject({ apikey: "service", Authorization: "Bearer service" });
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
});
