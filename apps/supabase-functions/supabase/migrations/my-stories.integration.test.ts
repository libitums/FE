import { afterAll, beforeAll, beforeEach, expect, test } from "vitest";
import { signIn, startTestDatabase } from "./postgres.test-support";

// 20261228140000(ADR-0179): 내 스토리(단어 · 카드) — 스위치 · 올리기(두 번 눌러도 하나 · 하루 상한) · 반응 예약 · claim 상한(사람 · 전체) ·
// 끝내기 · 지우기(반응 cascade · 대화 인용 「Deleted story」) · 보관 끔 정리 · chat-send의 내 스토리 답장(mine).
const tester = "00000000-0000-4000-8000-000000000001";
const member = "00000000-0000-4000-8000-000000000002";
const other = "00000000-0000-4000-8000-000000000003";

let db: Awaited<ReturnType<typeof startTestDatabase>>;
let app: Awaited<ReturnType<typeof db.connect>>;
let server: typeof app;

const settings = (assignments: string) =>
  db.admin.query(`update companion.settings set ${assignments}`);
const uuid = async () =>
  (await db.admin.query("select gen_random_uuid() as id")).rows[0].id as string;

type Reaction = {
  id: string;
  characterId: string;
  text: string;
  meaning: string | null;
  at: string;
};
type MyStory = {
  id: string;
  kind: string;
  word: { episodeId: string; ref: string };
  ko: string;
  roman: string;
  meaning: string;
  example: { ko: string; meaning: string | null } | null;
  postedAt: string;
  expiresAt: string;
  reactions: Reaction[];
};
type Posted = { result: string; story: MyStory | null };

async function postAs(
  user: string,
  clientId?: string,
  extra: Partial<Record<string, unknown>> = {},
) {
  await signIn(app, user);
  const args = {
    client: clientId ?? (await uuid()),
    kind: "card",
    word: { episodeId: "u02-arrival", ref: "voca:arrive" },
    ko: "도착하다",
    roman: "dochakada",
    meaning: "to arrive",
    exampleKo: "서울에 도착했어!",
    exampleMeaning: "I arrived in Seoul!",
    lang: "en",
    ...extra,
  };
  return (
    await app.query(
      "select public.companion_post_my_story($1, $2, $3, $4, $5, $6, $7, $8, $9) as p",
      [
        args.client,
        args.kind,
        args.word === null ? null : JSON.stringify(args.word),
        args.ko,
        args.roman,
        args.meaning,
        args.exampleKo,
        args.exampleMeaning,
        args.lang,
      ],
    )
  ).rows[0].p as Posted;
}
async function mine(user: string) {
  await signIn(app, user);
  return (await app.query("select public.companion_my_stories() as s")).rows[0].s as {
    enabled: boolean;
    keep: boolean;
    stories: MyStory[];
  };
}
async function remove(user: string, id: string | null) {
  await signIn(app, user);
  return (await app.query("select public.companion_delete_my_story($1) as d", [id])).rows[0].d as {
    deleted: number;
  };
}
async function keep(user: string, value: boolean) {
  await signIn(app, user);
  return (await app.query("select public.companion_set_keep_my_stories($1) as k", [value])).rows[0]
    .k as { keep: boolean };
}
async function spoke(user: string, character: string, at = "now()") {
  const id = (
    await db.admin.query(
      `insert into companion.conversations (user_id, character_id, last_message_at) values ($1, $2, ${at})
       on conflict (user_id, character_id) where kind = 'companion' do update set last_message_at = excluded.last_message_at
       returning id`,
      [user, character],
    )
  ).rows[0].id as string;
  await db.admin.query(
    `insert into companion.messages (conversation_id, user_id, role, origin, status, text, client_message_id, created_at)
     values ($1, $2, 'user', 'turn', 'complete', '안녕하세요', gen_random_uuid(), ${at})`,
    [id, user],
  );
}
type Scheduled = { character_id: string; minutes: number; status: string };
const scheduled = async (story: string) =>
  (
    await db.admin.query(
      `select r.character_id, extract(epoch from r.due_at - s.posted_at)::int / 60 as minutes, r.status
       from companion.my_story_reactions r join companion.my_stories s on s.id = r.story_id
       where r.story_id = $1 order by r.due_at`,
      [story],
    )
  ).rows as Scheduled[];
type Claimed = {
  reactionId: string;
  userId: string;
  characterId: string;
  storyId: string;
  kind: string;
  ko: string;
  meaning: string;
  exampleKo: string | null;
  lang: string;
};
type ClaimResult = { rows: Claimed[]; skippedCap: number; globalCapped: boolean };
const claimFull = async (at: string, limit = 50) =>
  (
    await server.query("select public.companion_claim_story_reactions($1::timestamptz, $2) as c", [
      at,
      limit,
    ])
  ).rows[0].c as ClaimResult;
const claimAt = async (at: string, limit = 50) => (await claimFull(at, limit)).rows;
const reasons = async (story: string) =>
  (
    await db.admin.query(
      "select status, skip_reason from companion.my_story_reactions where story_id = $1 order by due_at",
      [story],
    )
  ).rows as { status: string; skip_reason: string | null }[];
const later = async (hours: number) =>
  (await db.admin.query(`select (now() + interval '${hours} hours')::text as t`)).rows[0]
    .t as string;
const finish = async (id: string, text: string | null, ok = true) =>
  (
    await server.query(
      "select public.companion_finish_story_reaction($1, $2, $3, $4, now()) as f",
      [id, text, "Have ramen after overtime!", ok],
    )
  ).rows[0].f as { updated: number };
const claimReply = async (user: string, story: string, character: string, clientId: string) =>
  (
    await server.query("select public.companion_claim_story_reply($1, $2, $3, $4, now()) as c", [
      user,
      story,
      character,
      clientId,
    ])
  ).rows[0].c as { result: string; story: Record<string, unknown> | null };
const quote = async (user: string, clientId: string) =>
  (await db.admin.query("select companion.story_quote_json($1, $2) as q", [user, clientId])).rows[0]
    .q as Record<string, unknown> | null;

beforeAll(async () => {
  db = await startTestDatabase();
  app = await db.connect();
  server = await db.connect();
  await server.query("set role service_role");
}, 90_000);
afterAll(async () => {
  await db?.close();
});
beforeEach(async () => {
  await db.admin.query("truncate auth.users cascade");
  // 전체 장부 줄은 계정과 함께 지워지지 않는다 — 테스트마다 비운다.
  await db.admin.query("truncate companion.my_story_usage_global");
  await settings(
    "testers_only = false, friends_mode = 'on', friend_stories = 'on', my_stories = 'on', story_reactions = 'on', my_story_daily = 3, story_reaction_user_daily = 3, story_reaction_global_daily = 500",
  );
  await db.admin.query(
    `insert into auth.users (id, email, raw_app_meta_data) values
       ($1, 't@libitum.test', '{"duru_tester": true}'), ($2, 'm@libitum.test', '{}'), ($3, 'o@libitum.test', '{}')`,
    [tester, member, other],
  );
});

test("MS1. 스위치 둘(off 기본 · off · testers · on) · 상한 기본값 · 보관 기본 켬", async () => {
  const columns = (
    await db.admin.query(
      `select column_name, column_default from information_schema.columns
       where table_schema = 'companion' and table_name = 'settings'
         and column_name in ('my_stories', 'story_reactions', 'my_story_daily', 'story_reaction_user_daily', 'story_reaction_global_daily')
       order by column_name`,
    )
  ).rows as { column_name: string; column_default: string }[];
  expect(Object.fromEntries(columns.map((c) => [c.column_name, c.column_default]))).toEqual({
    my_stories: "'off'::text",
    my_story_daily: "3",
    story_reaction_global_daily: "500",
    story_reaction_user_daily: "3",
    story_reactions: "'off'::text",
  });
  await expect(settings("my_stories = 'all'")).rejects.toMatchObject({ code: "23514" });
  await expect(settings("story_reactions = 'yes'")).rejects.toMatchObject({ code: "23514" });
  await expect(settings("story_reaction_user_daily = 21")).rejects.toMatchObject({ code: "23514" });
  expect(await mine(member)).toEqual({ enabled: true, keep: true, stories: [] });

  await settings("my_stories = 'testers'");
  expect((await mine(member)).enabled).toBe(false);
  expect((await postAs(member)).result).toBe("off");
  expect((await mine(tester)).enabled).toBe(true);
  expect((await postAs(tester)).result).toBe("ok");
  await settings("my_stories = 'off'");
  expect(await mine(tester)).toEqual({ enabled: false, keep: true, stories: [] });
});

test("MS2. 올리기 — 모양 · 24시간 · 같은 client id면 하나 · 하루 상한 · 잘못된 값은 invalid", async () => {
  const client = await uuid();
  const first = await postAs(member, client);
  expect(first.result).toBe("ok");
  expect(first.story).toMatchObject({
    kind: "card",
    word: { episodeId: "u02-arrival", ref: "voca:arrive" },
    ko: "도착하다",
    roman: "dochakada",
    meaning: "to arrive",
    example: { ko: "서울에 도착했어!", meaning: "I arrived in Seoul!" },
    reactions: [],
  });
  expect(Date.parse(first.story!.expiresAt) - Date.parse(first.story!.postedAt)).toBe(
    24 * 3600_000,
  );
  expect((await postAs(member, client)).story?.id).toBe(first.story?.id);
  expect((await postAs(member)).result).toBe("ok");
  expect((await postAs(member)).result).toBe("ok");
  expect((await postAs(member)).result).toBe("daily_limit");
  expect((await mine(member)).stories).toHaveLength(3);

  expect((await postAs(other, undefined, { kind: "photo" })).result).toBe("invalid");
  expect((await postAs(other, undefined, { word: { episodeId: 1 } })).result).toBe("invalid");
  expect((await postAs(other, undefined, { ko: "  " })).result).toBe("invalid");
  expect((await postAs(other, undefined, { lang: "english" })).result).toBe("invalid");
  const word = await postAs(other, undefined, {
    kind: "word",
    exampleKo: null,
    exampleMeaning: null,
  });
  expect(word.story).toMatchObject({ kind: "word", example: null });
  expect((await mine(member)).stories.map((s) => s.id)).not.toContain(word.story?.id);
});

test("MS3. 반응 예약 — 말한 대화의 인물 최대 셋(마지막으로 말한 순), 간격 8 ~ 25분 · 45 ~ 150분 · 3 ~ 7시간, 반응 스위치가 꺼지면 없음", async () => {
  await spoke(member, "mina", "now() - interval '3 days'");
  await spoke(member, "yoonkyung", "now() - interval '1 day'");
  await spoke(member, "haejun", "now() - interval '2 hours'");
  await spoke(member, "daeun", "now() - interval '5 days'");
  const story = (await postAs(member)).story!.id;
  const rows = await scheduled(story);
  expect(rows.map((r) => r.character_id)).toEqual(["haejun", "yoonkyung", "mina"]);
  expect(rows.every((r) => r.status === "scheduled")).toBe(true);
  expect(rows[0]!.minutes).toBeGreaterThanOrEqual(8);
  expect(rows[0]!.minutes).toBeLessThanOrEqual(25);
  expect(rows[1]!.minutes).toBeGreaterThanOrEqual(45);
  expect(rows[1]!.minutes).toBeLessThanOrEqual(150);
  expect(rows[2]!.minutes).toBeGreaterThanOrEqual(180);
  expect(rows[2]!.minutes).toBeLessThanOrEqual(420);

  await settings("story_reactions = 'testers'");
  expect(await scheduled((await postAs(member)).story!.id)).toEqual([]);
  await settings("story_reactions = 'off'");
  await spoke(tester, "mina");
  expect(await scheduled((await postAs(tester)).story!.id)).toEqual([]);
});

test("MS4. claim — 때가 된 것만 · 사람 하루 상한(넘는 것은 skipped) · 전체 상한(남김) · 24시간 지난 스토리는 skipped", async () => {
  for (const c of ["mina", "yoonkyung", "haejun"]) await spoke(member, c);
  await spoke(other, "mina");
  const story = (await postAs(member)).story!.id;
  await postAs(other);
  expect(await claimAt(new Date().toISOString())).toEqual([]);

  const all = await claimAt(await later(8));
  expect(all.map((c) => c.userId).sort()).toEqual([member, member, member, other].sort());
  expect(all.find((c) => c.userId === member)).toMatchObject({
    storyId: story,
    kind: "card",
    ko: "도착하다",
    meaning: "to arrive",
    exampleKo: "서울에 도착했어!",
    lang: "en",
  });
  expect(await claimAt(await later(8))).toEqual([]);

  // 사람 상한 2: 셋째는 skipped.
  await db.admin.query("delete from companion.my_story_reactions");
  await db.admin.query("delete from companion.my_story_usage");
  await db.admin.query("delete from companion.my_story_usage_global");
  await settings("story_reaction_user_daily = 2");
  const second = (await postAs(member)).story!.id;
  expect((await claimAt(await later(8))).filter((c) => c.userId === member)).toHaveLength(2);
  expect((await scheduled(second)).map((r) => r.status).sort()).toEqual([
    "claimed",
    "claimed",
    "skipped",
  ]);

  // 전체 상한 1: 하나만, 나머지는 scheduled로 남는다.
  await db.admin.query("delete from companion.my_story_reactions");
  await db.admin.query("delete from companion.my_story_usage");
  await db.admin.query("delete from companion.my_story_usage_global");
  await settings("story_reaction_user_daily = 3, story_reaction_global_daily = 1");
  const third = (await postAs(member)).story!.id;
  expect(await claimAt(await later(8))).toHaveLength(1);
  expect((await scheduled(third)).filter((r) => r.status === "scheduled")).toHaveLength(2);

  // 24시간 지난 스토리 · 반응 스위치 꺼짐은 skipped.
  await settings("story_reaction_global_daily = 500");
  await db.admin.query("update companion.my_stories set posted_at = posted_at - interval '2 days'");
  expect(await claimAt(await later(8))).toEqual([]);
  expect((await scheduled(third)).filter((r) => r.status === "skipped")).toHaveLength(2);
});

test("MS5. 끝내기 — done만 읽기에 실리고(뜻 포함), failed · 빈 글은 싣지 않는다, claimed가 아니면 바꾸지 않는다", async () => {
  await spoke(member, "mina");
  await spoke(member, "yoonkyung");
  const story = (await postAs(member)).story!.id;
  const [a, b] = await claimAt(await later(8));
  expect(await finish(a!.reactionId, "야근 끝나면 라면 먹어!")).toEqual({ updated: 1 });
  expect(await finish(b!.reactionId, "  ")).toEqual({ updated: 1 });
  expect(await finish(a!.reactionId, "다시")).toEqual({ updated: 0 });
  const read = (await mine(member)).stories.find((s) => s.id === story)!;
  expect(read.reactions).toEqual([
    expect.objectContaining({
      characterId: a!.characterId,
      text: "야근 끝나면 라면 먹어!",
      meaning: "Have ramen after overtime!",
    }),
  ]);
  expect((await scheduled(story)).map((r) => r.status).sort()).toEqual(["done", "failed"]);
});

test("MS6. 지우기 — 하나 · 모두, 남의 것은 못 지움, 반응 cascade, 대화 인용은 Deleted story", async () => {
  await spoke(member, "mina");
  const story = (await postAs(member)).story!.id;
  const [reaction] = await claimAt(await later(1));
  await finish(reaction!.reactionId, "도착했구나!");
  const clientId = await uuid();
  const claimed = await claimReply(member, story, "mina", clientId);
  expect(claimed).toEqual({
    result: "mine",
    story: expect.objectContaining({
      line: "도착하다",
      wordKo: "도착하다",
      reaction: "도착했구나!",
    }),
  });
  expect(await quote(member, clientId)).toMatchObject({
    kind: "mine",
    id: story,
    characterId: "mina",
    line: "도착하다",
    imagePath: null,
  });

  expect(await remove(other, story)).toEqual({ deleted: 0 });
  expect(await remove(member, story)).toEqual({ deleted: 1 });
  expect(
    (await db.admin.query("select count(*)::int as n from companion.my_story_reactions")).rows[0].n,
  ).toBe(0);
  expect(await quote(member, clientId)).toEqual({ kind: "deleted", characterId: "mina" });
  expect((await claimReply(member, story, "mina", await uuid())).result).toBe("not_found");

  await postAs(member);
  await postAs(member);
  expect(await remove(member, null)).toEqual({ deleted: 2 });
  expect((await mine(member)).stories).toEqual([]);
});

test("MS7. 보관 끔 — 읽기는 살아 있는 것만, 정리는 끈 사람의 24시간 지난 것만 지운다", async () => {
  const kept = (await postAs(other)).story!.id;
  const old = (await postAs(member)).story!.id;
  const fresh = (await postAs(member)).story!.id;
  await db.admin.query(
    "update companion.my_stories set posted_at = now() - interval '30 hours', expires_at = now() - interval '6 hours' where id = any($1)",
    [[old, kept]],
  );
  expect((await mine(member)).stories.map((s) => s.id)).toEqual([fresh, old]);
  expect(await keep(member, false)).toEqual({ keep: false });
  expect(await mine(member)).toMatchObject({ keep: false });
  expect((await mine(member)).stories.map((s) => s.id)).toEqual([fresh]);
  expect(
    (await server.query("select public.companion_purge_my_stories(now()) as p")).rows[0].p,
  ).toEqual({ deleted: 1 });
  expect((await mine(other)).stories.map((s) => s.id)).toEqual([kept]);
  expect(await keep(member, true)).toEqual({ keep: true });
});

test("MS8. 친구 스토리 답장은 그대로 — 인용에 kind friend가 붙고, 내 스토리 스위치가 꺼지면 내 스토리 답장은 off", async () => {
  await db.admin.query(
    `insert into companion.story_pool (id, character_id, image_path, line_ko, line_roman, meaning, word, replies)
     values ('ms-test-01', 'mina', 'content/images/a.webp', '한 줄', 'han jul', '{"en":"line"}', null, '["좋아!"]')`,
  );
  const friend = (
    await db.admin.query(
      `insert into companion.stories (pool_id, character_id, day, posted_at, expires_at)
       values ('ms-test-01', 'mina', current_date, now() - interval '1 hour', now() + interval '23 hours') returning id`,
    )
  ).rows[0].id as string;
  const clientId = await uuid();
  expect((await claimReply(member, friend, "mina", clientId)).result).toBe("free");
  expect(await quote(member, clientId)).toMatchObject({
    kind: "friend",
    id: friend,
    line: "한 줄",
  });

  const story = (await postAs(member)).story!.id;
  await settings("my_stories = 'off'");
  expect((await claimReply(member, story, "mina", await uuid())).result).toBe("off");
  expect((await claimReply(member, await uuid(), "mina", await uuid())).result).toBe("not_found");
});

test("MS9. 앱 역할은 서버 함수를 못 부르고, 손님은 앱 함수를 못 부른다", async () => {
  await signIn(app, member);
  await expect(
    app.query("select public.companion_claim_story_reactions(now(), 10)"),
  ).rejects.toMatchObject({ code: "42501" });
  await expect(app.query("select public.companion_purge_my_stories(now())")).rejects.toMatchObject({
    code: "42501",
  });
  const anon = await db.connect();
  await anon.query("set role anon");
  await expect(anon.query("select public.companion_my_stories()")).rejects.toMatchObject({
    code: "42501",
  });
});

test("MS10. 상한은 지워도 줄지 않는다 — 지우고 다시 올려도 daily_limit, 반응을 받은 스토리를 지워도 사람 반응 상한은 그대로", async () => {
  await settings("my_story_daily = 1, story_reaction_user_daily = 1");
  for (const c of ["mina", "yoonkyung"]) await spoke(member, c);
  const first = (await postAs(member)).story!.id;
  expect(await claimAt(await later(8))).toHaveLength(1);
  await remove(member, first);
  expect((await postAs(member)).result).toBe("daily_limit");
  await remove(member, null);
  expect((await postAs(member)).result).toBe("daily_limit");

  // 하루 올리기를 늘려도 오늘 쓴 반응 1은 그대로 — 새 스토리의 반응은 skipped.
  await settings("my_story_daily = 3");
  const second = (await postAs(member)).story!.id;
  expect(await claimAt(await later(8))).toEqual([]);
  expect((await scheduled(second)).map((r) => r.status)).toEqual(["skipped", "skipped"]);
});

test("MS11. 정리(보관 끔)로 스토리가 지워져도 전체 반응 수는 그대로다", async () => {
  await settings("story_reaction_global_daily = 1");
  await spoke(member, "mina");
  await spoke(other, "mina");
  await keep(member, false);
  await postAs(member);
  expect(await claimAt(await later(8))).toHaveLength(1);
  await db.admin.query("update companion.my_stories set expires_at = now() - interval '1 minute'");
  expect(
    (await server.query("select public.companion_purge_my_stories(now()) as p")).rows[0].p,
  ).toEqual({ deleted: 1 });
  await postAs(other);
  expect(await claimAt(await later(8))).toEqual([]);
});

test("MS12. 동시에 두 번 claim해도 전체 상한을 넘지 않는다(줄 세움)", async () => {
  await settings("story_reaction_global_daily = 2");
  // plpgsql FOR 고리는 열 줄씩 미리 읽어 잠그므로, 경쟁이 보이게 때가 된 반응을 열다섯 줄 둔다.
  await settings("my_story_daily = 20, story_reaction_user_daily = 20");
  await db.admin.query(
    `with s as (
       insert into companion.my_stories (user_id, client_id, kind, word, ko, roman, meaning, lang, posted_at, expires_at)
       select $1, gen_random_uuid(), 'word', '{"episodeId":"u01","ref":"voca:x"}', '야근', '', 'overtime', 'en', now(), now() + interval '24 hours'
       from generate_series(1, 15)
       returning id
     )
     insert into companion.my_story_reactions (story_id, user_id, character_id, due_at, status)
     select id, $1, 'mina', now() - interval '1 minute', 'scheduled' from s`,
    [member],
  );
  const at = new Date().toISOString();
  const second = await db.connect();
  try {
    await second.query("set role service_role");
    await server.query("begin");
    const first = (
      await server.query("select public.companion_claim_story_reactions($1::timestamptz, 1) as c", [
        at,
      ])
    ).rows[0].c.rows as Claimed[];
    const pending = second.query(
      "select public.companion_claim_story_reactions($1::timestamptz, 50) as c",
      [at],
    );
    await new Promise((resolve) => setTimeout(resolve, 300));
    await server.query("commit");
    const later2 = (await pending).rows[0].c.rows as Claimed[];
    expect(first.length + later2.length).toBe(2);
  } finally {
    await server.query("rollback").catch(() => undefined);
    await second.end();
  }
});

test("MS13. 30분 넘게 claimed로 남은 줄(함수가 끊김)은 다음 claim 때 failed로 끝낸다", async () => {
  await spoke(member, "mina");
  const story = (await postAs(member)).story!.id;
  expect(await claimAt(await later(8))).toHaveLength(1);
  await db.admin.query(
    "update companion.my_story_reactions set claimed_at = claimed_at - interval '31 minutes'",
  );
  await claimAt(await later(8));
  expect((await scheduled(story)).map((r) => r.status)).toEqual(["failed"]);
});

test("MS14. 단어 칸 길이 — episodeId 80자 · ref 120자를 넘으면 invalid, 끝내기의 meta(사용량)는 남는다", async () => {
  expect(
    (await postAs(member, undefined, { word: { episodeId: "e".repeat(81), ref: "voca:x" } }))
      .result,
  ).toBe("invalid");
  expect(
    (await postAs(member, undefined, { word: { episodeId: "u01", ref: "r".repeat(121) } })).result,
  ).toBe("invalid");
  await spoke(member, "mina");
  await postAs(member);
  const [claim] = await claimAt(await later(8));
  await server.query(
    "select public.companion_finish_story_reaction($1, $2, null, true, now(), $3::jsonb)",
    [claim!.reactionId, "도착하면 연락해!", JSON.stringify({ usage: { reply: { calls: 1 } } })],
  );
  expect(
    (
      await db.admin.query("select meta from companion.my_story_reactions where id = $1", [
        claim!.reactionId,
      ])
    ).rows[0].meta,
  ).toEqual({ usage: { reply: { calls: 1 } } });
});

test("MS15. 건너뛴 까닭(감사 A14) — 사람 상한 cap_user · 전체 상한 globalCapped · 24시간 expired · 스위치 switch_off · 끊김 stale · 단어 없음 no_word · 예산 budget", async () => {
  for (const c of ["mina", "yoonkyung", "haejun"]) await spoke(member, c);
  await settings("story_reaction_user_daily = 2");
  const story = (await postAs(member)).story!.id;
  const capped = await claimFull(await later(8));
  expect(capped).toMatchObject({ skippedCap: 1, globalCapped: false });
  expect(capped.rows).toHaveLength(2);
  expect((await reasons(story)).filter((r) => r.status === "skipped")).toEqual([
    { status: "skipped", skip_reason: "cap_user" },
  ]);

  const [a, b] = capped.rows;
  await server.query(
    "select public.companion_finish_story_reaction($1, null, null, false, now(), $2::jsonb)",
    [a!.reactionId, JSON.stringify({ outcome: "rejected" })],
  );
  await server.query(
    "select public.companion_finish_story_reaction($1, null, null, false, now(), $2::jsonb)",
    [b!.reactionId, JSON.stringify({ outcome: "budget" })],
  );
  expect((await reasons(story)).map((r) => r.skip_reason).sort()).toEqual([
    "budget",
    "cap_user",
    "no_word",
  ]);

  await db.admin.query("delete from companion.my_story_reactions");
  await db.admin.query("delete from companion.my_story_usage");
  await db.admin.query("delete from companion.my_story_usage_global");
  await settings("story_reaction_user_daily = 3, story_reaction_global_daily = 1");
  const second = (await postAs(member)).story!.id;
  expect(await claimFull(await later(8))).toMatchObject({ globalCapped: true, skippedCap: 0 });
  await db.admin.query(
    "update companion.my_story_reactions set claimed_at = claimed_at - interval '31 minutes' where status = 'claimed'",
  );
  await settings("story_reaction_global_daily = 500, story_reactions = 'off'");
  await claimFull(await later(8));
  expect((await reasons(second)).map((r) => r.skip_reason).sort()).toEqual([
    "stale",
    "switch_off",
    "switch_off",
  ]);

  await settings("story_reactions = 'on'");
  const third = (await postAs(member)).story!.id;
  await db.admin.query(
    "update companion.my_stories set posted_at = posted_at - interval '2 days' where id = $1",
    [third],
  );
  await claimFull(await later(8));
  expect((await reasons(third)).map((r) => r.skip_reason)).toEqual([
    "expired",
    "expired",
    "expired",
  ]);
});
