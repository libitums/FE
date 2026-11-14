import { afterAll, beforeAll, beforeEach, expect, test } from "vitest";
import { signIn, startTestDatabase } from "./postgres.test-support";

// 선톡 빈도 설정(20261115): off · daily1 · daily2, 선호 시각 · 시간대 · 조용한 시간, 유저마다 한 회차 하나, 전체 상한.
// 시각은 고정한다 — 조용한 시간 판정이 테스트를 돌린 시각에 따라 바뀌지 않게.
const user = "00000000-0000-4000-8000-0000000000a1";
const noon = "2026-11-20T12:00:00Z"; // UTC 정오(시간대를 모르면 UTC 하루)

let db: Awaited<ReturnType<typeof startTestDatabase>>;
let server: Awaited<ReturnType<typeof db.connect>>;
let app: typeof server;

const hoursBefore = (at: string, hours: number) =>
  new Date(Date.parse(at) - hours * 3_600_000).toISOString();

async function profile(values: Record<string, unknown>) {
  const columns = Object.keys(values);
  await db.admin.query(
    `insert into companion.profiles (user_id, birth_year, age_source, ${columns.join(", ")})
     values ($1, 1990, 'self', ${columns.map((_, i) => `$${i + 2}`).join(", ")})
     on conflict (user_id) do update set birth_year = 1990, age_source = 'self',
       ${columns.map((c) => `${c} = excluded.${c}`).join(", ")}`,
    [user, ...Object.values(values)],
  );
}
async function conversation(character: string, lastMessageAt: string) {
  const result = await db.admin.query(
    "insert into companion.conversations (user_id, character_id, last_message_at) values ($1, $2, $3) returning id",
    [user, character, lastMessageAt],
  );
  const id = result.rows[0].id as string;
  // 유저가 한 번은 말한 대화 — 첫 인사만 있는 대화는 후보가 아니다(20261122).
  await db.admin.query(
    `insert into companion.messages (conversation_id, user_id, role, origin, status, text, client_message_id, created_at)
     values ($1, $2, 'user', 'turn', 'complete', '안녕하세요', gen_random_uuid(), $3)`,
    [id, user, lastMessageAt],
  );
  return id;
}
async function proactiveAt(conversationId: string, at: string) {
  await db.admin.query(
    `insert into companion.messages (conversation_id, user_id, role, origin, status, created_at)
     values ($1, $2, 'assistant', 'proactive', 'complete', $3)`,
    [conversationId, user, at],
  );
}
async function candidates(now: string) {
  const result = await server.query("select public.companion_proactive_candidates($1, 20) as c", [
    now,
  ]);
  return result.rows[0].c as { userId: string; characterId: string }[];
}
async function reason(now: string, lastMessageAt: string) {
  const result = await db.admin.query("select companion.proactive_skip_reason($1, $2, $3) as r", [
    user,
    lastMessageAt,
    now,
  ]);
  return result.rows[0].r as string | null;
}

beforeAll(async () => {
  db = await startTestDatabase();
  server = await db.connect();
  app = await db.connect();
  await server.query("set role service_role");
}, 90_000);
afterAll(async () => {
  await db?.close();
});
beforeEach(async () => {
  await db.admin.query("truncate auth.users cascade");
  await db.admin.query(
    "update companion.settings set proactive_daily_cap = 2, proactive_gap = interval '24 hours'",
  );
  await db.admin.query(
    `insert into auth.users (id, email, raw_app_meta_data) values ($1, 'p@libitum.test', '{"duru_tester": true}')`,
    [user],
  );
});

test("PP1. off는 보내지 않는다 · 기본은 daily1 · 연령 규칙은 그대로", async () => {
  await conversation("duksu", hoursBefore(noon, 30));
  // 나이 모름은 미성년자 기본값 — 지역을 모르면 보내지 않는다.
  await db.admin.query("insert into companion.profiles (user_id) values ($1)", [user]);
  expect(await candidates(noon)).toEqual([]);
  await profile({ proactive_pref: "daily1" });
  expect(await candidates(noon)).toMatchObject([{ userId: user, characterId: "duksu" }]);
  await profile({ proactive_pref: "off" });
  expect(await candidates(noon)).toEqual([]);
  expect(await reason(noon, hoursBefore(noon, 30))).toBe("off");
  const settings = await db.admin.query("select proactive_daily_cap from companion.settings");
  expect(settings.rows[0].proactive_daily_cap).toBe(2);
});

test("PP2. daily1 — 마지막 메시지 뒤 24시간, 하루 한 번", async () => {
  await profile({ proactive_pref: "daily1" });
  const id = await conversation("duksu", hoursBefore(noon, 20));
  expect(await candidates(noon)).toEqual([]);
  expect(await reason(noon, hoursBefore(noon, 20))).toBe("gap");
  await db.admin.query("update companion.conversations set last_message_at = $1", [
    hoursBefore(noon, 25),
  ]);
  expect(await candidates(noon)).toHaveLength(1);
  await proactiveAt(id, hoursBefore(noon, 11)); // 오늘(UTC) 01:00
  expect(await reason(noon, hoursBefore(noon, 25))).toBe("daily_cap");
});

test("PP3. daily2 — 공백 10시간 · 직전 선톡 뒤 8시간 · 하루 두 번", async () => {
  await profile({ proactive_pref: "daily2" });
  const id = await conversation("duksu", hoursBefore(noon, 11));
  expect(await candidates(noon)).toHaveLength(1);
  expect(await reason(noon, hoursBefore(noon, 9))).toBe("gap");
  await proactiveAt(id, hoursBefore(noon, 5));
  expect(await reason(noon, hoursBefore(noon, 11))).toBe("spacing");
  await db.admin.query("delete from companion.messages");
  await proactiveAt(id, hoursBefore(noon, 9)); // 오늘 03:00
  expect(await reason(noon, hoursBefore(noon, 11))).toBeNull();
  await proactiveAt(id, hoursBefore(noon, 10.5));
  expect(await reason(noon, hoursBefore(noon, 11))).toBe("daily_cap");
  // 어제 보낸 것은 오늘 횟수에 들지 않는다.
  await db.admin.query("delete from companion.messages");
  await proactiveAt(id, hoursBefore(noon, 13));
  await proactiveAt(id, hoursBefore(noon, 23));
  expect(await reason(noon, hoursBefore(noon, 11))).toBeNull();
});

test("PP4. 조용한 시간 — 현지 22:00 ~ 08:00에는 보내지 않는다(시간대 · 지역 대표 시간대, 모르면 건너뜀)", async () => {
  const last = "2026-11-18T00:00:00Z";
  await conversation("duksu", last);
  const seoul23 = "2026-11-20T14:00:00Z";
  const seoul09 = "2026-11-20T00:00:00Z";
  const seoul0759 = "2026-11-19T22:59:00Z";
  await profile({ timezone: "Asia/Seoul" });
  expect(await reason(seoul23, last)).toBe("quiet_hours");
  expect(await reason(seoul0759, last)).toBe("quiet_hours");
  expect(await reason(seoul09, last)).toBeNull();
  expect(await candidates(seoul23)).toEqual([]);
  // 시간대가 없으면 지역의 대표 시간대.
  await profile({ timezone: null, last_region: "KR" });
  expect(await reason(seoul23, last)).toBe("quiet_hours");
  // 시간대가 여럿인 지역 · 모르는 지역은 건너뛴다.
  await profile({ timezone: null, last_region: "US" });
  expect(await reason(seoul23, last)).toBeNull();
});

test("PP5. 선호 시각 — 현지 그 시각에만, daily2는 그 시각과 10시간 뒤", async () => {
  const last = "2026-11-18T00:00:00Z";
  await conversation("duksu", last);
  await profile({ timezone: "Asia/Seoul", proactive_hour: 9 });
  expect(await reason("2026-11-20T00:00:00Z", last)).toBeNull(); // 09시
  expect(await reason("2026-11-20T00:59:00Z", last)).toBeNull();
  expect(await reason("2026-11-20T01:00:00Z", last)).toBe("hour"); // 10시
  expect(await reason("2026-11-20T10:00:00Z", last)).toBe("hour"); // 19시 — daily1
  await profile({ proactive_pref: "daily2" });
  expect(await reason("2026-11-20T10:00:00Z", last)).toBeNull(); // 19시
  expect(await reason("2026-11-20T11:00:00Z", last)).toBe("hour");
  // 시간대를 모르면 시각을 맞추지 않는다.
  await profile({ timezone: null, last_region: null });
  expect(await reason("2026-11-20T11:00:00Z", last)).toBeNull();
});

test("PP6. 한 회차에 유저마다 하나(가장 오래 조용한 대화) · 전체 상한이 위", async () => {
  await profile({ proactive_pref: "daily2" });
  await conversation("duksu", hoursBefore(noon, 30));
  const older = await conversation("yoonkyung", hoursBefore(noon, 40));
  expect(await candidates(noon)).toMatchObject([{ userId: user, characterId: "yoonkyung" }]);
  await db.admin.query("update companion.settings set proactive_daily_cap = 1");
  await proactiveAt(older, hoursBefore(noon, 10));
  expect(await reason(noon, hoursBefore(noon, 30))).toBe("daily_cap");
});

test("PP7. 맥락 — skipReason · capReached(이전 함수 호환)", async () => {
  await profile({ proactive_pref: "off" });
  await conversation("duksu", hoursBefore(noon, 30));
  const read = async () =>
    (
      await server.query("select public.companion_proactive_context($1, 'duksu', 12, $2) as c", [
        user,
        noon,
      ])
    ).rows[0].c;
  expect(await read()).toMatchObject({ allowed: true, skipReason: "off", capReached: true });
  await profile({ proactive_pref: "daily1" });
  expect(await read()).toMatchObject({ skipReason: null, capReached: false });
});

test("PP8. 앱 저장 · 읽기 — 선톡 설정 셋, 지우기 규칙, 틀린 값은 22023, 옛 4인수 호출도 된다", async () => {
  await signIn(app, user);
  const load = async () =>
    (await app.query("select public.companion_load_profile() as p")).rows[0].p;
  await app.query("select public.companion_save_profile(2000, 'self', 'en', null)");
  expect(await load()).toMatchObject({
    birthYear: 2000,
    proactivePref: "daily1",
    proactiveHour: null,
    timezone: null,
  });
  await app.query(
    "select public.companion_save_profile(null, null, null, null, 'daily2', 20, 'Asia/Manila')",
  );
  expect(await load()).toMatchObject({
    birthYear: 2000,
    proactivePref: "daily2",
    proactiveHour: 20,
    timezone: "Asia/Manila",
  });
  await app.query("select public.companion_save_profile(null, null, null, 'natural')");
  expect(await load()).toMatchObject({ proactivePref: "daily2", proactiveHour: 20 });
  await app.query("select public.companion_save_profile(null, null, null, null, null, -1, '')");
  expect(await load()).toMatchObject({ proactiveHour: null, timezone: null });
  for (const args of ["'daily3', null, null", "null, 24, null", "null, null, 'Mars/Base'"]) {
    await expect(
      app.query(`select public.companion_save_profile(null, null, null, null, ${args})`),
    ).rejects.toMatchObject({ code: "22023" });
  }
});

test("PP9. 운영자 — 선톡 설정 셋을 바꾸고 시험 계정 목록에 보인다, 옛 6인수 호출도 된다", async () => {
  await server.query(
    "select public.companion_operator_set_profile($1, 1990, false, null, null, 'PH', 'daily2', 9, 'Asia/Manila')",
    [user],
  );
  const testers = async () =>
    (await server.query("select public.companion_inspect_testers() as t")).rows[0].t[0];
  expect(await testers()).toMatchObject({
    region: "PH",
    proactivePref: "daily2",
    proactiveHour: 9,
    timezone: "Asia/Manila",
  });
  await server.query(
    "select public.companion_operator_set_profile($1, null, false, null, 'prefix', null)",
    [user],
  );
  expect(await testers()).toMatchObject({ feedbackMode: "prefix", proactivePref: "daily2" });
  await server.query(
    "select public.companion_operator_set_profile($1, null, false, null, null, null, 'off', -1, '')",
    [user],
  );
  expect(await testers()).toMatchObject({
    proactivePref: "off",
    proactiveHour: null,
    timezone: null,
  });
  await expect(
    server.query(
      "select public.companion_operator_set_profile($1, null, false, null, null, null, 'always', null, null)",
      [user],
    ),
  ).rejects.toMatchObject({ code: "22023" });
  await signIn(app, user);
  await expect(
    app.query(
      "select public.companion_operator_set_profile($1, null, false, null, null, null, 'off', null, null)",
      [user],
    ),
  ).rejects.toMatchObject({ code: "42501" });
});
