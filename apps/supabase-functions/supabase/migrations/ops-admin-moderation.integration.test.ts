import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";
import { startTestDatabase } from "./postgres.test-support";

// 운영 도구 판정 메시지(20261215, ops-dashboard docs/admin-contract.md §F): ops_user_moderation.
const real = "00000000-0000-4000-8000-0000000000e1";
const other = "00000000-0000-4000-8000-0000000000e2";
const ACTOR = "komet";

type Db = Awaited<ReturnType<typeof startTestDatabase>>;
type Client = Awaited<ReturnType<Db["connect"]>>;
type Json = Record<string, any>;

/** 이름 붙인 인수로 부른다(PostgREST처럼). */
async function named(client: Client, fn: string, args: Record<string, unknown>): Promise<Json> {
  const keys = Object.keys(args);
  const params = keys.map((k, i) => `${k} => $${i + 1}`).join(", ");
  const result = await client.query(
    `select public.${fn}(${params}) as r`,
    keys.map((k) => args[k]),
  );
  return result.rows[0].r as Json;
}

type Seeded = { blocked: string; crisis: string; reply: string; crisisReply: string };

async function seed(db: Db): Promise<Seeded> {
  await db.admin.query("truncate auth.users cascade");
  await db.admin.query("truncate ops.audit_log");
  await db.admin.query(
    `insert into auth.users (id, email, raw_app_meta_data) values ($1, 'real@example.com', '{}'), ($2, 'other@example.com', '{}')`,
    [real, other],
  );
  const conversation = (
    await db.admin.query(
      "insert into companion.conversations (user_id, character_id) values ($1, 'mina') returning id",
      [real],
    )
  ).rows[0].id;
  const insertMessage = async (sql: string, args: unknown[]) =>
    (await db.admin.query(sql, args)).rows[0].id as string;
  // 3분 전: 입력 검사에서 막힌 턴(답 없음). 2분 전: 위기 턴(위기 답 + 옛 답 하나 — 가장 늦은 답을 붙인다).
  const blocked = await insertMessage(
    `insert into companion.messages (conversation_id, user_id, role, status, client_message_id, text, created_at)
     values ($1, $2, 'user', 'blocked', gen_random_uuid(), $3, now() - interval '3 minutes') returning id`,
    [conversation, real, "나쁜 말 " + "가".repeat(2100)],
  );
  const crisis = await insertMessage(
    `insert into companion.messages (conversation_id, user_id, role, status, client_message_id, text, created_at)
     values ($1, $2, 'user', 'crisis', gen_random_uuid(), '너무 힘들어', now() - interval '2 minutes') returning id`,
    [conversation, real],
  );
  await insertMessage(
    `insert into companion.messages (conversation_id, user_id, role, status, segments, reply_to, hidden, created_at)
     values ($1, $2, 'assistant', 'complete', '[{"kind":"speech","text":"옛 답"}]', $3, true, now() - interval '119 seconds') returning id`,
    [conversation, real, crisis],
  );
  const crisisReply = await insertMessage(
    `insert into companion.messages (conversation_id, user_id, role, origin, status, segments, reply_to, created_at)
     values ($1, $2, 'assistant', 'crisis', 'crisis', '[{"kind":"speech","text":"괜찮아요?","translation":"Are you okay?"}]', $3,
       now() - interval '118 seconds') returning id`,
    [conversation, real, crisis],
  );
  // 1분 전: 캐릭터 답에 단 판정(나중 검사 숨김) — 답에서 사용자 메시지를 거꾸로 찾는다.
  const asked = await insertMessage(
    `insert into companion.messages (conversation_id, user_id, role, status, client_message_id, text, created_at)
     values ($1, $2, 'user', 'complete', gen_random_uuid(), '사진 보여줘', now() - interval '61 seconds') returning id`,
    [conversation, real],
  );
  const reply = await insertMessage(
    `insert into companion.messages (conversation_id, user_id, role, status, segments, reply_to, hidden, created_at)
     values ($1, $2, 'assistant', 'complete', '[{"kind":"action","text":"웃는다"}]', $3, true, now() - interval '60 seconds') returning id`,
    [conversation, real, asked],
  );
  await db.admin.query(
    `insert into companion.moderation_events (user_id, message_id, layer, category, action, created_at) values
       ($1, $2, 'input', 'harassment', 'block', now() - interval '3 minutes'),
       ($1, $2, 'input', 'none', 'allow', now() - interval '3 minutes'),
       ($1, $3, 'input', 'self_harm', 'crisis', now() - interval '2 minutes'),
       ($1, $3, 'output_sync', 'self_harm', 'crisis', now() - interval '2 minutes'),
       ($1, $4, 'output_async', 'sexual', 'hide', now() - interval '1 minute'),
       ($1, null, 'input', 'spam', 'block', now() - interval '4 minutes'),
       ($5, null, 'input', 'spam', 'block', now())`,
    [real, blocked, crisis, reply, other],
  );
  return { blocked, crisis, reply, crisisReply };
}

describe("ops_user_moderation", () => {
  let db: Db;
  let server: Client;
  let s: Seeded;

  beforeAll(async () => {
    db = await startTestDatabase();
    server = await db.connect();
    await server.query("set role service_role");
  }, 90_000);
  afterAll(async () => {
    await db?.close();
  });
  beforeEach(async () => {
    s = await seed(db);
  });

  test("OM-1 allow 빼고 최신순, 판정마다 사용자 메시지 · 캐릭터 답", async () => {
    const page = await named(server, "ops_user_moderation", { p_actor: ACTOR, p_user: real });
    expect(page.hasMore).toBe(false);
    expect(page.items.map((e: Json) => [e.stage, e.category, e.action])).toEqual([
      ["output_async", "sexual", "hide"],
      expect.arrayContaining(["self_harm", "crisis"]),
      expect.arrayContaining(["self_harm", "crisis"]),
      ["input", "harassment", "block"],
      ["input", "spam", "block"],
    ]);
    const [hide, crisis, , block, orphan] = page.items;
    // 답에 단 판정: messageId는 답, message는 그 답이 받은 사용자 메시지.
    expect(hide).toMatchObject({
      messageId: s.reply,
      characterId: "mina",
      message: { role: "user", text: "사진 보여줘", status: "complete" },
      reply: { id: s.reply, hidden: true, segments: [{ kind: "action", text: "웃는다" }] },
    });
    // 사용자 메시지에 단 판정: 답이 여럿이면 가장 늦은 것.
    expect(crisis).toMatchObject({
      messageId: s.crisis,
      message: { id: s.crisis, text: "너무 힘들어", status: "crisis" },
      reply: {
        id: s.crisisReply,
        status: "crisis",
        hidden: false,
        segments: [{ kind: "speech", text: "괜찮아요?", translation: "Are you okay?" }],
      },
    });
    expect(block.message.text).toHaveLength(2000);
    expect(block.reply).toBeNull();
    expect(orphan).toMatchObject({
      messageId: null,
      characterId: null,
      message: null,
      reply: null,
    });
    expect(Object.keys(hide).sort()).toEqual(
      [
        "action",
        "at",
        "category",
        "characterId",
        "id",
        "message",
        "messageId",
        "reply",
        "stage",
      ].sort(),
    );
  });

  test("OM-2 쪽 넘기기: 같은 시각 판정은 갈라지지 않고, before로 이어진다", async () => {
    const first = await named(server, "ops_user_moderation", {
      p_actor: ACTOR,
      p_user: real,
      p_limit: 2,
    });
    // 2번째가 위기 턴(같은 시각 둘) — 둘 다 넣어 3개.
    expect(first.items.map((e: Json) => e.action)).toEqual(["hide", "crisis", "crisis"]);
    expect(first.hasMore).toBe(true);
    const next = await named(server, "ops_user_moderation", {
      p_actor: ACTOR,
      p_user: real,
      p_limit: 2,
      p_before: first.items.at(-1).at,
    });
    expect(next.items.map((e: Json) => e.category)).toEqual(["harassment", "spam"]);
    expect(next.hasMore).toBe(false);
    const empty = await named(server, "ops_user_moderation", {
      p_actor: ACTOR,
      p_user: other,
      p_before: "2000-01-01",
    });
    expect(empty).toEqual({ items: [], hasMore: false });
  });

  test("OM-3 잘못된 인수 · 없는 사용자", async () => {
    await expect(
      named(server, "ops_user_moderation", { p_actor: ACTOR, p_user: real, p_limit: 0 }),
    ).rejects.toThrow(/invalid_limit/);
    await expect(
      named(server, "ops_user_moderation", { p_actor: ACTOR, p_user: real, p_limit: 201 }),
    ).rejects.toThrow(/invalid_limit/);
    await expect(
      named(server, "ops_user_moderation", {
        p_actor: ACTOR,
        p_user: "00000000-0000-4000-8000-0000000000ff",
      }),
    ).rejects.toThrow(/not_found/);
    await expect(
      named(server, "ops_user_moderation", { p_actor: "", p_user: real }),
    ).rejects.toThrow(/actor/);
  });

  test("OM-4 열람 기록 view · user_moderation", async () => {
    await named(server, "ops_user_moderation", { p_actor: ACTOR, p_user: real });
    await named(server, "ops_user_moderation", {
      p_actor: ACTOR,
      p_user: real,
      p_limit: 10,
      p_before: "2026-12-15T00:00:00Z",
    });
    const rows = (
      await db.admin.query(
        "select actor, kind, action, target_user, detail from ops.audit_log order by id",
      )
    ).rows;
    expect(rows).toEqual([
      {
        actor: ACTOR,
        kind: "view",
        action: "user_moderation",
        target_user: real,
        detail: { limit: 50 },
      },
      {
        actor: ACTOR,
        kind: "view",
        action: "user_moderation",
        target_user: real,
        detail: { limit: 10, before: expect.stringMatching(/^2026-12-15/) },
      },
    ]);
  });

  test("OM-5 service_role만 부른다", async () => {
    const rows = (
      await db.admin.query(
        `select has_function_privilege('anon', p.oid, 'execute') as anon,
                has_function_privilege('authenticated', p.oid, 'execute') as auth,
                has_function_privilege('service_role', p.oid, 'execute') as service,
                p.prosecdef as definer
         from pg_proc p join pg_namespace n on n.oid = p.pronamespace
         where n.nspname = 'public' and p.proname = 'ops_user_moderation'`,
      )
    ).rows;
    expect(rows).toEqual([{ anon: false, auth: false, service: true, definer: true }]);
  });
});
