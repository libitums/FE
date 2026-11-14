import { afterAll, beforeAll, beforeEach, expect, test } from "vitest";
import { startTestDatabase } from "./postgres.test-support";

// 기억 · 선톡 품질 보완(20261123): 답 없는 선톡 상한 · 늘어나는 공백, 선톡 맥락, 선톡 칩 저장, 기억 고치기 · 잊기 · 보호,
// 쉬는 대화의 기억 마저 뽑기, 운영 조회의 옛 글 · 지운 까닭.
const user = "00000000-0000-4000-8000-0000000000c3";
const noon = "2026-11-20T12:00:00Z";

let db: Awaited<ReturnType<typeof startTestDatabase>>;
let server: Awaited<ReturnType<typeof db.connect>>;

const hoursBefore = (at: string, hours: number) =>
  new Date(Date.parse(at) - hours * 3_600_000).toISOString();

async function conversation(lastMessageAt: string, userAt = lastMessageAt) {
  const result = await db.admin.query(
    "insert into companion.conversations (user_id, character_id, last_message_at) values ($1, 'duksu', $2) returning id",
    [user, lastMessageAt],
  );
  const id = result.rows[0].id as string;
  await say(id, "안녕하세요", userAt);
  return id;
}
async function say(conversationId: string, text: string, at: string, meta: object = {}) {
  const result = await db.admin.query(
    `insert into companion.messages (conversation_id, user_id, role, origin, status, text, client_message_id, meta, created_at)
     values ($1, $2, 'user', 'turn', 'complete', $3, gen_random_uuid(), $4, $5) returning id`,
    [conversationId, user, text, JSON.stringify(meta), at],
  );
  return result.rows[0].id as string;
}
async function proactiveAt(conversationId: string, at: string, text = "잘 지내요?") {
  await db.admin.query(
    `insert into companion.messages (conversation_id, user_id, role, origin, status, segments, created_at)
     values ($1, $2, 'assistant', 'proactive', 'complete', $3, $4)`,
    [conversationId, user, JSON.stringify([{ kind: "speech", text }]), at],
  );
  await db.admin.query("update companion.conversations set last_message_at = $2 where id = $1", [
    conversationId,
    at,
  ]);
}
async function candidates(now: string) {
  return (await server.query("select public.companion_proactive_candidates($1, 20) as c", [now]))
    .rows[0].c as { conversationId: string }[];
}
async function context(now: string) {
  return (
    await server.query("select public.companion_proactive_context($1, 'duksu', 12, $2) as c", [
      user,
      now,
    ])
  ).rows[0].c as Record<string, unknown>;
}
async function memory(content: string, values: Record<string, unknown> = {}) {
  const result = await db.admin.query(
    `insert into companion.memories (user_id, character_id, kind, content, user_edited)
     values ($1, $2, 'fact', $3, $4) returning id`,
    [user, values["shared"] ? null : "duksu", content, values["userEdited"] ?? false],
  );
  return result.rows[0].id as string;
}
async function apply(ops: unknown[], source: string | null = null) {
  return (
    await server.query(
      "select public.companion_apply_memory_ops($1, 'duksu', $2, $3::jsonb) as r",
      [user, source, JSON.stringify(ops)],
    )
  ).rows[0].r as Record<string, number | boolean>;
}

beforeAll(async () => {
  db = await startTestDatabase();
  server = await db.connect();
  await server.query("set role service_role");
}, 90_000);
afterAll(async () => {
  await db?.close();
});
beforeEach(async () => {
  await db.admin.query("truncate auth.users cascade");
  await db.admin.query(
    `update companion.settings set proactive_daily_cap = 2, proactive_gap = interval '24 hours',
       proactive_unanswered_limit = 2, proactive_backoff = 2, memory_every = 5, memory_cap = 50,
       memory_flush_idle = interval '30 minutes'`,
  );
  await db.admin.query(
    `insert into auth.users (id, email, raw_app_meta_data) values ($1, 'q@libitum.test', '{"duru_tester": true}')`,
    [user],
  );
  await db.admin.query(
    `insert into companion.profiles (user_id, birth_year, age_source, proactive_pref, timezone)
     values ($1, 1990, 'self', 'daily1', 'Asia/Seoul')`,
    [user],
  );
});

test("QL1. 답 없는 선톡 — 하나면 공백이 두 배, 상한(2)에 닿으면 멈추고, 유저가 말하면 처음부터", async () => {
  // 서울 21:00 — 조용한 시간 밖. 서울의 「오늘」은 정오(UTC) 21시간 전부터.
  const id = await conversation(hoursBefore(noon, 40));
  expect(await candidates(noon)).toHaveLength(1);
  // 답 없는 선톡 하나: 공백 24시간 × 2.
  await proactiveAt(id, hoursBefore(noon, 30));
  expect(await candidates(noon)).toEqual([]);
  expect(await context(noon)).toMatchObject({ unanswered: 1, skipReason: "backoff" });
  await db.admin.query("update companion.conversations set last_message_at = $1", [
    hoursBefore(noon, 49),
  ]);
  expect(await candidates(noon)).toHaveLength(1);
  // 둘이면 상한.
  await proactiveAt(id, hoursBefore(noon, 25));
  await db.admin.query("update companion.conversations set last_message_at = $1", [
    hoursBefore(noon, 200),
  ]);
  expect(await context(noon)).toMatchObject({ unanswered: 2, skipReason: "unanswered_limit" });
  expect(await candidates(noon)).toEqual([]);
  // 끄면(0 · 1) 예전 규칙.
  await db.admin.query(
    "update companion.settings set proactive_unanswered_limit = 0, proactive_backoff = 1",
  );
  expect(await candidates(noon)).toHaveLength(1);
  await db.admin.query(
    "update companion.settings set proactive_unanswered_limit = 2, proactive_backoff = 2",
  );
  // 유저가 답하면 0.
  await say(id, "네, 잘 지내요", hoursBefore(noon, 24.5));
  await db.admin.query("update companion.conversations set last_message_at = $1", [
    hoursBefore(noon, 24.5),
  ]);
  expect(await context(noon)).toMatchObject({ unanswered: 0, skipReason: null });
  await expect(
    db.admin.query("update companion.settings set proactive_backoff = 0.5"),
  ).rejects.toThrow(/settings_proactive_backoff_check/);
});

test("QL2. 선톡 맥락 — 유저의 마지막 말 · 현지 시각 · 최근 선톡 글 셋 · 칩 설정", async () => {
  const id = await conversation(hoursBefore(noon, 30), hoursBefore(noon, 72));
  for (const [hours, text] of [
    [90, "첫째"],
    [80, "둘째"],
    [75, "셋째"],
    [40, "넷째"],
  ] as const)
    await proactiveAt(id, hoursBefore(noon, hours), text);
  const c = await context(noon);
  expect(c).toMatchObject({
    localHour: 21,
    recentProactive: ["둘째", "셋째", "넷째"],
    replySuggestions: true,
    suggestionsEnabled: true,
    suggestionDisplayMax: 2,
    recentChoiceSets: [],
  });
  expect(Date.parse(c["lastUserMessageAt"] as string)).toBe(Date.parse(hoursBefore(noon, 72)));
  await db.admin.query("update companion.profiles set timezone = null, last_region = null");
  expect((await context(noon))["localHour"]).toBeNull();
});

test("QL3. 선톡 저장에 칩을 함께 — 모양이 틀리면 거절", async () => {
  const id = await conversation(hoursBefore(noon, 30));
  const messageId = crypto.randomUUID();
  const chips = { version: 2, items: [{ text: "네!", meaning: null, intent: "reflect" }] };
  await server.query(
    "select public.companion_save_proactive($1, 'duksu', $2, $3::jsonb, '{}'::jsonb, $4, $5::jsonb)",
    [
      user,
      messageId,
      JSON.stringify([{ kind: "speech", text: "안녕!" }]),
      noon,
      JSON.stringify(chips),
    ],
  );
  const saved = await db.admin.query(
    "select suggestions, conversation_id from companion.messages where id = $1",
    [messageId],
  );
  expect(saved.rows[0]).toEqual({ suggestions: chips, conversation_id: id });
  // 옛 호출(칩 없음)도 그대로 돈다.
  await server.query(
    "select public.companion_save_proactive($1, 'duksu', $2, $3::jsonb, '{}'::jsonb, $4)",
    [user, crypto.randomUUID(), JSON.stringify([{ kind: "speech", text: "또 안녕!" }]), noon],
  );
  await expect(
    server.query(
      "select public.companion_save_proactive($1, 'duksu', $2, '[]'::jsonb, '{}'::jsonb, $3, '{\"items\": 1}'::jsonb)",
      [user, crypto.randomUUID(), noon],
    ),
  ).rejects.toThrow(/invalid suggestions/);
});

test("QL4. 기억 작업 — 고치기는 옛 글을 남기고, 잊기는 소프트 삭제, 유저가 고친 기억은 보호, 두 번 적용하지 않는다", async () => {
  const id = await conversation(noon);
  const source = await say(id, "저 부산으로 이사했어요", noon);
  const seoul = await memory("서울에 산다", { shared: true });
  const coffee = await memory("커피를 좋아한다");
  const locked = await memory("이름은 마리아", { shared: true, userEdited: true });
  const result = await apply(
    [
      { op: "update", id: seoul, content: "부산에 산다", reason: "이사했다고 함" },
      { op: "forget", id: coffee, reason: "이제 커피를 끊었다고 함" },
      { op: "forget", id: locked, reason: "?" },
      { op: "update", id: "not-a-uuid", content: "x" },
      { op: "add", kind: "event", content: "부산으로 이사했다", shared: false },
    ],
    source,
  );
  expect(result).toEqual({
    added: 1,
    updated: 1,
    forgotten: 1,
    evicted: 0,
    skipped: 0,
    protected: 1,
    ignored: 1,
    full: false,
  });
  const rows = await db.admin.query(
    "select id, content, deleted_reason, deleted_at is not null as deleted, updated_at is not null as updated, history from companion.memories where user_id = $1",
    [user],
  );
  const byId = new Map(rows.rows.map((row) => [row.id, row]));
  expect(byId.get(seoul)).toMatchObject({ content: "부산에 산다", updated: true, deleted: false });
  expect(byId.get(seoul).history).toMatchObject([
    { op: "update", content: "서울에 산다", reason: "이사했다고 함", sourceMessageId: source },
  ]);
  expect(byId.get(coffee)).toMatchObject({ deleted: true, deleted_reason: "forgotten" });
  expect(byId.get(locked)).toMatchObject({ content: "이름은 마리아", deleted: false });
  // 같은 원본으로 다시 — 아무것도 바뀌지 않는다.
  expect(await apply([{ op: "update", id: seoul, content: "대구에 산다" }], source)).toMatchObject({
    updated: 0,
    duplicate: true,
  });
  // 다른 사람 · 다른 캐릭터의 기억은 고칠 수 없다.
  const other = (
    await db.admin.query(
      `insert into companion.memories (user_id, character_id, kind, content) values ($1, 'mina', 'fact', '미나만 아는 것') returning id`,
      [user],
    )
  ).rows[0].id as string;
  expect(await apply([{ op: "forget", id: other }])).toMatchObject({ forgotten: 0, ignored: 1 });
  // 운영 조회가 옛 글 · 지운 까닭을 준다.
  const inspect = (
    await server.query("select public.companion_inspect_memory($1, 'duksu') as m", [user])
  ).rows[0].m as { memories: Record<string, unknown>[] };
  expect(inspect.memories.find((m) => m["id"] === coffee)).toMatchObject({
    deleted: true,
    deletedReason: "forgotten",
  });
  expect(inspect.memories.find((m) => m["id"] === seoul)?.["history"]).toHaveLength(1);
});

test("QL5. 상한 — 잊은 자리가 먼저 비고, 밀어낸 기억은 evicted", async () => {
  await db.admin.query("update companion.settings set memory_cap = 2");
  const a = await memory("하나");
  await memory("둘");
  expect(
    await apply([
      { op: "forget", id: a },
      { op: "add", kind: "fact", content: "셋", shared: false },
      { op: "add", kind: "fact", content: "넷", shared: false },
    ]),
  ).toMatchObject({ added: 2, forgotten: 1, evicted: 1 });
  const evicted = await db.admin.query(
    "select content from companion.memories where deleted_reason = 'evicted'",
  );
  expect(evicted.rows).toEqual([{ content: "둘" }]);
});

test("QL6. 기억 원문은 기존 기억(id)을 같이 주고, 쉬는 대화는 묶음이 차지 않아도 마저 뽑는다", async () => {
  const id = await conversation(hoursBefore(noon, 1), hoursBefore(noon, 1));
  await say(id, "저는 떡볶이를 좋아해요", hoursBefore(noon, 1));
  const kept = await memory("커피를 좋아한다");
  await memory("지운 기억");
  await db.admin.query(
    "update companion.memories set deleted_at = now() where content = '지운 기억'",
  );
  const source = async (flush?: boolean) =>
    (
      await server.query(
        flush === undefined
          ? "select public.companion_memory_source($1, 40) as s"
          : "select public.companion_memory_source($1, 40, $2) as s",
        flush === undefined ? [id] : [id, flush],
      )
    ).rows[0].s as { messages: unknown[]; existing: { id: string; userEdited: boolean }[] } | null;
  // 유저 메시지 2개 < memory_every 5.
  expect(await source()).toBeNull();
  expect(await source(false)).toBeNull();
  const flushed = await source(true);
  expect(flushed?.messages).toHaveLength(2);
  expect(flushed?.existing).toEqual([
    { id: kept, kind: "fact", content: "커피를 좋아한다", shared: false, userEdited: false },
  ]);

  const flushCandidates = async (now: string) =>
    (await server.query("select public.companion_memory_flush_candidates($1, 20) as c", [now]))
      .rows[0].c as Record<string, unknown>[];
  expect(await flushCandidates(noon)).toEqual([
    { userId: user, characterId: "duksu", conversationId: id, memoryEnabled: true, minor: false },
  ]);
  // 아직 30분이 지나지 않았다.
  expect(await flushCandidates(hoursBefore(noon, 0.8))).toEqual([]);
  // 다 뽑았으면 후보가 아니다.
  await server.query("select public.companion_mark_memories($1, $2)", [id, hoursBefore(noon, 1)]);
  expect(await flushCandidates(noon)).toEqual([]);
  // 미국 나이 모름 — 장기 메모리 꺼짐.
  await say(id, "또 왔어요", hoursBefore(noon, 0.9));
  await db.admin.query(
    "update companion.profiles set birth_year = null, age_source = null, last_region = 'US'",
  );
  expect(await flushCandidates(noon)).toMatchObject([{ memoryEnabled: false, minor: true }]);
});
