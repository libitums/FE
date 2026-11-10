import { afterAll, beforeAll, beforeEach, expect, test } from "vitest";
import { signIn, startTestDatabase } from "./postgres.test-support";

// 턴 비용 · 지난 대화(20261120): 지난 대화는 마지막 요약 뒤 메시지(`companion_begin_turn`), 기억은 유저 메시지가
// `settings.memory_every`개 모이면 묶음으로(`companion_memory_source` → `companion_mark_memories`).
const tester = "00000000-0000-4000-8000-0000000000d1";
const base = Date.parse("2026-11-10T00:00:00Z");
const at = (minute: number) => new Date(base + minute * 60_000).toISOString();
const now = at(1000);

let db: Awaited<ReturnType<typeof startTestDatabase>>;
let server: Awaited<ReturnType<typeof db.connect>>;
let app: typeof server;

async function begin(text = "안녕하세요") {
  const result = await server.query(
    "select public.companion_begin_turn($1, 'duksu', $2, $3, 'text', 100, null, $4) as t",
    [tester, crypto.randomUUID(), text, now],
  );
  return result.rows[0].t as {
    result: string;
    conversationId: string;
    userMessageId: string;
    history: { role: string; text: string | null }[];
  };
}

/** 대화에 정상 메시지를 직접 넣는다 — minute마다 유저 · 캐릭터 한 쌍. */
async function seed(conversationId: string, minutes: number[], status = "complete", hidden = false) {
  for (const minute of minutes) {
    await db.admin.query(
      `insert into companion.messages (conversation_id, user_id, role, status, client_message_id, text, hidden, created_at)
       values ($1, $2, 'user', $3, $4, $5, $6, $7)`,
      [conversationId, tester, status, crypto.randomUUID(), `유저 ${minute}`, hidden, at(minute)],
    );
    await db.admin.query(
      `insert into companion.messages (conversation_id, user_id, role, status, segments, created_at)
       values ($1, $2, 'assistant', 'complete', $3::jsonb, $4)`,
      [conversationId, tester, JSON.stringify([{ kind: "speech", text: `캐릭터 ${minute}` }]), at(minute + 0.5)],
    );
  }
}

async function memorySource(conversationId: string, limit = 40) {
  const result = await server.query("select public.companion_memory_source($1, $2) as s", [
    conversationId,
    limit,
  ]);
  return result.rows[0].s as {
    until: string;
    sourceMessageId: string;
    messages: { role: string; text: string | null }[];
  } | null;
}

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
  await db.admin.query("update companion.settings set testers_only = true, memory_every = 5");
  await db.admin.query(
    `insert into auth.users (id, email, raw_app_meta_data) values ($1, 'tc@libitum.test', '{"duru_tester": true}')`,
    [tester],
  );
});

test("TC1. 지난 대화는 마지막 요약 뒤 메시지 전부 — 요약된 것은 빠지고, 상한(p_history_limit)은 그대로 지킨다", async () => {
  const first = await begin();
  expect(first.result).toBe("ok");
  await seed(first.conversationId, [1, 2, 3, 4]);
  // 요약 전: 넣은 정상 메시지가 모두(이번 유저 메시지 · 첫 턴의 pending 메시지는 빠진다).
  let turn = await begin("두 번째");
  expect(turn.history.map((entry) => entry.text ?? "(캐릭터)")).toEqual([
    "유저 1",
    "(캐릭터)",
    "유저 2",
    "(캐릭터)",
    "유저 3",
    "(캐릭터)",
    "유저 4",
    "(캐릭터)",
  ]);
  // 2분까지 요약되면 그 뒤만.
  await db.admin.query("update companion.conversations set summarized_until = $2 where id = $1", [
    first.conversationId,
    at(2.5),
  ]);
  turn = await begin("세 번째");
  expect(turn.history.map((entry) => entry.text ?? "(캐릭터)")).toEqual([
    "유저 3",
    "(캐릭터)",
    "유저 4",
    "(캐릭터)",
  ]);
  // 상한은 최근 것부터.
  const limited = await server.query(
    "select public.companion_begin_turn($1, 'duksu', $2, '네 번째', 'text', 2, null, $3) as t",
    [tester, crypto.randomUUID(), now],
  );
  expect(limited.rows[0].t.history.map((entry: { text: string | null }) => entry.text ?? "(캐릭터)")).toEqual([
    "유저 4",
    "(캐릭터)",
  ]);
});

test("TC2. 기억 묶음 — 유저 메시지가 memory_every개 모여야 주고, 표시를 옮기면 다음 묶음까지 비어 있다", async () => {
  const { conversationId } = await begin();
  await seed(conversationId, [1, 2, 3, 4]);
  // 차단 · 숨김 메시지는 세지 않는다.
  await seed(conversationId, [5], "blocked");
  await seed(conversationId, [6], "complete", true);
  expect(await memorySource(conversationId)).toBeNull();

  await seed(conversationId, [7]);
  const batch = await memorySource(conversationId);
  expect(batch?.messages.filter((entry) => entry.role === "user").map((entry) => entry.text)).toEqual([
    "유저 1",
    "유저 2",
    "유저 3",
    "유저 4",
    "유저 7",
  ]);
  expect(batch?.messages).toHaveLength(12); // 유저 5 + 캐릭터 7(차단 · 숨김 유저 메시지의 짝 캐릭터 말 포함)
  expect(new Date(batch!.until).toISOString()).toBe(at(7.5));
  const last = await db.admin.query(
    "select id from companion.messages where conversation_id = $1 and text = '유저 7'",
    [conversationId],
  );
  expect(batch?.sourceMessageId).toBe(last.rows[0].id);

  await server.query("select public.companion_mark_memories($1, $2)", [conversationId, batch!.until]);
  expect(await memorySource(conversationId)).toBeNull();
  // 뒤로 돌아가지 않는다(늦게 끝난 작업).
  await server.query("select public.companion_mark_memories($1, $2)", [conversationId, at(1)]);
  const stored = await db.admin.query(
    "select memory_extracted_until from companion.conversations where id = $1",
    [conversationId],
  );
  expect((stored.rows[0].memory_extracted_until as Date).toISOString()).toBe(at(7.5));

  // 설정을 바꾸면 다음 턴부터.
  await db.admin.query("update companion.settings set memory_every = 1");
  await seed(conversationId, [8]);
  expect((await memorySource(conversationId))?.messages.map((entry) => entry.text ?? "(캐릭터)")).toEqual([
    "유저 8",
    "(캐릭터)",
  ]);
});

test("TC3. 표시 없는 오래된 대화는 최근 p_limit개만 — 그 앞은 건너뛴다", async () => {
  const { conversationId } = await begin();
  await seed(conversationId, [1, 2, 3, 4, 5, 6]);
  const batch = await memorySource(conversationId, 10);
  expect(batch?.messages).toHaveLength(10);
  expect(batch?.messages[0]?.text).toBe("유저 2");
});

test("TC4. 기억 묶음 함수는 서버 키만 — 앱은 부를 수 없다", async () => {
  const { conversationId } = await begin();
  await signIn(app, tester);
  await expect(
    app.query("select public.companion_memory_source($1, 40)", [conversationId]),
  ).rejects.toMatchObject({ code: "42501" });
  await expect(
    app.query("select public.companion_mark_memories($1, now())", [conversationId]),
  ).rejects.toMatchObject({ code: "42501" });
});
