import { afterAll, beforeAll, beforeEach, expect, test } from "vitest";
import { signIn, startTestDatabase } from "./postgres.test-support";

// 첫 인사(20261121): 판정을 지난 맥락(`companion_greet_context`)과, 메시지가 없을 때만 저장하는 `companion_save_greeting`.
const tester = "00000000-0000-4000-8000-0000000000f1";
const other = "00000000-0000-4000-8000-0000000000f2";
const now = new Date(Math.floor(Date.now() / 1000) * 1000).toISOString();

let db: Awaited<ReturnType<typeof startTestDatabase>>;
let server: Awaited<ReturnType<typeof db.connect>>;
let app: typeof server;

const segments = [{ kind: "speech", text: "어서 와요!", translation: "Welcome!" }];
const items = [
  { text: "안녕하세요!", meaning: "Hello!", intent: "continue" },
  { text: "쌤은 어디 살아요?", meaning: "Where do you live?", intent: "ask" },
  { text: "와!", meaning: "Wow!", intent: "react" },
];

async function context(user = tester) {
  const result = await server.query("select public.companion_greet_context($1, 'duksu', $2) as c", [
    user,
    now,
  ]);
  return result.rows[0].c as Record<string, unknown>;
}

async function save(id = crypto.randomUUID(), suggestions: unknown = null) {
  const result = await server.query(
    "select public.companion_save_greeting($1, 'duksu', $2, $3::jsonb, $4::jsonb, $5::jsonb, $6) as s",
    [
      tester,
      id,
      JSON.stringify(segments),
      JSON.stringify({ greeting: "model" }),
      suggestions === null ? null : JSON.stringify(suggestions),
      now,
    ],
  );
  return result.rows[0].s as { saved: boolean; messageId?: string };
}

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
  await db.admin.query("update companion.settings set testers_only = true");
  await db.admin.query(
    `insert into auth.users (id, email, raw_app_meta_data) values
       ($1, 'gr@libitum.test', '{"duru_tester": true}'), ($2, 'other@libitum.test', '{}')`,
    [tester, other],
  );
});

test("GR1. 맥락 — 판정을 지나면 페르소나(정해진 인사 포함) · 말투 · 칩 설정 · 메시지 없음, 못 지나면 결과만", async () => {
  const ok = await context();
  expect(ok).toMatchObject({
    result: "ok",
    ageBand: "unknown",
    l1: null,
    feedbackMode: "separate",
    replySuggestions: true,
    speechLevel: "polite",
    hasMessages: false,
    memories: [],
  });
  expect((ok.persona as { greetingLines: Record<string, string> }).greetingLines.polite).toContain(
    "덕수쌤",
  );
  expect(await context(other)).toEqual({ result: "not_available" });
});

test("GR2. 저장 — 대화를 만들고 인사 하나만, 두 번째는 거절 · 메시지 목록에 origin greeting과 칩", async () => {
  const id = crypto.randomUUID();
  expect(await save(id, { items, model: "fake", createdAt: now })).toEqual({
    saved: true,
    messageId: id,
  });
  expect(await save()).toEqual({ saved: false });
  expect((await context()).hasMessages).toBe(true);
  await signIn(app, tester);
  const page = (await app.query("select public.companion_list_messages('duksu', null, 20) as p"))
    .rows[0].p as { messages: Record<string, unknown>[] };
  expect(page.messages).toHaveLength(1);
  expect(page.messages[0]).toMatchObject({
    id,
    role: "assistant",
    origin: "greeting",
    status: "complete",
    segments,
    suggestions: items,
  });
  // 인사의 칩을 그대로 보내면 피드백을 건너뛸 수 있게 턴 시작 상태에 칩 글이 온다.
  const status = await server.query("select public.companion_turn_status($1, 'duksu', $2) as s", [
    tester,
    now,
  ]);
  expect(status.rows[0].s.latestSuggestions).toEqual(items.map((item) => item.text));
});

test("GR3. 유저가 먼저 말을 보냈으면 저장하지 않는다 · 초기화하면 다시 인사할 수 있다 · 앱은 부를 수 없다", async () => {
  const begun = await server.query(
    "select public.companion_begin_turn($1, 'duksu', $2, '안녕하세요', 'text', 20, null, $3) as t",
    [tester, crypto.randomUUID(), now],
  );
  expect(begun.rows[0].t.result).toBe("ok");
  expect(await save()).toEqual({ saved: false });
  await server.query("select public.companion_operator_reset($1, 'duksu')", [tester]);
  expect((await context()).hasMessages).toBe(false);
  expect((await save()).saved).toBe(true);
  await signIn(app, tester);
  await expect(
    app.query("select public.companion_greet_context($1, 'duksu', now())", [tester]),
  ).rejects.toMatchObject({ code: "42501" });
  await expect(
    app.query(
      "select public.companion_save_greeting($1, 'duksu', $2, '[]'::jsonb, null, null, now())",
      [tester, crypto.randomUUID()],
    ),
  ).rejects.toMatchObject({ code: "42501" });
});

test("GR4. 빈 말풍선 · 모양이 틀린 칩은 거절한다", async () => {
  await expect(
    server.query(
      "select public.companion_save_greeting($1, 'duksu', $2, '[]'::jsonb, null, null, now())",
      [tester, crypto.randomUUID()],
    ),
  ).rejects.toMatchObject({ code: "22023" });
  await expect(save(crypto.randomUUID(), { items: "nope" })).rejects.toMatchObject({
    code: "22023",
  });
});
