import { afterAll, beforeAll, beforeEach, expect, test } from "vitest";
import { signIn, startTestDatabase } from "./postgres.test-support";

// 학습 표현 연결(20261125): 학습 맥락의 유저 기록 · 넣기 설정, 기록 세기(없는 표현 · 모르는 종류는 건너뜀), 교정 카드의 learnedUsed,
// 학습 지표(넣은 턴 · 방식 · 유도 뒤 산출 · 다시 쓴 표현), 권한.
const tester = "00000000-0000-4000-8000-0000000000e1";
const now = new Date(Math.floor(Date.now() / 1000) * 1000).toISOString();
const since = new Date(Date.parse(now) - 3_600_000).toISOString();

let db: Awaited<ReturnType<typeof startTestDatabase>>;
let server: Awaited<ReturnType<typeof db.connect>>;
let app: typeof server;

type Begun = { result: string; userMessageId: string; holdId: string };

async function turn(text: string, learning: Record<string, unknown>, feedback: unknown = null) {
  const begun = (
    await server.query(
      "select public.companion_begin_turn($1, 'duksu', $2, $3, 'text', 20, null, $4) as t",
      [tester, crypto.randomUUID(), text, now],
    )
  ).rows[0].t as Begun;
  expect(begun.result).toBe("ok");
  const assistantId = crypto.randomUUID();
  await server.query(
    "select public.companion_finish_turn($1, 'complete', $2::jsonb, '[]'::jsonb, '{}', $3, $4::jsonb, 0, null, $5)",
    [
      begun.userMessageId,
      JSON.stringify({
        id: assistantId,
        origin: "turn",
        segments: [{ kind: "speech", text: "네!" }],
        meta: { model: "fake", learning },
      }),
      now,
      feedback === null ? null : JSON.stringify(feedback),
      begun.holdId,
    ],
  );
  return { userMessageId: begun.userMessageId, assistantId };
}

const record = (events: unknown[], at = now) =>
  server.query("select public.companion_record_learning($1, $2::jsonb, $3) as n", [
    tester,
    JSON.stringify(events),
    at,
  ]);

const context = async () =>
  (await server.query("select public.companion_learning_context($1, 10) as c", [tester])).rows[0]
    .c as {
    expressions: Record<string, unknown>[];
    settings: Record<string, unknown>;
  };

beforeAll(async () => {
  db = await startTestDatabase();
  server = await db.connect();
  app = await db.connect();
  await server.query("set role service_role");
}, 90_000);
afterAll(async () => {
  await db?.close();
});
beforeEach(async () => {
  await db.admin.query("truncate auth.users cascade");
  await db.admin.query("truncate companion.expression_units, companion.user_expressions");
  await db.admin.query("delete from companion.expressions");
  await db.admin.query("update companion.settings set testers_only = true, trial_limit = 100");
  await db.admin.query(
    `insert into auth.users (id, email, raw_app_meta_data) values ($1, 'ln@libitum.test', '{"duru_tester": true}')`,
    [tester],
  );
  await db.admin.query(`
    insert into companion.expressions (id, kind, surface, gloss_en) values
      ('expr:fine', 'expr', '괜찮아요.', 'I''m fine'), ('patt:means', 'patt', '{수단}로 할게요.', 'I''ll use {means}');
    insert into companion.expression_units values ('expr:fine', 'u01-water', 'S1'), ('patt:means', 'u01-water', 'S2');
  `);
  await db.admin.query("insert into public.learning_progress (user_id, progress) values ($1, $2)", [
    tester,
    JSON.stringify({ version: 1, catalogProgress: { "u01-water": ["S1", "S2"] } }),
  ]);
});

test("LE1. 학습 맥락 — 표현마다 유저 기록 · 낸 에피소드와 넣기 설정", async () => {
  const before = await context();
  expect(before.settings).toEqual({
    enabled: true,
    minGap: 3,
    baseProbability: 0.3,
    forceTurns: 6,
    dailyCap: 6,
  });
  expect(before.expressions[0]).toMatchObject({
    id: "expr:fine",
    episode: "u01-water",
    exposed: 0,
    produced: 0,
    lastSeenAt: null,
  });
  const counted = await record([
    { expression_id: "expr:fine", kind: "exposed" },
    { expression_id: "expr:fine", kind: "elicited" },
    { expression_id: "expr:fine", kind: "produced" },
    { expression_id: "voca:nope", kind: "exposed" },
    { expression_id: "expr:fine", kind: "dance" },
  ]);
  expect(counted.rows[0].n).toBe(3);
  const after = await context();
  expect(after.expressions[0]).toMatchObject({
    exposed: 1,
    elicited: 1,
    chipShown: 0,
    produced: 1,
  });
  expect(after.expressions[0]!.lastSeenAt).not.toBeNull();
  await db.admin.query(
    "update companion.settings set learning_daily_cap = 2, learning_enabled = false",
  );
  expect((await context()).settings).toMatchObject({ enabled: false, dailyCap: 2 });
  await expect(
    db.admin.query("update companion.settings set learning_force_turns = 1"),
  ).rejects.toMatchObject({ code: "23514" });
});

test("LE2. 교정 카드 — 유저가 쓴 배운 표현(learnedUsed)은 있을 때만", async () => {
  const card = {
    status: "none",
    kind: null,
    original: "괜찮아요",
    corrected: null,
    items: [],
    better: null,
    meaning: null,
  };
  const used = await turn(
    "괜찮아요",
    { open: false, reason: "cooldown", produced: ["expr:fine"] },
    {
      ...card,
      learnedUsed: [{ id: "expr:fine", surface: "괜찮아요." }],
    },
  );
  const plain = await turn("네", { open: false, reason: "cooldown" }, card);
  await signIn(app, tester);
  const page = (await app.query("select public.companion_list_messages('duksu', null, 50) as p"))
    .rows[0].p as { messages: { id: string; feedback?: Record<string, unknown> | null }[] };
  const correctionOf = (id: string) => page.messages.find((m) => m.id === id)?.feedback;
  expect(correctionOf(used.userMessageId)?.learnedUsed).toEqual([
    { id: "expr:fine", surface: "괜찮아요." },
  ]);
  expect(correctionOf(plain.userMessageId)).not.toHaveProperty("learnedUsed");
});

test("LE3. 학습 지표 — 열린 턴 · 넣은 턴(방식별 · 따름) · 까닭 · 유도 뒤 산출 · 다시 쓴 표현", async () => {
  await turn("하나", { open: false, reason: "cooldown" });
  await turn("둘", {
    open: true,
    reason: "ok",
    mode: "elicit",
    expressionId: "expr:fine",
    surface: "괜찮아요.",
    done: true,
  });
  await turn("괜찮아요", { open: false, reason: "cooldown", produced: ["expr:fine"] });
  await turn("셋", {
    open: true,
    reason: "ok",
    mode: "expose",
    expressionId: "patt:means",
    surface: "{수단}로 할게요.",
    done: false,
  });
  await record([{ expression_id: "expr:fine", kind: "produced" }], since);
  await record(
    [{ expression_id: "expr:fine", kind: "produced" }],
    new Date(Date.parse(now) + 2 * 86_400_000).toISOString(),
  );
  const stats = (await server.query("select public.companion_learning_stats($1) as s", [since]))
    .rows[0].s;
  expect(stats).toMatchObject({
    turns: 4,
    open: 2,
    inserted: 2,
    byMode: { elicit: { inserted: 1, done: 1 }, expose: { inserted: 1, done: 0 } },
    reasons: { cooldown: 2, ok: 2 },
    producedTurns: 1,
    elicitedDone: 1,
    elicitedProduced: 1,
    reused: 1,
    producedExpressions: 1,
  });
  expect(stats.topExpressions).toHaveLength(2);
});

test("LE4. 권한 — 기록 · 지표는 service_role만", async () => {
  await signIn(app, tester);
  await expect(
    app.query("select public.companion_record_learning($1, '[]'::jsonb, now())", [tester]),
  ).rejects.toMatchObject({ code: "42501" });
  await expect(app.query("select public.companion_learning_stats(now())")).rejects.toMatchObject({
    code: "42501",
  });
  await expect(app.query("select * from companion.user_expressions")).rejects.toMatchObject({
    code: "42501",
  });
});
