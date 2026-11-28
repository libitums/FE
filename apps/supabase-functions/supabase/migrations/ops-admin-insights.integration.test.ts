import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";
import { startTestDatabase } from "./postgres.test-support";

// 운영 도구 판정 · 기억 · 스토리 조회 1차(20270118, ops-dashboard docs/admin-contract.md §G-A).
const real = "00000000-0000-4000-8000-0000000000f1";
const other = "00000000-0000-4000-8000-0000000000f2";
const ACTOR = "komet";
const REV_A = "aaaa1111";
const REV_B = "bbbb2222";

type Db = Awaited<ReturnType<typeof startTestDatabase>>;
type Client = Awaited<ReturnType<Db["connect"]>>;
type Json = Record<string, any>;

async function named(client: Client, fn: string, args: Record<string, unknown>): Promise<Json> {
  const keys = Object.keys(args);
  const params = keys.map((k, i) => `${k} => $${i + 1}`).join(", ");
  const result = await client.query(
    `select public.${fn}(${params}) as r`,
    keys.map((k) => args[k]),
  );
  return result.rows[0].r as Json;
}

const range = () => ({
  p_from: new Date(Date.now() - 3_600_000).toISOString(),
  p_to: new Date(Date.now() + 60_000).toISOString(),
});

type Seeded = {
  blocked: string;
  blockedEvent: string;
  recoveredEvent: string;
  trackedEvent: string;
  greeting: string;
  memoryChip: string;
};

async function seed(db: Db): Promise<Seeded> {
  await db.admin.query("truncate auth.users cascade");
  await db.admin.query("truncate ops.audit_log, ops.guardrail_revs");
  await db.admin.query(
    `insert into auth.users (id, email, raw_app_meta_data) values ($1, 'real@example.com', '{}'), ($2, 'other@example.com', '{}')`,
    [real, other],
  );
  const conversation = (
    await db.admin.query(
      "insert into companion.conversations (user_id, character_id) values ($1, 'geonwoo') returning id",
      [real],
    )
  ).rows[0].id;
  const row = async (sql: string, args: unknown[]) =>
    (await db.admin.query(sql, args)).rows[0].id as string;
  // 10분 전: 캐릭터 인사(앞 말). 9분 전: 입력에서 막힌 학습자 메시지 + 거절 답.
  const greeting = await row(
    `insert into companion.messages (conversation_id, user_id, role, status, segments, created_at)
     values ($1, $2, 'assistant', 'complete', '[{"kind":"speech","text":"좋아하는 가수 있어요?"}]', now() - interval '10 minutes') returning id`,
    [conversation, real],
  );
  const blocked = await row(
    `insert into companion.messages (conversation_id, user_id, role, status, client_message_id, text, meta, created_at)
     values ($1, $2, 'user', 'blocked', gen_random_uuid(), 'kimtaeyhung from bts', '{"inputSource":"manual"}', now() - interval '9 minutes') returning id`,
    [conversation, real],
  );
  await row(
    `insert into companion.messages (conversation_id, user_id, role, status, segments, reply_to, meta, created_at)
     values ($1, $2, 'assistant', 'complete', '[{"kind":"speech","text":"그건 잘 안 해요"}]', $3,
       '{"ageBand":"adult","romanceLine":"open","refusal":true,"refusalStage":"deflect","refusalCategory":"personal_info"}',
       now() - interval '9 minutes' + interval '5 seconds') returning id`,
    [conversation, real, blocked],
  );
  // 5분 전: 답 검사에 걸려 다시 만든 턴(초안 남음) + 기록용 허용(romance).
  const asked = await row(
    `insert into companion.messages (conversation_id, user_id, role, status, client_message_id, text, meta, created_at)
     values ($1, $2, 'user', 'complete', gen_random_uuid(), '너 좋아해', '{"inputSource":"manual"}', now() - interval '5 minutes') returning id`,
    [conversation, real],
  );
  await row(
    `insert into companion.messages (conversation_id, user_id, role, status, segments, reply_to, meta, created_at)
     values ($1, $2, 'assistant', 'complete', '[{"kind":"speech","text":"김치라면 좋아해?"}]', $3,
       '{"ageBand":"minor","romanceLine":"none","guardrailRecovered":{"category":"romance","draft":"나도 좋아해 💕"}}',
       now() - interval '5 minutes' + interval '5 seconds') returning id`,
    [conversation, real, asked],
  );
  const event = async (
    message: string | null,
    layer: string,
    category: string,
    action: string,
    rev: string | null,
    ago: string,
  ) =>
    row(
      `insert into companion.moderation_events (user_id, message_id, layer, category, action, rev, created_at)
       values ($1, $2, $3, $4, $5, $6, now() - $7::interval) returning id`,
      [real, message, layer, category, action, rev, ago],
    );
  const blockedEvent = await event(blocked, "input", "personal_info", "block", REV_A, "9 minutes");
  await event(blocked, "input", "safe", "allow", REV_A, "9 minutes");
  const trackedEvent = await event(asked, "input", "romance", "allow", REV_B, "5 minutes");
  const recoveredEvent = await event(asked, "output_sync", "romance", "block", REV_B, "5 minutes");
  await event(asked, "output_sync", "safe", "allow", REV_B, "5 minutes");
  await db.admin.query(
    `insert into companion.moderation_events (user_id, layer, category, action, created_at) values ($1, 'input', 'spam', 'block', now())`,
    [other],
  );
  await db.admin.query(
    "insert into companion.moderation_state (user_id, strikes, window_started_at) values ($1, 2, now())",
    [real],
  );
  // 기억 — 칩에서 나온 것(지움) · 직접 말한 것.
  const chip = await row(
    `insert into companion.messages (conversation_id, user_id, role, status, client_message_id, text, meta, created_at)
     values ($1, $2, 'user', 'complete', gen_random_uuid(), '저는 한국 드라마를 좋아해요.', '{"inputSource":"suggestion"}', now() - interval '20 minutes') returning id`,
    [conversation, real],
  );
  const memoryChip = await row(
    `insert into companion.memories (user_id, character_id, kind, content, source_message_id, deleted_at, deleted_reason)
     values ($1, 'geonwoo', 'fact', '한국 드라마를 좋아함', $2, now(), 'forgotten') returning id`,
    [real, chip],
  );
  await db.admin.query(
    `insert into companion.memories (user_id, character_id, kind, content, source_message_id) values ($1, 'geonwoo', 'fact', '태국에 산다', $2)`,
    [real, blocked],
  );
  await db.admin.query(
    "insert into companion.relationships (user_id, character_id, intimacy, speech_level) values ($1, 'geonwoo', 12, 'polite')",
    [real],
  );
  return { blocked, blockedEvent, recoveredEvent, trackedEvent, greeting, memoryChip };
}

describe("ops admin insights", () => {
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

  test("OI-1 rev 기본값은 요청 헤더 x-guardrail-rev에서, 없거나 모양이 틀리면 null", async () => {
    const insert = async (headers: string | null) => {
      await db.admin.query("begin");
      if (headers !== null)
        await db.admin.query("select set_config('request.headers', $1, true)", [headers]);
      const rev = (
        await db.admin.query(
          "insert into companion.moderation_events (user_id, layer, category, action) values ($1, 'input', 'safe', 'allow') returning rev",
          [other],
        )
      ).rows[0].rev;
      await db.admin.query("commit");
      return rev;
    };
    expect(await insert('{"x-guardrail-rev":"0123abcd"}')).toBe("0123abcd");
    expect(await insert('{"x-guardrail-rev":"NOT-HEX"}')).toBeNull();
    expect(await insert("not json")).toBeNull();
    expect(await insert(null)).toBeNull();
  });

  test("OI-2 현황 — 입력 수 · 분류 × 단계 · 기록용 허용 · 리비전 · 스트라이크", async () => {
    await named(server, "ops_set_guardrail_rev", {
      p_actor: ACTOR,
      p_rev: REV_A,
      p_label: "ADR-0203 전",
    });
    await named(server, "ops_review_moderation", {
      p_actor: ACTOR,
      p_event: s.blockedEvent,
      p_verdict: "false_positive",
    });
    const r = await named(server, "ops_moderation_summary", { p_actor: ACTOR, ...range() });
    expect(r.inputs).toBe(4); // real 셋(차단 · 허용 · 기록용) + other 하나
    expect(r.cells).toEqual(
      expect.arrayContaining([
        { category: "personal_info", stage: "input", blocks: 1, per1k: 250 },
        { category: "romance", stage: "output_sync", blocks: 1, per1k: 250 },
        { category: "spam", stage: "input", blocks: 1, per1k: 250 },
      ]),
    );
    expect(r.tracked).toEqual([
      { line: "none", characterId: "geonwoo", category: "romance", count: 1 },
    ]);
    expect(
      r.revs.map((v: Json) => [v.rev, v.label, v.events, v.blocks, v.reviewed, v.falsePositives]),
    ).toEqual([
      [REV_A, "ADR-0203 전", 2, 1, 1, 1],
      [REV_B, null, 3, 1, 0, 0],
    ]);
    expect(r.strikes.map((x: Json) => [x.user.id, x.strikes])).toEqual([[real, 2]]);
    // 거르기: 연령대 adult면 open 턴만.
    const adult = await named(server, "ops_moderation_summary", {
      p_actor: ACTOR,
      ...range(),
      p_age: "adult",
    });
    expect(adult.inputs).toBe(2);
    expect(adult.cells).toEqual([
      { category: "personal_info", stage: "input", blocks: 1, per1k: 500 },
    ]);
    const log = await db.admin.query(
      "select kind, action from ops.audit_log where action = 'moderation_summary'",
    );
    expect(log.rows).toHaveLength(2);
  });

  test("OI-3 목록 — 앞 캐릭터 말 · 거절 답 · 걸린 초안 · 검토, 거르기 · 쪽 넘김", async () => {
    const page = await named(server, "ops_moderation_feed", {
      p_actor: ACTOR,
      ...range(),
      p_user: real,
    });
    expect(page.items.map((e: Json) => [e.stage, e.category, e.action])).toEqual([
      ["output_sync", "romance", "block"],
      ["input", "personal_info", "block"],
    ]);
    const [recovered, blocked] = page.items;
    expect(blocked).toMatchObject({
      rev: REV_A,
      ageBand: "adult",
      romanceLine: "open",
      characterId: "geonwoo",
      user: { id: real, email: "real@example.com", tester: false },
      previous: { id: s.greeting, segments: [{ kind: "speech", text: "좋아하는 가수 있어요?" }] },
      message: {
        id: s.blocked,
        text: "kimtaeyhung from bts",
        status: "blocked",
        inputSource: "manual",
      },
      reply: { refusal: { stage: "deflect", category: "personal_info" }, recovered: null },
      strikes: 2,
      review: null,
    });
    expect(recovered.reply.recovered).toEqual({ category: "romance", draft: "나도 좋아해 💕" });

    const tracked = await named(server, "ops_moderation_feed", {
      p_actor: ACTOR,
      ...range(),
      p_action: "tracked",
    });
    expect(tracked.items.map((e: Json) => e.id)).toEqual([s.trackedEvent]);

    await named(server, "ops_review_moderation", {
      p_actor: ACTOR,
      p_event: s.blockedEvent,
      p_verdict: "false_positive",
      p_note: "붙여 쓴 이름",
    });
    const reviewed = await named(server, "ops_moderation_feed", {
      p_actor: ACTOR,
      ...range(),
      p_review: "false_positive",
    });
    expect(reviewed.items.map((e: Json) => [e.id, e.review.verdict, e.review.note])).toEqual([
      [s.blockedEvent, "false_positive", "붙여 쓴 이름"],
    ]);
    const none = await named(server, "ops_moderation_feed", {
      p_actor: ACTOR,
      ...range(),
      p_review: "none",
    });
    expect(none.items.map((e: Json) => e.id)).not.toContain(s.blockedEvent);

    const first = await named(server, "ops_moderation_feed", {
      p_actor: ACTOR,
      ...range(),
      p_user: real,
      p_limit: 1,
    });
    expect(first.items.map((e: Json) => e.id)).toEqual([s.recoveredEvent]);
    expect(first.hasMore).toBe(true);
    const second = await named(server, "ops_moderation_feed", {
      p_actor: ACTOR,
      ...range(),
      p_user: real,
      p_limit: 1,
      p_before: first.items[0].at,
    });
    expect(second.items.map((e: Json) => e.id)).toEqual([s.blockedEvent]);
    expect(second.hasMore).toBe(false);

    await expect(
      named(server, "ops_moderation_feed", {
        p_actor: ACTOR,
        p_from: "2026-01-01",
        p_to: "2026-12-31",
      }),
    ).rejects.toThrow(/invalid_range/);
    await expect(
      named(server, "ops_moderation_feed", { p_actor: ACTOR, ...range(), p_action: "allow" }),
    ).rejects.toThrow(/invalid_action/);
  });

  test("OI-4 검토 — 덮어쓰기 · 지우기 · 기록에 이전 값, 리비전 이름 붙이고 지우기", async () => {
    await named(server, "ops_review_moderation", {
      p_actor: ACTOR,
      p_event: s.blockedEvent,
      p_verdict: "unsure",
    });
    const changed = await named(server, "ops_review_moderation", {
      p_actor: "other-admin",
      p_event: s.blockedEvent,
      p_verdict: "correct",
    });
    expect(changed.review).toMatchObject({ verdict: "correct", actor: "other-admin" });
    const cleared = await named(server, "ops_review_moderation", {
      p_actor: ACTOR,
      p_event: s.blockedEvent,
      p_verdict: null,
    });
    expect(cleared.review).toBeNull();
    const log = await db.admin.query(
      "select detail from ops.audit_log where action = 'review_moderation' order by id",
    );
    expect(log.rows.map((r) => r.detail.before?.verdict ?? null)).toEqual([
      null,
      "unsure",
      "correct",
    ]);
    await expect(
      named(server, "ops_review_moderation", {
        p_actor: ACTOR,
        p_event: s.blockedEvent,
        p_verdict: "wrong",
      }),
    ).rejects.toThrow(/invalid_verdict/);
    await expect(
      named(server, "ops_review_moderation", {
        p_actor: ACTOR,
        p_event: real,
        p_verdict: "correct",
      }),
    ).rejects.toThrow(/not_found/);

    const named1 = await named(server, "ops_set_guardrail_rev", {
      p_actor: ACTOR,
      p_rev: REV_B,
      p_label: "ADR-0203",
      p_note: "오탐 다듬기",
    });
    expect(named1.rev).toEqual({ rev: REV_B, label: "ADR-0203", note: "오탐 다듬기" });
    await named(server, "ops_set_guardrail_rev", { p_actor: ACTOR, p_rev: REV_B, p_label: " " });
    expect((await db.admin.query("select count(*)::int n from ops.guardrail_revs")).rows[0].n).toBe(
      0,
    );
    await expect(
      named(server, "ops_set_guardrail_rev", { p_actor: ACTOR, p_rev: "zz", p_label: "x" }),
    ).rejects.toThrow(/invalid_rev/);
  });

  test("OI-5 전체 기억 — 캐릭터 가리지 않고 출처 메시지 · 칩 여부, 지운 것은 스위치로", async () => {
    const live = await named(server, "ops_user_memories", { p_actor: ACTOR, p_user: real });
    expect(live.memories.map((m: Json) => m.text)).toEqual(["태국에 산다"]);
    expect(live.relationships).toEqual([
      { characterId: "geonwoo", intimacy: 12, speechLevel: "polite" },
    ]);
    const all = await named(server, "ops_user_memories", {
      p_actor: ACTOR,
      p_user: real,
      p_include_deleted: true,
    });
    const chip = all.memories.find((m: Json) => m.id === s.memoryChip);
    expect(chip).toMatchObject({
      characterId: "geonwoo",
      deletedReason: "forgotten",
      source: { text: "저는 한국 드라마를 좋아해요.", inputSource: "suggestion" },
    });
    const log = await db.admin.query(
      "select detail from ops.audit_log where action = 'user_memories' order by id",
    );
    expect(log.rows.map((r) => r.detail.includeDeleted)).toEqual([false, true]);
  });

  test("OI-6 스토리 — 내 스토리 · 반응 · Seen · 퀴즈 · 거절(그림 경로 없음) · 친구 스토리 답장 · 지난 스토리 열람", async () => {
    const story = (
      await db.admin.query(
        `insert into companion.my_stories (user_id, client_id, kind, ko, roman, meaning, lang, background, posted_at, expires_at)
         values ($1, gen_random_uuid(), 'text', '오늘 떡볶이 먹었어요', '', '', 'en', 'orange', now() - interval '2 hours', now() + interval '22 hours')
         returning id`,
        [real],
      )
    ).rows[0].id;
    await db.admin.query(
      `insert into companion.my_stories (user_id, client_id, kind, ko, roman, meaning, lang, background, posted_at, expires_at)
       values ($1, gen_random_uuid(), 'text', '어제 스토리', '', '', 'en', 'blue', now() - interval '30 hours', now() - interval '6 hours')`,
      [real],
    );
    await db.admin.query(
      "insert into companion.my_story_seen (story_id, character_id, seen_at) values ($1, 'geonwoo', now()), ($1, 'duksu', now())",
      [story],
    );
    await db.admin.query(
      `insert into companion.my_story_reactions (story_id, user_id, character_id, rank, angle, due_at, status)
       values ($1, $2, 'geonwoo', 1, 'react', now(), 'done'), ($1, $2, 'duksu', 2, 'quiz', now(), 'failed')`,
      [story, real],
    );
    await db.admin.query(
      `insert into companion.my_story_rejections (user_id, client_id, category, quarantine_path, created_at, purge_after)
       values ($1, gen_random_uuid(), 'nudity', 'secret/path.jpg', now(), now() + interval '30 days')`,
      [real],
    );
    const first = await named(server, "ops_user_stories", {
      p_actor: ACTOR,
      p_user: real,
      p_limit: 1,
    });
    expect(first.hasMore).toBe(true);
    expect(first.stories).toHaveLength(1);
    expect(first.stories[0]).toMatchObject({
      id: story,
      kind: "text",
      status: "live",
      ko: "오늘 떡볶이 먹었어요",
      background: "orange",
      seen: 2,
      replies: 0,
      quiz: null,
    });
    expect(first.stories[0].reactions.map((r: Json) => [r.characterId, r.rank, r.status])).toEqual([
      ["geonwoo", 1, "done"],
      ["duksu", 2, "failed"],
    ]);
    expect(first.rejections).toHaveLength(1);
    expect(first.rejections[0].category).toBe("nudity");
    expect(JSON.stringify(first)).not.toContain("secret/path.jpg");
    const second = await named(server, "ops_user_stories", {
      p_actor: ACTOR,
      p_user: real,
      p_limit: 1,
      p_before: first.stories[0].createdAt,
    });
    expect(second.stories.map((x: Json) => [x.ko, x.status])).toEqual([["어제 스토리", "expired"]]);
    expect(second.hasMore).toBe(false);
    expect(first.friendReplies).toEqual([]);
    expect(first.pastOpens).toEqual([]);
  });

  test("OI-7 권한 — service_role만", async () => {
    const anon = await db.connect();
    await anon.query("set role authenticated");
    await expect(
      named(anon, "ops_moderation_summary", { p_actor: ACTOR, ...range() }),
    ).rejects.toThrow(/permission denied/);
    await expect(named(anon, "ops_user_stories", { p_actor: ACTOR, p_user: real })).rejects.toThrow(
      /permission denied/,
    );
    await anon.end();
  });

  // ---- 20270120 고침(`ops_admin_insights_fix`). 글은 모두 지어낸 것입니다.

  // OI-8 — 본문의 `set local statement_timeout`은 이미 시작한 호출에 걸리지 않습니다(9초 걸린 호출이 끝까지 돌았습니다). 함수 설정은
  // PostgREST가 호출 전에 트랜잭션에 올려 그 호출에 겁니다 — PostgREST v12.2.12 · v13.0.7에서 9.5초 걸리게 한 호출이 8.0초에 57014로
  // 끊기는 것을 확인했습니다(2026-11-27). DB만으로는 그 길을 재현할 수 없어 여기서는 설정이 붙어 있는지만 봅니다.
  test("OI-8 제한 시간 — 판정 현황 · 목록에 함수 설정 8초, 본문의 set local은 없다", async () => {
    const rows = (
      await db.admin.query(
        `select p.proname as name, p.proconfig as config, p.prosrc ~* 'set\\s+local\\s+statement_timeout' as in_body
         from pg_proc p join pg_namespace n on n.oid = p.pronamespace
         where n.nspname = 'public' and p.proname in ('ops_moderation_summary', 'ops_moderation_feed') order by 1`,
      )
    ).rows;
    expect(rows).toEqual([
      {
        name: "ops_moderation_feed",
        config: ['search_path=""', "statement_timeout=8s"],
        in_body: false,
      },
      {
        name: "ops_moderation_summary",
        config: ['search_path=""', "statement_timeout=8s"],
        in_body: false,
      },
    ]);
    // 인수 꼴은 그대로입니다 — 이름만으로 불러도 겹치지 않습니다(옛 도우미 꼴은 지웠습니다).
    const shapes = (
      await db.admin.query(
        `select n.nspname || '.' || p.proname as name, count(*)::int as n
         from pg_proc p join pg_namespace n on n.oid = p.pronamespace
         where (n.nspname, p.proname) in (('public', 'ops_moderation_summary'), ('public', 'ops_moderation_feed'), ('ops', 'moderation_scope'))
         group by 1 order by 1`,
      )
    ).rows;
    expect(shapes).toEqual([
      { name: "ops.moderation_scope", n: 1 },
      { name: "public.ops_moderation_feed", n: 1 },
      { name: "public.ops_moderation_summary", n: 1 },
    ]);
  });

  /** 덕수쌤 방의 턴 하나: 사용자 메시지 + (있으면) 답 + 입력 차단 판정. 시각은 지금부터 몇 분 전인지. */
  async function turn(options: {
    minutesAgo: number;
    replyAfterMinutes?: number;
    replyMeta?: Json;
    rev?: string | null;
    category?: string;
  }) {
    const one = async (sql: string, args: unknown[]) =>
      (await db.admin.query(sql, args)).rows[0].id as string;
    const conversation = await one(
      `insert into companion.conversations (user_id, character_id) values ($1, 'duksu')
       on conflict (user_id, character_id) where kind = 'companion' do update set character_id = excluded.character_id returning id`,
      [other],
    );
    const message = await one(
      `insert into companion.messages (conversation_id, user_id, role, status, client_message_id, text, created_at)
       values ($1, $2, 'user', 'blocked', gen_random_uuid(), '지어낸 말', now() - $3 * interval '1 minute') returning id`,
      [conversation, other, options.minutesAgo],
    );
    const reply =
      options.replyAfterMinutes === undefined
        ? null
        : await one(
            `insert into companion.messages (conversation_id, user_id, role, status, segments, reply_to, meta, created_at)
             values ($1, $2, 'assistant', 'complete', '[{"kind":"speech","text":"지어낸 답"}]', $3, $4::jsonb,
               now() - $5 * interval '1 minute' + $6 * interval '1 minute') returning id`,
            [
              conversation,
              other,
              message,
              JSON.stringify(options.replyMeta ?? { ageBand: "adult", romanceLine: "hug" }),
              options.minutesAgo,
              options.replyAfterMinutes,
            ],
          );
    const event = await one(
      `insert into companion.moderation_events (user_id, message_id, layer, category, action, rev, created_at)
       values ($1, $2, 'input', $3, 'block', $4, now() - $5 * interval '1 minute') returning id`,
      [other, message, options.category ?? "profanity", options.rev ?? null, options.minutesAgo],
    );
    return { conversation, message, reply, event };
  }
  const feedItem = async (event: string, extra: Record<string, unknown> = {}) =>
    (
      await named(server, "ops_moderation_feed", { p_actor: ACTOR, ...range(), ...extra })
    ).items.find((e: Json) => e.id === event) as Json | undefined;

  // OI-9 — 그 턴의 답은 그 메시지 뒤 30분 창에서만 찾습니다. 창이 없으면 판정마다 그 뒤의 대화 전부를 읽어 긴 대화에서 조회가 끝나지 않습니다.
  test("OI-9 그 턴의 답 — 메시지 뒤 30분 안의 답, 그 밖은 답 없음", async () => {
    const inside = await turn({ minutesAgo: 50, replyAfterMinutes: 29 });
    const outside = await turn({ minutesAgo: 45, replyAfterMinutes: 31 });
    const none = await turn({ minutesAgo: 40 });
    expect(await feedItem(inside.event)).toMatchObject({
      characterId: "duksu",
      ageBand: "adult",
      romanceLine: "hug",
      message: { id: inside.message },
      reply: { id: inside.reply },
    });
    // 창 밖의 답은 그 턴의 답으로 보지 않습니다 — 연령대 · 선도 모릅니다. 메시지 · 캐릭터는 그대로 나옵니다.
    expect(await feedItem(outside.event)).toMatchObject({
      characterId: "duksu",
      ageBand: null,
      romanceLine: null,
      message: { id: outside.message },
      reply: null,
    });
    expect(await feedItem(none.event)).toMatchObject({
      message: { id: none.message },
      reply: null,
    });
    // 판정이 답에 달려 있으면 그 답이 곧 답이고, 사용자 메시지는 `reply_to`로 찾습니다(창과 상관없음).
    const onReply = (
      await db.admin.query(
        `insert into companion.moderation_events (user_id, message_id, layer, category, action, created_at)
         values ($1, $2, 'output_async', 'sexual', 'hide', now() - interval '10 minutes') returning id`,
        [other, outside.reply],
      )
    ).rows[0].id as string;
    expect(await feedItem(onReply)).toMatchObject({
      message: { id: outside.message },
      reply: { id: outside.reply },
      ageBand: "adult",
    });
    // 현황의 거르기도 같은 답을 읽습니다: 성인 턴은 창 안의 턴(입력 1)과 시드의 open 턴(입력 2)입니다.
    const adult = await named(server, "ops_moderation_summary", {
      p_actor: ACTOR,
      ...range(),
      p_age: "adult",
    });
    expect(adult.inputs).toBe(3);
    // 캐릭터 거르기는 답이 없어도 잡습니다.
    const duksu = await named(server, "ops_moderation_summary", {
      p_actor: ACTOR,
      ...range(),
      p_character: "duksu",
    });
    expect(duksu.inputs).toBe(3);
  });

  test("OI-10 리비전 없는 줄 — 현황의 unrevisioned, 목록의 p_rev none", async () => {
    const old = await turn({ minutesAgo: 30, replyAfterMinutes: 1, category: "hate" });
    await named(server, "ops_review_moderation", {
      p_actor: ACTOR,
      p_event: old.event,
      p_verdict: "false_positive",
    });
    const all = await named(server, "ops_moderation_summary", { p_actor: ACTOR, ...range() });
    expect(Object.keys(all).sort()).toEqual(
      ["cells", "daily", "inputs", "revs", "strikes", "tracked", "unrevisioned"].sort(),
    );
    // 리비전 없는 줄: 시드의 other 차단(spam)과 이 턴의 차단.
    expect(all.unrevisioned).toEqual({ events: 2, blocks: 2, reviewed: 1, falsePositives: 1 });
    // 리비전 수와 같은 거르기를 따릅니다(단계 · 캐릭터).
    const output = await named(server, "ops_moderation_summary", {
      p_actor: ACTOR,
      ...range(),
      p_stage: "output_sync",
    });
    expect(output.unrevisioned).toEqual({ events: 0, blocks: 0, reviewed: 0, falsePositives: 0 });
    const duksu = await named(server, "ops_moderation_summary", {
      p_actor: ACTOR,
      ...range(),
      p_character: "duksu",
    });
    expect(duksu.unrevisioned).toEqual({ events: 1, blocks: 1, reviewed: 1, falsePositives: 1 });

    const ids = async (extra: Record<string, unknown>) =>
      (
        await named(server, "ops_moderation_feed", { p_actor: ACTOR, ...range(), ...extra })
      ).items.map((e: Json) => e.id);
    const none = await ids({ p_rev: "none" });
    expect(none).toHaveLength(2);
    expect(none).toContain(old.event);
    expect(none).not.toContain(s.blockedEvent);
    expect(await ids({ p_rev: REV_A })).toEqual([s.blockedEvent]);
    expect(await ids({ p_rev: "none", p_review: "false_positive" })).toEqual([old.event]);
    for (const rev of ["None", "null", "abc", "AAAA1111", ""])
      await expect(
        named(server, "ops_moderation_feed", { p_actor: ACTOR, ...range(), p_rev: rev }),
      ).rejects.toThrow(/invalid_rev/);
    const log = (
      await db.admin.query(
        "select detail->>'rev' as rev from ops.audit_log where action = 'moderation_feed' and detail ? 'rev' order by id limit 1",
      )
    ).rows;
    expect(log).toEqual([{ rev: "none" }]);
  });

  // OI-11 — 그래프가 `firstAt`에 「리비전이 바뀐 날」 세로선을 긋습니다. 기간으로 자른 값이면 기간 첫날에 가짜 선이 생깁니다.
  test("OI-11 리비전 줄 — 처음 · 마지막 본 때는 전체, 수는 기간 + 모든 거르기, 거르기에 안 맞아도 0으로 나온다", async () => {
    // REV_B를 기간(최근 1시간) 밖 20일 전에도 봤습니다. REV_A는 그보다 뒤(9분 전)에 처음 봤습니다.
    await db.admin.query(
      `insert into companion.moderation_events (user_id, layer, category, action, rev, created_at)
       values ($1, 'input', 'safe', 'allow', $2, now() - interval '20 days')`,
      [other, REV_B],
    );
    const pick = (r: Json) =>
      r.revs.map((v: Json) => [v.rev, v.events, v.blocks, v.reviewed, v.falsePositives]);
    const all = await named(server, "ops_moderation_summary", { p_actor: ACTOR, ...range() });
    // 순서는 처음 본 때 이른 순 — 전체로 보면 REV_B가 먼저입니다. 수는 기간 안의 것만입니다.
    expect(pick(all)).toEqual([
      [REV_B, 3, 1, 0, 0],
      [REV_A, 2, 1, 0, 0],
    ]);
    const [revB, revA] = all.revs;
    const from = Date.parse(range().p_from);
    expect(Date.parse(revB.firstAt)).toBeLessThan(from - 19 * 86_400_000);
    expect(Date.parse(revB.lastAt)).toBeGreaterThan(from);
    expect(Date.parse(revA.firstAt)).toBeGreaterThan(from);
    expect(Object.keys(revA).sort()).toEqual(
      [
        "blocks",
        "events",
        "falsePositives",
        "firstAt",
        "label",
        "lastAt",
        "note",
        "rev",
        "reviewed",
      ].sort(),
    );
    // 단계 거르기: 리비전 수가 분류 × 단계 칸과 같은 기준입니다. 처음 · 마지막 본 때는 거르기와 상관없이 그대로입니다.
    await named(server, "ops_review_moderation", {
      p_actor: ACTOR,
      p_event: s.recoveredEvent,
      p_verdict: "false_positive",
    });
    const output = await named(server, "ops_moderation_summary", {
      p_actor: ACTOR,
      ...range(),
      p_stage: "output_sync",
    });
    expect(pick(output)).toEqual([
      [REV_B, 2, 1, 1, 1],
      [REV_A, 0, 0, 0, 0],
    ]);
    expect(output.cells).toEqual([
      { category: "romance", stage: "output_sync", blocks: 1, per1k: 250 },
    ]);
    expect(output.revs.map((v: Json) => [v.firstAt, v.lastAt])).toEqual(
      all.revs.map((v: Json) => [v.firstAt, v.lastAt]),
    );
    // 연령대 거르기: 맞는 줄이 없는 리비전도 0으로 나옵니다(세로선이 거르기에 따라 사라지지 않습니다).
    const adult = await named(server, "ops_moderation_summary", {
      p_actor: ACTOR,
      ...range(),
      p_age: "adult",
    });
    expect(pick(adult)).toEqual([
      [REV_B, 0, 0, 0, 0],
      [REV_A, 2, 1, 0, 0],
    ]);
    // 기간 안에 보이지 않은 리비전은 나오지 않습니다.
    const earlier = await named(server, "ops_moderation_summary", {
      p_actor: ACTOR,
      p_from: new Date(Date.now() - 30 * 86_400_000).toISOString(),
      p_to: new Date(Date.now() - 86_400_000).toISOString(),
    });
    expect(pick(earlier)).toEqual([[REV_B, 1, 0, 0, 0]]);
    expect(earlier.revs[0].lastAt).toBe(revB.lastAt);
  });

  // OI-12 — 앞 말은 입력 검사가 맥락으로 받은 것이어야 합니다. 숨긴 답 · 위기 답을 앞 말로 보이면 운영 도구가 본 맥락과 실제 맥락이 달라집니다.
  test("OI-12 앞 캐릭터 말 — 완료 · 숨기지 않음 · 조각 있음만", async () => {
    const context = await turn({ minutesAgo: 30, replyAfterMinutes: 1 });
    const say = (sql: string) => db.admin.query(sql, [context.conversation, other]);
    // 그 뒤(28 ~ 26분 전)의 캐릭터 메시지 셋은 맥락이 아닙니다: 숨긴 답 · 위기 답(조각 없음) · 완료가 아닌 것.
    await say(
      `insert into companion.messages (conversation_id, user_id, role, status, segments, hidden, created_at)
       values ($1, $2, 'assistant', 'complete', '[{"kind":"speech","text":"숨긴 말"}]', true, now() - interval '28 minutes')`,
    );
    await say(
      `insert into companion.messages (conversation_id, user_id, role, origin, status, segments, created_at)
       values ($1, $2, 'assistant', 'crisis', 'crisis', '[]', now() - interval '27 minutes')`,
    );
    await say(
      `insert into companion.messages (conversation_id, user_id, role, status, segments, created_at)
       values ($1, $2, 'assistant', 'complete', '[]', now() - interval '26 minutes')`,
    );
    const next = await turn({ minutesAgo: 20, replyAfterMinutes: 1 });
    expect((await feedItem(next.event))?.previous).toEqual({
      id: context.reply,
      segments: [{ kind: "speech", text: "지어낸 답" }],
      at: expect.any(String),
    });
    // 그 대화의 첫 턴은 앞 말이 없습니다.
    expect((await feedItem(context.event))?.previous).toBeNull();
  });
});
