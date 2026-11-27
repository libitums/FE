import { readFile } from "node:fs/promises";

import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";
import { startTestDatabase } from "./postgres.test-support";

// 운영 도구 판정 · 기억 · 스토리 조회 1차(20270118, ops-dashboard docs/admin-contract.md §G-A).
// 글은 모두 지어낸 것입니다 — 운영 대화를 옮기지 않습니다.
const real = "00000000-0000-4000-8000-0000000000a1";
const other = "00000000-0000-4000-8000-0000000000a2";
const nobody = "00000000-0000-4000-8000-0000000000ff";
const ACTOR = "komet";
const REV_A = "0a1b2c3d";
const REV_B = "9f8e7d6c";
const migration = new URL("./20270118120000_ops_admin_insights.sql", import.meta.url);

type Db = Awaited<ReturnType<typeof startTestDatabase>>;
type Client = Awaited<ReturnType<Db["connect"]>>;
type Json = Record<string, any>;

/** 이름 붙인 인수로 부릅니다(PostgREST처럼). */
async function named(client: Client, fn: string, args: Record<string, unknown>): Promise<Json> {
  const keys = Object.keys(args);
  const params = keys.map((k, i) => `${k} => $${i + 1}`).join(", ");
  const result = await client.query(
    `select public.${fn}(${params}) as r`,
    keys.map((k) => args[k]),
  );
  return result.rows[0].r as Json;
}

const ago = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();
const range = { p_from: ago(60 * 24 * 14), p_to: ago(-1) };

type Seeded = {
  mina: string;
  duksu: string;
  before: string;
  blocked: string;
  refusal: string;
  asked: string;
  recovered: string;
  failed: string;
  events: Record<
    "block" | "tracked" | "outputBlock" | "outputAllow" | "oldBlock" | "crisis",
    string
  >;
};

async function seed(db: Db): Promise<Seeded> {
  await db.admin.query("truncate auth.users cascade");
  await db.admin.query(
    "truncate ops.audit_log, ops.guardrail_revs, ops.moderation_reviews, companion.stories, companion.story_pool cascade",
  );
  await db.admin.query(
    `insert into auth.users (id, email, raw_app_meta_data) values
       ($1, 'real@example.com', '{}'), ($2, 'other@example.com', '{"duru_tester": true}')`,
    [real, other],
  );
  await db.admin.query(
    "insert into public.learner_profiles (user_id, name, country_code) values ($1, '마리', 'PH')",
    [real],
  );
  const id = async (sql: string, args: unknown[]) =>
    (await db.admin.query(sql, args)).rows[0].id as string;
  const conversation = (user: string, character: string) =>
    id("insert into companion.conversations (user_id, character_id) values ($1, $2) returning id", [
      user,
      character,
    ]);
  const mina = await conversation(real, "mina");
  const duksu = await conversation(real, "duksu");
  const otherMina = await conversation(other, "mina");
  const say = (
    chat: string,
    user: string,
    status: string,
    text: string,
    at: string,
    meta: unknown = {},
  ) =>
    id(
      `insert into companion.messages (conversation_id, user_id, role, status, client_message_id, text, meta, created_at)
       values ($1, $2, 'user', $3, gen_random_uuid(), $4, $5::jsonb, $6) returning id`,
      [chat, user, status, text, JSON.stringify(meta), at],
    );
  const answer = (
    chat: string,
    user: string,
    replyTo: string | null,
    text: string,
    at: string,
    meta: unknown = {},
    extra: { hidden?: boolean; status?: string; origin?: string } = {},
  ) =>
    id(
      `insert into companion.messages (conversation_id, user_id, role, origin, status, segments, meta, reply_to, hidden, created_at)
       values ($1, $2, 'assistant', $3, $4, $5::jsonb, $6::jsonb, $7, $8, $9) returning id`,
      [
        chat,
        user,
        extra.origin ?? "turn",
        extra.status ?? "complete",
        JSON.stringify(text === "" ? [] : [{ kind: "speech", text }]),
        JSON.stringify(meta),
        replyTo,
        extra.hidden ?? false,
        at,
      ],
    );
  const event = (
    user: string,
    message: string | null,
    layer: string,
    category: string,
    action: string,
    rev: string | null,
    at: string,
  ) =>
    id(
      `insert into companion.moderation_events (user_id, message_id, layer, category, action, rev, created_at)
       values ($1, $2, $3, $4, $5, $6, $7) returning id`,
      [user, message, layer, category, action, rev, at],
    );

  // 미나 방. 40분 전 선톡(맥락이 되는 앞 말) → 39분 전 숨긴 답(맥락에서 빠짐) → 30분 전 입력 차단 턴(거절 답).
  const before = await answer(
    mina,
    real,
    null,
    "오늘 뭐 했어요?",
    ago(40),
    {},
    { origin: "proactive" },
  );
  await answer(mina, real, null, "숨긴 말", ago(39), {}, { hidden: true });
  const blocked = await say(mina, real, "blocked", "연락처 " + "가".repeat(2100), ago(30), {
    inputSource: "manual",
  });
  const refusal = await answer(mina, real, blocked, "그건 여기서 얘기해요.", ago(29.9), {
    ageBand: "adult",
    romanceLine: "hug",
    refusal: true,
    refusalStage: "deflect",
    refusalCategory: "personal_info",
  });
  // 20분 전: 칩을 고른 말 — 입력은 기록용 허용(romance), 답은 출력 검사에 걸려 다시 만든 것입니다.
  const asked = await say(mina, real, "complete", "보고 싶었어요", ago(20), {
    inputSource: "suggestion",
  });
  const recovered = await answer(mina, real, asked, "저도 반가워요.", ago(19.9), {
    ageBand: "minor",
    romanceLine: "none",
    guardrailRecovered: { category: "profanity", draft: "걸린 초안" },
  });
  // 덕수쌤 방. 3일 전: 리비전이 생기기 전의 입력 차단, 턴은 실패해 답이 없습니다.
  const failed = await say(duksu, real, "failed", "막힌 말", ago(60 * 24 * 3));
  // 다른 사용자: 10분 전 위기 턴.
  const cry = await say(otherMina, other, "crisis", "너무 힘들어요", ago(10));
  await answer(
    otherMina,
    other,
    cry,
    "",
    ago(9.9),
    { ageBand: "unknown" },
    { status: "crisis", origin: "crisis" },
  );

  const events = {
    block: await event(real, blocked, "input", "personal_info", "block", REV_A, ago(30)),
    tracked: await event(real, asked, "input", "romance", "allow", REV_A, ago(20)),
    outputBlock: await event(real, asked, "output_sync", "profanity", "block", REV_A, ago(20)),
    outputAllow: await event(real, asked, "output_sync", "safe", "allow", REV_A, ago(20)),
    oldBlock: await event(real, failed, "input", "profanity", "block", null, ago(60 * 24 * 3)),
    crisis: await event(other, cry, "input", "self_harm", "crisis", REV_B, ago(10)),
  };
  // 기간 밖(20일 전)에도 REV_A가 있었습니다 — 처음 본 때는 기간 밖까지 셉니다.
  await event(real, null, "input", "safe", "allow", REV_A, ago(60 * 24 * 20));
  // 그냥 허용(입력 검사 분모): 미나 방 성인 턴 하나, 덕수쌤 방 옛 줄 하나.
  const plain = await say(mina, real, "complete", "안녕하세요", ago(50));
  await answer(mina, real, plain, "안녕하세요!", ago(49.9), {
    ageBand: "adult",
    romanceLine: "hug",
  });
  await event(real, plain, "input", "safe", "allow", REV_A, ago(50));
  await event(real, failed, "input", "safe", "allow", null, ago(60 * 24 * 3));
  return { mina, duksu, before, blocked, refusal, asked, recovered, failed, events };
}

describe("운영 도구 판정 · 기억 · 스토리 조회", () => {
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

  // OI-1 — 운영에는 마이그레이션이 함수보다 먼저 올라갑니다. `rev`를 모르는 지금의 `chat-send`가 보내는 꼴이 그대로 저장돼야 합니다.
  test("OI-1 턴 저장: rev를 그대로 넣고, 없거나 꼴이 다르면 null — 옛 호출도 저장된다", async () => {
    const turn = async (moderation: unknown) => {
      const message = (
        await db.admin.query(
          `insert into companion.messages (conversation_id, user_id, role, status, client_message_id, text)
           values ($1, $2, 'user', 'pending', gen_random_uuid(), '새 말') returning id`,
          [s.mina, real],
        )
      ).rows[0].id as string;
      await server.query(
        "select public.companion_finish_turn($1, 'complete', null, $2::jsonb, '{}', now(), null, 0, null, null)",
        [message, JSON.stringify(moderation)],
      );
      return (
        await db.admin.query(
          "select layer, category, action, rev from companion.moderation_events where message_id = $1 order by layer",
          [message],
        )
      ).rows;
    };
    expect(await turn([{ layer: "input", category: "safe", action: "allow" }])).toEqual([
      { layer: "input", category: "safe", action: "allow", rev: null },
    ]);
    expect(
      await turn([
        { layer: "input", category: "romance", action: "allow", rev: REV_A },
        { layer: "output_sync", category: "safe", action: "allow", rev: REV_A },
      ]),
    ).toEqual([
      { layer: "input", category: "romance", action: "allow", rev: REV_A },
      { layer: "output_sync", category: "safe", action: "allow", rev: REV_A },
    ]);
    for (const rev of ["0A1B2C3D", "abc", "0a1b2c3d0", 123, null, { a: 1 }])
      expect(await turn([{ layer: "input", category: "safe", action: "allow", rev }])).toEqual([
        { layer: "input", category: "safe", action: "allow", rev: null },
      ]);
    expect(await turn([])).toEqual([]);
    await expect(
      db.admin.query(
        "insert into companion.moderation_events (user_id, layer, category, action, rev) values ($1, 'input', 'safe', 'allow', 'XYZ')",
        [real],
      ),
    ).rejects.toThrow(/moderation_events_rev_check/);
  });

  test("OI-2 현황: 분류 × 단계 · 일별 · 기록용 허용 · 리비전 · 스트라이크", async () => {
    await named(server, "ops_set_guardrail_rev", {
      p_actor: ACTOR,
      p_rev: REV_A,
      p_label: "오탐 다듬기",
    });
    await named(server, "ops_review_moderation", {
      p_actor: ACTOR,
      p_event: s.events.outputBlock,
      p_verdict: "false_positive",
    });
    await named(server, "ops_review_moderation", {
      p_actor: ACTOR,
      p_event: s.events.oldBlock,
      p_verdict: "correct",
    });
    await db.admin.query(
      `insert into companion.moderation_state (user_id, strikes, window_started_at) values
         ($1, 2, now() - interval '1 hour'), ($2, 5, now() - interval '2 days')`,
      [real, other],
    );
    const all = await named(server, "ops_moderation_summary", { p_actor: ACTOR, ...range });
    expect(Object.keys(all).sort()).toEqual(
      ["cells", "daily", "inputs", "revs", "strikes", "tracked", "unrevisioned"].sort(),
    );
    // 입력 검사: block · tracked · oldBlock · crisis · 그냥 허용 둘(기간 밖 하나는 뺌).
    expect(all.inputs).toBe(6);
    expect(all.cells).toHaveLength(4);
    expect(all.cells).toEqual(
      expect.arrayContaining([
        { category: "personal_info", stage: "input", blocks: 1, per1k: 166.67 },
        { category: "profanity", stage: "input", blocks: 1, per1k: 166.67 },
        { category: "profanity", stage: "output_sync", blocks: 1, per1k: 166.67 },
        { category: "self_harm", stage: "input", blocks: 1, per1k: 166.67 },
      ]),
    );
    // 날은 UTC 날짜 글자입니다. 시드가 자정에 걸칠 수 있어 날마다의 수는 합으로만 봅니다.
    expect(all.daily.reduce((sum: number, d: Json) => sum + d.blocks, 0)).toBe(4);
    expect(all.daily.every((d: Json) => /^\d{4}-\d{2}-\d{2}$/.test(d.day))).toBe(true);
    // 기록용 허용은 거르기가 없어도 그 턴의 선 · 캐릭터를 읽습니다.
    expect(all.tracked).toEqual([
      { line: "none", characterId: "mina", category: "romance", count: 1 },
    ]);
    // 리비전: 처음 본 때 늦은 순. REV_A의 처음 본 때는 기간 밖(20일 전)까지 셉니다.
    expect(all.revs.map((r: Json) => r.rev)).toEqual([REV_B, REV_A]);
    const [revB, revA] = all.revs;
    expect(revA).toMatchObject({
      label: "오탐 다듬기",
      note: null,
      events: 5,
      blocks: 2,
      reviewed: 1,
      falsePositives: 1,
    });
    expect(Date.parse(revA.firstAt)).toBeLessThan(Date.parse(range.p_from));
    expect(Date.parse(revA.lastAt)).toBeGreaterThan(Date.parse(ago(21)));
    expect(revB).toMatchObject({
      label: null,
      events: 1,
      blocks: 1,
      reviewed: 0,
      falsePositives: 0,
    });
    expect(all.unrevisioned).toEqual({ events: 2, blocks: 1, reviewed: 1, falsePositives: 0 });
    // 스트라이크: 상한 3 − 1 이상이고 창(24시간) 안인 사람만.
    expect(all.strikes).toHaveLength(1);
    expect(all.strikes[0]).toMatchObject({
      strikes: 2,
      user: { id: real, email: "real@example.com" },
    });
    expect(all.strikes[0].windowStartedAt).toEqual(expect.any(String));
  });

  test("OI-3 현황 거르기: 단계는 분모를 바꾸지 않고, 연령대 · 선 · 캐릭터는 그 턴의 답에서 읽는다", async () => {
    const output = await named(server, "ops_moderation_summary", {
      p_actor: ACTOR,
      ...range,
      p_stage: "output_sync",
    });
    expect(output.inputs).toBe(6);
    expect(output.cells).toEqual([
      { category: "profanity", stage: "output_sync", blocks: 1, per1k: 166.67 },
    ]);
    expect(output.tracked).toEqual([]);
    // 나열은 거르기와 상관없이(세로선), 수는 거르기 안.
    expect(output.revs.map((r: Json) => [r.rev, r.events, r.blocks])).toEqual([
      [REV_B, 0, 0],
      [REV_A, 2, 1],
    ]);

    const minor = await named(server, "ops_moderation_summary", {
      p_actor: ACTOR,
      ...range,
      p_age: "minor",
    });
    expect(minor.inputs).toBe(1);
    expect(minor.cells).toEqual([
      { category: "profanity", stage: "output_sync", blocks: 1, per1k: 1000 },
    ]);
    const hug = await named(server, "ops_moderation_summary", {
      p_actor: ACTOR,
      ...range,
      p_line: "hug",
    });
    expect([hug.inputs, hug.cells.map((c: Json) => c.category)]).toEqual([2, ["personal_info"]]);
    // 답이 없는 턴(덕수쌤 방의 실패 턴)은 캐릭터로는 잡히고 연령대 · 선으로는 빠집니다.
    const duksu = await named(server, "ops_moderation_summary", {
      p_actor: ACTOR,
      ...range,
      p_character: "duksu",
    });
    expect([duksu.inputs, duksu.cells.map((c: Json) => c.category)]).toEqual([2, ["profanity"]]);
    expect(duksu.unrevisioned).toMatchObject({ events: 2, blocks: 1 });
    const none = await named(server, "ops_moderation_summary", {
      p_actor: ACTOR,
      ...range,
      p_age: "adult",
      p_character: "duksu",
    });
    expect(none).toMatchObject({ inputs: 0, cells: [], daily: [], tracked: [] });
  });

  test("OI-4 목록: 앞 캐릭터 말 → 학습자 메시지 → 그 뒤 답, 기본은 allow가 아닌 것", async () => {
    await named(server, "ops_review_moderation", {
      p_actor: ACTOR,
      p_event: s.events.block,
      p_verdict: "missed",
      p_expected_category: "romance",
      p_note: "  메모  ",
    });
    await db.admin.query(
      "insert into companion.moderation_state (user_id, strikes) values ($1, 2)",
      [real],
    );
    const page = await named(server, "ops_moderation_feed", { p_actor: ACTOR, ...range });
    expect(page.hasMore).toBe(false);
    expect(page.items.map((e: Json) => e.id)).toEqual([
      s.events.crisis,
      s.events.outputBlock,
      s.events.block,
      s.events.oldBlock,
    ]);
    const [crisis, output, block, old] = page.items;
    expect(Object.keys(block).sort()).toEqual(
      [
        "action",
        "ageBand",
        "at",
        "category",
        "characterId",
        "id",
        "message",
        "previous",
        "reply",
        "rev",
        "review",
        "romanceLine",
        "stage",
        "strikes",
        "user",
      ].sort(),
    );
    expect(block).toMatchObject({
      stage: "input",
      category: "personal_info",
      action: "block",
      rev: REV_A,
      ageBand: "adult",
      romanceLine: "hug",
      characterId: "mina",
      user: { id: real, email: "real@example.com", name: "마리", tester: false },
      // 숨긴 답(39분 전)이 아니라 그 앞의 선톡이 맥락입니다.
      previous: { id: s.before, segments: [{ kind: "speech", text: "오늘 뭐 했어요?" }] },
      message: { id: s.blocked, status: "blocked", inputSource: "manual" },
      reply: {
        id: s.refusal,
        status: "complete",
        hidden: false,
        segments: [{ kind: "speech", text: "그건 여기서 얘기해요." }],
        refusal: { stage: "deflect", category: "personal_info" },
        recovered: null,
      },
      strikes: 2,
      review: { verdict: "missed", expectedCategory: "romance", note: "메모", actor: ACTOR },
    });
    expect(block.message.text).toHaveLength(2000);
    expect(Object.keys(block.message).sort()).toEqual([
      "at",
      "id",
      "inputSource",
      "status",
      "text",
    ]);
    expect(Object.keys(block.reply).sort()).toEqual(
      ["at", "hidden", "id", "recovered", "refusal", "segments", "status"].sort(),
    );
    expect(Object.keys(block.previous).sort()).toEqual(["at", "id", "segments"]);
    expect(Object.keys(block.review).sort()).toEqual(
      ["actor", "at", "expectedCategory", "note", "verdict"].sort(),
    );
    // 다시 만든 답: 걸린 초안이 붙고, 앞 말은 거절 답(완료로 저장됨)입니다.
    expect(output).toMatchObject({
      stage: "output_sync",
      ageBand: "minor",
      romanceLine: "none",
      previous: { id: s.refusal },
      message: { id: s.asked, text: "보고 싶었어요", inputSource: "suggestion" },
      reply: {
        id: s.recovered,
        refusal: null,
        recovered: { category: "profanity", draft: "걸린 초안" },
      },
      review: null,
    });
    // 답 없는 턴(실패): 연령대 · 선을 모릅니다. 리비전 전.
    expect(old).toMatchObject({
      rev: null,
      ageBand: null,
      romanceLine: null,
      characterId: "duksu",
      previous: null,
      message: { id: s.failed, status: "failed", inputSource: null },
      reply: null,
    });
    // 위기 답: 조각이 없어도 답으로 붙습니다. 스트라이크 기록이 없으면 null.
    expect(crisis).toMatchObject({
      action: "crisis",
      rev: REV_B,
      ageBand: "unknown",
      romanceLine: null,
      user: { id: other, name: null, tester: true },
      reply: { status: "crisis", segments: [] },
      strikes: null,
    });
  });

  test("OI-5 목록 거르기: 조치 · 분류 · 단계 · 캐릭터 · 연령대 · 선 · 리비전 · 검토 · 사용자", async () => {
    await named(server, "ops_review_moderation", {
      p_actor: ACTOR,
      p_event: s.events.outputBlock,
      p_verdict: "false_positive",
    });
    const ids = async (filter: Record<string, unknown>) =>
      (
        await named(server, "ops_moderation_feed", { p_actor: ACTOR, ...range, ...filter })
      ).items.map((e: Json) => e.id);
    const { block, tracked, outputBlock, oldBlock, crisis } = s.events;
    expect(await ids({ p_action: "tracked" })).toEqual([tracked]);
    expect(await ids({ p_action: "block" })).toEqual([outputBlock, block, oldBlock]);
    expect(await ids({ p_action: "crisis" })).toEqual([crisis]);
    expect(await ids({ p_action: "hide" })).toEqual([]);
    expect(await ids({ p_category: "profanity" })).toEqual([outputBlock, oldBlock]);
    expect(await ids({ p_stage: "output_sync" })).toEqual([outputBlock]);
    expect(await ids({ p_character: "duksu" })).toEqual([oldBlock]);
    expect(await ids({ p_age: "adult" })).toEqual([block]);
    expect(await ids({ p_line: "none" })).toEqual([outputBlock]);
    expect(await ids({ p_line: "none", p_action: "tracked" })).toEqual([tracked]);
    expect(await ids({ p_rev: REV_A })).toEqual([outputBlock, block]);
    expect(await ids({ p_rev: "none" })).toEqual([oldBlock]);
    expect(await ids({ p_review: "false_positive" })).toEqual([outputBlock]);
    expect(await ids({ p_review: "none" })).toEqual([crisis, block, oldBlock]);
    expect(await ids({ p_user: other })).toEqual([crisis]);
    expect(await ids({ p_user: real, p_character: "mina", p_stage: "input" })).toEqual([block]);
    // 빈 글 거르기는 거르지 않는 것과 같습니다 — HTTP 쪽이 빈 쿼리를 그대로 넘겨도 됩니다.
    expect(await ids({ p_category: " ", p_rev: "", p_review: "" })).toHaveLength(4);
    // 기간 밖.
    expect(await ids({ p_from: ago(25), p_to: ago(5) })).toEqual([crisis, outputBlock]);
  });

  test("OI-6 쪽 넘기기: 같은 시각 판정은 갈라지지 않고, before로 이어진다", async () => {
    // 20분 전 턴에 같은 시각의 차단을 하나 더 넣습니다.
    const twin = (
      await db.admin.query(
        `insert into companion.moderation_events (user_id, message_id, layer, category, action, rev, created_at)
         select user_id, message_id, 'input', 'sexual', 'block', rev, created_at
         from companion.moderation_events where id = $1 returning id`,
        [s.events.outputBlock],
      )
    ).rows[0].id as string;
    const first = await named(server, "ops_moderation_feed", {
      p_actor: ACTOR,
      ...range,
      p_limit: 2,
    });
    expect(first.items.map((e: Json) => e.id)).toEqual([
      s.events.crisis,
      ...[s.events.outputBlock, twin].sort(),
    ]);
    expect(first.hasMore).toBe(true);
    const next = await named(server, "ops_moderation_feed", {
      p_actor: ACTOR,
      ...range,
      p_limit: 2,
      p_before: first.items.at(-1).at,
    });
    expect(next.items.map((e: Json) => e.id)).toEqual([s.events.block, s.events.oldBlock]);
    expect(next.hasMore).toBe(false);
    // hasMore는 기간 안의 것만 셉니다.
    const recent = await named(server, "ops_moderation_feed", {
      p_actor: ACTOR,
      p_from: ago(25),
      p_to: range.p_to,
      p_limit: 3,
    });
    expect([recent.items.length, recent.hasMore]).toEqual([3, false]);
  });

  test("OI-7 검토: 하나에 하나 — 덮고, 지우고, 판정이 지워지면 같이 지워진다", async () => {
    const review = (verdict: string | null, extra: Record<string, unknown> = {}) =>
      named(server, "ops_review_moderation", {
        p_actor: ACTOR,
        p_event: s.events.block,
        p_verdict: verdict,
        ...extra,
      });
    const first = await review("unsure", { p_note: "다시 볼 것" });
    expect(first).toEqual({
      ok: true,
      review: {
        verdict: "unsure",
        expectedCategory: null,
        note: "다시 볼 것",
        actor: ACTOR,
        at: expect.any(String),
      },
    });
    const second = await named(server, "ops_review_moderation", {
      p_actor: "other-admin",
      p_event: s.events.block,
      p_verdict: "missed",
      p_expected_category: "sexual",
    });
    expect(second.review).toMatchObject({
      verdict: "missed",
      expectedCategory: "sexual",
      note: null,
      actor: "other-admin",
    });
    expect(
      (await db.admin.query("select count(*)::int as n from ops.moderation_reviews")).rows[0].n,
    ).toBe(1);
    // 그냥 허용한 판정도 검토할 수 있습니다(놓침).
    expect(
      (
        await named(server, "ops_review_moderation", {
          p_actor: ACTOR,
          p_event: s.events.outputAllow,
          p_verdict: "missed",
        })
      ).ok,
    ).toBe(true);
    expect(await review(null)).toEqual({ ok: true, review: null });
    expect(await review("")).toEqual({ ok: true, review: null });
    const log = (
      await db.admin.query(
        "select actor, kind, action, target_user, detail, result from ops.audit_log where detail->>'event' = $1 order by id",
        [s.events.block],
      )
    ).rows;
    expect(log.map((row: Json) => [row.kind, row.action, row.target_user, row.result])).toEqual(
      Array(4).fill(["write", "review_moderation", null, "ok"]),
    );
    expect(log.map((row: Json) => row.detail)).toEqual([
      { event: s.events.block, verdict: "unsure", before: null },
      {
        event: s.events.block,
        verdict: "missed",
        before: expect.objectContaining({ verdict: "unsure", note: "다시 볼 것" }),
      },
      {
        event: s.events.block,
        verdict: null,
        before: expect.objectContaining({ verdict: "missed", actor: "other-admin" }),
      },
      { event: s.events.block, verdict: null, before: null },
    ]);
    // 대화를 지우면 판정이 지워지고 검토도 따라 지워집니다.
    await db.admin.query("delete from companion.messages where id = $1", [s.asked]);
    expect(
      (await db.admin.query("select count(*)::int as n from ops.moderation_reviews")).rows[0].n,
    ).toBe(0);

    await expect(review("wrong")).rejects.toThrow(/invalid_verdict/);
    await expect(review("correct", { p_note: "가".repeat(201) })).rejects.toThrow(/invalid_note/);
    await expect(review("missed", { p_expected_category: "a".repeat(65) })).rejects.toThrow(
      /invalid_expected_category/,
    );
    await expect(
      named(server, "ops_review_moderation", {
        p_actor: ACTOR,
        p_event: nobody,
        p_verdict: "correct",
      }),
    ).rejects.toThrow(/not_found/);
    await expect(
      named(server, "ops_review_moderation", {
        p_actor: " ",
        p_event: s.events.block,
        p_verdict: "correct",
      }),
    ).rejects.toThrow(/actor_required/);
  });

  test("OI-8 리비전 이름: 붙이고 고치고 지운다", async () => {
    const set = (rev: string | null, label: string | null, note?: string | null) =>
      named(server, "ops_set_guardrail_rev", {
        p_actor: ACTOR,
        p_rev: rev,
        p_label: label,
        ...(note === undefined ? {} : { p_note: note }),
      });
    expect(await set(REV_A, " 오탐 다듬기 ", "판정 원칙을 앞에 둠")).toEqual({
      ok: true,
      rev: {
        rev: REV_A,
        label: "오탐 다듬기",
        note: "판정 원칙을 앞에 둠",
        updatedBy: ACTOR,
        updatedAt: expect.any(String),
      },
    });
    // 아직 판정에 없는 리비전에도 붙일 수 있고, 빈 이름은 지웁니다.
    expect((await set("ffffffff", "곧 배포")).rev).toMatchObject({ label: "곧 배포", note: null });
    expect((await set(REV_A, "", null)).rev).toMatchObject({ label: null, note: null });
    expect(
      (await db.admin.query("select count(*)::int as n from ops.guardrail_revs")).rows[0].n,
    ).toBe(2);
    const log = (
      await db.admin.query(
        "select kind, action, target_user, detail from ops.audit_log where action = 'set_guardrail_rev' order by id",
      )
    ).rows;
    expect(log.at(0)).toEqual({
      kind: "write",
      action: "set_guardrail_rev",
      target_user: null,
      detail: { rev: REV_A, label: "오탐 다듬기", note: "판정 원칙을 앞에 둠", before: null },
    });
    expect(log.at(-1).detail).toEqual({
      rev: REV_A,
      label: null,
      note: null,
      before: { label: "오탐 다듬기", note: "판정 원칙을 앞에 둠" },
    });
    for (const rev of ["0A1B2C3D", "abc", "0a1b2c3d0", "", null])
      await expect(set(rev, "이름")).rejects.toThrow(/invalid_rev/);
    await expect(set(REV_A, "가".repeat(81))).rejects.toThrow(/invalid_label/);
    await expect(set(REV_A, "이름", "가".repeat(501))).rejects.toThrow(/invalid_note/);
  });

  test("OI-9 전체 기억: 캐릭터를 고르지 않고, 출처 메시지 · 칩 표시, 지운 것은 켰을 때만", async () => {
    const memory = async (
      character: string | null,
      content: string,
      source: string | null,
      at: string,
      extra = "",
    ) =>
      (
        await db.admin.query(
          `insert into companion.memories (user_id, character_id, kind, content, source_message_id, created_at ${extra === "" ? "" : ", deleted_at, deleted_reason, updated_at"})
           values ($1, $2, 'fact', $3, $4, $5 ${extra}) returning id`,
          [real, character, content, source, at],
        )
      ).rows[0].id as string;
    const long = (
      await db.admin.query(
        `insert into companion.messages (conversation_id, user_id, role, status, client_message_id, text, meta, created_at)
         values ($1, $2, 'user', 'complete', gen_random_uuid(), $3, '{"inputSource": "suggestion"}', $4) returning id`,
        [s.duksu, real, "나".repeat(400), ago(120)],
      )
    ).rows[0].id as string;
    const chip = await memory("duksu", "한국어를 배운다", long, ago(100));
    const typed = await memory("mina", "고양이를 키운다", s.asked, ago(90));
    const shared = await memory(null, "서울에 가고 싶다", null, ago(80));
    const gone = await memory("mina", "지운 기억", null, ago(70), ", now(), 'forgotten', now()");
    await db.admin.query(
      "insert into companion.memories (user_id, character_id, kind, content) values ($1, 'mina', 'fact', '남의 기억')",
      [other],
    );
    await db.admin.query(
      `insert into companion.relationships (user_id, character_id, intimacy, speech_level) values
         ($1, 'mina', 25, 'casual'), ($1, 'duksu', 3, 'polite'), ($2, 'mina', 99, 'slang')`,
      [real, other],
    );

    const live = await named(server, "ops_user_memories", { p_actor: ACTOR, p_user: real });
    expect(live.memories.map((m: Json) => m.id)).toEqual([shared, typed, chip]);
    expect(live.relationships).toEqual([
      { characterId: "duksu", intimacy: 3, speechLevel: "polite" },
      { characterId: "mina", intimacy: 25, speechLevel: "casual" },
    ]);
    const [sharedRow, typedRow, chipRow] = live.memories;
    expect(Object.keys(chipRow).sort()).toEqual(
      [
        "characterId",
        "createdAt",
        "deletedAt",
        "deletedReason",
        "id",
        "kind",
        "source",
        "text",
        "updatedAt",
      ].sort(),
    );
    expect(chipRow).toMatchObject({
      characterId: "duksu",
      kind: "fact",
      text: "한국어를 배운다",
      updatedAt: null,
      deletedAt: null,
      deletedReason: null,
      source: { messageId: long, inputSource: "suggestion" },
    });
    expect(chipRow.source.text).toHaveLength(300);
    expect(Object.keys(chipRow.source).sort()).toEqual(["at", "inputSource", "messageId", "text"]);
    expect(typedRow.source).toMatchObject({ messageId: s.asked, text: "보고 싶었어요" });
    expect(sharedRow).toMatchObject({ characterId: null, source: null });

    const all = await named(server, "ops_user_memories", {
      p_actor: ACTOR,
      p_user: real,
      p_include_deleted: true,
    });
    expect(all.memories.map((m: Json) => m.id)).toEqual([gone, shared, typed, chip]);
    expect(all.memories[0]).toMatchObject({
      deletedReason: "forgotten",
      deletedAt: expect.any(String),
      updatedAt: expect.any(String),
    });
    await expect(
      named(server, "ops_user_memories", { p_actor: ACTOR, p_user: nobody }),
    ).rejects.toThrow(/not_found/);
    const log = (
      await db.admin.query(
        "select kind, target_user, detail from ops.audit_log where action = 'user_memories' order by id",
      )
    ).rows;
    expect(log).toEqual([
      { kind: "view", target_user: real, detail: { includeDeleted: false } },
      { kind: "view", target_user: real, detail: { includeDeleted: true } },
    ]);
  });

  test("OI-10 스토리: 내 스토리 · 반응 · 퀴즈 · 거절 · 친구 스토리 답장 · 지난 스토리 열람", async () => {
    const one = async (sql: string, args: unknown[]) =>
      (await db.admin.query(sql, args)).rows[0].id as string;
    const photo = await one(
      `insert into companion.my_stories (user_id, client_id, kind, ko, roman, meaning, lang, posted_at, expires_at,
         image_path, overlays, scene, line_original)
       values ($1, gen_random_uuid(), 'photo', '바다에 왔어요', 'badae wasseoyo', 'I came to the sea', 'en',
         now() - interval '1 hour', now() + interval '23 hours', $2, '[{"kind": "text", "text": "여름"}]',
         '{"summary": "A beach at noon."}', '바다에 왔어') returning id`,
      [real, `${real}/photo-1.jpg`],
    );
    const word = await one(
      `insert into companion.my_stories (user_id, client_id, kind, word, ko, roman, meaning, lang, posted_at, expires_at)
       values ($1, gen_random_uuid(), 'word', '{"episodeId": "u01", "ref": "w1"}', '도착하다', 'dochakada', 'to arrive', 'en',
         now() - interval '3 days', now() - interval '2 days') returning id`,
      [real],
    );
    await one(
      `insert into companion.my_stories (user_id, client_id, kind, word, ko, meaning, lang, posted_at, expires_at)
       values ($1, gen_random_uuid(), 'word', '{"episodeId": "u01", "ref": "w2"}', '남의 것', 'not mine', 'en', now(), now() + interval '1 day')
       returning id`,
      [other],
    );
    const quizMessage = await one(
      `insert into companion.messages (conversation_id, user_id, role, origin, status, segments)
       values ($1, $2, 'assistant', 'story_reaction', 'complete', '[{"kind": "speech", "text": "퀴즈!"}]') returning id`,
      [s.duksu, real],
    );
    await db.admin.query(
      `insert into companion.my_story_reactions (story_id, user_id, character_id, rank, angle, due_at, status, message_id, done_at) values
         ($1, $3, 'mina', 2, 'question', now() + interval '1 hour', 'scheduled', null, null),
         ($1, $3, 'duksu', 1, 'react', now() - interval '30 minutes', 'failed', null, null),
         ($2, $3, 'duksu', 1, 'quiz', now() - interval '3 days', 'done', $4, now() - interval '3 days')`,
      [photo, word, real, quizMessage],
    );
    await db.admin.query(
      "insert into companion.my_story_seen (story_id, character_id, seen_at) values ($1, 'mina', now()), ($1, 'duksu', now())",
      [photo],
    );
    await db.admin.query(
      `insert into companion.my_story_replies (user_id, client_message_id, my_story_id, character_id) values
         ($1, gen_random_uuid(), $2, 'duksu'), ($1, gen_random_uuid(), $2, 'duksu'), ($1, gen_random_uuid(), null, 'mina')`,
      [real, word],
    );
    await db.admin.query(
      `insert into companion.my_story_quizzes (user_id, character_id, story_id, message_id, word, meaning, expires_at, result)
       values ($1, 'duksu', $2, $3, '도착하다', 'to arrive', now() - interval '2 days', 'correct')`,
      [real, word, quizMessage],
    );
    const rejection = await one(
      `insert into companion.my_story_rejections (user_id, client_id, category, quarantine_path, created_at, purge_after, review_requested_at)
       values ($1, gen_random_uuid(), 'violence', $2, now() - interval '2 hours', now() + interval '30 days', now() - interval '1 hour')
       returning id`,
      [real, `${real}/held.jpg`],
    );
    await db.admin.query(
      `insert into companion.story_pool (id, character_id, image_path, line_ko, line_roman, meaning, replies)
       values ('mina-1', 'mina', 'content/images/mina-1.webp', '오늘의 한 줄', 'oneurui han jul', '{"en": "a line"}', '["좋다!"]')`,
    );
    const friendStory = await one(
      `insert into companion.stories (pool_id, character_id, day, posted_at, expires_at)
       values ('mina-1', 'mina', (now() at time zone 'utc')::date, now() - interval '2 hours', now() + interval '22 hours') returning id`,
      [],
    );
    const sent = (
      await db.admin.query("select id, client_message_id from companion.messages where id = $1", [
        s.asked,
      ])
    ).rows[0];
    await db.admin.query(
      `insert into companion.story_replies (user_id, client_message_id, story_id, character_id, free, created_at) values
         ($1, $2, $3, 'mina', true, now() - interval '20 minutes'),
         ($1, gen_random_uuid(), $3, 'mina', false, now() - interval '50 minutes')`,
      [real, sent.client_message_id, friendStory],
    );
    await db.admin.query(
      `insert into companion.past_story_opens (user_id, character_id, request_id, opened_at, expires_at, paid_with, price, ledger_ref) values
         ($1, 'mina', gen_random_uuid(), now() - interval '1 day', now() + interval '6 days', 'coins', 10, 'past-1'),
         ($1, 'duksu', gen_random_uuid(), now() - interval '2 days', now() + interval '5 days', 'subscription', 0, null)`,
      [real],
    );

    const page = await named(server, "ops_user_stories", { p_actor: ACTOR, p_user: real });
    expect(Object.keys(page).sort()).toEqual(
      ["friendReplies", "hasMore", "pastOpens", "rejections", "stories"].sort(),
    );
    expect(page.hasMore).toBe(false);
    expect(page.stories.map((story: Json) => story.id)).toEqual([photo, word]);
    const [photoRow, wordRow] = page.stories;
    expect(Object.keys(photoRow).sort()).toEqual(
      [
        "createdAt",
        "expiresAt",
        "id",
        "imagePath",
        "kind",
        "ko",
        "lineOriginal",
        "meaning",
        "overlays",
        "quiz",
        "reactions",
        "replies",
        "roman",
        "scene",
        "seen",
        "status",
      ].sort(),
    );
    expect(photoRow).toMatchObject({
      kind: "photo",
      status: "live",
      ko: "바다에 왔어요",
      roman: "badae wasseoyo",
      meaning: "I came to the sea",
      lineOriginal: "바다에 왔어",
      overlays: [{ kind: "text", text: "여름" }],
      scene: { summary: "A beach at noon." },
      imagePath: `${real}/photo-1.jpg`,
      seen: 2,
      replies: 0,
      quiz: null,
      reactions: [
        {
          characterId: "duksu",
          rank: 1,
          angle: "react",
          status: "failed",
          messageId: null,
          doneAt: null,
        },
        { characterId: "mina", rank: 2, angle: "question", status: "scheduled", messageId: null },
      ],
    });
    expect(Object.keys(photoRow.reactions[0]).sort()).toEqual(
      ["angle", "characterId", "doneAt", "dueAt", "messageId", "rank", "status"].sort(),
    );
    expect(wordRow).toMatchObject({
      kind: "word",
      status: "expired",
      imagePath: null,
      scene: null,
      lineOriginal: null,
      overlays: [],
      seen: 0,
      replies: 2,
      quiz: { word: "도착하다", result: "correct" },
      reactions: [{ characterId: "duksu", angle: "quiz", status: "done", messageId: quizMessage }],
    });
    // 거절된 사진: 분류 · 다시 확인 상태만 — 격리 파일 경로는 싣지 않습니다.
    expect(page.rejections).toEqual([
      {
        id: rejection,
        category: "violence",
        createdAt: expect.any(String),
        reviewRequestedAt: expect.any(String),
        reviewResult: null,
        reviewedAt: null,
      },
    ]);
    expect(JSON.stringify(page)).not.toContain("held.jpg");
    expect(page.friendReplies).toEqual([
      {
        storyId: friendStory,
        characterId: "mina",
        free: true,
        messageId: s.asked,
        at: expect.any(String),
      },
      {
        storyId: friendStory,
        characterId: "mina",
        free: false,
        messageId: null,
        at: expect.any(String),
      },
    ]);
    expect(page.pastOpens).toEqual([
      { characterId: "mina", openedAt: expect.any(String), price: 10 },
      { characterId: "duksu", openedAt: expect.any(String), price: 0 },
    ]);

    // 쪽 넘기기는 stories 기준이고, 나머지 셋은 쪽마다 그대로 옵니다.
    const first = await named(server, "ops_user_stories", {
      p_actor: ACTOR,
      p_user: real,
      p_limit: 1,
    });
    expect([first.stories.map((story: Json) => story.id), first.hasMore]).toEqual([[photo], true]);
    const next = await named(server, "ops_user_stories", {
      p_actor: ACTOR,
      p_user: real,
      p_limit: 1,
      p_before: first.stories[0].createdAt,
    });
    expect([next.stories.map((story: Json) => story.id), next.hasMore]).toEqual([[word], false]);
    expect(next.rejections).toHaveLength(1);
    const empty = await named(server, "ops_user_stories", {
      p_actor: ACTOR,
      p_user: other,
      p_before: "2000-01-01",
    });
    expect(empty).toEqual({
      stories: [],
      rejections: [],
      friendReplies: [],
      pastOpens: [],
      hasMore: false,
    });

    for (const limit of [0, 101])
      await expect(
        named(server, "ops_user_stories", { p_actor: ACTOR, p_user: real, p_limit: limit }),
      ).rejects.toThrow(/invalid_limit/);
    await expect(
      named(server, "ops_user_stories", { p_actor: ACTOR, p_user: nobody }),
    ).rejects.toThrow(/not_found/);
    const log = (
      await db.admin.query(
        "select kind, target_user, detail from ops.audit_log where action = 'user_stories' order by id limit 3",
      )
    ).rows;
    expect(log).toEqual([
      { kind: "view", target_user: real, detail: { limit: 30 } },
      { kind: "view", target_user: real, detail: { limit: 1 } },
      { kind: "view", target_user: real, detail: { limit: 1, before: expect.any(String) } },
    ]);
  });

  test("OI-11 잘못된 인수: 기간 · 단계 · 조치 · 리비전 · 검토 · limit · 없는 사용자", async () => {
    const summary = (args: Record<string, unknown>) =>
      named(server, "ops_moderation_summary", { p_actor: ACTOR, ...range, ...args });
    const feed = (args: Record<string, unknown>) =>
      named(server, "ops_moderation_feed", { p_actor: ACTOR, ...range, ...args });
    for (const call of [summary, feed]) {
      await expect(call({ p_from: range.p_to, p_to: range.p_from })).rejects.toThrow(
        /invalid_range/,
      );
      await expect(call({ p_from: range.p_to })).rejects.toThrow(/invalid_range/);
      await expect(call({ p_from: null })).rejects.toThrow(/invalid_range/);
      await expect(call({ p_from: ago(60 * 24 * 91), p_to: ago(0) })).rejects.toThrow(
        /invalid_range/,
      );
      await expect(call({ p_stage: "later" })).rejects.toThrow(/invalid_stage/);
      await expect(call({ p_actor: "" })).rejects.toThrow(/actor_required/);
    }
    expect((await summary({ p_from: ago(60 * 24 * 90), p_to: ago(0) })).inputs).toBe(7);
    await expect(feed({ p_action: "allow" })).rejects.toThrow(/invalid_action/);
    await expect(feed({ p_rev: "nope" })).rejects.toThrow(/invalid_rev/);
    await expect(feed({ p_review: "maybe" })).rejects.toThrow(/invalid_review/);
    await expect(feed({ p_limit: 0 })).rejects.toThrow(/invalid_limit/);
    await expect(feed({ p_limit: 201 })).rejects.toThrow(/invalid_limit/);
    await expect(feed({ p_user: nobody })).rejects.toThrow(/not_found/);
    // 입력 검증 실패는 기록하지 않습니다.
    expect(
      (
        await db.admin.query(
          "select count(*)::int as n from ops.audit_log where action <> 'moderation_summary'",
        )
      ).rows[0].n,
    ).toBe(0);
  });

  test("OI-12 열람 기록: 거르기를 그대로 남긴다", async () => {
    await named(server, "ops_moderation_summary", { p_actor: ACTOR, ...range });
    await named(server, "ops_moderation_summary", {
      p_actor: ACTOR,
      ...range,
      p_stage: "input",
      p_age: "adult",
      p_line: "hug",
      p_character: "mina",
    });
    await named(server, "ops_moderation_feed", { p_actor: ACTOR, ...range });
    await named(server, "ops_moderation_feed", {
      p_actor: ACTOR,
      ...range,
      p_category: "romance",
      p_stage: "input",
      p_action: "tracked",
      p_character: "mina",
      p_age: "minor",
      p_line: "none",
      p_rev: REV_A,
      p_review: "none",
      p_user: real,
      p_limit: 10,
      p_before: ago(1),
    });
    const rows = (
      await db.admin.query(
        "select actor, kind, action, target_user, detail from ops.audit_log order by id",
      )
    ).rows;
    const period = { from: expect.any(String), to: expect.any(String) };
    expect(rows).toEqual([
      {
        actor: ACTOR,
        kind: "view",
        action: "moderation_summary",
        target_user: null,
        detail: period,
      },
      {
        actor: ACTOR,
        kind: "view",
        action: "moderation_summary",
        target_user: null,
        detail: { ...period, stage: "input", age: "adult", line: "hug", character: "mina" },
      },
      {
        actor: ACTOR,
        kind: "view",
        action: "moderation_feed",
        target_user: null,
        detail: { ...period, limit: 50 },
      },
      {
        actor: ACTOR,
        kind: "view",
        action: "moderation_feed",
        target_user: real,
        detail: {
          ...period,
          category: "romance",
          stage: "input",
          action: "tracked",
          character: "mina",
          age: "minor",
          line: "none",
          rev: REV_A,
          review: "none",
          user: real,
          limit: 10,
          before: expect.any(String),
        },
      },
    ]);
  });

  test("OI-13 service_role만 부르고, 표는 service_role도 직접 못 읽는다 · 제한 시간 5초", async () => {
    const rows = (
      await db.admin.query(
        `select p.proname as name,
                has_function_privilege('anon', p.oid, 'execute') as anon,
                has_function_privilege('authenticated', p.oid, 'execute') as auth,
                has_function_privilege('service_role', p.oid, 'execute') as service,
                p.prosecdef as definer, p.proconfig as config
         from pg_proc p join pg_namespace n on n.oid = p.pronamespace
         where n.nspname = 'public' and p.proname = any ($1) order by p.proname`,
        [
          [
            "ops_moderation_summary",
            "ops_moderation_feed",
            "ops_review_moderation",
            "ops_set_guardrail_rev",
            "ops_user_memories",
            "ops_user_stories",
          ],
        ],
      )
    ).rows;
    expect(rows.map((row: Json) => row.name)).toEqual([
      "ops_moderation_feed",
      "ops_moderation_summary",
      "ops_review_moderation",
      "ops_set_guardrail_rev",
      "ops_user_memories",
      "ops_user_stories",
    ]);
    for (const row of rows)
      expect(row).toMatchObject({
        anon: false,
        auth: false,
        service: true,
        definer: true,
        // PostgREST가 함수 설정의 제한 시간을 호출 전에 트랜잭션에 올립니다 — 본문에서 거는 `set local`은 이미 시작한 호출에 듣지 않습니다.
        config: expect.arrayContaining(['search_path=""', "statement_timeout=5s"]),
      });
    for (const table of ["ops.guardrail_revs", "ops.moderation_reviews"])
      await expect(server.query(`select 1 from ${table}`)).rejects.toThrow(/permission denied/);
    // 턴 저장 함수의 권한은 그대로입니다 — 같은 인수 꼴로 다시 만들었습니다.
    const finish = (
      await db.admin.query(
        `select has_function_privilege('service_role', p.oid, 'execute') as service,
                has_function_privilege('authenticated', p.oid, 'execute') as auth
         from pg_proc p where p.proname = 'companion_finish_turn'`,
      )
    ).rows;
    expect(finish).toEqual([{ service: true, auth: false }]);
  });

  test("OI-14 다시 적용해도 같다 — 이름 · 검토 · 리비전이 남는다", async () => {
    await named(server, "ops_set_guardrail_rev", { p_actor: ACTOR, p_rev: REV_A, p_label: "이름" });
    await named(server, "ops_review_moderation", {
      p_actor: ACTOR,
      p_event: s.events.block,
      p_verdict: "correct",
    });
    await db.admin.query(await readFile(migration, "utf8"));
    const page = await named(server, "ops_moderation_feed", {
      p_actor: ACTOR,
      ...range,
      p_rev: REV_A,
    });
    expect(page.items.map((e: Json) => [e.id, e.review?.verdict ?? null])).toEqual([
      [s.events.outputBlock, null],
      [s.events.block, "correct"],
    ]);
    const summary = await named(server, "ops_moderation_summary", { p_actor: ACTOR, ...range });
    expect(summary.revs.find((r: Json) => r.rev === REV_A)).toMatchObject({
      label: "이름",
      reviewed: 1,
    });
  });
});
