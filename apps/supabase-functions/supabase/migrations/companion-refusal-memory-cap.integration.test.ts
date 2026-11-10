import { readFile } from "node:fs/promises";

import { afterAll, beforeAll, beforeEach, expect, test } from "vitest";
import { signIn, startTestDatabase } from "./postgres.test-support";

// 20261117: 단계 제재의 턴 상태(반복 위반 수 · 상한 · 기억 가득 참) · 거절 답 저장 · 페르소나 거절 줄, 기억 상한(가장 오래된
// 고치지 않은 기억부터 지움 · 유저가 고친 기억은 지키고 · 모두 지켜지면 넣지 않음 · 상한은 설정에서).
const tester = "00000000-0000-4000-8000-000000000001";
const now = new Date(Math.floor(Date.now() / 1000) * 1000).toISOString();
const migration = new URL("./20261117120000_companion_refusal_memory_cap.sql", import.meta.url);

let db: Awaited<ReturnType<typeof startTestDatabase>>;
let app: Awaited<ReturnType<typeof db.connect>>;
let server: typeof app;
let anon: typeof app;

type Layer = { count: number; cap: number; full: boolean };
type AddResult = { added: number; evicted: number; skipped: number; full: boolean };

const hoursAgo = (hours: number) => new Date(Date.parse(now) - hours * 3_600_000).toISOString();

/** 기억을 정해진 시각으로 바로 넣는다 — 지우는 순서가 시각에 달려 있어 테스트가 고정한다. */
async function seed(
  content: string,
  hours: number,
  options: { shared?: boolean; edited?: boolean } = {},
) {
  const result = await db.admin.query(
    `insert into companion.memories (user_id, character_id, kind, content, user_edited, created_at)
     values ($1, $2, 'fact', $3, $4, $5) returning id`,
    [tester, options.shared ? null : "duksu", content, options.edited ?? false, hoursAgo(hours)],
  );
  return result.rows[0].id as string;
}
async function add(items: { content: string; shared?: boolean }[]) {
  const result = await server.query(
    "select public.companion_add_memories($1, 'duksu', null, $2::jsonb) as r",
    [tester, JSON.stringify(items.map((item) => ({ kind: "fact", shared: false, ...item })))],
  );
  return result.rows[0].r as AddResult;
}
async function list(character: string | null) {
  const result = await app.query("select public.companion_list_memories($1) as m", [character]);
  return result.rows[0].m as Layer & { memories: { content: string; userEdited: boolean }[] };
}
async function status() {
  const result = await server.query("select public.companion_turn_status($1, 'duksu', $2) as s", [
    tester,
    now,
  ]);
  return result.rows[0].s as { strikes: number; strikeLimit: number; memoryFull: boolean };
}
const settings = (assignments: string) =>
  db.admin.query(`update companion.settings set ${assignments}`);

let seq = 0;
const nextId = () => `20000000-0000-4000-8000-${String(++seq).padStart(12, "0")}`;
async function begin() {
  const result = await server.query(
    "select public.companion_begin_turn($1, 'duksu', $2, '나쁜 말', 'text', 20, null, $3) as t",
    [tester, nextId(), now],
  );
  return result.rows[0].t as { result: string; userMessageId: string; holdId: string };
}

beforeAll(async () => {
  db = await startTestDatabase();
  app = await db.connect();
  server = await db.connect();
  anon = await db.connect();
  await server.query("set role service_role");
  await anon.query("set role anon");
}, 30_000);
afterAll(async () => {
  await db?.close();
});
beforeEach(async () => {
  await db.admin.query("truncate auth.users cascade");
  await settings(
    "memory_cap = 50, shared_memory_cap = 30, strike_limit = 3, strike_window = interval '24 hours', trial_limit = 20, message_cost = 1",
  );
  await db.admin.query(
    `insert into auth.users (id, email, raw_app_meta_data) values ($1, 't@libitum.test', '{"duru_tester": true}')`,
    [tester],
  );
  await signIn(app, tester);
});

test("RM1. 기본 상한 — 캐릭터마다 50 · 공유 30, 설정 한 행에 있다", async () => {
  const defaults = await db.admin.query(
    "select column_name, column_default from information_schema.columns where table_schema = 'companion' and table_name = 'settings' and column_name in ('memory_cap', 'shared_memory_cap') order by column_name",
  );
  expect(defaults.rows).toEqual([
    { column_name: "memory_cap", column_default: "50" },
    { column_name: "shared_memory_cap", column_default: "30" },
  ]);
  expect(await list("duksu")).toEqual({ memories: [], count: 0, cap: 50, full: false });
  expect(await list(null)).toMatchObject({ count: 0, cap: 30, full: false });
});

test("RM2. 상한에 닿으면 유저가 고치지 않은 가장 오래된 기억부터 지운다 — 고친 기억은 남는다", async () => {
  await settings("memory_cap = 3");
  const oldest = await seed("가장 오래된 기억", 3);
  await seed("두 번째 기억", 2);
  await seed("세 번째 기억", 1);
  // 유저가 가장 오래된 기억을 고치면 지켜진다.
  await app.query("select public.companion_update_memory($1, '가장 오래된 기억(고침)')", [oldest]);
  expect(await add([{ content: "새 기억" }])).toEqual({
    added: 1,
    evicted: 1,
    skipped: 0,
    full: false,
  });
  const after = await list("duksu");
  expect(after).toMatchObject({ count: 3, cap: 3, full: false });
  expect(after.memories.map((memory) => [memory.content, memory.userEdited])).toEqual([
    ["새 기억", false],
    ["세 번째 기억", false],
    ["가장 오래된 기억(고침)", true],
  ]);
  // 지운 기억은 운영 조회에 deleted로 남는다.
  const inspected = await server.query("select public.companion_inspect_memory($1, 'duksu') as m", [
    tester,
  ]);
  expect(inspected.rows[0].m.memories).toContainEqual(
    expect.objectContaining({ content: "두 번째 기억", deleted: true, userEdited: false }),
  );
  expect(inspected.rows[0].m.capacity).toEqual({
    character: { count: 3, cap: 3, full: false },
    shared: { count: 0, cap: 30, full: false },
  });
});

test("RM3. 모두 유저가 고친 기억이면 넣지 않고 가득 참 — 하나 지우면 풀린다", async () => {
  await settings("memory_cap = 2");
  const first = await seed("고친 기억 하나", 2, { edited: true });
  await seed("고친 기억 둘", 1, { edited: true });
  expect(await add([{ content: "못 넣는 기억" }])).toEqual({
    added: 0,
    evicted: 0,
    skipped: 1,
    full: true,
  });
  expect(await list("duksu")).toMatchObject({ count: 2, cap: 2, full: true });
  expect(await status()).toMatchObject({ memoryFull: true });
  await app.query("select public.companion_delete_memory($1)", [first]);
  expect(await list("duksu")).toMatchObject({ count: 1, full: false });
  expect(await status()).toMatchObject({ memoryFull: false });
  expect(await add([{ content: "이제 넣는 기억" }])).toMatchObject({ added: 1, full: false });
});

test("RM4. 상한은 설정에서 읽는다 — 공유 기억은 따로, 상한을 낮추면 넘친 만큼 지운다", async () => {
  await settings("shared_memory_cap = 1");
  await seed("공유 옛 기억", 2, { shared: true });
  await seed("덕수쌤 기억", 1);
  expect(await add([{ content: "공유 새 기억", shared: true }])).toMatchObject({
    added: 1,
    evicted: 1,
  });
  expect((await list(null)).memories.map((memory) => memory.content)).toEqual(["공유 새 기억"]);
  // 캐릭터 층은 공유 상한과 상관없다.
  expect(await list("duksu")).toMatchObject({ count: 1, cap: 50 });
  // 공유 층만 가득 차도 턴 상태는 가득 참이다.
  await db.admin.query(
    "update companion.memories set user_edited = true where character_id is null",
  );
  expect(await status()).toMatchObject({ memoryFull: true });

  await settings("memory_cap = 2, shared_memory_cap = 30");
  await seed("덕수쌤 기억 둘", 0.5);
  await settings("memory_cap = 1");
  expect(await add([{ content: "덕수쌤 새 기억" }])).toMatchObject({ added: 1, evicted: 2 });
  expect((await list("duksu")).memories.map((memory) => memory.content)).toEqual([
    "덕수쌤 새 기억",
  ]);
  // 이미 있는 글은 상한과 상관없이 넣지 않는다.
  expect(await add([{ content: "덕수쌤 새 기억" }])).toEqual({
    added: 0,
    evicted: 0,
    skipped: 0,
    full: false,
  });
});

test("RM5. 턴 상태 — 창 안의 반복 위반 수 · 상한, 창이 지나면 0", async () => {
  expect(await status()).toEqual({
    strikes: 0,
    strikeLimit: 3,
    memoryFull: false,
    latestSuggestions: [],
  });
  await db.admin.query(
    "insert into companion.moderation_state (user_id, strikes, window_started_at) values ($1, 2, $2)",
    [tester, hoursAgo(1)],
  );
  expect(await status()).toMatchObject({ strikes: 2 });
  await settings("strike_limit = 5, strike_window = interval '30 minutes'");
  expect(await status()).toEqual({
    strikes: 0,
    strikeLimit: 5,
    memoryFull: false,
    latestSuggestions: [],
  });
});

test("RM6. 거절 답 — 차단 턴에 보통 assistant 메시지로(meta.refusal) 저장, 차감 없음 · 반복 위반으로 센다", async () => {
  await db.admin.query("update companion.settings set trial_limit = 0");
  await server.query(
    "select public.companion_grant_credits($1, 'grant', 3, 'operator', null, null)",
    [tester],
  );
  const turn = await begin();
  expect(turn.result).toBe("ok");
  const assistantId = crypto.randomUUID();
  const refusal = { refusal: true, refusalStage: "deflect", refusalCategory: "profanity" };
  const finished = await server.query(
    "select public.companion_finish_turn($1, 'blocked', $2::jsonb, $3::jsonb, '{}', $4, null, 0, null, $5) as f",
    [
      turn.userMessageId,
      JSON.stringify({
        id: assistantId,
        origin: "turn",
        segments: [{ kind: "speech", text: "그 얘기는 말고요. 퀴즈 하나!", translation: "[en] …" }],
        meta: refusal,
      }),
      JSON.stringify([{ layer: "input", category: "profanity", action: "block" }]),
      now,
      turn.holdId,
    ],
  );
  expect(finished.rows[0].f).toMatchObject({ creditsSpent: 0, balance: 3 });
  expect(await status()).toMatchObject({ strikes: 1 });

  const page = await app.query("select public.companion_list_messages('duksu', null, 20) as p");
  expect(
    (page.rows[0].p.messages as { role: string; status: string; segments: unknown[] }[]).map(
      (message) => [message.role, message.status, message.segments.length],
    ),
  ).toEqual([
    ["assistant", "complete", 1],
    ["user", "blocked", 0],
  ]);
  const inspected = await server.query(
    "select public.companion_inspect_conversation($1, 'duksu', null, 10) as c",
    [tester],
  );
  expect(inspected.rows[0].c.messages[0]).toMatchObject({
    id: assistantId,
    meta: refusal,
    replyTo: turn.userMessageId,
  });
});

test("RM7. 페르소나 거절 줄 — 다섯 캐릭터 모두 회피 · 경고를 말투 상한까지 갖는다", async () => {
  const result = await db.admin.query(
    "select id, persona->'refusalLines' as lines, coalesce(persona->>'maxSpeechLevel', 'slang') as max from companion.characters order by sort_order",
  );
  const levels = ["polite", "casual", "slang"];
  expect(result.rows.map((row) => row.id)).toEqual([
    "duksu",
    "yoonkyung",
    "mina",
    "doyun",
    "jaemin",
  ]);
  for (const row of result.rows) {
    const expected = levels.slice(0, levels.indexOf(row.max as string) + 1);
    for (const stage of ["deflect", "warn"]) {
      expect(Object.keys(row.lines[stage]).sort(), `${row.id} ${stage}`).toEqual(
        [...expected].sort(),
      );
    }
  }
});

test("RM8. 다시 적용해도 같은 결과 · 앱 사용자 · anon은 서버용 함수를 부르지 못한다", async () => {
  const before = await db.admin.query(
    "select (select jsonb_agg(persona order by id) from companion.characters) as personas, (select to_jsonb(s) from companion.settings s) as settings",
  );
  await db.admin.query(await readFile(migration, "utf8"));
  const after = await db.admin.query(
    "select (select jsonb_agg(persona order by id) from companion.characters) as personas, (select to_jsonb(s) from companion.settings s) as settings",
  );
  expect(after.rows[0]).toEqual(before.rows[0]);
  for (const client of [app, anon]) {
    await expect(
      client.query("select public.companion_turn_status($1, 'duksu', now())", [tester]),
    ).rejects.toMatchObject({ code: "42501" });
    await expect(
      client.query("select public.companion_add_memories($1, 'duksu', null, '[]'::jsonb)", [
        tester,
      ]),
    ).rejects.toMatchObject({ code: "42501" });
  }
  await expect(anon.query("select public.companion_list_memories(null)")).rejects.toMatchObject({
    code: "42501",
  });
});
