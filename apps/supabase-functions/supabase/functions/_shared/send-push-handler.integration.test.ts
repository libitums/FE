import { beforeAll, describe, expect, test } from "vitest";

import { signEs256 } from "./apple-client-secret.ts";
import { bytesFromBase64Url } from "./base64.ts";
import { fcmStoredTokenFrom } from "./fcm.ts";
import type { OutboundRequest, OutboundResponse } from "./delete-account.contract.ts";
import type { SendPushEnv, SendPushLogEntry } from "./send-push.contract.ts";
import { createSendPushHandler, tokensPerRemoval, userIdsPerLookup } from "./send-push-handler.ts";

// 핸들러 + 실제 WebCrypto 서명 + 가짜 바깥 호출(PostgREST · APNs)을 잇습니다(SH1~SH8).

const serviceKey = "service-role-key";
const tokens = ["a", "b", "c"].map((c) => c.repeat(64));
let privateKeyPem: string;
let fcmPrivateKeyPem: string;
let publicKey: CryptoKey;

beforeAll(async () => {
  const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, [
    "sign",
    "verify",
  ]);
  publicKey = pair.publicKey;
  const der = new Uint8Array(await crypto.subtle.exportKey("pkcs8", pair.privateKey));
  let binary = "";
  for (const byte of der) binary += String.fromCharCode(byte);
  const lines = btoa(binary).match(/.{1,64}/g) ?? [];
  privateKeyPem = ["-----BEGIN PRIVATE KEY-----", ...lines, "-----END PRIVATE KEY-----"].join("\n");
  const rsa = await crypto.subtle.generateKey(
    {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["sign", "verify"],
  );
  const rsaDer = new Uint8Array(await crypto.subtle.exportKey("pkcs8", rsa.privateKey));
  const rsaBinary = Array.from(rsaDer, (byte) => String.fromCharCode(byte)).join("");
  fcmPrivateKeyPem = `-----BEGIN PRIVATE KEY-----\n${btoa(rsaBinary)}\n-----END PRIVATE KEY-----`;
});

const env = (): SendPushEnv => ({
  supabaseUrl: "https://p.supabase.co",
  supabaseServiceRoleKey: serviceKey,
  apns: { teamId: "TEAM", keyId: "KEY", topic: "com.libitum.host", privateKeyPem },
});

type Reply = { status: number; body?: string };

function harness(
  routes: (request: OutboundRequest) => Reply,
  overrides: { env?: SendPushEnv | null } = {},
) {
  const calls: OutboundRequest[] = [];
  const logs: SendPushLogEntry[] = [];
  const handler = createSendPushHandler({
    env: overrides.env === undefined ? env() : overrides.env,
    outbound: async (request): Promise<OutboundResponse> => {
      calls.push(request);
      const reply = routes(request);
      return { status: reply.status, text: async () => reply.body ?? "" };
    },
    nowMs: () => 1_700_000_000_000,
    signEs256,
    log: (entry) => logs.push(entry),
  });
  const post = (body: unknown, auth: string | null = `Bearer ${serviceKey}`) =>
    handler(
      new Request("https://p.supabase.co/functions/v1/send-push", {
        method: "POST",
        headers: auth === null ? {} : { Authorization: auth },
        body: typeof body === "string" ? body : JSON.stringify(body),
      }),
    );
  return { calls, logs, post, handler };
}

const devicesBody = JSON.stringify([
  { token: tokens[0], environment: "sandbox" },
  { token: tokens[1], environment: "production" },
  { token: tokens[2], environment: "production" },
]);

const announcement = { kind: "announcement", audience: "all", title: "New", body: "Episode 2" };
const fcmStored = fcmStoredTokenFrom("bk3RNwTe3H0:CI2k_HHwgIpoDKCIZvvDMExUdFQ3P1")!;
const fcmEnv = (): SendPushEnv => ({
  ...env(),
  fcm: {
    projectId: "duru-prod",
    clientEmail: "push@duru.iam.gserviceaccount.com",
    privateKeyPem: fcmPrivateKeyPem,
  },
});

describe("send-push handler", () => {
  test("SH16 APNs와 FCM을 같은 호출에서 발송하고 OAuth는 한 번만 받는다", async () => {
    const h = harness(
      (request) => {
        if (request.url.includes("/rest/v1/push_devices"))
          return {
            status: 200,
            body: JSON.stringify([
              { token: tokens[0], environment: "sandbox" },
              { token: fcmStored, environment: "fcm" },
            ]),
          };
        if (request.url === "https://oauth2.googleapis.com/token")
          return { status: 200, body: '{"access_token":"access","token_type":"Bearer"}' };
        return { status: 200, body: "{}" };
      },
      { env: fcmEnv() },
    );
    const response = await h.post(announcement);
    await expect(response.json()).resolves.toEqual({ devices: 2, sent: 2, failed: 0, removed: 0 });
    expect(h.calls.filter((call) => call.url.includes("oauth2.googleapis.com/token"))).toHaveLength(
      1,
    );
    expect(
      h.calls.filter((call) => call.url.includes("api.sandbox.push.apple.com/3/device/")),
    ).toHaveLength(1);
    const fcm = h.calls.find((call) => call.url.includes("fcm.googleapis.com/v1/projects/"))!;
    expect(fcm.headers.Authorization).toBe("Bearer access");
    expect(JSON.parse(fcm.body!)).toEqual({
      message: {
        token: "bk3RNwTe3H0:CI2k_HHwgIpoDKCIZvvDMExUdFQ3P1",
        data: { title: "New", body: "Episode 2", target: '{"kind":"journey-map"}' },
        android: { priority: "HIGH" },
      },
    });
  });

  test("SH17 FCM 시크릿이 없어도 APNs 발송을 계속하고 FCM만 실패로 센다", async () => {
    const h = harness((request) =>
      request.url.includes("/rest/v1/push_devices")
        ? {
            status: 200,
            body: JSON.stringify([
              { token: tokens[0], environment: "production" },
              { token: fcmStored, environment: "fcm" },
            ]),
          }
        : { status: 200 },
    );
    await expect((await h.post(announcement)).json()).resolves.toEqual({
      devices: 2,
      sent: 1,
      failed: 1,
      removed: 0,
    });
    expect(h.calls.some((call) => call.url.includes("oauth2.googleapis.com"))).toBe(false);
    expect(h.calls.some((call) => call.url.includes("fcm.googleapis.com"))).toBe(false);
  });

  test("SH18 FCM UNREGISTERED만 삭제하고 400 payload 오류는 보존한다", async () => {
    const second = fcmStoredTokenFrom("another-valid-FCM-token:abcdefghijklmnopqrstuv")!;
    const h = harness(
      (request) => {
        if (request.method === "DELETE") return { status: 204 };
        if (request.url.includes("/rest/v1/push_devices"))
          return {
            status: 200,
            body: JSON.stringify([
              { token: fcmStored, environment: "fcm" },
              { token: second, environment: "fcm" },
            ]),
          };
        if (request.url.includes("oauth2.googleapis.com"))
          return { status: 200, body: '{"access_token":"access","token_type":"Bearer"}' };
        if (request.body?.includes("another-valid-FCM-token"))
          return { status: 400, body: '{"error":{"details":[{"errorCode":"INVALID_ARGUMENT"}]}}' };
        return { status: 404, body: '{"error":{"details":[{"errorCode":"UNREGISTERED"}]}}' };
      },
      { env: fcmEnv() },
    );
    await expect((await h.post(announcement)).json()).resolves.toEqual({
      devices: 2,
      sent: 0,
      failed: 2,
      removed: 1,
    });
    const removal = h.calls.find((call) => call.method === "DELETE")!;
    expect(removal.url).toContain(fcmStored);
    expect(removal.url).not.toContain(second);
  });

  test("SH19 많은 무효 FCM 토큰은 URL 길이를 지키며 묶어 지운다", async () => {
    const many = Array.from({ length: 11 }, (_, index) =>
      fcmStoredTokenFrom(`fcm-token-${index}-${"x".repeat(60)}`),
    );
    const h = harness(
      (request) => {
        if (request.method === "DELETE") return { status: 204 };
        if (request.url.includes("/rest/v1/push_devices")) {
          return {
            status: 200,
            body: JSON.stringify(many.map((token) => ({ token, environment: "fcm" }))),
          };
        }
        if (request.url.includes("oauth2.googleapis.com")) {
          return { status: 200, body: '{"access_token":"access","token_type":"Bearer"}' };
        }
        return { status: 404, body: '{"error":{"details":[{"errorCode":"UNREGISTERED"}]}}' };
      },
      { env: fcmEnv() },
    );
    await expect((await h.post(announcement)).json()).resolves.toEqual({
      devices: 11,
      sent: 0,
      failed: 11,
      removed: 11,
    });
    const deletions = h.calls.filter((call) => call.method === "DELETE");
    expect(deletions).toHaveLength(2);
    expect(deletions.every((call) => call.url.length < 3500)).toBe(true);
  });

  test("SH1 POST가 아니면 405, 환경이 없으면 500, 키가 틀리면 401 — 기기 조회 · 발송 0", async () => {
    const h = harness((request) =>
      request.url.includes("/auth/v1/admin/users") ? { status: 401 } : { status: 200, body: "[]" },
    );
    expect((await h.handler(new Request("https://x/send-push"))).status).toBe(405);
    expect((await harness(() => ({ status: 200 }), { env: null }).post(announcement)).status).toBe(
      500,
    );
    expect((await h.post(announcement, null)).status).toBe(401);
    expect((await h.post(announcement, "Bearer anon-key")).status).toBe(401);
    expect(h.calls).toHaveLength(0);
    expect((await h.post(announcement, "Bearer eyJh.eyJi.sig")).status).toBe(401);
    // 글자가 다른 키는 Auth에 한 번 묻고, 거절되면 그 뒤로 아무것도 부르지 않는다.
    expect(h.calls.map((call) => call.url)).toEqual([
      "https://p.supabase.co/auth/v1/admin/users?page=1&per_page=1",
    ]);
  });

  test("SH2 본문이 틀리면 400", async () => {
    const h = harness(() => ({ status: 200, body: "[]" }));
    expect((await h.post({ kind: "announcement", audience: "all" })).status).toBe(400);
    expect(h.calls).toHaveLength(0);
  });

  test("SH3 기기 조회가 실패하면 502", async () => {
    const h = harness(() => ({ status: 500 }));
    const response = await h.post(announcement);
    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({ error: "devices_unavailable" });
  });

  test("SH4 기기가 없으면 APNs를 부르지 않고 0을 센다", async () => {
    const h = harness(() => ({ status: 200, body: "[]" }));
    const response = await h.post(announcement);
    await expect(response.json()).resolves.toEqual({ devices: 0, sent: 0, failed: 0, removed: 0 });
    expect(h.calls).toHaveLength(1);
  });

  test("SH5 공지 — 환경별 호스트로 보내고, 서명된 JWT와 목적지 기본값(여정 맵)을 싣는다", async () => {
    const h = harness((request) =>
      request.url.includes("/rest/v1/") ? { status: 200, body: devicesBody } : { status: 200 },
    );
    const response = await h.post(announcement);
    await expect(response.json()).resolves.toEqual({ devices: 3, sent: 3, failed: 0, removed: 0 });

    const pushes = h.calls.filter((call) => call.url.includes("/3/device/"));
    expect(pushes.map((call) => new URL(call.url).host)).toEqual([
      "api.sandbox.push.apple.com",
      "api.push.apple.com",
      "api.push.apple.com",
    ]);
    const payload = JSON.parse(pushes[0]!.body!) as Record<string, unknown>;
    expect(payload["target"]).toEqual({ kind: "journey-map" });

    const jwt = pushes[0]!.headers["authorization"]!.replace("bearer ", "");
    const [header, claims, signature] = jwt.split(".");
    const verified = await crypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      publicKey,
      bytesFromBase64Url(signature!) as Uint8Array<ArrayBuffer>,
      new TextEncoder().encode(`${header}.${claims}`),
    );
    expect(verified).toBe(true);
    expect(JSON.parse(new TextDecoder().decode(bytesFromBase64Url(claims!)!))).toEqual({
      iss: "TEAM",
      iat: 1_700_000_000,
    });
  });

  test("SH6 무효 토큰은 한 번의 DELETE로 지우고 실패로 센다", async () => {
    const h = harness((request) => {
      if (request.method === "DELETE") return { status: 204 };
      if (request.url.includes("/rest/v1/")) return { status: 200, body: devicesBody };
      if (request.url.endsWith(tokens[0]!))
        return { status: 410, body: '{"reason":"Unregistered"}' };
      if (request.url.endsWith(tokens[1]!)) return { status: 500 };
      return { status: 200 };
    });
    const response = await h.post(announcement);
    await expect(response.json()).resolves.toEqual({ devices: 3, sent: 1, failed: 2, removed: 1 });
    const deletes = h.calls.filter((call) => call.method === "DELETE");
    expect(deletes).toHaveLength(1);
    expect(deletes[0]!.url).toContain(`token=in.(${tokens[0]})`);
  });

  test("SH7 다시 돌아오기는 RPC로 대상을 고르고 함수의 문구를 싣는다", async () => {
    const h = harness((request) =>
      request.url.includes("/rest/v1/")
        ? { status: 200, body: JSON.stringify([{ token: tokens[0], environment: "sandbox" }]) }
        : { status: 200 },
    );
    await h.post({ kind: "reengagement", days: 3 });
    expect(h.calls[0]!.url).toBe("https://p.supabase.co/rest/v1/rpc/reengagement_devices");
    expect(h.calls[0]!.body).toBe('{"p_days":3}');
    const payload = JSON.parse(h.calls[1]!.body!) as { aps: { alert: { title: string } } };
    expect(payload.aps.alert.title).toBe("Your Korean journey is waiting");
  });

  test("SH8 로그는 요청당 한 줄이고 토큰을 싣지 않는다", async () => {
    const h = harness((request) =>
      request.url.includes("/rest/v1/") ? { status: 200, body: devicesBody } : { status: 200 },
    );
    await h.post(announcement);
    expect(h.logs).toEqual([
      {
        event: "send-push",
        status: 200,
        kind: "announcement",
        summary: { devices: 3, sent: 3, failed: 0, removed: 0 },
      },
    ]);
    expect(JSON.stringify(h.logs)).not.toContain(tokens[0]);
  });

  test("SH9 사용자 목록은 100개씩 나눠 조회하고, 무효 토큰은 50개씩 나눠 지운다", async () => {
    expect(userIdsPerLookup).toBe(100);
    expect(tokensPerRemoval).toBe(50);
    const userIds = Array.from(
      { length: 150 },
      (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
    );
    const many = Array.from({ length: 60 }, (_, i) => i.toString(16).padStart(64, "0"));
    const h = harness((request) => {
      if (request.method === "DELETE") return { status: 204 };
      if (request.url.includes("/rest/v1/")) {
        const first = request.url.includes(userIds[0]!);
        const rows = (first ? many.slice(0, 30) : many.slice(30)).map((token) => ({
          token,
          environment: "production",
        }));
        return { status: 200, body: JSON.stringify(rows) };
      }
      return { status: 410 };
    });
    const response = await h.post({ ...announcement, audience: { userIds } });
    await expect(response.json()).resolves.toEqual({
      devices: 60,
      sent: 0,
      failed: 60,
      removed: 60,
    });
    const lookups = h.calls.filter((call) => call.method === "GET");
    expect(lookups).toHaveLength(2);
    expect(h.calls.filter((call) => call.method === "DELETE")).toHaveLength(2);
  });

  test("SH10 나눈 조회 중 하나라도 실패하면 아무에게도 보내지 않는다", async () => {
    const userIds = Array.from(
      { length: 101 },
      (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
    );
    const h = harness((request) =>
      request.url.includes(userIds[100]!)
        ? { status: 500 }
        : { status: 200, body: JSON.stringify([{ token: tokens[0], environment: "sandbox" }]) },
    );
    const response = await h.post({ ...announcement, audience: { userIds } });
    expect(response.status).toBe(502);
    expect(h.calls.filter((call) => call.url.includes("/3/device/"))).toHaveLength(0);
  });

  test("SH11 런타임과 형식이 다른 서버 키도 Auth가 200이면 통과한다 — 같은 글자면 묻지 않는다", async () => {
    const legacyKey = "eyJh.eyJzZXJ2aWNlIjp0cnVlfQ.sig";
    const h = harness((request) => {
      if (request.url.includes("/auth/v1/admin/users")) {
        return request.headers["apikey"] === legacyKey
          ? { status: 200, body: "{}" }
          : { status: 401 };
      }
      return { status: 200, body: "[]" };
    });
    expect((await h.post(announcement, `Bearer ${legacyKey}`)).status).toBe(200);
    expect(h.calls[0]!.headers).toEqual({
      apikey: legacyKey,
      Authorization: `Bearer ${legacyKey}`,
    });

    const same = harness(() => ({ status: 200, body: "[]" }));
    expect((await same.post(announcement)).status).toBe(200);
    expect(same.calls.some((call) => call.url.includes("/auth/v1/admin/users"))).toBe(false);
  });
  test.each(["random-key", "sb_publishable_abc", "sb_secret_", "eyJh..sig"])(
    "SH12 잘못된 키 형식 %s는 Auth · 기기 조회 · 발송 없이 거절한다",
    async (key) => {
      const h = harness(() => ({ status: 200, body: "[]" }));
      expect((await h.post(announcement, `Bearer ${key}`)).status).toBe(401);
      expect(h.calls).toHaveLength(0);
    },
  );

  test("SH13 런타임과 다른 새 비밀 키는 Auth 확인 후에만 허용하고 apikey로만 보낸다", async () => {
    const key = "sb_secret_other-server-key";
    const h = harness(() => ({ status: 200, body: "[]" }));
    expect((await h.post(announcement, `Bearer ${key}`)).status).toBe(200);
    expect(h.calls).toHaveLength(2);
    expect(h.calls[0]!.url).toContain("/auth/v1/admin/users");
    expect(h.calls[0]!.headers).toEqual({ apikey: key });
    expect(h.calls[1]!.url).toContain("/rest/v1/push_devices");
  });

  test.each([401, 403, 429, 500])(
    "SH14 키 형식이 맞아도 Auth 응답 %i이면 기기 조회 · 발송 없이 거절한다",
    async (status) => {
      const h = harness(() => ({ status }));
      expect((await h.post(announcement, "Bearer sb_secret_unverified")).status).toBe(401);
      expect(h.calls).toHaveLength(1);
      expect(h.calls[0]!.url).toContain("/auth/v1/admin/users");
    },
  );

  test("SH15 Auth 연결 실패도 인증 실패로 처리하고 발송하지 않는다", async () => {
    const h = harness(() => {
      throw new Error("network unavailable");
    });
    expect((await h.post(announcement, "Bearer eyJh.eyJi.sig")).status).toBe(401);
    expect(h.calls).toHaveLength(1);
    expect(h.calls[0]!.url).toContain("/auth/v1/admin/users");
  });
});
