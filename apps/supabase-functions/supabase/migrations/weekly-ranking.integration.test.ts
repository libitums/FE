import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";
import { save, signIn, startTestDatabase } from "./postgres.test-support";

// 주간 순위(20261220, ADR-0170): 주 시즌(월 00:00 UTC) · 그룹 배정(구간 · 목표 인원) · 레슨 트리거(처음 통과한 콘텐츠 유닛만) ·
// 채팅 단어(주 1번) · 보드 · 숨기기 · 개인정보 · 권한 · 계정 삭제 · 상위 3 보상(설정, 기본 꺼짐).
const ids = {
  a: "00000000-0000-4000-8000-0000000000a1",
  b: "00000000-0000-4000-8000-0000000000b1",
  c: "00000000-0000-4000-8000-0000000000c1",
  d: "00000000-0000-4000-8000-0000000000d1",
  e: "00000000-0000-4000-8000-0000000000e1",
  f: "00000000-0000-4000-8000-0000000000f1",
} as const;
const message = "40000000-0000-4000-8000-000000000001";
const empty = {
  version: 1,
  completedStepCount: 0,
  completedEpisodeIntroIds: [] as string[],
  completedMessengerUnitIds: [] as string[],
  completedPhoneCallUnitIds: [] as string[],
  visualNovel: { status: "active", beatIndex: 0 },
  completedEpisodeFinalIds: [] as string[],
};

let db: Awaited<ReturnType<typeof startTestDatabase>>;
let app: Awaited<ReturnType<typeof db.connect>>;
let anon: typeof app;
let service: typeof app;
let thisWeek: string;
let lastWeek: string;

type Board = {
  state: string;
  board: string;
  endsAt: string;
  groupSize: number;
  reward: number | null;
  rows: {
    rank: number;
    name: string;
    country: string | null;
    episode: number | null;
    score: number;
    me: boolean;
  }[];
  me: { rank: number; score: number } | null;
  next: { name: string; more: number } | null;
};
type Recorded = { counted: string[]; pending: string[]; weekTotal: number };

const sql = async (text: string, params: unknown[] = []) =>
  (await db.admin.query(text, params)).rows;
const count = async (text: string, params: unknown[] = []) =>
  Number((await sql(text, params))[0].n);

async function user(id: string, ageDays = 400, profile?: { name: string; country: string }) {
  await sql(
    `insert into auth.users (id, email, created_at) values ($1, $2, now() - make_interval(days => $3::int))`,
    [id, `${id}@libitum.test`, ageDays],
  );
  if (profile !== undefined)
    await sql(
      `insert into public.learner_profiles (user_id, name, country_code) values ($1, $2, $3)`,
      [id, profile.name, profile.country],
    );
}
const join = async (id: string, at = "now()") =>
  (await sql(`select ranking.join_week($1::uuid, ${at}) as g`, [id]))[0].g as string;
/** 이번 주(또는 `week`) 레슨 통과를 직접 넣는다 — `minutesAgo`는 그 점수에 닿은 시각. */
async function passes(id: string, units: string[], minutesAgo = 60, week = thisWeek) {
  for (const unit of units)
    await sql(
      `insert into ranking.lesson_passes (user_id, episode_id, unit_key, week, passed_at)
       values ($1, 'u01-water', $2, $3::date, now() - make_interval(mins => $4))`,
      [id, unit, week, minutesAgo],
    );
}
const board = async (kind: string, client = app) =>
  (await client.query("select public.ranking_board($1) as b", [kind])).rows[0].b as Board;
const record = async (id: string, counted: string[], pending: string[], at = "now()") =>
  (
    await service.query(
      `select public.ranking_record_chat_words($1::uuid, $2::uuid, $3::text[], $4::text[], ${at}) as r`,
      [id, message, counted, pending],
    )
  ).rows[0].r as Recorded;

beforeAll(async () => {
  db = await startTestDatabase();
  app = await db.connect();
  anon = await db.connect();
  await anon.query("set role anon");
  service = await db.connect();
  await service.query("set role service_role");
  thisWeek = (await sql("select date_trunc('week', now() at time zone 'utc')::date::text as d"))[0]
    .d;
  lastWeek = (await sql("select ($1::date - 7)::text as d", [thisWeek]))[0].d;
}, 90_000);
afterAll(async () => {
  await db?.close();
});
beforeEach(async () => {
  await db.admin.query("truncate auth.users cascade");
  await db.admin.query("truncate ranking.groups cascade");
  await db.admin.query(
    "update ranking.settings set reward_enabled = false, reward_amount = 30, group_target = 25, group_max = 30",
  );
  await db.admin.query(`
    insert into companion.expressions (id, kind, surface) values
      ('voca:delicious', 'voca', '맛있다'), ('voca:water', 'voca', '물'), ('expr:fine', 'expr', '괜찮아요')
    on conflict do nothing`);
});

describe("주 · 배정", () => {
  test("RK-I0. 그룹 크기 기본값은 목표 15명 · 상한 18명이다(20261227)", async () => {
    const defaults = await db.admin.query(
      `select column_name, column_default from information_schema.columns
     where table_schema = 'ranking' and table_name = 'settings' and column_name in ('group_target', 'group_max')
     order by column_name`,
    );
    expect(defaults.rows).toEqual([
      { column_name: "group_max", column_default: "18" },
      { column_name: "group_target", column_default: "15" },
    ]);
  });

  test("WR-D1 주는 UTC 월요일 00:00에 바뀐다 — 일요일 23:59와 월요일 00:00의 같은 단어는 두 주에 따로 센다", async () => {
    const week = async (at: string) =>
      (await sql("select ranking.week_of($1::timestamptz)::text as w", [at]))[0].w;
    expect(await week("2026-11-22T23:59:59Z")).toBe("2026-11-16");
    expect(await week("2026-11-23T00:00:00Z")).toBe("2026-11-23");
    // 한국 월요일 08:00 = UTC 일요일 23:00 — 아직 지난주.
    expect(await week("2026-11-23T08:00:00+09:00")).toBe("2026-11-16");
    await user(ids.a);
    expect(await record(ids.a, ["voca:delicious"], [], "'2026-11-22T23:59:00Z'")).toEqual({
      counted: ["voca:delicious"],
      pending: [],
      weekTotal: 1,
    });
    expect(await record(ids.a, ["voca:delicious"], [], "'2026-11-23T00:00:00Z'")).toEqual({
      counted: ["voca:delicious"],
      pending: [],
      weekTotal: 1,
    });
    await signIn(app, ids.a);
    const ends = (await sql("select to_char($1::date + 7, 'YYYY-MM-DD') as d", [thisWeek]))[0].d;
    expect((await board("lessons")).endsAt).toBe(`${ends}T00:00:00Z`);
  });

  test("WR-D2 같은 구간 · 숨기지 않은 인원이 목표 미만인 가장 오래된 그룹, 차면 새 그룹 · 가입 나이 · 진도가 다르면 다른 그룹", async () => {
    await sql("update ranking.settings set group_target = 2, group_max = 3");
    for (const id of [ids.a, ids.b, ids.c, ids.e]) await user(id);
    await user(ids.d, 3);
    await user(ids.f);
    const groupA = await join(ids.a);
    expect(await join(ids.a)).toBe(groupA);
    // B는 숨김 — 목표 인원에 세지 않아 C도 A의 그룹으로.
    await sql("insert into ranking.preferences (user_id, hidden) values ($1, true)", [ids.b]);
    expect(await join(ids.b)).toBe(groupA);
    expect(await join(ids.c)).toBe(groupA);
    // 숨기지 않은 인원이 목표(2)에 닿았다 → 새 그룹.
    const groupE = await join(ids.e);
    expect(groupE).not.toBe(groupA);
    // 가입 3일 — 다른 구간.
    const groupD = await join(ids.d);
    expect([groupA, groupE]).not.toContain(groupD);
    // 진도 10유닛(콘텐츠 유닛) — 저장 트리거가 배정하고, 다른 구간.
    await signIn(app, ids.f);
    await save(app, {
      ...empty,
      catalogProgress: {
        "u01-water": ["CULT", "RP", "S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8"],
      },
    });
    const groupF = (
      await sql("select group_id from ranking.members where user_id = $1", [ids.f])
    )[0].group_id;
    expect([groupA, groupE, groupD]).not.toContain(groupF);
    const brackets = await sql("select distinct bracket from ranking.groups");
    expect(brackets).toHaveLength(3);
    expect(
      await count("select count(*) as n from ranking.members where group_id = $1", [groupA]),
    ).toBe(3);
  });
});

describe("점수", () => {
  test("WR-D3 레슨: 콘텐츠 유닛 가운데 처음 올라온 것만 · 다시 통과 0 · 콘텐츠 밖 0", async () => {
    await user(ids.a);
    await user(ids.b);
    await signIn(app, ids.b);
    // 콘텐츠 밖(가짜 에피소드 · 표지)만 → 점수 없음 · 배정 없음.
    await save(app, { ...empty, catalogProgress: { "zz-fake": ["S1"], "u01-water": ["intro"] } });
    expect(await count("select count(*) as n from ranking.lesson_passes")).toBe(0);
    expect((await board("lessons")).state).toBe("not_joined");

    await signIn(app, ids.a);
    await save(app, {
      ...empty,
      catalogProgress: { "u01-water": ["S1", "S2", "intro"], "zz-fake": ["S1"] },
    });
    expect(
      await count("select count(*) as n from ranking.lesson_passes where user_id = $1", [ids.a]),
    ).toBe(2);
    await save(app, { ...empty, catalogProgress: { "u01-water": ["S1", "S2", "S3"] } });
    expect((await board("lessons")).me).toEqual({ rank: 1, score: 3 });
    // 같은 스냅숏을 다시 저장 — 새 유닛 없음.
    await save(app, { ...empty, catalogProgress: { "u01-water": ["S1", "S2", "S3"] } });
    expect((await board("lessons")).me).toEqual({ rank: 1, score: 3 });
    // 지난주에 통과한 것으로 옮기고, 스냅숏에서 S1이 빠졌다가 다시 올라와도 평생 한 번이라 이번 주 0.
    await sql("update ranking.lesson_passes set week = $1::date where user_id = $2", [
      lastWeek,
      ids.a,
    ]);
    await sql(
      `update public.learning_progress set progress = jsonb_set(progress, '{catalogProgress,u01-water}', '["S2","S3"]') where user_id = $1`,
      [ids.a],
    );
    await save(app, { ...empty, catalogProgress: { "u01-water": ["S1"] } });
    expect((await board("lessons")).me).toEqual({ rank: 1, score: 0 });
    expect(
      await count("select count(*) as n from ranking.lesson_passes where user_id = $1", [ids.a]),
    ).toBe(3);
  });

  test("WR-D4 채팅 단어: voca만 · 주 1번 · 짚힌 단어는 이번 주 아직 안 셌을 때만 pending · 새로 셌을 때만 배정", async () => {
    await user(ids.a);
    // pending만 — 배정 없음.
    expect(await record(ids.a, [], ["voca:water"])).toEqual({
      counted: [],
      pending: ["voca:water"],
      weekTotal: 0,
    });
    expect(await count("select count(*) as n from ranking.members")).toBe(0);
    expect(
      await record(
        ids.a,
        ["voca:delicious", "expr:fine", "voca:unknown", "voca:delicious"],
        ["voca:water", "expr:fine"],
      ),
    ).toEqual({ counted: ["voca:delicious"], pending: ["voca:water"], weekTotal: 1 });
    expect(
      await count("select count(*) as n from ranking.members where user_id = $1", [ids.a]),
    ).toBe(1);
    expect(await record(ids.a, ["voca:delicious"], ["voca:delicious", "voca:water"])).toEqual({
      counted: [],
      pending: ["voca:water"],
      weekTotal: 1,
    });
    // 고쳐 다시 보내면 센다.
    expect(await record(ids.a, ["voca:water"], [])).toEqual({
      counted: ["voca:water"],
      pending: [],
      weekTotal: 2,
    });
    expect(
      await count("select count(*) as n from ranking.chat_words where user_id = $1", [ids.a]),
    ).toBe(2);
    const stored = await sql(
      "select message_id, week::text from ranking.chat_words where expression_id = 'voca:water'",
    );
    expect(stored).toEqual([{ message_id: message, week: thisWeek }]);
  });
});

describe("보드", () => {
  async function group() {
    await user(ids.a, 400, { name: "Linh", country: "VN" });
    await user(ids.b, 400, { name: "Ana", country: "ES" });
    await user(ids.c);
    await user(ids.d, 400, { name: "Mina", country: "KR" });
    for (const id of [ids.a, ids.b, ids.c, ids.d]) await join(id);
    await passes(ids.a, ["S1", "S2", "S3"], 180);
    await passes(ids.b, ["S1", "S2", "S3"], 60);
    await passes(ids.c, ["S1"], 30);
    // 에피소드 표시용 진행(표지만 — 점수가 생기지 않는다).
    await sql(`insert into public.learning_progress (user_id, progress) values ($1, $2::jsonb)`, [
      ids.a,
      JSON.stringify({
        ...empty,
        catalogProgress: { "u01-water": ["intro"], "u05-baekban": ["intro"] },
      }),
    ]);
  }

  test("WR-D5 모양 · 순서(점수 → 먼저 닿은 순 → 이름) · 내 줄 · 앞사람과의 차이 · 틀린 보드 22023", async () => {
    await group();
    await signIn(app, ids.b);
    const ends = (await sql("select to_char($1::date + 7, 'YYYY-MM-DD') as d", [thisWeek]))[0].d;
    expect(await board("lessons")).toEqual({
      state: "ranked",
      board: "lessons",
      endsAt: `${ends}T00:00:00Z`,
      groupSize: 4,
      reward: null,
      rows: [
        { rank: 1, name: "Linh", country: "VN", episode: 5, score: 3, me: false },
        { rank: 2, name: "Ana", country: "ES", episode: null, score: 3, me: true },
        { rank: 3, name: "Learner", country: null, episode: null, score: 1, me: false },
        { rank: 4, name: "Mina", country: "KR", episode: null, score: 0, me: false },
      ],
      me: { rank: 2, score: 3 },
      next: { name: "Linh", more: 1 },
    });
    const chat = await board("chat_words");
    expect(chat.rows.map((row) => row.name)).toEqual(["Ana", "Learner", "Linh", "Mina"]);
    expect(chat).toMatchObject({
      state: "ranked",
      board: "chat_words",
      me: { rank: 1, score: 0 },
      next: null,
    });
    await signIn(app, ids.c);
    expect((await board("lessons")).next).toEqual({ name: "Ana", more: 3 });
    await expect(board("xp")).rejects.toMatchObject({ code: "22023" });
    await expect(board("chat-words")).rejects.toMatchObject({ code: "22023" });
  });

  test("WR-D6 숨긴 사람은 남의 목록 · 그룹 수에서 빠지고, 본인은 hidden · 다시 보이면 ranked", async () => {
    await group();
    await signIn(app, ids.a);
    expect((await app.query("select public.ranking_preferences() as p")).rows[0].p).toEqual({
      hidden: false,
    });
    expect((await app.query("select public.ranking_set_hidden(true) as p")).rows[0].p).toEqual({
      hidden: true,
    });
    expect((await app.query("select public.ranking_preferences() as p")).rows[0].p).toEqual({
      hidden: true,
    });
    expect(await board("lessons")).toMatchObject({
      state: "hidden",
      board: "lessons",
      rows: [],
      me: null,
    });
    await signIn(app, ids.b);
    const seen = await board("lessons");
    expect(seen.groupSize).toBe(3);
    expect(seen.rows.map((row) => row.name)).toEqual(["Ana", "Learner", "Mina"]);
    expect(seen).toMatchObject({ me: { rank: 1, score: 3 }, next: null });
    await signIn(app, ids.a);
    await app.query("select public.ranking_set_hidden(false)");
    expect((await board("lessons")).state).toBe("ranked");
    await expect(app.query("select public.ranking_set_hidden(null)")).rejects.toMatchObject({
      code: "22023",
    });
  });

  test("WR-D7 개인정보: 보드 JSON에 user id · 이메일 · id 칸이 없다", async () => {
    await group();
    await signIn(app, ids.b);
    for (const kind of ["lessons", "chat_words"]) {
      const result = await board(kind);
      const text = JSON.stringify(result);
      for (const id of Object.values(ids)) expect(text).not.toContain(id);
      expect(text).not.toContain("@libitum.test");
      const keys = new Set<string>();
      const walk = (value: unknown) => {
        if (Array.isArray(value)) value.forEach(walk);
        else if (value !== null && typeof value === "object")
          for (const [key, inner] of Object.entries(value)) {
            keys.add(key);
            walk(inner);
          }
      };
      walk(result);
      for (const banned of ["id", "userId", "user_id", "email", "groupId"])
        expect(keys).not.toContain(banned);
    }
  });
});

describe("경계", () => {
  test("WR-D8 권한: anon은 RPC 못 부름 · 로그인 사용자는 기록 · 정산 · 표 · 내부 함수 못 씀 · 로그인 없으면 28000", async () => {
    await user(ids.a);
    await expect(anon.query("select public.ranking_board('lessons')")).rejects.toMatchObject({
      code: "42501",
    });
    await expect(anon.query("select public.ranking_preferences()")).rejects.toMatchObject({
      code: "42501",
    });
    await expect(anon.query("select public.ranking_set_hidden(true)")).rejects.toMatchObject({
      code: "42501",
    });
    await signIn(app, ids.a);
    await expect(
      app.query(
        "select public.ranking_record_chat_words($1::uuid, $2::uuid, array['voca:water'], '{}', now())",
        [ids.a, message],
      ),
    ).rejects.toMatchObject({ code: "42501" });
    await expect(
      app.query("select public.ranking_settle_week($1::date)", [lastWeek]),
    ).rejects.toMatchObject({
      code: "42501",
    });
    for (const table of [
      "settings",
      "groups",
      "members",
      "lesson_passes",
      "chat_words",
      "preferences",
      "rewards",
    ])
      await expect(app.query(`select * from ranking.${table}`)).rejects.toMatchObject({
        code: "42501",
      });
    await expect(
      app.query("select ranking.join_week($1::uuid, now())", [ids.a]),
    ).rejects.toMatchObject({
      code: "42501",
    });
    const nobody = await db.connect();
    await nobody.query("set role authenticated");
    await expect(nobody.query("select public.ranking_board('lessons')")).rejects.toMatchObject({
      code: "28000",
    });
    await nobody.end();
  });

  test("WR-D9 계정을 지우면 순위 행이 모두 지워진다(CASCADE)", async () => {
    await user(ids.a);
    await signIn(app, ids.a);
    await save(app, { ...empty, catalogProgress: { "u01-water": ["S1"] } });
    await record(ids.a, ["voca:delicious"], []);
    await app.query("select public.ranking_set_hidden(true)");
    await sql(
      `insert into ranking.rewards (week, user_id, board, rank, amount) values ($1::date, $2, 'lessons', 1, 30)`,
      [lastWeek, ids.a],
    );
    await sql("delete from auth.users where id = $1", [ids.a]);
    for (const table of ["members", "lesson_passes", "chat_words", "preferences", "rewards"])
      expect(
        await count(`select count(*) as n from ranking.${table} where user_id = $1`, [ids.a]),
      ).toBe(0);
  });

  test("WR-D10 정산: 꺼짐 → 아무것도 안 줌 · 켜짐 → 그룹 · 보드마다 1~3위(점수 > 0, 숨김 제외)에 한 번만", async () => {
    for (const id of [ids.a, ids.b, ids.c, ids.d, ids.e]) await user(id);
    for (const id of [ids.a, ids.b, ids.c, ids.d, ids.e])
      await join(id, "now() - interval '7 days'");
    await passes(ids.a, ["S1", "S2", "S3"], 60, lastWeek);
    await passes(ids.b, ["S1", "S2"], 60, lastWeek);
    await passes(ids.c, ["S1"], 60, lastWeek);
    await passes(ids.e, ["S1", "S2", "S3", "S4", "S5"], 60, lastWeek);
    await sql("insert into ranking.preferences (user_id, hidden) values ($1, true)", [ids.e]);
    await record(ids.a, ["voca:delicious"], [], "now() - interval '7 days'");
    const settle = async () =>
      (await service.query("select public.ranking_settle_week($1::date) as n", [lastWeek])).rows[0]
        .n as number;

    expect(await settle()).toBe(0);
    expect(await count("select count(*) as n from companion.credit_ledger")).toBe(0);
    expect(await count("select count(*) as n from ranking.rewards")).toBe(0);

    await sql("update ranking.settings set reward_enabled = true, reward_amount = 30");
    expect(await settle()).toBe(4);
    expect(
      await sql("select user_id, board, rank, amount from ranking.rewards order by board, rank"),
    ).toEqual([
      { user_id: ids.a, board: "chat_words", rank: 1, amount: 30 },
      { user_id: ids.a, board: "lessons", rank: 1, amount: 30 },
      { user_id: ids.b, board: "lessons", rank: 2, amount: 30 },
      { user_id: ids.c, board: "lessons", rank: 3, amount: 30 },
    ]);
    expect(
      await sql(
        "select ref_id from companion.credit_ledger where reason = 'ranking' order by ref_id",
      ),
    ).toContainEqual({ ref_id: `${lastWeek}:lessons:${ids.a}` });
    expect(await settle()).toBe(0);
    expect(
      await count("select count(*) as n from companion.credit_ledger where reason = 'ranking'"),
    ).toBe(4);
    expect(
      (
        await sql("select grant_balance from companion.credit_wallets where user_id = $1", [ids.a])
      )[0],
    ).toEqual({
      grant_balance: 60,
    });
    await expect(
      service.query("select public.ranking_settle_week('2026-11-18'::date)"),
    ).rejects.toMatchObject({
      code: "22023",
    });
    // 켜져 있으면 보드에 액수가 실린다.
    await join(ids.b);
    await signIn(app, ids.b);
    expect((await board("lessons")).reward).toBe(30);
  });
});

describe("WR-D11 배정 경합", () => {
  test("WR-D11 같은 사용자의 첫 점수가 두 트랜잭션에서 겹쳐 구간이 달라도(진도 10유닛 저장 중 · 채팅 단어) 회원 줄은 하나 · 오류 없음", async () => {
    const id = "70000000-0000-4000-8000-0000000000d1";
    await user(id);
    const first = await db.connect();
    const second = await db.connect();
    const units = ["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8", "CULT", "RP"];
    await first.query("begin");
    await first.query(
      "insert into public.learning_progress (user_id, progress) values ($1, $2::jsonb)",
      [id, JSON.stringify({ version: 1, catalogProgress: { "u01-water": units } })],
    );
    // 첫 트랜잭션은 진도 10(p10 구간)으로 배정됐고 아직 커밋 전 — 둘째는 진도 0(p0 구간)으로 본다.
    const racing = second.query("select ranking.join_week($1::uuid, now()) as g", [id]);
    await new Promise((resolve) => setTimeout(resolve, 200));
    await first.query("commit");
    const raced = (await racing).rows[0].g as string;
    const members = await sql("select group_id from ranking.members where user_id = $1", [id]);
    expect(members).toHaveLength(1);
    expect(raced).toBe(members[0].group_id);
  });
});
