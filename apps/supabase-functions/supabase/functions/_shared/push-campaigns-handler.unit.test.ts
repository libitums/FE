import { beforeEach, describe, expect, test } from "vitest";

import type { OutboundRequest } from "./delete-account.contract.ts";
import type { CampaignConfig } from "./push-campaign-plan.ts";
import {
  createPushCampaignsHandler,
  type PushCampaignsLog,
  pushCampaignsEnvFrom,
  resetContentCache,
} from "./push-campaigns-handler.ts";

const URL_BASE = "https://p.supabase.co";
const KEY = "service-key";
const NOW = Date.UTC(2026, 10, 16, 12, 5); // 마닐라 20:05
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

const entry = { en: { title: "Korean time", body: "{name}, try again." } };
const config: CampaignConfig = {
  localHours: { noon: 12, evening: 20 },
  minIdleHours: 12,
  minGapHours: 6,
  dailyDays: 7,
  winbackDays: [10],
  stages: { "tutorial-lesson2": "tutorial" },
  copy: {
    tutorial: { noon: [entry], evening: [entry], winback: [entry] },
    next: { noon: [], evening: [], winback: [] },
    mid: { noon: [], evening: [], winback: [] },
  },
  lastCopy: entry,
};

const content: Record<string, unknown> = {
  "manifests/level-5.json": {
    episodes: [{ id: "u00-tutorial", order: 0, url: "episodes/level-5/u00-tutorial.json" }],
  },
  "episodes/level-5/u00-tutorial.json": {
    title_en: "Tutorial",
    counterpart: "승무원",
    steps: [{ id: "S1" }, { id: "S2" }, { id: "RP" }],
  },
  "push/level-5/index.json": {
    units: [{ unit: "u00-tutorial", url: "push/u00-tutorial.json", steps: ["S1", "S2", "RP"] }],
  },
  "push/level-5/u00-tutorial.json": {
    title_en: "Tutorial",
    after: { S1: [{ hook_name: "dare", text: { en: "after S1" } }] },
  },
};

function fakeNetwork(options: { insertStatus?: number } = {}) {
  const calls: OutboundRequest[] = [];
  const learners = [
    ...Array.from({ length: 40 }, (_, n) => ({
      user_id: uuid(n),
      last_active_at: new Date(NOW - 30 * 3600_000).toISOString(),
      name: "Ana",
      country_code: "PH",
      catalog_progress: { "u00-tutorial": ["intro", "S1"] },
      tester: false,
      last_campaign_at: null,
    })),
    {
      user_id: uuid(99),
      last_active_at: new Date(NOW - 30 * 3600_000).toISOString(),
      name: "Tester",
      country_code: "PH",
      catalog_progress: { "u00-tutorial": ["intro", "S1"] },
      tester: true,
      last_campaign_at: null,
    },
  ];
  const outbound = async (request: OutboundRequest) => {
    calls.push(request);
    const reply = (status: number, body: unknown) => ({
      status,
      text: async () => JSON.stringify(body),
    });
    if (request.url.includes("/rpc/push_campaign_learners")) return reply(200, learners);
    if (request.url.includes("/storage/v1/object/public/content/")) {
      const path = request.url.split("/content/")[1]!;
      return path in content ? reply(200, content[path]) : reply(404, {});
    }
    if (request.url.endsWith("/rest/v1/push_campaign_sends"))
      return reply(options.insertStatus ?? 201, null);
    if (request.url.endsWith("/functions/v1/send-push")) {
      const body = JSON.parse(request.body ?? "{}");
      const n = body.audience.userIds.length;
      return reply(200, { devices: n, sent: n, failed: 0, removed: 0 });
    }
    return reply(404, {});
  };
  return { calls, outbound };
}

const post = (body: unknown, key = KEY) =>
  new Request(`${URL_BASE}/functions/v1/push-campaigns`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

function handlerWith(network: ReturnType<typeof fakeNetwork>) {
  const logs: PushCampaignsLog[] = [];
  const handler = createPushCampaignsHandler({
    env: { supabaseUrl: URL_BASE, serviceKey: KEY },
    outbound: network.outbound,
    sendOutbound: network.outbound,
    config,
    nowMs: () => NOW,
    log: (entry) => logs.push(entry),
  });
  return { handler, logs };
}

beforeEach(() => resetContentCache());

describe("PCH1 환경 · 권한", () => {
  test("URL은 https, 키는 필수", () => {
    expect(
      pushCampaignsEnvFrom(
        (n) => ({ SUPABASE_URL: "https://p.supabase.co/", SUPABASE_SERVICE_ROLE_KEY: " k " })[n],
      ),
    ).toEqual({
      supabaseUrl: "https://p.supabase.co",
      serviceKey: "k",
    });
    expect(
      pushCampaignsEnvFrom(
        (n) => ({ SUPABASE_URL: "http://x", SUPABASE_SERVICE_ROLE_KEY: "k" })[n],
      ),
    ).toBeNull();
  });

  test("서버 키가 아니면 401, GET은 405", async () => {
    const { handler } = handlerWith(fakeNetwork());
    expect((await handler(post({}, "nope"))).status).toBe(401);
    expect((await handler(new Request(URL_BASE, { method: "GET" }))).status).toBe(405);
  });
});

describe("PCH2 미리보기 · 발송", () => {
  test("dryRun은 기록 · 발송 없이 요약과 예시만 준다", async () => {
    const network = fakeNetwork();
    const { handler } = handlerWith(network);
    const response = await handler(post({ dryRun: true }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.learners).toBe(40); // 시험 계정 제외
    expect(body.sent + body.control).toBe(40);
    expect(body.samples.length).toBeGreaterThan(0);
    expect(network.calls.some((call) => call.url.endsWith("/push_campaign_sends"))).toBe(false);
    expect(network.calls.some((call) => call.url.endsWith("/send-push"))).toBe(false);
  });

  test("배정을 먼저 남기고, 받는 사람만 send-push로 보낸다", async () => {
    const network = fakeNetwork();
    const { handler, logs } = handlerWith(network);
    const response = await handler(post({}));
    expect(response.status).toBe(200);
    const body = await response.json();
    const insertAt = network.calls.findIndex((call) => call.url.endsWith("/push_campaign_sends"));
    const sendAt = network.calls.findIndex((call) => call.url.endsWith("/send-push"));
    expect(insertAt).toBeGreaterThan(-1);
    expect(sendAt).toBeGreaterThan(insertAt);
    const recorded = JSON.parse(network.calls[insertAt]!.body!);
    expect(recorded).toHaveLength(40);
    expect(recorded.every((row: { user_id: string }) => row.user_id !== uuid(99))).toBe(true);
    const sentIds = network.calls
      .filter((call) => call.url.endsWith("/send-push"))
      .flatMap((call) => JSON.parse(call.body!).audience.userIds);
    expect(sentIds.length).toBe(body.sent);
    expect(body.delivery.delivered).toBe(body.sent);
    expect(logs.at(-1)).toMatchObject({ event: "push-campaigns", status: 200, dryRun: false });
  });

  test("기록이 실패하면 보내지 않는다(502)", async () => {
    const network = fakeNetwork({ insertStatus: 500 });
    const { handler } = handlerWith(network);
    expect((await handler(post({}))).status).toBe(502);
    expect(network.calls.some((call) => call.url.endsWith("/send-push"))).toBe(false);
  });

  test("콘텐츠를 못 읽으면 보내지 않는다(502)", async () => {
    const network = fakeNetwork();
    delete content["push/level-5/u00-tutorial.json"];
    try {
      const { handler } = handlerWith(network);
      expect((await handler(post({}))).status).toBe(502);
    } finally {
      content["push/level-5/u00-tutorial.json"] = {
        title_en: "Tutorial",
        after: { S1: [{ hook_name: "dare", text: { en: "after S1" } }] },
      };
    }
    expect(network.calls.some((call) => call.url.endsWith("/send-push"))).toBe(false);
  });
});
