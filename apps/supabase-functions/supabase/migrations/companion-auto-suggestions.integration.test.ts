import { afterAll, beforeAll, beforeEach, expect, test } from "vitest";
import { signIn, startTestDatabase } from "./postgres.test-support";

// 추천 답변 칩 자동(20261119): 판정이 칩 스위치(`replySuggestions`)를 돌려주고, chat-send의 저장 경로(끝 → 칩 저장)가
// `companion_suggest_context`의 캐시로 그대로 읽힌다.
const tester = "00000000-0000-4000-8000-0000000000c1";
const other = "00000000-0000-4000-8000-0000000000c2";
const now = new Date(Math.floor(Date.now() / 1000) * 1000).toISOString();

let db: Awaited<ReturnType<typeof startTestDatabase>>;
let server: Awaited<ReturnType<typeof db.connect>>;
let app: typeof server;

async function gate(user = tester, character = "duksu") {
  const result = await server.query(
    "select public.companion_turn_gate($1, $2, $3, $4, null) as g",
    [user, character, crypto.randomUUID(), now],
  );
  return result.rows[0].g as Record<string, unknown>;
}

const items = [
  { text: "저도 좋아요.", meaning: "I like it too.", intent: "continue" },
  { text: "쌤은 뭐 좋아해요?", meaning: "What do you like?", intent: "ask" },
  { text: "진짜요?", meaning: "Really?", intent: "react" },
];

beforeAll(async () => {
  db = await startTestDatabase();
  server = await db.connect();
  app = await db.connect();
  await server.query("set role service_role");
}, 30_000);
afterAll(async () => {
  await db?.close();
});
beforeEach(async () => {
  await db.admin.query("truncate auth.users cascade");
  await db.admin.query("update companion.settings set testers_only = true");
  await db.admin.query(
    `insert into auth.users (id, email, raw_app_meta_data) values
       ($1, 'as@libitum.test', '{"duru_tester": true}'), ($2, 'other@libitum.test', '{}')`,
    [tester, other],
  );
});

test("AS1. 판정이 칩 스위치를 돌려준다 — 프로필이 없으면 참, 끄면 거짓, 다른 칸은 그대로", async () => {
  expect(await gate()).toEqual({
    result: "ok",
    ageBand: "unknown",
    l1: null,
    region: null,
    tier: "free",
    feedbackMode: "separate",
    memoryEnabled: true,
    replySuggestions: true,
    notices: ["ai_disclosure", "minor_notice"],
  });
  await signIn(app, tester);
  await app.query("select public.companion_save_profile(1990, 'self', 'vi', 'natural')");
  expect(await gate()).toMatchObject({
    ageBand: "adult",
    l1: "vi",
    feedbackMode: "natural",
    replySuggestions: true,
  });
  await app.query(
    "select public.companion_save_profile(null, null, null, null, null, null, null, false)",
  );
  expect((await gate()).replySuggestions).toBe(false);
  await server.query(
    "select public.companion_operator_set_profile($1, null, false, null, null, null, null, null, null, true)",
    [tester],
  );
  expect((await gate()).replySuggestions).toBe(true);
});

test("AS2. 판정을 통과하지 못하면 결과만 — 스위치를 싣지 않는다 · 앱은 부를 수 없다", async () => {
  expect(await gate(other)).toEqual({ result: "not_available" });
  expect(await gate(tester, "nobody")).toEqual({ result: "character_not_found" });
  await signIn(app, tester);
  await expect(
    app.query("select public.companion_turn_gate($1, 'duksu', $2, now(), null)", [
      tester,
      crypto.randomUUID(),
    ]),
  ).rejects.toMatchObject({ code: "42501" });
});

test("AS3. chat-send 저장 경로 — 끝(finish)이 만든 캐릭터 메시지에 칩을 저장하면 companion-suggest가 캐시로 읽는다", async () => {
  const begun = (
    await server.query(
      "select public.companion_begin_turn($1, 'duksu', $2, '안녕하세요', 'text', 20, null, $3) as t",
      [tester, crypto.randomUUID(), now],
    )
  ).rows[0].t as { result: string; userMessageId: string; holdId: string };
  expect(begun.result).toBe("ok");
  const assistantId = crypto.randomUUID();
  await server.query(
    "select public.companion_finish_turn($1, 'complete', $2::jsonb, '[]'::jsonb, '{}', $3, null, 0, null, $4)",
    [
      begun.userMessageId,
      JSON.stringify({
        id: assistantId,
        origin: "turn",
        segments: [{ kind: "speech", text: "반가워요!" }],
      }),
      now,
      begun.holdId,
    ],
  );
  const suggestions = { items, model: "fake", createdAt: now };
  const saved = await server.query(
    "select public.companion_save_suggestions($1, $2, $3::jsonb) as ok",
    [tester, assistantId, JSON.stringify(suggestions)],
  );
  expect(saved.rows[0].ok).toBe(true);
  const context = await server.query(
    "select public.companion_suggest_context($1, 'duksu', 6, $2) as c",
    [tester, now],
  );
  expect(context.rows[0].c.latest).toEqual({
    id: assistantId,
    status: "complete",
    origin: "turn",
    refusal: false,
    suggestions,
  });
});
