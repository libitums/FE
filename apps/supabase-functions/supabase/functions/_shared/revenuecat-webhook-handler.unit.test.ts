import { describe, expect, test, vi } from "vitest";
import type { OutboundRequest } from "./delete-account.contract.ts";
import { revenuecatWebhookEnvFrom } from "./revenuecat-webhook-env.ts";
import { createRevenuecatWebhookHandler } from "./revenuecat-webhook-handler.ts";
import type {
  RevenuecatWebhookEnv,
  RevenuecatWebhookLogEntry,
} from "./revenuecat-webhook.contract.ts";

// RevenueCat 웹훅 처리기(ADR-0144) — 인증 헤더 · 본문 · 샌드박스 · DB RPC 한 번.
const env: RevenuecatWebhookEnv = {
  supabaseUrl: "https://db.example",
  supabaseServiceRoleKey: "sb_secret_x",
  webhookAuth: "Bearer rc-secret",
  acceptSandbox: false,
};
const event = {
  id: "evt-1",
  type: "INITIAL_PURCHASE",
  app_user_id: "00000000-0000-4000-8000-0000000000a1",
  product_id: "duru.premium.monthly.v1",
  environment: "PRODUCTION",
  event_timestamp_ms: 1,
};

function setup(rpcStatus = 200, rpcBody = '{"outcome":"activated","userId":"u"}', withEnv = env) {
  const calls: OutboundRequest[] = [];
  const log = vi.fn<(entry: RevenuecatWebhookLogEntry) => void>();
  const handler = createRevenuecatWebhookHandler({
    env: withEnv,
    outbound: async (request) => {
      calls.push(request);
      return { status: rpcStatus, text: async () => rpcBody };
    },
    log,
  });
  return { handler, calls, log };
}
const post = (body: unknown, auth: string | null = env.webhookAuth, method = "POST") =>
  new Request("https://fn.example/revenuecat-webhook", {
    method,
    headers: auth === null ? {} : { Authorization: auth },
    ...(method === "POST" ? { body: typeof body === "string" ? body : JSON.stringify(body) } : {}),
  });

describe("SB-W4 환경 값", () => {
  const read = (values: Record<string, string>) => (name: string) => values[name];
  const full = {
    SUPABASE_URL: "https://db.example/",
    SUPABASE_SERVICE_ROLE_KEY: "sb_secret_x",
    REVENUECAT_WEBHOOK_AUTH: " Bearer rc-secret ",
  };
  test("필수 셋이 있으면 읽고, 끝 / · 공백을 걷는다. 샌드박스는 정확히 true만", () => {
    expect(revenuecatWebhookEnvFrom(read(full))).toEqual({ ...env, acceptSandbox: false });
    expect(
      revenuecatWebhookEnvFrom(read({ ...full, REVENUECAT_ACCEPT_SANDBOX: "true" }))?.acceptSandbox,
    ).toBe(true);
    expect(
      revenuecatWebhookEnvFrom(read({ ...full, REVENUECAT_ACCEPT_SANDBOX: "yes" }))?.acceptSandbox,
    ).toBe(false);
  });
  test("하나라도 없거나 http면 null", () => {
    for (const key of Object.keys(full)) {
      expect(revenuecatWebhookEnvFrom(read({ ...full, [key]: " " }))).toBeNull();
    }
    expect(
      revenuecatWebhookEnvFrom(read({ ...full, SUPABASE_URL: "http://db.example" })),
    ).toBeNull();
  });
});

describe("SB-W5 처리기", () => {
  test("POST가 아니면 405, 인증 헤더가 없거나 다르면 401 — DB를 부르지 않는다", async () => {
    const { handler, calls } = setup();
    expect((await handler(post(null, env.webhookAuth, "GET"))).status).toBe(405);
    expect((await handler(post({ event }, null))).status).toBe(401);
    expect((await handler(post({ event }, "Bearer wrong"))).status).toBe(401);
    expect((await handler(post({ event }, "rc-secret"))).status).toBe(401);
    expect(calls).toHaveLength(0);
  });

  test("env가 없으면 500, 깨진 본문은 400", async () => {
    expect(
      (await setup(200, "", null as unknown as RevenuecatWebhookEnv).handler(post({ event })))
        .status,
    ).toBe(500);
    const { handler, calls } = setup();
    expect((await handler(post("{not json"))).status).toBe(400);
    expect((await handler(post({ event: { id: "x" } }))).status).toBe(400);
    expect(calls).toHaveLength(0);
  });

  test("정상 → 서버 키로 companion_apply_store_event 한 번, 200 outcome", async () => {
    const { handler, calls, log } = setup();
    const response = await handler(post({ api_version: "1.0", event }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ outcome: "activated" });
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://db.example/rest/v1/rpc/companion_apply_store_event");
    expect(calls[0]?.headers["apikey"]).toBe("sb_secret_x");
    const sent = JSON.parse(calls[0]?.body ?? "{}") as { p_event: { id: string; action: string } };
    expect(sent.p_event).toMatchObject({ id: "evt-1", action: "activate" });
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({ status: 200, outcome: "activated", type: "INITIAL_PURCHASE" }),
    );
  });

  test("샌드박스는 플래그가 꺼져 있으면 DB 없이 200 sandbox_ignored, 켜져 있으면 반영", async () => {
    const sandbox = { event: { ...event, environment: "SANDBOX" } };
    const off = setup();
    const response = await off.handler(post(sandbox));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ outcome: "sandbox_ignored" });
    expect(off.calls).toHaveLength(0);
    const on = setup(200, '{"outcome":"activated"}', { ...env, acceptSandbox: true });
    expect((await on.handler(post(sandbox))).status).toBe(200);
    expect(on.calls).toHaveLength(1);
  });

  test("DB가 실패하면 500(RevenueCat이 다시 보냄), 연결이 끊겨도 500", async () => {
    expect((await setup(500, "{}").handler(post({ event }))).status).toBe(500);
    const broken = createRevenuecatWebhookHandler({
      env,
      outbound: async () => {
        throw new Error("network");
      },
      log: () => {},
    });
    expect((await broken(post({ event }))).status).toBe(500);
  });
});
