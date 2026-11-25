import { afterAll, beforeAll, beforeEach, expect, test } from "vitest";
import { signIn, startTestDatabase } from "./postgres.test-support";

// 20270107120000(ADR-0191 D13): 글 스토리 — 스위치 · 문(창 · 상한 · 검수 시도 · 연령대) · 저장(바탕색 · 쓴 글 · 얹은 글, 늘 live) ·
// 반응 각도(사진과 같게 — 덕수쌤 고정 · 퀴즈 없음) · claim의 얹은 글 · 목록의 `kinds` · `background`.
const adult = "00000000-0000-4000-8000-000000000021";
const minor = "00000000-0000-4000-8000-000000000022";

let db: Awaited<ReturnType<typeof startTestDatabase>>;
let app: Awaited<ReturnType<typeof db.connect>>;
let server: typeof app;

type Json = Record<string, unknown>;
const settings = (assignments: string) =>
  db.admin.query(`update companion.settings set ${assignments}`);
const one = async <T>(sql: string, params: unknown[] = []) =>
  (await db.admin.query(sql, params)).rows[0] as T;
const uuid = async () => (await one<{ id: string }>("select gen_random_uuid() as id")).id;
const rpc = async (sql: string, params: unknown[] = []) =>
  (await server.query(`select ${sql} as r`, params)).rows[0].r as Json;

const gate = (user: string, client: string) =>
  rpc("public.companion_my_text_gate($1, $2, null, now())", [user, client]);
const overlays = [{ kind: "text", ko: "우산", x: 0.5, y: 0.5, scale: 1, rotation: 0 }];
const save = (
  user: string,
  client: string,
  extra: { background?: string | null; ko?: string; overlays?: unknown } = {},
) =>
  rpc("public.companion_save_my_text_story($1, $2, $3, $4, $5, 'en', null, now())", [
    user,
    client,
    extra.background === undefined ? "orange" : extra.background,
    extra.ko ?? "오늘 비가 와요",
    JSON.stringify(extra.overlays ?? overlays),
  ]);
const reopen = (user: string) =>
  db.admin.query(
    "update companion.my_story_slots set local_day = local_day - 30 - (random() * 1000)::int where user_id = $1",
    [user],
  );
async function spoke(user: string, character: string) {
  const id = (
    await one<{ id: string }>(
      `insert into companion.conversations (user_id, character_id, last_message_at) values ($1, $2, now() - interval '2 hours')
       on conflict (user_id, character_id) where kind = 'companion' do update set last_message_at = excluded.last_message_at
       returning id`,
      [user, character],
    )
  ).id;
  await db.admin.query(
    `insert into companion.messages (conversation_id, user_id, role, origin, status, text, client_message_id, created_at)
     values ($1, $2, 'user', 'turn', 'complete', '안녕하세요', gen_random_uuid(), now() - interval '2 hours')`,
    [id, user],
  );
}
const alarms = async (story: string) =>
  (
    await db.admin.query(
      "select character_id, rank, angle from companion.my_story_reactions where story_id = $1 order by rank",
      [story],
    )
  ).rows as { character_id: string; rank: number; angle: string }[];
const storyOf = (result: Json) => result["story"] as Json;
const listAs = async (user: string) => {
  await signIn(app, user);
  return (await app.query("select public.companion_my_stories() as r")).rows[0].r as Json;
};

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
  await db.admin.query("truncate companion.my_story_usage_global");
  await settings(
    "testers_only = false, friends_mode = 'on', my_stories = 'on', story_reactions = 'on', my_story_photo = 'on', my_story_text = 'on', my_story_daily = 20, my_story_check_daily = 5, my_story_rules = '{}'",
  );
  await db.admin.query(
    `insert into auth.users (id, email, raw_app_meta_data) values
       ($1, 'a@libitum.test', '{"duru_tester": true}'), ($2, 'n@libitum.test', '{}')`,
    [adult, minor],
  );
  const year = new Date().getUTCFullYear();
  await db.admin.query(
    "insert into companion.profiles (user_id, birth_year, age_source, l1) values ($1, $2, 'self', 'es'), ($3, $4, 'self', 'en')",
    [adult, year - 30, minor, year - 15],
  );
});

test("MT1. 문 — 스위치 off 기본 · testers · 미성년도 올릴 수 있음(연령대를 싣는다) · 검수 시도 상한 · 같은 요청은 그 스토리", async () => {
  expect(
    (
      await one<{ d: string }>(
        `select column_default as d from information_schema.columns
         where table_schema = 'companion' and table_name = 'settings' and column_name = 'my_story_text'`,
      )
    ).d,
  ).toBe("'off'::text");
  await settings("my_story_text = 'off'");
  expect((await gate(adult, await uuid())).result).toBe("off");
  await settings("my_story_text = 'testers'");
  expect(await gate(adult, await uuid())).toMatchObject({ result: "ok", ageBand: "adult" });
  expect((await gate(minor, await uuid())).result).toBe("off");
  await settings("my_story_text = 'on', my_story_check_daily = 3");
  expect(await gate(minor, await uuid())).toMatchObject({ result: "ok", ageBand: "minor" });
  await gate(minor, await uuid());
  await gate(minor, await uuid());
  expect((await gate(minor, await uuid())).result).toBe("check_limit");

  const client = await uuid();
  const saved = await save(adult, client);
  expect(saved.result).toBe("ok");
  expect(await gate(adult, client)).toMatchObject({
    result: "exists",
    story: { id: storyOf(saved)["id"] },
  });
  // 창은 다른 스토리와 합쳐서 센다 — 방금 쓴 창이다.
  expect((await gate(adult, await uuid())).result).toBe("window_used");
});

test("MT2. 저장 — 바탕색 · 쓴 글 · 얹은 글 · 늘 live, 뜻 줄은 비움. 값이 틀리면 invalid, 창 · 상한은 다른 스토리와 함께", async () => {
  const saved = await save(adult, await uuid(), { ko: "  오늘 비가 와요 " });
  expect(saved.result).toBe("ok");
  expect(storyOf(saved)).toMatchObject({
    kind: "text",
    status: "live",
    word: null,
    background: "orange",
    ko: "오늘 비가 와요",
    meaning: "",
    overlays,
    imagePath: null,
  });
  // 얹은 글만 있는 스토리도 된다.
  await reopen(adult);
  expect((await save(adult, await uuid(), { ko: "" })).result).toBe("ok");
  for (const bad of [
    { background: "red" },
    { background: null },
    { ko: "", overlays: [] },
    { ko: "가".repeat(201) },
  ]) {
    await reopen(adult);
    expect((await save(adult, await uuid(), bad)).result).toBe("invalid");
  }
  // 같은 창에 또 올릴 수 없다(창은 종류와 상관없이 하나).
  expect((await save(adult, await uuid())).result).toBe("ok");
  expect((await save(adult, await uuid())).result).toBe("window_used");
  await settings("my_story_text = 'off'");
  await reopen(adult);
  expect((await save(adult, await uuid())).result).toBe("off");
});

test("MT3. 반응 — 사진과 같은 각도(첫째 react · 둘째 question · together), 덕수쌤 고정 · 퀴즈 없음 · claim은 얹은 글을 싣는다", async () => {
  await spoke(adult, "mina");
  await spoke(adult, "duksu");
  await spoke(adult, "yoonkyung");
  await settings(`my_story_rules = '{"twoReplyChance": 1}'`);
  for (let round = 0; round < 4; round += 1) {
    await reopen(adult);
    const story = storyOf(await save(adult, await uuid()))["id"] as string;
    const picked = await alarms(story);
    expect(picked).toHaveLength(2);
    expect(picked[0]!.angle).toBe("react");
    expect(["question", "together"]).toContain(picked[1]!.angle);
  }
  await db.admin.query("delete from companion.my_story_reactions where rank = 2");
  const claimed = (
    await server.query(
      "select public.companion_claim_story_reactions(now() + interval '2 hours', 50) as r",
    )
  ).rows[0].r as { rows: Json[] };
  expect(claimed.rows[0]).toMatchObject({
    kind: "text",
    angle: "react",
    ko: "오늘 비가 와요",
    overlays,
  });
});

test("MT4. 목록 — kinds: word · card는 늘, photo는 사진 스위치 + 성인, text는 글 스위치. 꺼져 있으면 빈 목록", async () => {
  expect((await listAs(adult))["kinds"]).toEqual(["word", "card", "photo", "text"]);
  expect((await listAs(minor))["kinds"]).toEqual(["word", "card", "text"]);
  await settings("my_story_text = 'off', my_story_photo = 'off'");
  expect((await listAs(adult))["kinds"]).toEqual(["word", "card"]);
  await settings("my_stories = 'off'");
  expect(await listAs(adult)).toMatchObject({ enabled: false, kinds: [] });
});
