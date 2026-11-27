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
});
