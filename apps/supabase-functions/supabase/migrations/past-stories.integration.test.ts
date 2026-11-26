import { afterAll, beforeAll, beforeEach, expect, test } from "vitest";
import { signIn, startTestDatabase } from "./postgres.test-support";

// 20270111(ADR-0202): 지난 친구 스토리 — 친구 하나의 최근 7일 중 만료된 스토리를 10엽전(구독 Chat Plus · Premium은 무료)으로 7일 동안 연다.
// 시각이 필요한 판정은 내부 함수(`companion.*_at(…, p_now)`)로 보고, 로그인 · 권한 · RLS는 앱 RPC(`public.companion_*`)로 본다.
const tester = "00000000-0000-4000-8000-000000000001";
const member = "00000000-0000-4000-8000-000000000002";
const other = "00000000-0000-4000-8000-000000000003";

let db: Awaited<ReturnType<typeof startTestDatabase>>;
let app: Awaited<ReturnType<typeof db.connect>>;
let app2: typeof app;
let anon: typeof app;

const settings = (assignments: string) =>
  db.admin.query(`update companion.settings set ${assignments}`);

async function pool(id: string, character: string, word: unknown = null) {
  await db.admin.query(
    `insert into companion.story_pool (id, character_id, image_path, line_ko, line_roman, meaning, word, replies)
     values ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      id,
      character,
      `content/images/${id}.webp`,
      `${id} 한 줄`,
      `${id} han jul`,
      JSON.stringify({ en: `${id} line` }),
      word === null ? null : JSON.stringify(word),
      JSON.stringify(["좋다!"]),
    ],
  );
}

/** 지금보다 `ago`(예: '2 days') 전에 올린 스토리. 하루 하나라 다른 날짜로 둔다. */
async function story(character: string, poolId: string, ago: string) {
  return (
    await db.admin.query(
      `insert into companion.stories (pool_id, character_id, day, posted_at, expires_at)
       values ($1, $2, ((now() - $3::interval) at time zone 'utc')::date, now() - $3::interval,
               now() - $3::interval + interval '24 hours')
       returning id`,
      [poolId, character, ago],
    )
  ).rows[0].id as string;
}

/** 그 인물에게 말한 적이 있다(친구 — 내 스토리 반응 대상과 같은 기준). */
async function spoke(user: string, character: string) {
  const id = (
    await db.admin.query(
      `insert into companion.conversations (user_id, character_id, last_message_at) values ($1, $2, now())
       on conflict (user_id, character_id) where kind = 'companion' do update set last_message_at = excluded.last_message_at
       returning id`,
      [user, character],
    )
  ).rows[0].id as string;
  await db.admin.query(
    `insert into companion.messages (conversation_id, user_id, role, origin, status, text, client_message_id)
     values ($1, $2, 'user', 'turn', 'complete', '안녕하세요', gen_random_uuid())`,
    [id, user],
  );
}

async function wallet(user: string, buckets: { grant?: number; paid?: number; sub?: number }) {
  await db.admin.query(
    `insert into companion.credit_wallets (user_id, sub_balance, grant_balance, paid_balance) values ($1, $2, $3, $4)
     on conflict (user_id) do update set sub_balance = excluded.sub_balance, grant_balance = excluded.grant_balance,
       paid_balance = excluded.paid_balance`,
    [user, buckets.sub ?? 0, buckets.grant ?? 0, buckets.paid ?? 0],
  );
}
const balances = async (user: string) =>
  (
    await db.admin.query(
      "select sub_balance as sub, grant_balance as grant, paid_balance as paid from companion.credit_wallets where user_id = $1",
      [user],
    )
  ).rows[0] as { sub: number; grant: number; paid: number };
const spends = async (user: string) =>
  (
    await db.admin.query(
      `select delta, bucket, kind, reason, ref_id from companion.credit_ledger
       where user_id = $1 and reason = 'past_stories' order by bucket`,
      [user],
    )
  ).rows as { delta: number; bucket: string; kind: string; reason: string; ref_id: string }[];

async function subscribe(user: string, plan: string, expires = "now() + interval '30 days'") {
  await db.admin.query(
    `insert into companion.plan_entitlements (user_id, entitlement, product_id, status, expires_at, source_event_id, last_event_at)
     values ($1, $2, 'p', 'active', ${expires}, 'e', now())`,
    [user, plan],
  );
}

const uuid = async () =>
  (await db.admin.query("select gen_random_uuid() as id")).rows[0].id as string;

type Preview = { id: string; imagePath: string; postedAt: string };
type Status = {
  enabled: boolean;
  characterId: string;
  friend: boolean;
  count: number;
  previews: Preview[];
  open: boolean;
  expiresAt: string | null;
  price: number;
  subscriberFree: boolean;
  wallet: { balance: number };
};
type Open = {
  result: string;
  characterId: string;
  price: number;
  paidWith: string | null;
  openedAt: string | null;
  expiresAt: string | null;
  shortBy?: number;
  wallet: { balance: number };
};
type Listed = {
  result: string;
  expiresAt: string | null;
  stories: { id: string; characterId: string; line: { ko: string }; freeReply: boolean }[];
};

const at = (offset = "0 seconds") => `now() + interval '${offset}'`;
const status = async (user: string, character: string, offset?: string) =>
  (
    await db.admin.query(`select companion.past_stories_status_at($1, $2, ${at(offset)}) as s`, [
      user,
      character,
    ])
  ).rows[0].s as Status;
const open = async (user: string, character: string, request: string, offset?: string) =>
  (
    await db.admin.query(`select companion.open_past_stories_at($1, $2, $3, ${at(offset)}) as o`, [
      user,
      character,
      request,
    ])
  ).rows[0].o as Open;
const list = async (user: string, character: string, offset?: string) =>
  (
    await db.admin.query(`select companion.list_past_stories_at($1, $2, ${at(offset)}) as l`, [
      user,
      character,
    ])
  ).rows[0].l as Listed;
const opens = async (user: string) =>
  (
    await db.admin.query(
      "select character_id, paid_with, price from companion.past_story_opens where user_id = $1 order by opened_at",
      [user],
    )
  ).rows as { character_id: string; paid_with: string; price: number }[];

/** 윤경: 살아 있는 스토리 1(1시간 전) · 지난 스토리 3(1 · 3 · 6일 전) · 7일 넘은 것 1(8일 전). 미나: 지난 스토리 1. */
async function seed() {
  await pool("yk-1", "yoonkyung", { episodeId: "u01-water", ref: "voca:e70ba1ce" });
  await pool("yk-2", "yoonkyung");
  await pool("mina-1", "mina");
  const live = await story("yoonkyung", "yk-1", "1 hour");
  const day1 = await story("yoonkyung", "yk-2", "1 day 2 hours");
  const day3 = await story("yoonkyung", "yk-1", "3 days");
  const day6 = await story("yoonkyung", "yk-2", "6 days");
  const day8 = await story("yoonkyung", "yk-1", "8 days");
  const mina = await story("mina", "mina-1", "2 days");
  return { live, day1, day3, day6, day8, mina };
}

beforeAll(async () => {
  db = await startTestDatabase();
  app = await db.connect();
  app2 = await db.connect();
  anon = await db.connect();
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
    "testers_only = false, friends_mode = 'testers', friend_stories = 'on', past_stories = 'on', past_story_price = 10",
  );
  await db.admin.query(
    `insert into auth.users (id, email, raw_app_meta_data) values
       ($1, 't@libitum.test', '{"duru_tester": true}'), ($2, 'm@libitum.test', '{}'), ($3, 'o@libitum.test', '{}')`,
    [tester, member, other],
  );
});

// ------------------------------------------------------------------ 스위치 · 값

test("PX1. 스위치 `past_stories`는 off가 기본이고 off · testers · on만, 값 `past_story_price`는 10이 기본이고 양수만", async () => {
  const columns = (
    await db.admin.query(
      `select column_name, column_default from information_schema.columns
       where table_schema = 'companion' and table_name = 'settings' and column_name in ('past_stories', 'past_story_price')
       order by column_name`,
    )
  ).rows as { column_name: string; column_default: string }[];
  expect(columns.map((c) => [c.column_name, c.column_default])).toEqual([
    ["past_stories", "'off'::text"],
    ["past_story_price", "10"],
  ]);
  await expect(settings("past_stories = 'all'")).rejects.toMatchObject({ code: "23514" });
  await expect(settings("past_story_price = 0")).rejects.toMatchObject({ code: "23514" });
});

test("PX2. 스위치 off · testers · on — 꺼진 사람에게는 상태 enabled false, 열기 · 목록 off, 차감 없음. 친구 스토리 스위치가 꺼져도 off", async () => {
  await seed();
  for (const user of [tester, member]) {
    await spoke(user, "yoonkyung");
    await wallet(user, { paid: 50 });
  }

  await settings("past_stories = 'off'");
  const off = await status(tester, "yoonkyung");
  expect(off).toMatchObject({ enabled: false, count: 0, previews: [], open: false });
  expect((await open(tester, "yoonkyung", await uuid())).result).toBe("off");
  expect((await list(tester, "yoonkyung")).result).toBe("off");

  await settings("past_stories = 'testers'");
  expect((await status(tester, "yoonkyung")).enabled).toBe(true);
  expect((await status(member, "yoonkyung")).enabled).toBe(false);
  expect((await open(member, "yoonkyung", await uuid())).result).toBe("off");

  await settings("past_stories = 'on'");
  expect((await status(member, "yoonkyung")).enabled).toBe(true);

  await settings("friend_stories = 'off'");
  expect((await status(member, "yoonkyung")).enabled).toBe(false);
  expect((await open(member, "yoonkyung", await uuid())).result).toBe("off");

  expect(await balances(member)).toEqual({ sub: 0, grant: 0, paid: 50 });
  expect(await opens(tester)).toEqual([]);
});

// ------------------------------------------------------------------ 친구 · 지난 스토리

test("PX3. 만나지 않은 인물(말한 적 없음) · 숨긴 친구는 friend false — 미리보기 없음, 열기 not_friend, 목록 locked, 차감 없음", async () => {
  await seed();
  await pool("seoyeon-1", "seoyeon");
  await story("seoyeon", "seoyeon-1", "2 days");
  await wallet(member, { paid: 50 });

  const stranger = await status(member, "yoonkyung");
  expect(stranger).toMatchObject({
    enabled: true,
    friend: false,
    count: 0,
    previews: [],
    open: false,
  });
  expect((await open(member, "yoonkyung", await uuid())).result).toBe("not_friend");
  expect((await list(member, "yoonkyung")).result).toBe("locked");

  // 서연(kind friend)은 friends_mode testers라 회원에게 숨김 — 말했어도 친구가 아니다.
  await spoke(member, "seoyeon");
  expect((await status(member, "seoyeon")).friend).toBe(false);
  expect((await open(member, "seoyeon", await uuid())).result).toBe("not_friend");

  // 꺼진 인물도 아니다.
  await spoke(member, "yoonkyung");
  await db.admin.query("update companion.characters set active = false where id = 'yoonkyung'");
  expect((await open(member, "yoonkyung", await uuid())).result).toBe("not_friend");
  await db.admin.query("update companion.characters set active = true where id = 'yoonkyung'");

  expect(await balances(member)).toEqual({ sub: 0, grant: 0, paid: 50 });
  expect(await opens(member)).toEqual([]);
});

test("PX4. 지난 스토리가 0개면 count 0 · 열기 empty(차감 없음) — 24시간 안 스토리 · 7일 넘은 스토리는 세지 않는다", async () => {
  await pool("mina-1", "mina");
  await pool("mina-2", "mina");
  await story("mina", "mina-1", "2 hours"); // 살아 있음
  await story("mina", "mina-2", "9 days"); // 7일 넘음
  await spoke(member, "mina");
  await wallet(member, { paid: 50 });

  expect(await status(member, "mina")).toMatchObject({ friend: true, count: 0, previews: [] });
  expect((await open(member, "mina", await uuid())).result).toBe("empty");
  expect(await balances(member)).toEqual({ sub: 0, grant: 0, paid: 50 });
  expect(await opens(member)).toEqual([]);
});

test("PX5. 상태 모양 — 지난 스토리(최근 7일 · 만료됨)만 최신 순 미리보기(그림 · 날짜, 한 줄 없음), 값 10, 구독 무료 아님", async () => {
  const ids = await seed();
  await spoke(member, "yoonkyung");
  await wallet(member, { paid: 42 });

  const s = await status(member, "yoonkyung");
  expect(s).toEqual({
    enabled: true,
    characterId: "yoonkyung",
    friend: true,
    count: 3,
    previews: [
      {
        id: ids.day1,
        imagePath: "content/images/yk-2.webp",
        postedAt: expect.stringMatching(/Z$/),
      },
      {
        id: ids.day3,
        imagePath: "content/images/yk-1.webp",
        postedAt: expect.stringMatching(/Z$/),
      },
      {
        id: ids.day6,
        imagePath: "content/images/yk-2.webp",
        postedAt: expect.stringMatching(/Z$/),
      },
    ],
    open: false,
    expiresAt: null,
    price: 10,
    subscriberFree: false,
    wallet: expect.objectContaining({ balance: 42 }),
  });
  await settings("past_story_price = 15");
  expect((await status(member, "yoonkyung")).price).toBe(15);
});

// ------------------------------------------------------------------ 열기 — 엽전

test("PX6. 잔액이 모자라면 insufficient(shortBy) — 차감 · 기록 · 원장 없음", async () => {
  await seed();
  await spoke(member, "yoonkyung");
  await wallet(member, { grant: 4, paid: 5 });
  const result = await open(member, "yoonkyung", await uuid());
  expect(result).toMatchObject({
    result: "insufficient",
    characterId: "yoonkyung",
    price: 10,
    paidWith: null,
    openedAt: null,
    expiresAt: null,
    shortBy: 1,
    wallet: expect.objectContaining({ balance: 9 }),
  });
  expect(await balances(member)).toEqual({ sub: 0, grant: 4, paid: 5 });
  expect(await spends(member)).toEqual([]);
  expect(await opens(member)).toEqual([]);
});

test("PX7. 정확히 10을 뺀다 — 구독분 → 지급분 → 구매분 순, 원장 spend · past_stories · 요청 id, 7일 동안 열림", async () => {
  await seed();
  await spoke(member, "yoonkyung");
  await wallet(member, { sub: 3, grant: 4, paid: 20 });
  const request = await uuid();
  const result = await open(member, "yoonkyung", request);
  expect(result).toMatchObject({
    result: "opened",
    characterId: "yoonkyung",
    price: 10,
    paidWith: "coins",
    openedAt: expect.stringMatching(/Z$/),
    expiresAt: expect.stringMatching(/Z$/),
    wallet: expect.objectContaining({ balance: 17 }),
  });
  expect(Date.parse(result.expiresAt!) - Date.parse(result.openedAt!)).toBe(7 * 24 * 3600 * 1000);
  expect(await balances(member)).toEqual({ sub: 0, grant: 0, paid: 17 });
  expect(await spends(member)).toEqual([
    { delta: -4, bucket: "grant", kind: "spend", reason: "past_stories", ref_id: request },
    { delta: -3, bucket: "paid", kind: "spend", reason: "past_stories", ref_id: request },
    { delta: -3, bucket: "sub", kind: "spend", reason: "past_stories", ref_id: request },
  ]);
  expect(await opens(member)).toEqual([
    { character_id: "yoonkyung", paid_with: "coins", price: 10 },
  ]);
  const s = await status(member, "yoonkyung");
  expect(s.open).toBe(true);
  expect(s.expiresAt).toBe(result.expiresAt);
});

test("PX8. 같은 요청 id를 다시 보내면 같은 결과(차감 한 번) — 동시에 두 번 와도 한 번, 다른 인물에 같은 id는 거절", async () => {
  await seed();
  await spoke(member, "yoonkyung");
  await spoke(member, "mina");
  await wallet(member, { paid: 30 });
  const request = await uuid();
  const first = await open(member, "yoonkyung", request);
  const again = await open(member, "yoonkyung", request, "5 minutes");
  expect(again).toEqual({ ...first, wallet: again.wallet });
  expect(again.result).toBe("opened");
  expect(await balances(member)).toEqual({ sub: 0, grant: 0, paid: 20 });
  await expect(open(member, "mina", request)).rejects.toMatchObject({ code: "22023" });

  // 앱 RPC 두 연결이 같은 id로 동시에.
  const twin = await uuid();
  for (const c of [app, app2]) await signIn(c, member);
  const [a, b] = await Promise.all(
    [app, app2].map(
      async (c) =>
        (await c.query("select public.companion_open_past_stories('mina', $1) as o", [twin]))
          .rows[0].o as Open,
    ),
  );
  expect([a.result, b.result]).toEqual(["opened", "opened"]);
  expect(a.expiresAt).toBe(b.expiresAt);
  expect(await balances(member)).toEqual({ sub: 0, grant: 0, paid: 10 });
  expect((await opens(member)).length).toBe(2);
});

test("PX9. 이미 열려 있으면(다른 요청 id) already — 차감하지 않고 지금 열림의 만료를 돌려준다. 다른 인물은 따로 연다", async () => {
  await seed();
  await spoke(member, "yoonkyung");
  await spoke(member, "mina");
  await wallet(member, { paid: 30 });
  const first = await open(member, "yoonkyung", await uuid());
  const second = await open(member, "yoonkyung", await uuid(), "2 days");
  expect(second).toMatchObject({
    result: "already",
    paidWith: "coins",
    openedAt: first.openedAt,
    expiresAt: first.expiresAt,
  });
  expect(await balances(member)).toEqual({ sub: 0, grant: 0, paid: 20 });
  expect((await open(member, "mina", await uuid())).result).toBe("opened");
  expect(await balances(member)).toEqual({ sub: 0, grant: 0, paid: 10 });
});

test("PX10. 7일이 지나면 다시 잠긴다 — 상태 open false, 목록 locked, 다시 열면 다시 10", async () => {
  await seed();
  await spoke(member, "yoonkyung");
  await wallet(member, { paid: 30 });
  await open(member, "yoonkyung", await uuid());
  expect((await status(member, "yoonkyung", "6 days 23 hours")).open).toBe(true);
  expect((await list(member, "yoonkyung", "6 days 23 hours")).result).toBe("ok");
  const later = await status(member, "yoonkyung", "7 days 1 minute");
  expect(later.open).toBe(false);
  expect(later.expiresAt).toBeNull();
  expect((await list(member, "yoonkyung", "7 days 1 minute")).result).toBe("locked");
  // 그때는 지금의 지난 스토리가 모두 7일 밖이라, 그 사이(지금부터 5일 뒤)에 올라 만료된 스토리 하나를 둔다.
  await db.admin.query(
    `insert into companion.stories (pool_id, character_id, day, posted_at, expires_at)
     values ('yk-1', 'yoonkyung', ((now() + interval '5 days') at time zone 'utc')::date, now() + interval '5 days',
             now() + interval '6 days')`,
  );
  expect((await open(member, "yoonkyung", await uuid(), "7 days 1 minute")).result).toBe("opened");
  expect(await balances(member)).toEqual({ sub: 0, grant: 0, paid: 10 });
});

// ------------------------------------------------------------------ 구독 무료

test("PX11. 「모든 인물」 요금제(Chat Plus · Premium)가 살아 있으면 무료 — 값 0 기록, 원장 없음. 티켓 무제한 · 만료된 구독은 아님", async () => {
  await seed();
  for (const user of [tester, member, other]) await spoke(user, "yoonkyung");
  await subscribe(member, "chat_plus");
  await subscribe(tester, "unlimited_tickets");
  await subscribe(other, "premium", "now() - interval '1 day'");

  expect((await status(member, "yoonkyung")).subscriberFree).toBe(true);
  const result = await open(member, "yoonkyung", await uuid());
  expect(result).toMatchObject({ result: "opened", paidWith: "subscription", price: 0 });
  expect(await opens(member)).toEqual([
    { character_id: "yoonkyung", paid_with: "subscription", price: 0 },
  ]);
  expect(await spends(member)).toEqual([]);

  expect((await status(tester, "yoonkyung")).subscriberFree).toBe(false);
  expect((await open(tester, "yoonkyung", await uuid())).result).toBe("insufficient");
  expect((await status(other, "yoonkyung")).subscriberFree).toBe(false);
  expect((await open(other, "yoonkyung", await uuid())).result).toBe("insufficient");

  await db.admin.query(
    "update companion.plan_entitlements set expires_at = now() + interval '30 days' where user_id = $1",
    [other],
  );
  expect((await open(other, "yoonkyung", await uuid())).paidWith).toBe("subscription");
});

// ------------------------------------------------------------------ 목록

test("PX12. 열린 동안 목록은 그 친구의 지난 스토리만(24시간 안 · 7일 넘은 것 · 다른 인물 없음) 최신 순, 친구 스토리와 같은 모양 · freeReply false", async () => {
  const ids = await seed();
  await spoke(member, "yoonkyung");
  await wallet(member, { paid: 10 });
  expect(await list(member, "yoonkyung")).toEqual({
    result: "locked",
    expiresAt: null,
    stories: [],
  });
  const opened = await open(member, "yoonkyung", await uuid());
  const listed = await list(member, "yoonkyung");
  expect(listed.result).toBe("ok");
  expect(listed.expiresAt).toBe(opened.expiresAt);
  expect(listed.stories.map((s) => s.id)).toEqual([ids.day1, ids.day3, ids.day6]);
  expect(listed.stories[1]).toEqual({
    id: ids.day3,
    characterId: "yoonkyung",
    postedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
    expiresAt: expect.stringMatching(/Z$/),
    imagePath: "content/images/yk-1.webp",
    line: { ko: "yk-1 한 줄", roman: "yk-1 han jul", meaning: { en: "yk-1 line" } },
    word: { episodeId: "u01-water", ref: "voca:e70ba1ce" },
    replies: ["좋다!"],
    freeReply: false,
  });
  // 다른 사람은 이 열림을 쓰지 못한다.
  await spoke(other, "yoonkyung");
  expect((await list(other, "yoonkyung")).result).toBe("locked");
});

// ------------------------------------------------------------------ 앱 RPC · 권한 · RLS

test("PX13. 앱 RPC — 로그인 필요(28000), anon 거절, 상태 → 열기 → 목록이 지금 시각으로 돈다", async () => {
  await seed();
  await spoke(member, "yoonkyung");
  await wallet(member, { paid: 10 });
  for (const sql of [
    "select public.companion_past_stories_status('yoonkyung')",
    "select public.companion_open_past_stories('yoonkyung', gen_random_uuid())",
    "select public.companion_list_past_stories('yoonkyung')",
  ]) {
    await expect(anon.query(sql)).rejects.toMatchObject({ code: "42501" });
  }
  await app.query("set role authenticated");
  await app.query("select set_config('request.jwt.claim.sub', '', false)");
  await expect(
    app.query("select public.companion_past_stories_status('yoonkyung')"),
  ).rejects.toMatchObject({ code: "28000" });

  await signIn(app, member);
  const s = (await app.query("select public.companion_past_stories_status('yoonkyung') as s"))
    .rows[0].s as Status;
  expect(s).toMatchObject({ enabled: true, friend: true, count: 3, open: false });
  const o = (
    await app.query(
      "select public.companion_open_past_stories('yoonkyung', gen_random_uuid()) as o",
    )
  ).rows[0].o as Open;
  expect(o.result).toBe("opened");
  const l = (await app.query("select public.companion_list_past_stories('yoonkyung') as l")).rows[0]
    .l as Listed;
  expect(l.stories.length).toBe(3);
  await expect(
    app.query("select public.companion_open_past_stories('yoonkyung', null)"),
  ).rejects.toMatchObject({ code: "22004" });
  // 내부 함수는 앱이 부르지 못한다.
  await expect(
    app.query("select companion.open_past_stories_at($1, 'yoonkyung', gen_random_uuid(), now())", [
      member,
    ]),
  ).rejects.toMatchObject({ code: "42501" });
});

test("PX14. 열기 기록 — 앱은 표를 직접 못 읽고(스키마 비공개), RLS는 본인 줄만 읽기 · 쓰기는 함수만", async () => {
  await seed();
  for (const user of [member, other]) {
    await spoke(user, "yoonkyung");
    await subscribe(user, "chat_plus");
    await open(user, "yoonkyung", await uuid());
  }
  // 로그인 사용자 · anon은 companion 스키마를 쓰지 못한다(다른 컴패니언 표와 같다).
  await signIn(app, member);
  await expect(app.query("select * from companion.past_story_opens")).rejects.toMatchObject({
    code: "42501",
  });
  await expect(anon.query("select * from companion.past_story_opens")).rejects.toMatchObject({
    code: "42501",
  });

  // 스키마를 열어 줘도(authenticated를 물려받은 시험 역할) RLS가 본인 줄만 보이고, 쓰기 권한은 없다.
  await db.admin.query(`do $$ begin
    if not exists (select 1 from pg_roles where rolname = 'rls_probe') then create role rls_probe; end if;
  end $$`);
  await db.admin.query("grant authenticated to rls_probe");
  await db.admin.query("grant usage on schema companion to rls_probe");
  await app.query("reset role");
  await app.query("set role rls_probe");
  await app.query("select set_config('request.jwt.claim.sub', $1, false)", [member]);
  try {
    const rows = (await app.query("select user_id from companion.past_story_opens")).rows as {
      user_id: string;
    }[];
    expect(rows.map((r) => r.user_id)).toEqual([member]);
    for (const sql of [
      `insert into companion.past_story_opens (user_id, character_id, request_id, opened_at, expires_at, paid_with, price)
       values ('${member}', 'mina', gen_random_uuid(), now(), now() + interval '7 days', 'coins', 0)`,
      "update companion.past_story_opens set expires_at = now() + interval '1 year'",
      "delete from companion.past_story_opens",
    ]) {
      await expect(app.query(sql)).rejects.toMatchObject({ code: "42501" });
    }
  } finally {
    await app.query("reset role");
    await db.admin.query("revoke usage on schema companion from rls_probe");
  }
});
