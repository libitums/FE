import assert from "node:assert/strict";
import { test } from "node:test";

import {
  firstJsonArray,
  hogqlTimeMs,
  lastConsoleSends,
  posthogReturns,
  supabaseClient,
} from "./sources.mjs";

test("PC-IO1. CLI 출력에서 첫 JSON 배열만 꺼낸다(뒤에 붙은 안내 무시)", () => {
  const text =
    '[{"name":"service_role","api_key":"k]["}]\nA new version of Supabase CLI is available [x]';
  assert.deepEqual(firstJsonArray(text), [{ name: "service_role", api_key: "k][" }]);
  assert.equal(firstJsonArray("no json"), null);
});

test("PC-IO2. HogQL 시각은 시간대가 없으면 UTC로 읽고, 1970은 없음이다", () => {
  assert.equal(hogqlTimeMs("2026-11-12T11:00:00"), Date.UTC(2026, 10, 12, 11));
  assert.equal(hogqlTimeMs("2026-11-12T11:00:00Z"), Date.UTC(2026, 10, 12, 11));
  assert.equal(hogqlTimeMs("2026-11-12T20:00:00+09:00"), Date.UTC(2026, 10, 12, 11));
  assert.equal(hogqlTimeMs("1970-01-01T00:00:00"), null);
  assert.equal(hogqlTimeMs(null), null);
});

test("PC-IO3. 마지막 콘솔 발송은 발송 그룹만, 미리보기 기록은 세지 않는다", () => {
  const last = lastConsoleSends([
    {
      sentAtMs: 10,
      recipients: [
        { userId: "a", group: "sent" },
        { userId: "b", group: "control" },
      ],
    },
    { sentAtMs: 20, recipients: [{ userId: "a", group: "sent" }] },
    { sentAtMs: 30, dryRun: true, recipients: [{ userId: "c", group: "sent" }] },
  ]);
  assert.deepEqual([...last], [["a", 20]]);
});

test("PC-IO4. PostgREST 표는 1,000행씩 끝까지 읽고, send-push는 announcement 본문을 보낸다", async () => {
  const calls = [];
  const fetchImpl = async (url, init = {}) => {
    calls.push({ url, init });
    if (url.includes("/rest/v1/push_devices")) {
      const offset = Number(new URL(url).searchParams.get("offset"));
      const rows = Array.from({ length: offset === 0 ? 1000 : 3 }, (_, i) => ({
        user_id: `u${offset + i}`,
      }));
      return { ok: true, json: async () => rows };
    }
    return {
      ok: true,
      status: 200,
      text: async () => '{"devices":2,"sent":2,"failed":0,"removed":0}',
    };
  };
  const client = supabaseClient({ projectRef: "ref", key: "k", fetchImpl });
  assert.equal((await client.devices()).length, 1003);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].init.headers.Authorization, "Bearer k");

  const result = await client.sendAnnouncement({ userIds: ["a"], title: "T", body: "B" });
  assert.equal(result.summary.sent, 2);
  const last = calls.at(-1);
  assert.equal(last.url, "https://ref.supabase.co/functions/v1/send-push");
  assert.deepEqual(JSON.parse(last.init.body), {
    kind: "announcement",
    audience: { userIds: ["a"] },
    title: "T",
    body: "B",
    target: null,
  });
});

test("PC-IO5. PostHog 키가 없으면 null, 있으면 사람마다 첫 이벤트 · 발송 뒤 첫 누름", async () => {
  assert.equal(
    await posthogReturns({ posthogPersonalApiKey: null, posthogProjectId: "1" }, [], 0),
    null,
  );
  const id = "00000000-0000-4000-8000-000000000001";
  let sentQuery = "";
  const fetchImpl = async (_url, init) => {
    sentQuery = JSON.parse(init.body).query.query;
    return {
      ok: true,
      json: async () => ({ results: [[id, "2026-11-12T12:00:00", "1970-01-01T00:00:00"]] }),
    };
  };
  const result = await posthogReturns(
    { posthogPersonalApiKey: "p", posthogProjectId: "1", posthogHost: "https://ph" },
    [id, "not-a-uuid'); DROP"],
    Date.UTC(2026, 10, 12, 11),
    { fetchImpl },
  );
  assert.deepEqual(
    [...result],
    [[id, { firstEventMs: Date.UTC(2026, 10, 12, 12), firstTapMs: null }]],
  );
  assert.ok(!sentQuery.includes("DROP"));
});

test("PC-IO6. PostHog 응답에 results가 없거나 배열이 아니면 빈 결과다(리뷰 지적)", async () => {
  const id = "00000000-0000-4000-8000-000000000001";
  for (const body of [{}, { results: null }, { results: "x" }]) {
    const result = await posthogReturns(
      { posthogPersonalApiKey: "p", posthogProjectId: "1", posthogHost: "https://ph" },
      [id],
      0,
      { fetchImpl: async () => ({ ok: true, json: async () => body }) },
    );
    assert.equal(result.size, 0);
  }
});
