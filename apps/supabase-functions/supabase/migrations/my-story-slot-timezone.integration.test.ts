import { afterAll, beforeAll, beforeEach, expect, test } from "vitest";
import { signIn, startTestDatabase } from "./postgres.test-support";

// 20270119120000(ADR-0211): 내 스토리 올리기 창의 시간대 — 저장된 시간대 → 기기 시차(0이 아닌 값) → 스토어 나라 → 학습 프로필 나라 → UTC.
// 운영 2026-11-27: 학습 프로필 나라가 기기 시차(+540)를 이겨 16:30 KST가 아침 창으로 잡혔다.
const member = "00000000-0000-4000-8000-000000000021";

let db: Awaited<ReturnType<typeof startTestDatabase>>;
let app: Awaited<ReturnType<typeof db.connect>>;
let server: typeof app;

type Window = { slot: string; day: string; nextAt: string; used: boolean };
const one = async <T>(sql: string, params: unknown[] = []) =>
  (await db.admin.query(sql, params)).rows[0] as T;

// 16:30 KST = 07:30 UTC.
const KST_1630 = "2026-11-27T07:30:00Z";
const windowAt = async (offset: number | null, region: string | null, at = KST_1630) =>
  (
    await one<{ w: Window }>("select companion.my_story_window($1, $2, $3::timestamptz, $4) as w", [
      member,
      offset,
      at,
      region,
    ])
  ).w;
const learnerCountry = (country: string) =>
  db.admin.query(
    `insert into public.learner_profiles (user_id, name, country_code) values ($1, 'Mina', $2)
     on conflict (user_id) do update set country_code = excluded.country_code`,
    [member, country],
  );

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
  await db.admin.query(
    "update companion.settings set testers_only = false, friends_mode = 'on', my_stories = 'on', my_story_daily = 20, my_story_rules = '{}'",
  );
  await db.admin.query("insert into auth.users (id, email) values ($1, 'm@libitum.test')", [
    member,
  ]);
});

test("TZ1. 시간대 없음 + 기기 시차 0 + 스토어 나라 KR → 16:30 KST는 낮 창, 다음 창은 18:00 KST", async () => {
  expect(await windowAt(0, "KR")).toEqual({
    slot: "day",
    day: "2026-11-27",
    nextAt: "2026-11-27T09:00:00.000Z",
    used: false,
  });
  // 시차가 없어도(옛 앱 · 못 읽음) 같다. 소문자 나라도 받는다.
  expect(await windowAt(null, "kr")).toMatchObject({ slot: "day" });
});

test("TZ2. 학습 프로필 나라는 기기 시차를 이기지 않는다 — 나라 GB + 시차 +540 → 낮 창", async () => {
  await learnerCountry("GB");
  expect(await windowAt(540, null)).toMatchObject({
    slot: "day",
    day: "2026-11-27",
    nextAt: "2026-11-27T09:00:00.000Z",
  });
  // 스토어 나라도 기기 시차를 이기지 않는다(여행 중엔 기기가 맞다).
  expect(await windowAt(540, "US")).toMatchObject({ slot: "day" });
});

test("TZ3. 시차 0은 「모름」 — 스토어 나라가 정하고, UTC+0 나라(GB 겨울)는 UTC와 같다", async () => {
  expect(await windowAt(0, "GB")).toMatchObject({
    slot: "morning",
    day: "2026-11-27",
    nextAt: "2026-11-27T12:00:00.000Z",
  });
  // 스토어 나라가 요청에 없으면 저장된 스토어 나라(`last_region`).
  await db.admin.query("insert into companion.profiles (user_id, last_region) values ($1, 'KR')", [
    member,
  ]);
  expect(await windowAt(0, null)).toMatchObject({ slot: "day" });
  // 요청의 스토어 나라가 저장된 것보다 먼저다.
  expect(await windowAt(0, "GB")).toMatchObject({ slot: "morning" });
});

test("TZ4. 시차 · 스토어 나라가 없으면 학습 프로필 나라, 그것도 없으면 UTC. 모르는 나라 · 틀린 형식은 없는 것으로 본다", async () => {
  expect(await windowAt(0, null)).toMatchObject({
    slot: "morning",
    nextAt: "2026-11-27T12:00:00.000Z",
  });
  expect(await windowAt(0, "ZZ")).toMatchObject({ slot: "morning" });
  expect(await windowAt(0, "KOR")).toMatchObject({ slot: "morning" });
  await learnerCountry("KR");
  expect(await windowAt(null, null)).toMatchObject({ slot: "day" });
  expect(await windowAt(0, "ZZ")).toMatchObject({ slot: "day" });
});

test("TZ5. 저장된 시간대(프로필)가 가장 먼저다", async () => {
  await db.admin.query(
    "insert into companion.profiles (user_id, timezone) values ($1, 'Europe/London')",
    [member],
  );
  expect(await windowAt(540, "KR")).toMatchObject({
    slot: "morning",
    nextAt: "2026-11-27T12:00:00.000Z",
  });
});

test("TZ6. 스토어 나라 표 — 기본 표에 없는 스페인어권 · 마카오도 대표 시간대가 있다", async () => {
  // 베네수엘라(UTC−4): 07:30 UTC = 03:30 → 전날의 밤 창.
  expect(await windowAt(0, "VE")).toMatchObject({ slot: "night", day: "2026-11-26" });
  // 마카오(UTC+8): 15:30 → 낮 창.
  expect(await windowAt(0, "MO")).toMatchObject({ slot: "day" });
  const zones = await one<{ missing: string[] }>(
    `select coalesce(array_agg(c order by c) filter (where companion.story_country_timezone(c) is null), '{}') as missing
     from unnest(array['VN','ID','TH','MY','MM','ES','MX','AR','CO','PE','CL','VE','EC','GT','BO','DO','HN','PY','SV','NI','CR','PA','UY','PR','CU',
                       'JP','TW','HK','MO','BR','US','KR','PH','IN','SG']) c`,
  );
  expect(zones.missing).toEqual([]);
  // 표의 모든 이름이 Postgres가 아는 시간대다(틀린 이름은 창을 셀 때 오류가 된다).
  const unknownZones = await one<{ names: string[] }>(
    `select coalesce(array_agg(z order by z), '{}') as names from (
       select distinct companion.story_country_timezone(chr(a) || chr(b)) as z
       from generate_series(65, 90) a, generate_series(65, 90) b
     ) t where z is not null and not exists (select 1 from pg_catalog.pg_timezone_names n where n.name = t.z)`,
  );
  expect(unknownZones.names).toEqual([]);
});

test("TZ7. RPC 여섯이 `p_region`을 받고(기본 null), 목록 · 올리기가 그 나라로 창을 센다. 옛 호출(인자 없음)도 그대로", async () => {
  const args = await db.admin.query<{ name: string; args: string }>(
    `select p.proname as name, pg_get_function_arguments(p.oid) as args from pg_proc p
     where p.pronamespace = 'public'::regnamespace and p.proname = any ($1) order by 1`,
    [
      [
        "companion_my_stories",
        "companion_post_my_story",
        "companion_my_photo_gate",
        "companion_save_my_photo_story",
        "companion_my_text_gate",
        "companion_save_my_text_story",
      ],
    ],
  );
  expect(args.rows).toHaveLength(6);
  for (const row of args.rows) expect(row.args, row.name).toMatch(/p_region text DEFAULT NULL/);

  // 앱 — 목록(인자 둘 · 하나)과 단어 카드 올리기.
  await signIn(app, member);
  const expected = await one<{ w: Window }>(
    "select companion.my_story_window($1, 0, now(), 'KR') as w",
    [member],
  );
  const listed = (
    await app.query(
      "select public.companion_my_stories(p_tz_offset_min => 0, p_region => 'KR') as r",
    )
  ).rows[0].r as { window: Window };
  expect(listed.window).toEqual(expected.w);
  const old = (await app.query("select public.companion_my_stories(540) as r")).rows[0].r as {
    window: Window;
  };
  expect(old.window).not.toBeNull();
  const posted = (
    await app.query(
      `select public.companion_post_my_story(gen_random_uuid(), 'card', '{"episodeId":"u02-arrival","ref":"voca:arrive"}',
         '도착하다', 'dochakada', 'to arrive', null, null, 'en', p_tz_offset_min => 0, p_region => 'KR') as r`,
    )
  ).rows[0].r as { result: string };
  expect(posted.result).toBe("ok");
  const slot = await one<{ slot: string }>(
    "select slot from companion.my_story_slots where user_id = $1",
    [member],
  );
  expect(slot.slot).toBe(expected.w.slot);

  // 서버(Edge) — 사진 문은 이름 붙인 인자로 부른다.
  const gate = (
    await server.query(
      "select public.companion_my_photo_gate(p_user_id => $1, p_client_id => gen_random_uuid(), p_tz_offset_min => 0, p_now => $2::timestamptz, p_region => 'KR') as r",
      [member, KST_1630],
    )
  ).rows[0].r as { result: string; window?: Window };
  // 사진 스위치 · 성인 확인이 없어 문은 닫히지만, 이름 붙인 `p_region`을 받는다(없으면 함수를 찾지 못해 오류).
  expect(["off", "age"]).toContain(gate.result);
});
