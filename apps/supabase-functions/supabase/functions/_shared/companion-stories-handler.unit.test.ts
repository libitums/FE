import { expect, test } from "vitest";

import type { ChatSendEnv, ChatSendLogEntry } from "./chat-send.contract.ts";
import {
  createStoriesHandler,
  STORY_PUSH_CONCURRENCY,
  STORY_PUSH_HOLDOUT,
  storyPushPlan,
} from "./companion-stories-handler.ts";
import type { OutboundRequest } from "./delete-account.contract.ts";
import { inHoldout } from "./push-campaign-text.ts";

// 친구 스토리(ADR-0178 D1 · D7): 매시 — 올리고(`companion_post_stories`) → 알림 후보 → 사람마다 한 통(배정 기록 뒤 발송).
const env: ChatSendEnv = {
  supabaseUrl: "https://ref.supabase.co",
  supabaseAnonKey: "anon",
  supabaseServiceRoleKey: "service-secret",
  llm: { kind: "fake" },
  translation: "every",
};
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const SEED = "series:스토리";
const pick = (control: boolean) => {
  for (let n = 1; n < 500; n += 1)
    if (inHoldout(SEED, uuid(n), STORY_PUSH_HOLDOUT) === control) return uuid(n);
  throw new Error("no id");
};
const line = "야근 끝! 편의점 라면이 최고야";
const candidate = (userId: string, extra: Record<string, unknown> = {}) => ({
  userId,
  storyId: "5c6d7e8f-9a0b-4c1d-8e2f-3a4b5c6d7e8f",
  characterId: "yoonkyung",
  name: "정윤경",
  line,
  mode: "on",
  tester: false,
  ...extra,
});

test("SH1. 계획 — on은 대조군 30%(기록만), 받는 쪽은 제목 = 이름 · 본문 「posted a story — <한 줄>」, 시험 단계는 시험 묶음으로 기록", () => {
  const sent = storyPushPlan({
    mode: "on",
    tester: false,
    userId: pick(false),
    name: "정윤경",
    line,
  });
  expect(sent).toEqual({
    group: "sent",
    variant: "a",
    series: "스토리",
    lang: "en",
    title: "정윤경",
    body: `posted a story — ${line}`,
  });
  expect(
    storyPushPlan({ mode: "on", tester: false, userId: pick(true), name: "정윤경", line }),
  ).toEqual({ ...sent, group: "control", variant: null });
  expect(
    storyPushPlan({ mode: "testers", tester: true, userId: pick(true), name: "정윤경", line }),
  ).toEqual({ ...sent, series: "스토리 시험" });
  expect(
    storyPushPlan({ mode: "testers", tester: false, userId: uuid(1), name: "정윤경", line }),
  ).toBeNull();
  expect(
    storyPushPlan({ mode: "off", tester: true, userId: uuid(1), name: "정윤경", line }),
  ).toBeNull();

  const long = storyPushPlan({
    mode: "on",
    tester: false,
    userId: pick(false),
    name: "정윤경",
    line: `${"가".repeat(60)}\n다음 줄`,
  });
  expect(long?.body).toBe(`posted a story — ${"가".repeat(39)}…`);

  const ids = Array.from({ length: 2000 }, (_, n) => uuid(n + 1000));
  const share = ids.filter((id) => inHoldout(SEED, id, STORY_PUSH_HOLDOUT)).length / ids.length;
  expect(share).toBeGreaterThan(0.26);
  expect(share).toBeLessThan(0.34);
});

function setup(options: {
  candidates?: unknown[];
  recordStatus?: number;
  sendStatus?: number;
  postStatus?: number;
  serviceKey?: boolean;
}) {
  const requests: OutboundRequest[] = [];
  const logs: ChatSendLogEntry[] = [];
  const outbound = async (request: OutboundRequest) => {
    requests.push(request);
    if (request.url.includes("/auth/v1/admin/users"))
      return { status: options.serviceKey === false ? 401 : 200, text: async () => "{}" };
    if (request.url.endsWith("/rpc/companion_post_stories"))
      return {
        status: options.postStatus ?? 200,
        text: async () =>
          JSON.stringify({ posted: [{ storyId: "s", characterId: "yoonkyung", poolId: "p" }] }),
      };
    if (request.url.endsWith("/rpc/companion_story_push_candidates"))
      return { status: 200, text: async () => JSON.stringify(options.candidates ?? []) };
    if (request.url.endsWith("/rest/v1/push_campaign_sends"))
      return { status: options.recordStatus ?? 201, text: async () => "" };
    if (request.url.endsWith("/functions/v1/send-push"))
      return {
        status: options.sendStatus ?? 200,
        text: async () => JSON.stringify({ devices: 1, sent: 1, failed: 0, removed: 0 }),
      };
    return { status: 404, text: async () => "" };
  };
  const handler = createStoriesHandler({
    env,
    outbound,
    nowMs: () => Date.parse("2026-12-01T05:05:00Z"),
    log: (entry) => logs.push(entry),
  });
  const call = (token = "service-secret", method = "POST") =>
    handler(
      new Request("https://ref.supabase.co/functions/v1/companion-stories", {
        method,
        headers: { Authorization: `Bearer ${token}` },
        ...(method === "POST" ? { body: "{}" } : {}),
      }),
    );
  const bodyOf = (suffix: string) =>
    requests
      .filter((r) => r.url.endsWith(suffix))
      .map((r) => JSON.parse(r.body ?? "null") as unknown);
  return { call, requests, bodyOf, logs, outbound };
}

test("SH1b. 본문은 받는 사람 나라의 언어(일곱) — 제목은 인물 이름, 나라를 모르면 영어(검수 B1)", () => {
  const plan = (country: string | null) =>
    storyPushPlan({
      mode: "on",
      tester: false,
      userId: pick(false),
      name: "정윤경",
      line,
      country,
    });
  const bodies = Object.fromEntries(
    ["US", "MX", "ID", "JP", "VN", "TH", "MM", "MY", null].map((country) => {
      const p = plan(country);
      return [String(country), { lang: p?.lang, body: p?.body, title: p?.title }];
    }),
  );
  expect(bodies).toEqual({
    US: { lang: "en", body: `posted a story — ${line}`, title: "정윤경" },
    MX: { lang: "es", body: `publicó una historia — ${line}`, title: "정윤경" },
    ID: { lang: "id", body: `membagikan cerita — ${line}`, title: "정윤경" },
    JP: { lang: "ja", body: `ストーリーを投稿しました — ${line}`, title: "정윤경" },
    VN: { lang: "vi", body: `vừa đăng tin — ${line}`, title: "정윤경" },
    TH: { lang: "th", body: `โพสต์สตอรี่ใหม่ — ${line}`, title: "정윤경" },
    MM: { lang: "my", body: `စတိုရီအသစ် တင်လိုက်ပါပြီ — ${line}`, title: "정윤경" },
    MY: { lang: "id", body: `membagikan cerita — ${line}`, title: "정윤경" },
    null: { lang: "en", body: `posted a story — ${line}`, title: "정윤경" },
  });
});

test("SH1c. 후보의 나라로 기록 · 발송 언어를 정한다(검수 B1)", async () => {
  const userId = pick(false);
  const t = setup({ candidates: [candidate(userId, { country: "JP" })] });
  await t.call();
  expect(t.bodyOf("/rest/v1/push_campaign_sends")).toEqual([
    [expect.objectContaining({ lang: "ja", body: `ストーリーを投稿しました — ${line}` })],
  ]);
  expect(t.bodyOf("/functions/v1/send-push")).toEqual([
    expect.objectContaining({ title: "정윤경", body: `ストーリーを投稿しました — ${line}` }),
  ]);
});

test("SH2. 올리고 → 후보 → 받는 사람은 배정 기록 뒤 send-push(그 사람 하나 · 목적지 companion-chat + story)", async () => {
  const userId = pick(false);
  const t = setup({ candidates: [candidate(userId)] });
  const response = await t.call();
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({
    posted: 1,
    outcomes: [
      { userId, characterId: "yoonkyung", storyId: candidate(userId).storyId, result: "sent" },
    ],
  });
  expect(t.requests.map((r) => r.url.split(".co")[1])).toEqual([
    "/rest/v1/rpc/companion_post_stories",
    "/rest/v1/rpc/companion_story_push_candidates",
    "/rest/v1/push_campaign_sends",
    "/functions/v1/send-push",
  ]);
  expect(t.bodyOf("/rpc/companion_post_stories")).toEqual([{ p_now: "2026-12-01T05:05:00.000Z" }]);
  expect(t.bodyOf("/rpc/companion_story_push_candidates")).toEqual([
    { p_now: "2026-12-01T05:05:00.000Z", p_limit: 200 },
  ]);
  expect(t.bodyOf("/rest/v1/push_campaign_sends")).toEqual([
    [
      {
        run_at: "2026-12-01T05:05:00.000Z",
        series: "스토리",
        segment: "friend-story",
        user_id: userId,
        group: "sent",
        variant: "a",
        lang: "en",
        story_step: null,
        title: "정윤경",
        body: `posted a story — ${line}`,
        character_id: "yoonkyung",
        story_id: candidate(userId).storyId,
      },
    ],
  ]);
  expect(t.bodyOf("/functions/v1/send-push")).toEqual([
    {
      kind: "announcement",
      audience: { userIds: [userId] },
      title: "정윤경",
      body: `posted a story — ${line}`,
      target: { kind: "companion-chat", characterId: "yoonkyung", story: true },
    },
  ]);
});

test("SH3. 대조군은 기록만, 기록 실패면 보내지 않음, 발송 실패 · 모르는 후보는 결과에만 — 던지지 않는다", async () => {
  const control = pick(true);
  const recordFails = pick(false);
  const t = setup({ candidates: [candidate(control), { userId: "x" }] });
  const result = (await (await t.call()).json()) as { outcomes: { result: string }[] };
  expect(result.outcomes.map((o) => o.result)).toEqual(["control", "invalid"]);
  expect(t.bodyOf("/functions/v1/send-push")).toEqual([]);

  const failed = setup({ candidates: [candidate(recordFails)], recordStatus: 500 });
  expect(
    ((await (await failed.call()).json()) as { outcomes: { result: string }[] }).outcomes[0]
      ?.result,
  ).toBe("record_failed");
  expect(failed.bodyOf("/functions/v1/send-push")).toEqual([]);

  const sendFails = setup({ candidates: [candidate(recordFails)], sendStatus: 502 });
  expect(
    ((await (await sendFails.call()).json()) as { outcomes: { result: string }[] }).outcomes[0]
      ?.result,
  ).toBe("send_failed");
});

test("SH4. 서버 키만 · POST만 — 올리기가 실패해도 알림 후보는 돈다", async () => {
  expect((await setup({ serviceKey: false }).call("user-token")).status).toBe(401);
  expect((await setup({}).call("service-secret", "GET")).status).toBe(405);
  const t = setup({ postStatus: 500, candidates: [] });
  const response = await t.call();
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ posted: 0, outcomes: [] });
  expect(t.logs.at(-1)).toMatchObject({ event: "companion_stories", status: 200 });
});

test("SH5. 사람마다 알림은 동시에 STORY_PUSH_CONCURRENCY명까지 — 결과 순서는 후보 순서 그대로", async () => {
  const users = Array.from({ length: 500 }, (_, n) => uuid(n + 1))
    .filter((id) => !inHoldout(SEED, id, STORY_PUSH_HOLDOUT))
    .slice(0, 20);
  const t = setup({ candidates: users.map((id) => candidate(id)) });
  let inFlight = 0;
  let most = 0;
  const handler = createStoriesHandler({
    env,
    outbound: async (request) => {
      if (!request.url.endsWith("/functions/v1/send-push")) return t.outbound(request);
      inFlight += 1;
      most = Math.max(most, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 2));
      inFlight -= 1;
      return t.outbound(request);
    },
    nowMs: () => Date.parse("2026-12-01T05:05:00Z"),
    log: () => undefined,
  });
  const response = await handler(
    new Request("https://ref.supabase.co/functions/v1/companion-stories", {
      method: "POST",
      headers: { Authorization: "Bearer service-secret" },
      body: "{}",
    }),
  );
  const result = (await response.json()) as { outcomes: { userId: string; result: string }[] };
  expect(result.outcomes.map((o) => o.userId)).toEqual(users);
  expect(result.outcomes.every((o) => o.result === "sent")).toBe(true);
  expect(most).toBeGreaterThan(1);
  expect(most).toBeLessThanOrEqual(STORY_PUSH_CONCURRENCY);
});
