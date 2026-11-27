import { afterAll, beforeAll, beforeEach, expect, test } from "vitest";
import { startTestDatabase } from "./postgres.test-support";

// 20270119(ADR-0127 · ADR-0191 개정): 나라 판정 `companion.user_region` = 기기 지역(`profiles.last_region`) → 온보딩 나라
// (`learner_profiles.country_code`). 앱이 `client_region`을 보내지 않아 운영의 `last_region`이 전원 null이었고, 그래서 미성년의
// 선톡 · 스토리 반응이 모두 막혔다. 반응만은 나이 모름도 미성년과 같은 기준(나라를 알고 US 아님)으로 받는다(사용자 결정 2026-11-27).
const user = "00000000-0000-4000-8000-0000000000e1";
const noon = "2026-11-20T12:00:00Z"; // 자카르타 19시 · 뉴욕 7시
const adultYear = 1990;
const minorYear = 2010; // 2026년에 16세

let db: Awaited<ReturnType<typeof startTestDatabase>>;
let server: Awaited<ReturnType<typeof db.connect>>;

const hoursBefore = (at: string, hours: number) =>
  new Date(Date.parse(at) - hours * 3_600_000).toISOString();

async function profile(birthYear: number | null, lastRegion: string | null = null) {
  await db.admin.query(
    `insert into companion.profiles (user_id, birth_year, age_source, last_region) values ($1, $2, $3, $4)`,
    [user, birthYear, birthYear === null ? null : "self", lastRegion],
  );
}
async function country(code: string) {
  await db.admin.query(
    "insert into public.learner_profiles (user_id, name, country_code) values ($1, 'Ana', $2)",
    [user, code],
  );
}
async function spoke(at = hoursBefore(noon, 30)) {
  const id = (
    await db.admin.query(
      "insert into companion.conversations (user_id, character_id, last_message_at) values ($1, 'duksu', $2) returning id",
      [user, at],
    )
  ).rows[0].id as string;
  await db.admin.query(
    `insert into companion.messages (conversation_id, user_id, role, origin, status, text, client_message_id, created_at)
     values ($1, $2, 'user', 'turn', 'complete', '안녕하세요', gen_random_uuid(), $3)`,
    [id, user, at],
  );
}
async function region() {
  return (await db.admin.query("select companion.user_region($1) as r", [user])).rows[0].r as
    | string
    | null;
}
async function context() {
  return (
    await server.query("select public.companion_proactive_context($1, 'duksu', 8, $2) as c", [
      user,
      noon,
    ])
  ).rows[0].c as {
    allowed: boolean;
    reactionAllowed: boolean;
    ageBand: string;
    localHour: number | null;
  };
}
async function candidates() {
  return (await server.query("select public.companion_proactive_candidates($1, 20) as c", [noon]))
    .rows[0].c as { userId: string }[];
}
async function gate(requestRegion: string | null = null) {
  return (
    await db.admin.query(
      "select companion.turn_gate_base($1, 'duksu', gen_random_uuid(), $2, $3) as g",
      [user, noon, requestRegion],
    )
  ).rows[0].g as { result: string; region: string | null; memoryEnabled: boolean };
}
async function flushMemoryEnabled() {
  await db.admin.query("update companion.conversations set memory_extracted_until = null");
  const rows = (
    await server.query("select public.companion_memory_flush_candidates($1, 20) as c", [noon])
  ).rows[0].c as { memoryEnabled: boolean }[];
  return rows.map((row) => row.memoryEnabled);
}

beforeAll(async () => {
  db = await startTestDatabase();
  server = await db.connect();
  await server.query("set role service_role");
}, 90_000);
afterAll(async () => {
  await db?.close();
});
beforeEach(async () => {
  await db.admin.query("truncate auth.users cascade");
  await db.admin.query(
    `insert into auth.users (id, email, raw_app_meta_data) values ($1, 'r@libitum.test', '{"duru_tester": true}')`,
    [user],
  );
});

test("UR1. 나라 = 기기 지역 → 온보딩 나라, 둘 다 없으면 null", async () => {
  expect(await region()).toBeNull();
  await country("ID");
  expect(await region()).toBe("ID"); // 프로필 행이 없어도 온보딩 나라
  await profile(minorYear);
  expect(await region()).toBe("ID"); // 기기 지역이 없으면 온보딩 나라
  await db.admin.query("update companion.profiles set last_region = 'US'");
  expect(await region()).toBe("US"); // 기기 지역이 먼저
});

test("UR2. 미성년 + 온보딩 나라 ID → 선톡 · 반응 허용, 현지 시각은 자카르타", async () => {
  await profile(minorYear);
  await country("ID");
  await spoke();
  expect(await context()).toMatchObject({
    ageBand: "minor",
    allowed: true,
    reactionAllowed: true,
    localHour: 19,
  });
  expect(await candidates()).toMatchObject([{ userId: user }]);
});

test("UR3. 미성년 + 나라 US → 막힘", async () => {
  await profile(minorYear);
  await country("US");
  await spoke();
  expect(await context()).toMatchObject({ allowed: false, reactionAllowed: false });
  expect(await candidates()).toEqual([]);
});

test("UR4. 미성년 + 나라 없음 → 막힘", async () => {
  await profile(minorYear);
  await spoke();
  expect(await context()).toMatchObject({
    allowed: false,
    reactionAllowed: false,
    localHour: null,
  });
  expect(await candidates()).toEqual([]);
});

test("UR5. 기기 지역이 있으면 그것이 먼저 — US 기기면 온보딩 ID여도 막힘, KR 기기면 온보딩 US여도 허용", async () => {
  await profile(minorYear, "US");
  await country("ID");
  await spoke();
  expect(await context()).toMatchObject({ allowed: false, reactionAllowed: false });
  await db.admin.query("update companion.profiles set last_region = 'KR'");
  await db.admin.query("update public.learner_profiles set country_code = 'US'");
  expect(await context()).toMatchObject({ allowed: true, reactionAllowed: true, localHour: 21 });
});

test("UR6. 성인은 나라와 상관없이 그대로 허용", async () => {
  await profile(adultYear);
  await spoke();
  expect(await context()).toMatchObject({ allowed: true, reactionAllowed: true });
  await country("US");
  expect(await context()).toMatchObject({ allowed: true, reactionAllowed: true });
});

test("UR7. 나이 모름 — 반응만 미성년 기준(나라 앎 · US 아님)으로 허용, 선톡은 그대로 막힘", async () => {
  await profile(null);
  await country("ID");
  await spoke();
  expect(await context()).toMatchObject({
    ageBand: "unknown", // Edge는 unknown을 미성년 규칙(로맨스 없음 · 동기 출력 검사)으로 다룬다
    allowed: false,
    reactionAllowed: true,
  });
  expect(await candidates()).toEqual([]);
  await db.admin.query("update public.learner_profiles set country_code = 'US'");
  expect(await context()).toMatchObject({ allowed: false, reactionAllowed: false });
  await db.admin.query("delete from public.learner_profiles");
  expect(await context()).toMatchObject({ allowed: false, reactionAllowed: false });
});

test("UR8. 대화 관문 · 기억 — 미국 판정이 온보딩 나라도 본다(요청 지역 → 기기 지역 → 온보딩 나라)", async () => {
  await profile(null);
  await country("US");
  await spoke(hoursBefore(noon, 2));
  // 나이 모름 + 온보딩 US → 장기 기억 끔(SB 1119), 위기 연락처 지역 US
  expect(await gate()).toMatchObject({ result: "ok", region: "US", memoryEnabled: false });
  expect(await flushMemoryEnabled()).toEqual([false]);
  // 요청 지역이 먼저
  expect(await gate("ID")).toMatchObject({ region: "ID", memoryEnabled: true });
  await db.admin.query("update public.learner_profiles set country_code = 'ID'");
  expect(await gate()).toMatchObject({ region: "ID", memoryEnabled: true });
  expect(await flushMemoryEnabled()).toEqual([true]);
});
