import { describe, expect, test } from "vitest";

import { apnsHosts, apnsPayload, apnsRequest, apnsResultFrom } from "./apns.ts";

const apns = { teamId: "TEAM", keyId: "KEY", topic: "com.libitum.host", privateKeyPem: "pem" };
const token = "a".repeat(64);

describe("AP1 apnsRequest", () => {
  test("환경별 호스트 · 헤더 · 경로", () => {
    const sandbox = apnsRequest(apns, "jwt", { token, environment: "sandbox" }, "{}");
    expect(sandbox.url).toBe(`${apnsHosts.sandbox}/3/device/${token}`);
    expect(sandbox.method).toBe("POST");
    expect(sandbox.headers).toMatchObject({
      authorization: "bearer jwt",
      "apns-topic": "com.libitum.host",
      "apns-push-type": "alert",
    });
    const production = apnsRequest(apns, "jwt", { token, environment: "production" }, "{}");
    expect(production.url.startsWith("https://api.push.apple.com/")).toBe(true);
  });
});

describe("AP2 apnsPayload", () => {
  test("target은 aps 밖 최상위 키다", () => {
    const payload = JSON.parse(
      apnsPayload({ title: "T", body: "B", target: { kind: "notifications" } }),
    ) as Record<string, unknown>;
    expect(payload).toEqual({
      aps: { alert: { title: "T", body: "B" }, sound: "default" },
      target: { kind: "notifications" },
    });
  });
});

describe("AP3 apnsResultFrom", () => {
  test("200 → sent, 410 · 무효 토큰 400 → invalid-token, 그 밖 → failed", () => {
    expect(apnsResultFrom(200, "")).toBe("sent");
    expect(apnsResultFrom(410, '{"reason":"Unregistered"}')).toBe("invalid-token");
    expect(apnsResultFrom(400, '{"reason":"BadDeviceToken"}')).toBe("invalid-token");
    expect(apnsResultFrom(400, '{"reason":"DeviceTokenNotForTopic"}')).toBe("invalid-token");
    expect(apnsResultFrom(400, '{"reason":"PayloadTooLarge"}')).toBe("failed");
    expect(apnsResultFrom(400, "not json")).toBe("failed");
    expect(apnsResultFrom(403, '{"reason":"InvalidProviderToken"}')).toBe("failed");
    expect(apnsResultFrom(500, "")).toBe("failed");
  });
});
