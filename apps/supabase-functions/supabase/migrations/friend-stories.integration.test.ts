import { afterAll, beforeAll, beforeEach, expect, test } from "vitest";
import { frequencySeriesOf, seriesOf } from "../functions/_shared/push-campaign-text.ts";
import { signIn, startTestDatabase } from "./postgres.test-support";

// 20261228(ADR-0178): 친구 스토리 — 묶음 · 날마다 올림 · 앱 읽기 · 스토리마다 첫 답장 무료(금액 0 예약) · 인용 · 알림 후보(선톡과 합쳐 하루 한 번).
const tester = "00000000-0000-4000-8000-000000000001";
const member = "00000000-0000-4000-8000-000000000002";
const other = "00000000-0000-4000-8000-000000000003";

let db: Awaited<ReturnType<typeof startTestDatabase>>;
let app: Awaited<ReturnType<typeof db.connect>>;
let server: typeof app;
let server2: typeof app;
let anon: typeof app;

const settings = (assignments: string) =>
  db.admin.query(`update companion.settings set ${assignments}`);

async function pool(id: string, character: string, extra: Record<string, unknown> = {}) {
  const row = {
    image_path: `content/images/${id}.webp`,
    line_ko: `${id} 한 줄`,
    line_roman: `${id} han jul`,
    meaning: { en: `${id} line`, es: `${id} línea` },
    word: { episodeId: "u01-water", ref: "voca:e70ba1ce" },
    replies: ["맛있겠다!", "수고했어!"],
    active: true,
    ...extra,
  };
  await db.admin.query(
    `insert into companion.story_pool (id, character_id, image_path, line_ko, line_roman, meaning, word, replies, active)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      id,
      character,
      row.image_path,
      row.line_ko,
      row.line_roman,
      JSON.stringify(row.meaning),
      row.word === null ? null : JSON.stringify(row.word),
      JSON.stringify(row.replies),
      row.active,
    ],
  );
}

const postHour = async (character: string) =>
  (await db.admin.query("select companion.story_post_hour($1) as h", [character])).rows[0]
    .h as number;

type Posted = { posted: { storyId: string; characterId: string; poolId: string }[] };
const post = async (now: string) =>
  (await server.query("select public.companion_post_stories($1) as p", [now])).rows[0].p as Posted;

/** 지금 살아 있게 올린 스토리 하나(올림 시각을 직접 넣음). */
async function live(character: string, poolId: string, postedAgo = "1 hour") {
  return (
    await db.admin.query(
      `insert into companion.stories (pool_id, character_id, day, posted_at, expires_at)
       values ($1, $2, (now() - $3::interval)::date, now() - $3::interval, now() - $3::interval + interval '24 hours')
       returning id`,
      [poolId, character, postedAgo],
    )
  ).rows[0].id as string;
}

type Story = {
  id: string;
  characterId: string;
  postedAt: string;
  expiresAt: string;
  imagePath: string;
  line: { ko: string; roman: string; meaning: Record<string, string> };
  word: { episodeId: string; ref: string } | null;
  replies: string[];
  freeReply: boolean;
};
async function stories(user: string) {
  await signIn(app, user);
  return (
    (await app.query("select public.companion_friend_stories() as s")).rows[0].s as {
      stories: Story[];
    }
  ).stories;
}

type Claim = {
  result: string;
  story: { line: string; wordKo?: string | null; imagePath: string; postedAt: string } | null;
};
const claim = async (
  user: string,
  story: string,
  character: string,
  clientId: string,
  client = server,
) =>
  (
    await client.query("select public.companion_claim_story_reply($1, $2, $3, $4, now()) as c", [
      user,
      story,
      character,
      clientId,
    ])
  ).rows[0].c as Claim;

const uuid = async () =>
  (await db.admin.query("select gen_random_uuid() as id")).rows[0].id as string;

async function gate(user: string, character: string, clientId: string) {
  return (
    await server.query("select public.companion_turn_gate($1, $2, $3, now(), null) as g", [
      user,
      character,
      clientId,
    ])
  ).rows[0].g as { result: string };
}
async function begin(user: string, character: string, clientId: string) {
  return (
    await server.query(
      "select public.companion_begin_turn($1, $2, $3, '맛있겠다!', 'text', 20, null, now()) as t",
      [user, character, clientId],
    )
  ).rows[0].t as { result: string; creditsReserved?: number; trial?: boolean; holdId?: string };
}
const trialLeft = async (user: string) =>
  (await db.admin.query("select companion.trial_left($1) as n", [user])).rows[0].n as number;

async function device(user: string, createdAt = "2026-01-01T00:00:00Z") {
  await db.admin.query(
    `insert into public.push_devices (token, user_id, environment, created_at)
     values (encode(sha256(convert_to($1, 'utf8')), 'hex'), $2, 'production', $3)`,
    [`token-${user}-${createdAt}`, user, createdAt],
  );
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
async function country(user: string, code: string) {
  await db.admin.query(
    `insert into public.learner_profiles (user_id, name, country_code) values ($1, 'L', $2)
     on conflict (user_id) do update set country_code = excluded.country_code`,
    [user, code],
  );
}
const ZONES: readonly (readonly [string, string])[] = [
  ["KR", "Asia/Seoul"],
  ["US", "America/New_York"],
  ["GB", "Europe/London"],
  ["IN", "Asia/Kolkata"],
  ["AU", "Australia/Sydney"],
  ["MX", "America/Mexico_City"],
  ["TH", "Asia/Bangkok"],
  ["BR", "America/Sao_Paulo"],
];
/** 그 나라 코드의 시간대(`zoneAtLocalHour`가 고른 것). */
function zoneOf(code: string): string {
  const found = ZONES.find(([each]) => each === code);
  if (found === undefined) throw new Error(`no zone for ${code}`);
  return found[1];
}
/** 지금이 현지 몇 시인 나라 — 테스트 시각에 맞춰 09 ~ 21시 안 · 밖의 시간대를 고릅니다. */
async function zoneAtLocalHour(inside: boolean) {
  for (const [code, zone] of ZONES) {
    const hour = (
      await db.admin.query("select extract(hour from now() at time zone $1)::int as h", [zone])
    ).rows[0].h as number;
    if ((hour >= 9 && hour < 21) === inside) return code;
  }
  throw new Error("no zone");
}
type Candidate = {
  userId: string;
  storyId: string;
  characterId: string;
  name: string;
  line: string;
  mode: string;
  tester: boolean;
  country: string | null;
};
const candidates = async () =>
  (await server.query("select public.companion_story_push_candidates(now(), 50) as c")).rows[0]
    .c as Candidate[];
async function sent(user: string, series: string, at = "now()", group = "sent") {
  await db.admin.query(
    `insert into public.push_campaign_sends (run_at, series, segment, user_id, "group", variant, lang, title, body)
     values (${at}, $1, 'seg', $2, $3, $4, 'en', 't', 'b')`,
    [series, user, group, group === "sent" ? "a" : null],
  );
}

beforeAll(async () => {
  db = await startTestDatabase();
  app = await db.connect();
  server = await db.connect();
  server2 = await db.connect();
  anon = await db.connect();
  await server.query("set role service_role");
  await server2.query("set role service_role");
  await anon.query("set role anon");
}, 90_000);
afterAll(async () => {
  await db?.close();
});
beforeEach(async () => {
  await db.admin.query("truncate auth.users cascade");
  await db.admin.query("delete from companion.story_replies");
  await db.admin.query("delete from companion.stories");
  await db.admin.query("delete from companion.story_pool");
  await settings(
    "testers_only = false, friends_mode = 'testers', friend_stories = 'on', story_push = 'off', proactive_push = 'off', trial_limit = 20, message_cost = 3, minor_daily_limit_seconds = null",
  );
  await db.admin.query(
    `insert into auth.users (id, email, raw_app_meta_data) values
       ($1, 't@libitum.test', '{"duru_tester": true}'), ($2, 'm@libitum.test', '{}'), ($3, 'o@libitum.test', '{}')`,
    [tester, member, other],
  );
});

// ------------------------------------------------------------------ 스위치 · 묶음 모양

test("FS1. 스위치 둘은 off가 기본이고 off · testers · on만 받는다", async () => {
  const defaults = (
    await db.admin.query(
      `select column_default, column_name from information_schema.columns
       where table_schema = 'companion' and table_name = 'settings' and column_name in ('friend_stories', 'story_push')`,
    )
  ).rows as { column_default: string }[];
  expect(defaults).toHaveLength(2);
  for (const row of defaults) expect(row.column_default).toContain("'off'");
  await expect(settings("friend_stories = 'all'")).rejects.toMatchObject({ code: "23514" });
  await expect(settings("story_push = 'yes'")).rejects.toMatchObject({ code: "23514" });
});

test("FS2. 묶음 줄은 en 뜻 · 답장 칩 1 ~ 3개가 있어야 한다", async () => {
  await expect(pool("bad-meaning", "mina", { meaning: { es: "x" } })).rejects.toMatchObject({
    code: "23514",
  });
  await expect(pool("bad-replies", "mina", { replies: [] })).rejects.toMatchObject({
    code: "23514",
  });
  await expect(
    pool("bad-replies-4", "mina", { replies: ["a", "b", "c", "d"] }),
  ).rejects.toMatchObject({ code: "23514" });
  await pool("ok", "mina", { word: null });
});

// ------------------------------------------------------------------ 올림

test("FS3. 올림 시각은 UTC 1 ~ 10시이고, 그 시각이 지나면 인물마다 하루 하나를 가장 적게 올린 줄(같으면 id 순)로 올린다", async () => {
  const hour = await postHour("mina");
  expect(hour).toBeGreaterThanOrEqual(1);
  expect(hour).toBeLessThanOrEqual(10);
  await pool("mina-02", "mina");
  await pool("mina-01", "mina");
  await pool("mina-03", "mina", { active: false });
  const at = (day: number, h: number) =>
    `2026-12-${String(day).padStart(2, "0")}T${String(h).padStart(2, "0")}:05:00Z`;

  expect((await post(at(1, hour - 1))).posted).toEqual([]); // 시각 전
  const first = (await post(at(1, hour))).posted;
  expect(first.map((p) => [p.characterId, p.poolId])).toEqual([["mina", "mina-01"]]);
  expect((await post(at(1, hour + 3))).posted).toEqual([]); // 같은 날 두 번째는 없음
  expect((await post(at(2, 23))).posted.map((p) => p.poolId)).toEqual(["mina-02"]);
  expect((await post(at(3, 23))).posted.map((p) => p.poolId)).toEqual(["mina-01"]);

  const row = (
    await db.admin.query("select posted_at, expires_at, day from companion.stories where id = $1", [
      first[0]!.storyId,
    ])
  ).rows[0] as { posted_at: Date; expires_at: Date; day: Date };
  expect(row.expires_at.getTime() - row.posted_at.getTime()).toBe(24 * 3600 * 1000);
});

test("FS4. 스위치 off면 올리지 않고, 묶음이 없는 인물 · 꺼진 인물은 건너뛴다", async () => {
  await pool("mina-01", "mina");
  await settings("friend_stories = 'off'");
  expect((await post("2026-12-01T23:00:00Z")).posted).toEqual([]);
  await settings("friend_stories = 'testers'");
  await db.admin.query("update companion.characters set active = false where id = 'mina'");
  expect((await post("2026-12-01T23:00:00Z")).posted).toEqual([]);
  await db.admin.query("update companion.characters set active = true where id = 'mina'");
  expect((await post("2026-12-01T23:00:00Z")).posted.map((p) => p.characterId)).toEqual(["mina"]);
});

test("FS5. 두 연결이 같은 시각에 올려도 인물 · 날마다 하나", async () => {
  await pool("mina-01", "mina");
  await pool("mina-02", "mina");
  const [a, b] = await Promise.all([
    server.query("select public.companion_post_stories('2026-12-05T23:00:00Z') as p"),
    server2.query("select public.companion_post_stories('2026-12-05T23:00:00Z') as p"),
  ]);
  const total = (a.rows[0].p as Posted).posted.length + (b.rows[0].p as Posted).posted.length;
  expect(total).toBe(1);
});

// ------------------------------------------------------------------ 앱 읽기

test("FS6. 앱 읽기 — 살아 있는 스토리만 최근 순, 모양 · 스위치 · 시험 계정 · 숨긴 친구", async () => {
  await pool("mina-01", "mina");
  await pool("yoonkyung-01", "yoonkyung", { word: null });
  await pool("seoyeon-01", "seoyeon");
  const mina = await live("mina", "mina-01", "3 hours");
  const yoonkyung = await live("yoonkyung", "yoonkyung-01", "1 hour");
  await live("seoyeon", "seoyeon-01", "2 hours");
  await live("mina", "mina-01", "30 hours"); // 만료

  const list = await stories(member);
  // 친구(kind friend)는 friends_mode testers라 회원에게 숨김.
  expect(list.map((s) => s.characterId)).toEqual(["yoonkyung", "mina"]);
  const first = list[1]!;
  expect(first).toEqual({
    id: mina,
    characterId: "mina",
    postedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
    expiresAt: expect.stringMatching(/Z$/),
    imagePath: "content/images/mina-01.webp",
    line: {
      ko: "mina-01 한 줄",
      roman: "mina-01 han jul",
      meaning: { en: "mina-01 line", es: "mina-01 línea" },
    },
    word: { episodeId: "u01-water", ref: "voca:e70ba1ce" },
    replies: ["맛있겠다!", "수고했어!"],
    freeReply: true,
  });
  expect(list[0]!.id).toBe(yoonkyung);
  expect(list[0]!.word).toBeNull();
  expect((await stories(tester)).map((s) => s.characterId)).toEqual([
    "yoonkyung",
    "seoyeon",
    "mina",
  ]);

  await settings("friend_stories = 'testers'");
  expect(await stories(member)).toEqual([]);
  expect((await stories(tester)).length).toBe(3);
  await settings("friend_stories = 'off'");
  expect(await stories(tester)).toEqual([]);
});

test("FS7. 권한 — anon은 읽지 못하고, 로그인 사용자는 서버 함수를 부르지 못한다", async () => {
  await expect(anon.query("select public.companion_friend_stories()")).rejects.toMatchObject({
    code: "42501",
  });
  await signIn(app, member);
  for (const sql of [
    "select public.companion_post_stories(now())",
    "select public.companion_claim_story_reply(gen_random_uuid(), gen_random_uuid(), 'mina', gen_random_uuid(), now())",
    "select public.companion_story_push_candidates(now(), 10)",
    "select * from companion.story_pool",
  ]) {
    await expect(app.query(sql)).rejects.toMatchObject({ code: "42501" });
  }
});

// ------------------------------------------------------------------ 첫 답장 무료

test("FS8. 첫 답장은 무료 — 같은 메시지 재전송은 같은 결과, 다른 메시지는 used, 다른 스토리 · 다른 사람은 따로", async () => {
  await pool("mina-01", "mina");
  const story = await live("mina", "mina-01");
  const first = await uuid();
  const result = await claim(member, story, "mina", first);
  expect(result).toEqual({
    result: "free",
    story: {
      line: "mina-01 한 줄",
      wordKo: null,
      imagePath: "content/images/mina-01.webp",
      postedAt: expect.stringMatching(/Z$/),
    },
  });
  expect((await claim(member, story, "mina", first)).result).toBe("free");
  const holds = (
    await db.admin.query(
      "select amount, status from companion.credit_holds where user_id = $1 and client_message_id = $2",
      [member, first],
    )
  ).rows;
  expect(holds).toEqual([{ amount: 0, status: "open" }]);
  expect((await claim(member, story, "mina", await uuid())).result).toBe("used");
  expect((await claim(other, story, "mina", await uuid())).result).toBe("free");
  expect((await stories(member))[0]!.freeReply).toBe(false);
  expect((await stories(other))[0]!.freeReply).toBe(false);
});

test("FS9. 두 메시지가 동시에 와도 무료는 하나", async () => {
  await pool("mina-01", "mina");
  const story = await live("mina", "mina-01");
  const [a, b] = await Promise.all([
    claim(member, story, "mina", await uuid(), server),
    claim(member, story, "mina", await uuid(), server2),
  ]);
  expect([a.result, b.result].sort()).toEqual(["free", "used"]);
});

test("FS10. 턴이 실패해 예약이 풀리면 무료가 다시 산다 — 같은 메시지 재전송도, 새 메시지도", async () => {
  await pool("mina-01", "mina");
  const story = await live("mina", "mina-01");
  const first = await uuid();
  await claim(member, story, "mina", first);
  const release = () =>
    db.admin.query(
      `select companion.release_hold(id) from companion.credit_holds
       where user_id = $1 and client_message_id = $2 and status = 'open'`,
      [member, first],
    );
  await release();
  expect((await stories(member))[0]!.freeReply).toBe(true);
  expect((await claim(member, story, "mina", first)).result).toBe("free"); // 재전송 — 새 금액 0 예약
  await release();
  expect((await claim(member, story, "mina", await uuid())).result).toBe("free"); // 새 메시지
  expect((await claim(member, story, "mina", first)).result).toBe("used"); // 앞 메시지는 이제 무료가 아님
});

test("FS11. 만료 · 없는 스토리 · 인물 불일치 · 스위치 off", async () => {
  await pool("mina-01", "mina");
  const expired = await live("mina", "mina-01", "25 hours");
  const result = await claim(member, expired, "mina", await uuid());
  expect(result.result).toBe("expired");
  expect(result.story?.line).toBe("mina-01 한 줄");
  const story = await live("mina", "mina-01");
  expect((await claim(member, story, "yoonkyung", await uuid())).result).toBe("not_found");
  expect((await claim(member, await uuid(), "mina", await uuid())).result).toBe("not_found");
  await settings("friend_stories = 'testers'");
  expect(await claim(member, story, "mina", await uuid())).toEqual({ result: "off", story: null });
  expect((await claim(tester, story, "mina", await uuid())).result).toBe("free");
});

test("FS12. 무료 등급 · 엽전 0 · 체험 0이어도 무료 답장은 관문을 지나고, 금액 0 · 체험을 쓰지 않는다", async () => {
  await settings("trial_limit = 0");
  await pool("mina-01", "mina");
  const story = await live("mina", "mina-01");
  expect((await gate(member, "mina", await uuid())).result).toBe("insufficient_credits");
  const message = await uuid();
  await claim(member, story, "mina", message);
  expect((await gate(member, "mina", message)).result).toBe("ok");
  const turn = await begin(member, "mina", message);
  expect(turn).toMatchObject({ result: "ok", creditsReserved: 0, trial: false });
});

test("FS13. 체험이 남은 사람의 무료 답장은 체험 칸을 줄이지 않는다", async () => {
  await pool("mina-01", "mina");
  const story = await live("mina", "mina-01");
  const before = await trialLeft(member);
  const message = await uuid();
  await claim(member, story, "mina", message);
  expect(await begin(member, "mina", message)).toMatchObject({ creditsReserved: 0, trial: false });
  expect(await trialLeft(member)).toBe(before);
});

test("FS14. 구독 겉 관문도 그 메시지의 예약이 있으면 엽전 부족을 보지 않는다", async () => {
  await settings("trial_limit = 0");
  await pool("mina-01", "mina");
  const story = await live("mina", "mina-01");
  // 요금제 무료가 하루 0인 구독(가장 엄한 판) — chat_plus 값을 잠시 바꾸고 되돌린다.
  const saved = (
    await db.admin.query(
      "select daily_free_messages, chat_rank from companion.plans where id = 'chat_plus'",
    )
  ).rows[0] as { daily_free_messages: number | null; chat_rank: number | null };
  await db.admin.query(
    "update companion.plans set daily_free_messages = 0, chat_rank = 5 where id = 'chat_plus'",
  );
  try {
    await db.admin.query(
      `insert into companion.plan_entitlements (user_id, entitlement, product_id, status, expires_at, source_event_id, last_event_at)
       values ($1, 'chat_plus', 'test', 'active', now() + interval '1 day', 'test', now())`,
      [member],
    );
    expect((await gate(member, "mina", await uuid())).result).toBe("insufficient_credits");
    const message = await uuid();
    await claim(member, story, "mina", message);
    expect((await gate(member, "mina", message)).result).toBe("ok");
    expect(await begin(member, "mina", message)).toMatchObject({
      result: "ok",
      creditsReserved: 0,
    });
  } finally {
    await db.admin.query(
      "update companion.plans set daily_free_messages = $1, chat_rank = $2 where id = 'chat_plus'",
      [saved.daily_free_messages, saved.chat_rank],
    );
  }
});

// ------------------------------------------------------------------ 인용

test("FS15. 기록의 내 메시지에 스토리 인용이 실린다 — 무료가 아니어도, 다른 메시지는 null", async () => {
  await pool("mina-01", "mina");
  const story = await live("mina", "mina-01");
  const quoted = await uuid();
  const plain = await uuid();
  await claim(member, story, "mina", quoted);
  await begin(member, "mina", quoted);
  await db.admin.query(
    "update companion.messages set status = 'complete' where client_message_id = $1",
    [quoted],
  );
  await begin(member, "mina", plain);
  await db.admin.query(
    "update companion.messages set status = 'complete' where client_message_id = $1",
    [plain],
  );
  await signIn(app, member);
  const page = (await app.query("select public.companion_list_messages('mina', null, 10) as p"))
    .rows[0].p as { messages: { text: string; story: unknown }[] };
  const stories = page.messages.map((m) => m.story);
  expect(stories).toContainEqual({
    kind: "friend", // 내 스토리(20261228140000, ADR-0194)가 종류를 더함
    id: story,
    characterId: "mina",
    line: "mina-01 한 줄",
    imagePath: "content/images/mina-01.webp",
    postedAt: expect.stringMatching(/Z$/),
  });
  expect(stories.filter((s) => s === null)).toHaveLength(1);
});

// ------------------------------------------------------------------ 알림

async function pushReady(user: string, inside = true) {
  await device(user);
  await spoke(user, "mina");
  await country(user, await zoneAtLocalHour(inside));
}

test("FS16. 알림 후보 — 스위치 · 기기 · 방 · 현지 시각 · 답함 · 6시간 · 사람마다 가장 새 하나", async () => {
  await pool("mina-01", "mina");
  await pool("yoonkyung-01", "yoonkyung");
  const mina = await live("mina", "mina-01", "2 hours");
  expect(await candidates()).toEqual([]); // 스위치 off
  await settings("story_push = 'on'");
  await pushReady(member);
  await pushReady(tester);
  const list = await candidates();
  expect(list.map((c) => c.userId).sort()).toEqual([tester, member].sort());
  expect(list.find((c) => c.userId === member)).toEqual({
    userId: member,
    storyId: mina,
    characterId: "mina",
    name: expect.any(String),
    line: "mina-01 한 줄",
    mode: "on",
    tester: false,
    country: expect.stringMatching(/^[A-Z]{2}$/),
  });

  await settings("story_push = 'testers'");
  expect((await candidates()).map((c) => c.userId)).toEqual([tester]);
  await settings("story_push = 'on'");

  // 더 새 스토리가 있어도 방이 없는 인물은 아님 · 방이 있으면 가장 새 것 하나
  const yoonkyung = await live("yoonkyung", "yoonkyung-01", "1 hour");
  expect((await candidates()).find((c) => c.userId === member)?.storyId).toBe(mina);
  await spoke(member, "yoonkyung");
  expect((await candidates()).filter((c) => c.userId === member).map((c) => c.storyId)).toEqual([
    yoonkyung,
  ]);
});

test("FS16c. 알림 언어 나라 — 학습 프로필 나라가 마지막 지역보다 먼저(재리뷰 m6)", async () => {
  await settings("story_push = 'on'");
  await pool("mina-01", "mina");
  await live("mina", "mina-01", "2 hours");
  await pushReady(member);
  const code = (
    await db.admin.query("select country_code from public.learner_profiles where user_id = $1", [
      member,
    ])
  ).rows[0].country_code as string;
  const other = code === "VN" ? "TH" : "VN";
  // 시간대는 학습 나라의 것으로 못 박습니다 — 없으면 `user_timezone`이 마지막 지역(VN · TH)의 시각을 써서, 그곳이 밤인 시각(UTC 14 ~ 02시)에는
  // 후보에서 빠져 이 테스트가 시각에 따라 실패했습니다. 이 테스트가 보는 것은 알림 언어 나라의 순서뿐입니다.
  await db.admin.query(
    "insert into companion.profiles (user_id, last_region, timezone) values ($1, $2, $3) on conflict (user_id) do update set last_region = excluded.last_region, timezone = excluded.timezone",
    [member, other, zoneOf(code)],
  );
  expect((await candidates()).find((c) => c.userId === member)?.country).toBe(code);
});

test("FS17. 알림 후보에서 빠지는 사람 — 기기 없음 · 기기 뒤로 말 없음 · 선톡 off · 현지 밤 · 시간대 모름 · 답함 · 6시간 넘음", async () => {
  await settings("story_push = 'on'");
  await pool("mina-01", "mina");
  const story = await live("mina", "mina-01", "2 hours");

  await spoke(member, "mina"); // 기기 없음
  expect(await candidates()).toEqual([]);
  await device(member, "2999-01-01T00:00:00Z"); // 말한 뒤에 새 기기
  await country(member, await zoneAtLocalHour(true));
  expect(await candidates()).toEqual([]);
  await db.admin.query("delete from public.push_devices where user_id = $1", [member]);
  await device(member);
  expect((await candidates()).length).toBe(1);

  await db.admin.query(
    "insert into companion.profiles (user_id, proactive_pref) values ($1, 'off') on conflict (user_id) do update set proactive_pref = 'off'",
    [member],
  );
  expect(await candidates()).toEqual([]);
  await db.admin.query(
    "update companion.profiles set proactive_pref = 'daily1' where user_id = $1",
    [member],
  );

  await country(member, await zoneAtLocalHour(false));
  expect(await candidates()).toEqual([]);
  await db.admin.query("delete from public.learner_profiles where user_id = $1", [member]);
  expect(await candidates()).toEqual([]); // 시간대 모름
  await country(member, await zoneAtLocalHour(true));
  expect((await candidates()).length).toBe(1);

  await claim(member, story, "mina", await uuid());
  expect(await candidates()).toEqual([]); // 답함
  await db.admin.query("delete from companion.story_replies");
  await db.admin.query("update companion.stories set posted_at = now() - interval '7 hours'");
  expect(await candidates()).toEqual([]); // 6시간 넘음
});

test("FS18. 하루 한 번 합산 — 오늘(현지) 선톡 · 스토리 · 학습 자동 캠페인 밖의 다른 묶음이 나갔으면 빠지고, 어제 것 · 선톡 대조군은 세지 않는다", async () => {
  await settings("story_push = 'on'");
  await pool("mina-01", "mina");
  await live("mina", "mina-01", "2 hours");
  await pushReady(member);
  await sent(member, "선톡", "now() - interval '3 days'");
  await sent(member, "선톡", "now()", "control");
  expect((await candidates()).length).toBe(1);
  await sent(member, "선톡", "now() - interval '1 minute'");
  expect(await candidates()).toEqual([]);
  await db.admin.query("delete from public.push_campaign_sends");
  await sent(member, "tutorial-rest", "now() - interval '1 minute'");
  expect(await candidates()).toEqual([]);
});

test("FS18d. 학습 자동 캠페인(자동 · 빈도 묶음)만 받은 날에도 스토리 알림이 나간다 — 빈도 실험(ADR-0208) 칸마다 스토리 노출이 달라지지 않게", async () => {
  await settings("story_push = 'on'");
  await pool("mina-01", "mina");
  await live("mina", "mina-01", "2 hours");
  await pushReady(member);
  // 빈도 실험 「하루 2번」 칸 — 같은 날 두 통 · 옛 자동 캠페인 한 통.
  await sent(member, frequencySeriesOf("next"), "now() - interval '2 minutes'");
  await sent(member, frequencySeriesOf("next"), "now() - interval '1 minute'");
  await sent(member, seriesOf("tutorial-lesson1"), "now() - interval '1 minute'");
  expect((await candidates()).map((c) => c.userId)).toEqual([member]);

  // 선톡 · 스토리 · 스토리 반응을 받은 날은 그대로 막힌다.
  for (const series of ["선톡", "스토리", "스토리 시험", "스토리 반응"]) {
    await sent(member, series, "now() - interval '1 minute'");
    expect(await candidates(), series).toEqual([]);
    await db.admin.query("delete from public.push_campaign_sends where series = $1", [series]);
  }
  // 학습 자동 캠페인 밖의 묶음(사람이 보내는 캠페인 등)은 계속 센다 — 이름이 비슷해도 접두가 다르면 뺀다고 보지 않는다.
  for (const series of ["콘솔 · lesson1", "자동", "빈도", "tutorial-rest"]) {
    await sent(member, series, "now() - interval '1 minute'");
    expect(await candidates(), series).toEqual([]);
    await db.admin.query("delete from public.push_campaign_sends where series = $1", [series]);
  }
  expect((await candidates()).map((c) => c.userId)).toEqual([member]);
});

test("FS18e. 학습 자동 캠페인을 빼는 것은 스토리 알림뿐 — 선톡 푸시 문 · 반응 푸시 문 · pushed_today는 그대로", async () => {
  await spoke(member, "mina");
  await device(member, "2000-01-01T00:00:00Z");
  const proactive = async () =>
    (await server.query("select public.companion_proactive_push_gate($1, 'mina') as g", [member]))
      .rows[0].g as Record<string, unknown>;
  const reaction = async () =>
    (
      await server.query("select public.companion_story_reaction_push_gate($1, 'mina') as g", [
        member,
      ])
    ).rows[0].g as Record<string, unknown>;
  const pushedToday = async () =>
    (await db.admin.query("select companion.pushed_today($1, now()) as p", [member])).rows[0]
      .p as boolean;
  const beforeReaction = await reaction();
  expect(beforeReaction).not.toHaveProperty("pushedToday");
  await sent(member, frequencySeriesOf("next"), "now() - interval '1 minute'");
  // 선톡 문은 예전처럼 캠페인을 세지 않고, 반응 문은 하루 판정이 없으며, 묶음을 정하지 않은 pushed_today는 예전처럼 캠페인도 센다.
  expect((await proactive()).pushedToday).toBe(false);
  expect(await reaction()).toEqual(beforeReaction);
  expect(await pushedToday()).toBe(true);
});

test("FS18b. 스토리 대조군도 하루 한 줄 — 오늘(현지) 스토리 · 스토리 시험 줄이 있으면 후보(group 무관)에서 빠진다", async () => {
  await settings("story_push = 'on'");
  await pool("mina-01", "mina");
  await live("mina", "mina-01", "2 hours");
  await pushReady(member);
  expect((await candidates()).length).toBe(1);
  await sent(member, "스토리", "now() - interval '1 minute'", "control");
  expect(await candidates()).toEqual([]);
  await db.admin.query("delete from public.push_campaign_sends");
  await sent(member, "스토리 시험", "now() - interval '1 minute'", "control");
  expect(await candidates()).toEqual([]);
});

test("FS18c. 스토리 스위치가 꺼지거나 시험 계정만이면 알림 후보에서도 빠진다(알림 스위치가 on이어도)", async () => {
  await settings("story_push = 'on'");
  await pool("mina-01", "mina");
  await live("mina", "mina-01", "2 hours");
  await pushReady(member);
  expect((await candidates()).length).toBe(1);
  await settings("friend_stories = 'testers'");
  expect(await candidates()).toEqual([]);
  await settings("friend_stories = 'off'");
  expect(await candidates()).toEqual([]);
});

test("FS19. 선톡 푸시 문이 pushedToday를 돌려준다 — 선톡은 보낸 줄만, 스토리 묶음은 대조군 줄도(검수 A2), 다른 캠페인은 세지 않음", async () => {
  type Gate = { pushedToday: boolean; mode: string };
  const gate = async () =>
    (await server.query("select public.companion_proactive_push_gate($1, 'mina') as g", [member]))
      .rows[0].g as Gate;
  expect((await gate()).pushedToday).toBe(false);
  await sent(member, "선톡", "now()", "control");
  await sent(member, "tutorial-rest", "now()");
  expect((await gate()).pushedToday).toBe(false);
  await sent(member, "선톡", "now() - interval '1 minute'");
  expect(await gate()).toMatchObject({ pushedToday: true, mode: "off" });
});

test("FS19b. 스토리 대조군도 그날 선톡 푸시를 막는다 — 대조군이 선톡을 받으면 스토리 알림 효과 비교가 어긋난다(검수 A2)", async () => {
  type Gate = { pushedToday: boolean };
  const gate = async () =>
    (await server.query("select public.companion_proactive_push_gate($1, 'mina') as g", [member]))
      .rows[0].g as Gate;
  await sent(member, "스토리", "now() - interval '1 minute'", "control");
  expect((await gate()).pushedToday).toBe(true);
  await db.admin.query("delete from public.push_campaign_sends");
  await sent(member, "스토리 시험", "now() - interval '1 minute'", "control");
  expect((await gate()).pushedToday).toBe(true);
  await db.admin.query("delete from public.push_campaign_sends");
  await sent(member, "스토리", "now() - interval '3 days'", "control");
  expect((await gate()).pushedToday).toBe(false);
});

test("FS20. 스토리 알림 배정 줄은 인물 · 스토리를 남긴다 — push_campaign_sends.character_id · story_id(검수 A15, 다른 묶음은 null)", async () => {
  await pool("mina-01", "mina");
  const story = await live("mina", "mina-01", "2 hours");
  await db.admin.query(
    `insert into public.push_campaign_sends (run_at, series, segment, user_id, "group", variant, lang, title, body, character_id, story_id)
     values (now(), '스토리', 'friend-story', $1, 'sent', 'a', 'ja', '미나', 'b', 'mina', $2)`,
    [member, story],
  );
  await sent(member, "선톡");
  const rows = (
    await db.admin.query(
      "select series, character_id, story_id from public.push_campaign_sends order by id",
    )
  ).rows;
  expect(rows).toEqual([
    { series: "스토리", character_id: "mina", story_id: story },
    { series: "선톡", character_id: null, story_id: null },
  ]);
});
