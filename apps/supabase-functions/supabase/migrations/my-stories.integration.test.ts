import { afterAll, beforeAll, beforeEach, expect, test } from "vitest";
import { signIn, startTestDatabase } from "./postgres.test-support";

// 20261228140000(ADR-0194 내 스토리 · ADR-0191): 내 스토리(단어 · 카드) — 스위치 · 올리기(두 번 눌러도 하나 · 시간대 창 · 24시간 상한) ·
// 답할 인물 고르기(가중 무작위 · 최대 둘) · Seen by · claim(상한 · 대화 중 미룸) · 끝내기(그 인물 방의 메시지로 저장) ·
// 지우기(알람 cascade · 메시지는 남고 인용만 「Deleted story」) · 보관 끔 정리 · 반응 푸시 문 · 대화 턴에 싣는 스토리 맥락.
const tester = "00000000-0000-4000-8000-000000000001";
const member = "00000000-0000-4000-8000-000000000002";
const other = "00000000-0000-4000-8000-000000000003";

let db: Awaited<ReturnType<typeof startTestDatabase>>;
let app: Awaited<ReturnType<typeof db.connect>>;
let server: typeof app;

const settings = (assignments: string) =>
  db.admin.query(`update companion.settings set ${assignments}`);
const rules = (value: Record<string, number>) =>
  db.admin.query("update companion.settings set my_story_rules = $1", [JSON.stringify(value)]);
const one = async <T>(sql: string, params: unknown[] = []) =>
  (await db.admin.query(sql, params)).rows[0] as T;
const uuid = async () => (await one<{ id: string }>("select gen_random_uuid() as id")).id;

type Reaction = {
  id: string;
  characterId: string;
  messageId: string;
  text: string;
  meaning: string | null;
  at: string;
};
type Window = { slot: string; day: string; nextAt: string; used: boolean };
type MyStory = {
  id: string;
  kind: string;
  word: { episodeId: string; ref: string };
  ko: string;
  expiresAt: string;
  postedAt: string;
  reactions: Reaction[];
  seenBy: { characterId: string; at: string }[];
};
type Posted = { result: string; story: MyStory | null; window?: Window };

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
    tz: null,
    ...extra,
  };
  return (
    await app.query(
      "select public.companion_post_my_story($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) as p",
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
        args.tz,
      ],
    )
  ).rows[0].p as Posted;
}
/** 쓴 창을 옛날로 밀어 지금 창을 다시 연다 — 24시간 상한(`created_at`)은 그대로 센다. */
const reopenWindow = (user: string) =>
  db.admin.query(
    "update companion.my_story_slots set local_day = local_day - 30 - (random() * 1000)::int where user_id = $1",
    [user],
  );
async function postAgain(user: string) {
  await reopenWindow(user);
  return postAs(user);
}
async function mine(user: string) {
  await signIn(app, user);
  return (await app.query("select public.companion_my_stories() as s")).rows[0].s as {
    enabled: boolean;
    keep: boolean;
    stories: MyStory[];
    window: Window | null;
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
/** 그 인물에게 말한 적이 있게 만든다(= 친구). 기본은 두 시간 전 — claim의 「대화 중」 판정에 걸리지 않게. */
async function spoke(user: string, character: string, at = "now() - interval '2 hours'") {
  const id = (
    await one<{ id: string }>(
      `insert into companion.conversations (user_id, character_id, last_message_at) values ($1, $2, ${at})
       on conflict (user_id, character_id) where kind = 'companion' do update set last_message_at = excluded.last_message_at
       returning id`,
      [user, character],
    )
  ).id;
  await db.admin.query(
    `insert into companion.messages (conversation_id, user_id, role, origin, status, text, client_message_id, created_at)
     values ($1, $2, 'user', 'turn', 'complete', '안녕하세요', gen_random_uuid(), ${at})`,
    [id, user],
  );
  return id;
}
type Alarm = {
  id: string;
  character_id: string;
  rank: number;
  angle: string;
  seconds: number;
  status: string;
  skip_reason: string | null;
  message_id: string | null;
};
const alarms = async (story: string) =>
  (
    await db.admin.query(
      `select r.id, r.character_id, r.rank, r.angle, extract(epoch from r.due_at - s.posted_at)::int as seconds,
         r.status, r.skip_reason, r.message_id
       from companion.my_story_reactions r join companion.my_stories s on s.id = r.story_id
       where r.story_id = $1 order by r.rank`,
      [story],
    )
  ).rows as Alarm[];
const seenRows = async (story: string) =>
  (
    await db.admin.query(
      `select v.character_id, extract(epoch from v.seen_at - s.posted_at)::int as seconds
       from companion.my_story_seen v join companion.my_stories s on s.id = v.story_id
       where v.story_id = $1 order by v.character_id`,
      [story],
    )
  ).rows as { character_id: string; seconds: number }[];
type Claimed = {
  reactionId: string;
  userId: string;
  characterId: string;
  storyId: string;
  angle: string;
};
type ClaimResult = { rows: Claimed[]; skippedCap: number; deferred: number; globalCapped: boolean };
const claimFull = async (at: string, limit = 50) =>
  (
    await server.query("select public.companion_claim_story_reactions($1::timestamptz, $2) as c", [
      at,
      limit,
    ])
  ).rows[0].c as ClaimResult;
const later = async (hours: number) =>
  (await one<{ t: string }>(`select (now() + interval '${hours} hours')::text as t`)).t;
const speech = (text: string, translation?: string) => [
  { kind: "action", text: "웃는다" },
  { kind: "speech", text, ...(translation === undefined ? {} : { translation }) },
];
async function finish(
  id: string,
  options: { ok?: boolean; segments?: unknown; meta?: unknown; messageId?: string } = {},
) {
  const messageId = options.messageId ?? (await uuid());
  const result = (
    await server.query(
      "select public.companion_finish_story_reaction($1, $2, now(), $3, $4, $5, $6) as f",
      [
        id,
        options.ok ?? true,
        messageId,
        JSON.stringify(
          options.segments ?? speech("야근 끝나면 라면 먹어!", "Have ramen after overtime!"),
        ),
        JSON.stringify(options.meta ?? { outcome: "done", usage: { steps: 3 } }),
        JSON.stringify({ version: 2, items: [{ ko: "좋아!" }] }),
      ],
    )
  ).rows[0].f as { updated: number; saved: boolean };
  return { ...result, messageId };
}
const messageJson = async (id: string) =>
  (
    await one<{ j: Record<string, unknown> }>(
      "select companion.message_json(m) as j from companion.messages m where m.id = $1",
      [id],
    )
  ).j;
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
  (
    await one<{ q: Record<string, unknown> | null }>(
      "select companion.story_quote_json($1, $2) as q",
      [user, clientId],
    )
  ).q;
/** 스토리를 올리고 때가 된 알람을 모두 고른다(두 시간 뒤 시각으로). */
async function postAndClaim(user: string) {
  const story = (await postAgain(user)).story!;
  return {
    story,
    claimed: (await claimFull(await later(2))).rows.filter((row) => row.storyId === story.id),
  };
}

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
  // 친구 스토리 · 시험 묶음 줄도 계정과 함께 지워지지 않는다.
  await db.admin.query("delete from companion.stories");
  await db.admin.query("delete from companion.story_pool where id like 'ms-%'");
  await settings(
    "testers_only = false, friends_mode = 'on', friend_stories = 'on', my_stories = 'on', story_reactions = 'on', story_reaction_push = 'off', my_story_seen = true, my_story_daily = 3, story_reaction_user_daily = 6, story_reaction_global_daily = 1000, my_story_rules = '{}'",
  );
  await db.admin.query(
    `insert into auth.users (id, email, raw_app_meta_data) values
       ($1, 't@libitum.test', '{"duru_tester": true}'), ($2, 'm@libitum.test', '{}'), ($3, 'o@libitum.test', '{}')`,
    [tester, member, other],
  );
});

test("MS1. 스위치(off 기본) · 상한 기본값(사람 6 · 전체 1000) · Seen 기본 켬 · origin story_reaction · testers 단계", async () => {
  const columns = (
    await db.admin.query(
      `select column_name, column_default from information_schema.columns
       where table_schema = 'companion' and table_name = 'settings'
         and column_name in ('my_stories', 'story_reactions', 'story_reaction_push', 'my_story_seen', 'my_story_daily',
           'story_reaction_user_daily', 'story_reaction_global_daily')`,
    )
  ).rows as { column_name: string; column_default: string }[];
  expect(Object.fromEntries(columns.map((c) => [c.column_name, c.column_default]))).toEqual({
    my_stories: "'off'::text",
    story_reactions: "'off'::text",
    story_reaction_push: "'off'::text",
    my_story_seen: "true",
    my_story_daily: "3",
    story_reaction_user_daily: "6",
    story_reaction_global_daily: "1000",
  });
  const check = await one<{ def: string }>(
    "select pg_get_constraintdef(oid) as def from pg_constraint where conname = 'messages_origin_check'",
  );
  expect(check.def).toContain("story_reaction");

  await settings("my_stories = 'off'");
  expect(await mine(member)).toMatchObject({
    enabled: false,
    keep: true,
    stories: [],
    window: null,
  });
  expect((await postAs(member)).result).toBe("off");
  await settings("my_stories = 'testers'");
  expect((await mine(member)).enabled).toBe(false);
  expect((await mine(tester)).enabled).toBe(true);
  expect((await postAs(tester)).result).toBe("ok");
});

test("MS2. 올리기 — 모양 · 24시간 · 같은 client id면 하나 · 잘못된 값은 invalid · 같은 창은 window_used · 24시간 상한", async () => {
  const clientId = await uuid();
  const posted = await postAs(member, clientId);
  expect(posted.result).toBe("ok");
  expect(posted.story).toMatchObject({
    kind: "card",
    word: { episodeId: "u02-arrival", ref: "voca:arrive" },
    ko: "도착하다",
    reactions: [],
    seenBy: [],
  });
  expect(Date.parse(posted.story!.expiresAt) - Date.parse(posted.story!.postedAt)).toBe(86_400_000);
  expect(posted.window).toMatchObject({ used: true });
  // 두 번 눌러도 하나 — 창을 이미 썼어도 같은 요청은 그 스토리를 돌려준다.
  expect((await postAs(member, clientId)).story!.id).toBe(posted.story!.id);
  expect((await mine(member)).stories).toHaveLength(1);

  const again = await postAs(member);
  expect(again).toMatchObject({ result: "window_used", story: null, window: { used: true } });
  expect(Date.parse(again.window!.nextAt)).toBeGreaterThan(Date.now());
  expect((await mine(member)).window).toMatchObject({ used: true, slot: again.window!.slot });
  // 다른 사람의 창은 따로다.
  expect((await postAs(other)).result).toBe("ok");

  for (const extra of [
    { kind: "photo" },
    { word: null },
    { word: { episodeId: "u02" } },
    { ko: " " },
    { ko: "가".repeat(41) },
    { meaning: "" },
    { lang: "english" },
    { word: { episodeId: "e".repeat(81), ref: "voca:x" } },
    { word: { episodeId: "u02", ref: "r".repeat(121) } },
  ]) {
    await reopenWindow(member);
    expect((await postAs(member, undefined, extra)).result).toBe("invalid");
  }
  // 창을 다시 열어도(앱이 보낸 시간대로 창을 바꿔도) 24시간 안 3 + 1개까지 — 정직한 사용은 어느 24시간에도 창 셋 + 하나를 넘지 않는다.
  expect((await postAgain(member)).result).toBe("ok");
  expect((await postAgain(member)).result).toBe("ok");
  expect((await postAgain(member)).result).toBe("ok");
  expect(await postAgain(member)).toMatchObject({ result: "daily_limit", story: null });
  // 어제 세 창을 다 쓴 사람도 오늘 창이 열리면 바로 올릴 수 있다(24시간이 안 지났어도).
  await db.admin.query(
    "update companion.my_story_slots set created_at = now() - interval '20 hours' where user_id = $1",
    [other],
  );
  await db.admin.query(
    `insert into companion.my_story_slots (user_id, local_day, slot, created_at)
     select $1, current_date - 40, slot, now() - interval '12 hours' from unnest(array['day', 'night']) slot`,
    [other],
  );
  expect((await postAgain(other)).result).toBe("ok");
});

test("MS3. 창 — 현지 04 · 12 · 18시 경계, 새벽은 전날 밤 창, 시간대는 프로필 → 앱이 보낸 차이 → UTC, 경계는 규칙으로 바꾼다", async () => {
  const windowAt = async (at: string, offset: number | null = null) =>
    (
      await one<{ w: Window }>("select companion.my_story_window($1, $2, $3::timestamptz) as w", [
        member,
        offset,
        at,
      ])
    ).w;
  expect(await windowAt("2026-11-24T03:00:00Z")).toEqual({
    slot: "night",
    day: "2026-11-23",
    nextAt: "2026-11-24T04:00:00.000Z",
    used: false,
  });
  expect(await windowAt("2026-11-24T05:00:00Z")).toMatchObject({
    slot: "morning",
    day: "2026-11-24",
    nextAt: "2026-11-24T12:00:00.000Z",
  });
  expect(await windowAt("2026-11-24T13:00:00Z")).toMatchObject({
    slot: "day",
    nextAt: "2026-11-24T18:00:00.000Z",
  });
  expect(await windowAt("2026-11-24T19:00:00Z")).toMatchObject({
    slot: "night",
    day: "2026-11-24",
    nextAt: "2026-11-25T04:00:00.000Z",
  });
  // 앱이 보낸 차이(+9시간): UTC 03시 = 현지 12시 → 낮 창, 다음 창은 현지 18시 = UTC 09시.
  expect(await windowAt("2026-11-24T03:00:00Z", 540)).toMatchObject({
    slot: "day",
    day: "2026-11-24",
    nextAt: "2026-11-24T09:00:00.000Z",
  });
  // 프로필 시간대가 있으면 앱이 보낸 값보다 먼저다.
  await db.admin.query(
    "insert into companion.profiles (user_id, timezone) values ($1, 'Asia/Seoul')",
    [member],
  );
  expect(await windowAt("2026-11-24T03:00:00Z", -300)).toMatchObject({
    slot: "day",
    nextAt: "2026-11-24T09:00:00.000Z",
  });
  await rules({ dayStart: 13 });
  expect(await windowAt("2026-11-24T03:00:00Z")).toMatchObject({
    slot: "morning",
    nextAt: "2026-11-24T04:00:00.000Z",
  });
});

test("MS4. 답할 인물 — 친구(내가 말한 대화)만 · 1명이면 1 · 여럿이면 1 ~ 2 · 각도 · 시각(첫 답 1 ~ 5분, 둘째 5 ~ 60분) · Seen은 전원", async () => {
  // 친구 없음 → 알람도 Seen도 없다.
  const alone = (await postAs(member)).story!.id;
  expect(await alarms(alone)).toEqual([]);
  expect(await seenRows(alone)).toEqual([]);
  // 방만 있고 말한 적 없는 인물은 친구가 아니다.
  await db.admin.query(
    "insert into companion.conversations (user_id, character_id) values ($1, 'doyun')",
    [member],
  );
  await spoke(member, "mina");
  const single = (await postAgain(member)).story!.id;
  expect(await alarms(single)).toMatchObject([{ character_id: "mina", rank: 1, angle: "react" }]);

  await spoke(member, "yoonkyung");
  await spoke(member, "duksu");
  await settings("my_story_daily = 20");
  await rules({ twoReplyChance: 1 });
  const two = (await postAgain(member)).story!.id;
  const picked = await alarms(two);
  expect(picked.map((alarm) => alarm.rank)).toEqual([1, 2]);
  expect(new Set(picked.map((alarm) => alarm.character_id)).size).toBe(2);
  // 덕수쌤이 친구면 단어 · 카드 스토리엔 늘 답하고 단어 담당(word · quiz — 20270110120000). 다른 인물은 첫째 react · 둘째 follow.
  const duksu = picked.find((alarm) => alarm.character_id === "duksu")!;
  expect(["word", "quiz"]).toContain(duksu.angle);
  const other = picked.find((alarm) => alarm.character_id !== "duksu")!;
  expect(other.angle).toBe(other.rank === 1 ? "react" : "follow");
  expect(picked[0]!.seconds).toBeGreaterThanOrEqual(60);
  expect(picked[0]!.seconds).toBeLessThanOrEqual(300);
  expect(picked[1]!.seconds).toBeGreaterThanOrEqual(300);
  expect(picked[1]!.seconds).toBeLessThanOrEqual(3600);
  const seen = await seenRows(two);
  expect(seen.map((row) => row.character_id)).toEqual(["duksu", "mina", "yoonkyung"]);
  for (const row of seen) {
    const alarm = picked.find((candidate) => candidate.character_id === row.character_id);
    // 답하는 인물은 답 30 ~ 120초 전에(올린 뒤 5초보다 이르지 않게), 나머지는 1 ~ 30분 사이에 본다.
    const earliest = alarm === undefined ? 60 : Math.max(5, alarm.seconds - 121);
    const latest = alarm === undefined ? 1800 : alarm.seconds - 1;
    expect(row.seconds).toBeGreaterThanOrEqual(earliest);
    expect(row.seconds).toBeLessThanOrEqual(latest);
  }

  await rules({ twoReplyChance: 0 });
  // 답이 하나면 덕수쌤 혼자(첫째 자리 — word · quiz).
  const solo = await alarms((await postAgain(member)).story!.id);
  expect(solo).toMatchObject([{ character_id: "duksu", rank: 1 }]);
  expect(["word", "quiz"]).toContain(solo[0]!.angle);
  // 반응 스위치가 꺼지면 알람은 없다(Seen은 남는다).
  await settings("story_reactions = 'off'");
  const off = (await postAgain(member)).story!.id;
  expect(await alarms(off)).toEqual([]);
  expect(await seenRows(off)).toHaveLength(3);
});

test("MS5. 가중치 — 최근성 × 친밀도 × 직전 답한 인물 0.6, 가중치가 큰 인물이 뽑힌다", async () => {
  const weight = async (ago: string | null, intimacy: number | null, repeated = false) =>
    Number(
      (
        await one<{ w: string }>(
          `select companion.reaction_weight(${ago === null ? "null" : `now() - interval '${ago}'`}, $1, $2, now()) as w`,
          [intimacy, repeated],
        )
      ).w,
    );
  expect(await weight("1 day", 40)).toBeCloseTo(2.2);
  expect(await weight("10 days", 20)).toBeCloseTo(0.75);
  expect(await weight("60 days", 5)).toBeCloseTo(0.15);
  expect(await weight("1 day", 60, true)).toBeCloseTo(1.8);
  expect(await weight(null, null)).toBeCloseTo(0.15);
  await rules({ recentWeight: 4, intimacy0: 2 });
  expect(await weight("1 day", 0)).toBeCloseTo(8);

  // 한 명만 답하게 하고, 오래된 인물의 가중치를 0에 가깝게 — 최근에 말한 친한 인물이 뽑힌다.
  await rules({ twoReplyChance: 0, oldWeight: 0.000001 });
  await settings("my_story_daily = 20");
  await spoke(member, "mina", "now() - interval '1 day'");
  await spoke(member, "yoonkyung", "now() - interval '90 days'");
  // 덕수쌤은 단어 스토리에 늘 들어가므로(20270106120000) 가중치 검사엔 다른 인물을 쓴다.
  await spoke(member, "doyun", "now() - interval '90 days'");
  await db.admin.query(
    "insert into companion.relationships (user_id, character_id, intimacy) values ($1, 'mina', 70)",
    [member],
  );
  for (let round = 0; round < 4; round += 1) {
    const story = (await postAgain(member)).story!.id;
    expect((await alarms(story)).map((alarm) => alarm.character_id)).toEqual(["mina"]);
  }
});

test("MS6. claim — 때가 된 것만 · 대화 중이면 미룸 · 사람 상한(skipped) · 전체 상한(남김) · 24시간 지난 스토리는 skipped", async () => {
  await rules({ twoReplyChance: 1 });
  await settings("my_story_daily = 20");
  await spoke(member, "mina");
  await spoke(member, "yoonkyung");
  const story = (await postAs(member)).story!.id;
  // 아직 때가 아니다(첫 답은 1분 뒤부터).
  expect(await claimFull(new Date().toISOString())).toMatchObject({ rows: [], deferred: 0 });

  // 그 인물과 방금 말했으면(1분 안) 이번에는 건너뛰고 scheduled로 남긴다.
  const at = await later(2);
  const [first, second] = await alarms(story);
  await spoke(member, first!.character_id, `'${at}'::timestamptz - interval '10 seconds'`);
  const busy = await claimFull(at);
  expect(busy.deferred).toBe(1);
  expect(busy.rows.map((row) => row.characterId)).toEqual([second!.character_id]);
  expect(busy.rows[0]).toMatchObject({ storyId: story, angle: second!.angle, userId: member });
  expect((await alarms(story)).map((alarm) => alarm.status)).toEqual(["scheduled", "claimed"]);
  // 1분이 지나면 고른다.
  expect((await claimFull(await later(3))).rows.map((row) => row.reactionId)).toEqual([first!.id]);

  // 사람 상한 — 장부가 찼으면 skipped(cap_user).
  await settings("story_reaction_user_daily = 2");
  const capped = (await postAgain(member)).story!.id;
  expect(await claimFull(await later(3))).toMatchObject({ rows: [], skippedCap: 2 });
  expect((await alarms(capped)).map((alarm) => alarm.skip_reason)).toEqual([
    "cap_user",
    "cap_user",
  ]);

  // 전체 상한 — 남겨 둔다(다음 회차).
  await settings("story_reaction_user_daily = 20, story_reaction_global_daily = 2");
  const waiting = (await postAgain(member)).story!.id;
  expect(await claimFull(await later(3))).toMatchObject({ rows: [], globalCapped: true });
  expect((await alarms(waiting)).map((alarm) => alarm.status)).toEqual(["scheduled", "scheduled"]);
  // 24시간이 지나면 정리된다. 스위치가 꺼졌으면 switch_off.
  await settings("story_reaction_global_daily = 1000");
  expect((await claimFull(await later(25))).rows).toEqual([]);
  expect((await alarms(waiting)).map((alarm) => alarm.skip_reason)).toEqual(["expired", "expired"]);
  const off = (await postAgain(member)).story!.id;
  await settings("story_reactions = 'off'");
  await claimFull(await later(2));
  expect((await alarms(off)).map((alarm) => alarm.skip_reason)).toEqual([
    "switch_off",
    "switch_off",
  ]);
});

test("MS7. 끝내기 — 반응은 그 인물 방의 메시지(origin story_reaction)가 되고, 스토리 읽기 · 기록 인용이 그 메시지를 따른다", async () => {
  await spoke(member, "mina");
  const { story, claimed } = await postAndClaim(member);
  expect(claimed).toHaveLength(1);
  const done = await finish(claimed[0]!.reactionId);
  expect(done).toMatchObject({ updated: 1, saved: true });
  const saved = await one<Record<string, unknown>>(
    `select m.role, m.origin, m.status, m.user_id, c.character_id, m.meta, m.suggestions, companion.media_eligible(m) as media
     from companion.messages m join companion.conversations c on c.id = m.conversation_id where m.id = $1`,
    [done.messageId],
  );
  expect(saved).toMatchObject({
    role: "assistant",
    origin: "story_reaction",
    status: "complete",
    user_id: member,
    character_id: "mina",
    media: true,
    // meta.angle = 모델이 알린 방식(없으면 역할), meta.role = 역할(20270110120000).
    meta: { myStoryId: story.id, angle: "react", role: "react", outcome: "done" },
    suggestions: { version: 2 },
  });
  expect(await alarms(story.id)).toMatchObject([{ status: "done", message_id: done.messageId }]);
  // 스토리 위 목록 — 말만, 뜻은 번역에서.
  const read = (await mine(member)).stories[0]!;
  expect(read.reactions).toEqual([
    {
      id: claimed[0]!.reactionId,
      characterId: "mina",
      messageId: done.messageId,
      text: "야근 끝나면 라면 먹어!",
      meaning: "Have ramen after overtime!",
      at: expect.stringMatching(/^\d{4}-\d\d-\d\dT/),
    },
  ]);
  // 기록의 인용.
  expect((await messageJson(done.messageId)).story).toMatchObject({
    kind: "mine",
    id: story.id,
    characterId: "mina",
    line: "도착하다",
  });
  // 끝난 알람은 다시 끝내지 못한다. 선톡 수에는 세지 않는다(origin이 다르다).
  expect(await finish(claimed[0]!.reactionId)).toMatchObject({ updated: 0, saved: false });
  expect(
    await one<{ n: string }>(
      "select count(*) as n from companion.messages where user_id = $1 and origin = 'proactive'",
      [member],
    ),
  ).toEqual({ n: "0" });
  // 숨긴 메시지는 목록에서 빠진다.
  await db.admin.query("update companion.messages set hidden = true where id = $1", [
    done.messageId,
  ]);
  expect((await mine(member)).stories[0]!.reactions).toEqual([]);
});

test("MS8. 끝내기 실패 — failed + 까닭(meta.outcome), 메시지는 없다. 그 사이 스토리를 지웠으면 저장하지 않는다", async () => {
  await settings("my_story_daily = 20");
  await spoke(member, "mina");
  const failed = await postAndClaim(member);
  const result = await finish(failed.claimed[0]!.reactionId, {
    ok: false,
    meta: { outcome: "blocked", usage: { steps: 2 } },
  });
  expect(result).toMatchObject({ updated: 1, saved: false });
  expect(await alarms(failed.story.id)).toMatchObject([
    { status: "failed", skip_reason: "blocked", message_id: null },
  ]);
  const countReactions = async () =>
    (
      await one<{ n: string }>(
        "select count(*) as n from companion.messages where user_id = $1 and origin = 'story_reaction'",
        [member],
      )
    ).n;
  expect(await countReactions()).toBe("0");
  // 시간 예산에 걸려 모델을 부르지 못한 줄은 알람으로 되돌리고 센 상한도 돌려놓는다 — 다음 회차가 다시 고른다.
  const late = await postAndClaim(member);
  const usage = async () =>
    Number(
      (
        await one<{ n: string }>(
          "select sum(claims) as n from companion.my_story_usage where user_id = $1",
          [member],
        )
      ).n,
    );
  const before = await usage();
  expect(
    await finish(late.claimed[0]!.reactionId, { ok: false, meta: { outcome: "budget" } }),
  ).toMatchObject({ updated: 1, saved: false, requeued: true });
  expect(await alarms(late.story.id)).toMatchObject([{ status: "scheduled", skip_reason: null }]);
  expect(await usage()).toBe(before - 1);
  expect((await claimFull(await later(2))).rows.map((row) => row.reactionId)).toEqual([
    late.claimed[0]!.reactionId,
  ]);
  // 빈 조각은 실패로.
  const empty = await postAndClaim(member);
  expect(await finish(empty.claimed[0]!.reactionId, { segments: [] })).toMatchObject({
    saved: false,
  });
  expect((await alarms(empty.story.id))[0]).toMatchObject({ status: "failed" });
  // 알람이 울린 뒤 스토리를 지움 → 알람 줄이 없다 → 메시지도 없다.
  const gone = await postAndClaim(member);
  expect(await remove(member, gone.story.id)).toEqual({ deleted: 1 });
  expect(await finish(gone.claimed[0]!.reactionId)).toMatchObject({ updated: 0, saved: false });
  expect(await countReactions()).toBe("0");
});

test("MS9. 지우기 — 하나 · 모두, 남의 것은 못 지움, 알람 · Seen cascade, 방의 반응 글은 남고 인용만 Deleted story", async () => {
  await settings("my_story_daily = 20");
  await rules({ twoReplyChance: 1 });
  await spoke(member, "mina");
  await spoke(member, "yoonkyung");
  const { story, claimed } = await postAndClaim(member);
  const done = await finish(claimed[0]!.reactionId);
  const replyId = await uuid();
  expect((await claimReply(member, story.id, claimed[0]!.characterId, replyId)).result).toBe(
    "mine",
  );
  expect(await quote(member, replyId)).toMatchObject({ kind: "mine", id: story.id });

  expect(await remove(other, story.id)).toEqual({ deleted: 0 });
  expect(await remove(member, story.id)).toEqual({ deleted: 1 });
  expect(await alarms(story.id)).toEqual([]);
  expect(await seenRows(story.id)).toEqual([]);
  // 반응 메시지는 남는다 — 글은 그대로, 인용만 바뀐다.
  const kept = await messageJson(done.messageId);
  expect(kept.story).toEqual({ kind: "deleted", characterId: claimed[0]!.characterId });
  expect(JSON.stringify(kept)).toContain("야근 끝나면 라면 먹어!");
  expect(await quote(member, replyId)).toEqual({
    kind: "deleted",
    characterId: claimed[0]!.characterId,
  });

  await postAgain(member);
  await postAgain(member);
  expect(await remove(member, null)).toEqual({ deleted: 2 });
  expect((await mine(member)).stories).toEqual([]);
});

test("MS10. 보관 끔 — 읽기는 살아 있는 것만, 정리는 끈 사람의 24시간 지난 것만 지운다", async () => {
  await postAs(member);
  await postAs(other);
  await db.admin.query(
    "update companion.my_stories set posted_at = posted_at - interval '25 hours', expires_at = expires_at - interval '25 hours'",
  );
  expect((await mine(member)).stories).toHaveLength(1);
  expect(await keep(member, false)).toEqual({ keep: false });
  expect(await mine(member)).toMatchObject({ keep: false, stories: [] });
  const purged = (await server.query("select public.companion_purge_my_stories(now()) as p"))
    .rows[0].p as { deleted: number };
  expect(purged).toEqual({ deleted: 1 });
  expect((await mine(other)).stories).toHaveLength(1);
});

test("MS11. 친구 스토리 답장은 그대로 · 내 스토리 인용 답(mine)은 그 인물의 반응 글을 싣는다 · 스위치가 꺼지면 off", async () => {
  await db.admin.query(
    `insert into companion.story_pool (id, character_id, image_path, line_ko, line_roman, meaning, word, replies)
     values ('ms-test-01', 'mina', 'content/images/a.webp', '한 줄', 'han jul', '{"en":"line"}', null, '["좋아!"]')`,
  );
  const friend = (
    await one<{ id: string }>(
      `insert into companion.stories (pool_id, character_id, day, posted_at, expires_at)
       values ('ms-test-01', 'mina', current_date, now() - interval '1 hour', now() + interval '23 hours') returning id`,
    )
  ).id;
  const clientId = await uuid();
  expect((await claimReply(member, friend, "mina", clientId)).result).toBe("free");
  expect(await quote(member, clientId)).toMatchObject({
    kind: "friend",
    id: friend,
    line: "한 줄",
  });

  await spoke(member, "mina");
  const { story, claimed } = await postAndClaim(member);
  await finish(claimed[0]!.reactionId);
  expect(await claimReply(member, story.id, "mina", await uuid())).toMatchObject({
    result: "mine",
    story: { line: "도착하다", reaction: "야근 끝나면 라면 먹어!" },
  });
  await settings("my_stories = 'off'");
  expect((await claimReply(member, story.id, "mina", await uuid())).result).toBe("off");
  expect((await claimReply(member, await uuid(), "mina", await uuid())).result).toBe("not_found");
});

test("MS12. 앱 역할은 서버 함수를 못 부르고, 손님은 앱 함수를 못 부른다", async () => {
  await signIn(app, member);
  for (const sql of [
    "select public.companion_claim_story_reactions(now(), 10)",
    "select public.companion_purge_my_stories(now())",
    "select public.companion_finish_story_reaction(gen_random_uuid(), false, now())",
    `select public.companion_story_reaction_push_gate('${member}', 'mina')`,
    `select public.companion_story_context('${member}', 'mina', now())`,
  ])
    await expect(app.query(sql)).rejects.toMatchObject({ code: "42501" });
  const anon = await db.connect();
  await anon.query("set role anon");
  await expect(anon.query("select public.companion_my_stories()")).rejects.toMatchObject({
    code: "42501",
  });
  await anon.end();
});

test("MS13. 창 · 상한은 지워도 돌아오지 않는다 — 지우고 다시 올려도 window_used, 반응을 받은 스토리를 지워도 사람 반응 상한은 그대로", async () => {
  await spoke(member, "mina");
  const first = (await postAs(member)).story!.id;
  await remove(member, first);
  expect((await postAs(member)).result).toBe("window_used");

  await settings("story_reaction_user_daily = 1");
  const { story, claimed } = await postAndClaim(member);
  expect(claimed).toHaveLength(1);
  await remove(member, story.id);
  const next = (await postAgain(member)).story!.id;
  expect(await claimFull(await later(2))).toMatchObject({ rows: [], skippedCap: 1 });
  expect((await alarms(next))[0]).toMatchObject({ skip_reason: "cap_user" });
  // 정리(보관 끔)로 스토리가 지워져도 전체 반응 수는 그대로다.
  expect(
    Number(
      (await one<{ n: string }>("select sum(claims) as n from companion.my_story_usage_global")).n,
    ),
  ).toBe(1);
});

test("MS14. 동시에 두 번 claim해도 전체 상한을 넘지 않는다(줄 세움) · 30분 넘게 claimed로 남은 줄은 failed(stale)", async () => {
  await settings("story_reaction_global_daily = 2, story_reaction_user_daily = 20");
  // plpgsql FOR 고리는 열 줄씩 미리 읽어 잠그므로, 경쟁이 보이게 때가 된 알람을 열다섯 줄 둔다.
  await db.admin.query(
    `with s as (
       insert into companion.my_stories (user_id, client_id, kind, word, ko, roman, meaning, lang, posted_at, expires_at)
       select $1, gen_random_uuid(), 'word', '{"episodeId":"u01","ref":"voca:x"}', '야근', '', 'overtime', 'en', now(), now() + interval '24 hours'
       from generate_series(1, 15)
       returning id
     )
     insert into companion.my_story_reactions (story_id, user_id, character_id, rank, angle, due_at, status)
     select id, $1, 'mina', 1, 'word', now() - interval '1 minute', 'scheduled' from s`,
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
  await settings("story_reaction_global_daily = 1000");
  await claimFull(await later(1));
  const stale = await one<{ n: string }>(
    "select count(*) as n from companion.my_story_reactions where status = 'failed' and skip_reason = 'stale'",
  );
  expect(stale.n).toBe("2");
});

test("MS15. Seen by — 시각이 된 줄만 보이고, 스위치를 끄면 빈 목록", async () => {
  await spoke(member, "mina");
  await spoke(member, "yoonkyung");
  const story = (await postAs(member)).story!;
  expect(story.seenBy).toEqual([]);
  await db.admin.query(
    "update companion.my_story_seen set seen_at = now() - interval '1 minute' where story_id = $1 and character_id = 'mina'",
    [story.id],
  );
  expect((await mine(member)).stories[0]!.seenBy).toEqual([
    { characterId: "mina", at: expect.stringMatching(/^\d{4}-\d\d-\d\dT/) },
  ]);
  await settings("my_story_seen = false");
  expect((await mine(member)).stories[0]!.seenBy).toEqual([]);
});

test("MS16. 반응 푸시 문 — 스위치는 story_reaction_push, 하루 한 번 판정은 없다. 반응 푸시가 나간 날은 선톡 푸시 문이 pushedToday", async () => {
  await spoke(member, "mina");
  await db.admin.query(
    "insert into public.push_devices (token, user_id, environment, created_at) values ($1, $2, 'production', now() - interval '1 day')",
    ["a".repeat(64), member],
  );
  const gate = async () =>
    (
      await server.query("select public.companion_story_reaction_push_gate($1, 'mina') as g", [
        member,
      ])
    ).rows[0].g as Record<string, unknown>;
  expect(await gate()).toEqual({ mode: "off", tester: false, hasDevice: true, hasRoom: true });
  await settings("story_reaction_push = 'testers'");
  expect(await gate()).toMatchObject({ mode: "testers" });

  const proactive = async () =>
    (await server.query("select public.companion_proactive_push_gate($1, 'mina') as g", [member]))
      .rows[0].g as { pushedToday: boolean };
  expect((await proactive()).pushedToday).toBe(false);
  await db.admin.query(
    `insert into public.push_campaign_sends (run_at, series, segment, user_id, "group", variant, lang, title, body, character_id)
     values (now(), '스토리 반응', 'companion-story-reaction', $1, 'sent', 'a', 'ko', '미나', '한강 가자!', 'mina')`,
    [member],
  );
  expect((await proactive()).pushedToday).toBe(true);
});

test("MS17. 스토리 맥락 — 살아 있는 내 스토리(지우면 빠짐 · 스위치 꺼지면 없음) · 그 인물이 최근 올린 스토리 셋", async () => {
  const context = async (character = "mina") =>
    (
      await server.query("select public.companion_story_context($1, $2, now()) as c", [
        member,
        character,
      ])
    ).rows[0].c as { mine: Record<string, unknown>[]; own: { line: string }[] };
  expect(await context()).toEqual({ mine: [], own: [] });
  const story = (await postAs(member)).story!.id;
  expect((await context()).mine).toEqual([
    {
      kind: "card",
      ko: "도착하다",
      meaning: "to arrive",
      exampleKo: "서울에 도착했어!",
      scene: null,
      overlays: [],
      postedAt: expect.any(String),
    },
  ]);
  // 답하지 않은 인물에게도 같은 맥락이 간다.
  expect((await context("yoonkyung")).mine).toHaveLength(1);
  // 만료된 것은 빠진다.
  await db.admin.query(
    "update companion.my_stories set posted_at = posted_at - interval '25 hours', expires_at = expires_at - interval '25 hours' where id = $1",
    [story],
  );
  expect((await context()).mine).toEqual([]);

  await db.admin.query(
    `insert into companion.story_pool (id, character_id, image_path, line_ko, line_roman, meaning, word, replies)
     select 'ms-ctx-' || n, 'mina', 'content/images/a.webp', '한 줄 ' || n, 'han jul', '{"en":"line"}', null, '["좋아!"]'
     from generate_series(1, 4) n`,
  );
  await db.admin.query(
    `insert into companion.stories (pool_id, character_id, day, posted_at, expires_at)
     select 'ms-ctx-' || n, 'mina', current_date - n, now() - make_interval(days => n), now() - make_interval(days => n - 1)
     from generate_series(1, 4) n`,
  );
  expect((await context()).own.map((own) => own.line)).toEqual(["한 줄 1", "한 줄 2", "한 줄 3"]);
  expect((await context("yoonkyung")).own).toEqual([]);
  await settings("friend_stories = 'off', my_stories = 'off'");
  expect(await context()).toEqual({ mine: [], own: [] });
});
