import { afterAll, beforeAll, beforeEach, expect, test } from "vitest";
import { signIn, startTestDatabase } from "./postgres.test-support";

const userA = "00000000-0000-4000-8000-000000000001";
const userB = "00000000-0000-4000-8000-000000000002";

let db: Awaited<ReturnType<typeof startTestDatabase>>;
let clientA: Awaited<ReturnType<typeof db.connect>>;
let clientB: typeof clientA;
// 서버 키 역할의 연결입니다. 표 읽기 확인은 admin(소유자)으로 해서, 역할 전환이 확인 결과를 가리지 않게 합니다.
let server: typeof clientA;

type Client = typeof clientA;
type ProfileArgs = [number | null, string | null, string | null, string | null];
const save = (client: Client, ...args: ProfileArgs) =>
  client.query("select public.companion_save_profile($1, $2, $3, $4)", args);
async function load(client: Client): Promise<unknown> {
  const result = await client.query("select public.companion_load_profile() as profile");
  return result.rows[0].profile;
}

const expression = (id: string, surface: string, extra: Record<string, unknown> = {}) => ({
  id,
  kind: id.split(":")[0],
  surface,
  roman: null,
  gloss_en: null,
  grade: null,
  first_episode: "u01-water",
  ...extra,
});
const sync = (client: Client, expressions: unknown[], units: unknown[]) =>
  client.query("select companion.sync_expressions($1::jsonb, $2::jsonb) as result", [
    JSON.stringify(expressions),
    JSON.stringify(units),
  ]);
async function expressionRows(): Promise<unknown[]> {
  const result = await db.admin.query(
    "select id, surface, retired from companion.expressions order by id",
  );
  return result.rows;
}
async function unitRows(): Promise<unknown[]> {
  const result = await db.admin.query(
    "select expression_id, episode_id, unit_key from companion.expression_units order by 1, 2, 3",
  );
  return result.rows;
}

beforeAll(async () => {
  db = await startTestDatabase();
  clientA = await db.connect();
  clientB = await db.connect();
  server = await db.connect();
  await server.query("set role service_role");
}, 30_000);
afterAll(async () => {
  await db?.close();
});
beforeEach(async () => {
  await clientA.query("reset role");
  await clientB.query("reset role");
  await db.admin.query("truncate auth.users cascade");
  await db.admin.query("truncate companion.expression_units, companion.expressions");
  await db.admin.query("insert into auth.users (id) values ($1), ($2)", [userA, userB]);
  await signIn(clientA, userA);
  await signIn(clientB, userB);
});

// CF1 — 앱 역할이 컴패니언 표에 직접 닿으면 RLS 정책 하나 실수로 다른 사람의 생년 · 대화가 열립니다. 스키마 사용 권한부터 막습니다.
test("CF1. anon · authenticated는 companion 스키마의 표를 읽지도 쓰지도 못한다(42501)", async () => {
  for (const role of ["authenticated", "anon"]) {
    await clientA.query(`set role ${role}`);
    for (const table of ["profiles", "expressions", "expression_units"]) {
      await expect(clientA.query(`select * from companion.${table}`)).rejects.toMatchObject({
        code: "42501",
      });
    }
    await expect(
      clientA.query("insert into companion.profiles (user_id) values ($1)", [userA]),
    ).rejects.toMatchObject({ code: "42501" });
  }
});

test("CF2. 본인이 저장한 프로필을 읽고, 저장한 적 없으면 null이다", async () => {
  expect(await load(clientA)).toBeNull();
  await save(clientA, 2001, "self", "tl", "natural");
  expect(await load(clientA)).toEqual({
    birthYear: 2001,
    ageSource: "self",
    l1: "tl",
    feedbackMode: "natural",
    // 선톡 설정(20261115) — 저장한 적 없으면 기본값.
    proactivePref: "daily1",
    proactiveHour: null,
    timezone: null,
  });
});

// CF3 — 피드백 방식만 바꾸는 호출이 생년을 지우면 연령 판정이 「모름(미성년자 기본값)」으로 떨어집니다.
test("CF3. null인 인수는 그 열을 바꾸지 않는다", async () => {
  await save(clientA, 2001, "self", "tl", "natural");
  await save(clientA, null, null, null, "prefix");
  await save(clientA, null, null, "en", null);
  expect(await load(clientA)).toEqual({
    birthYear: 2001,
    ageSource: "self",
    l1: "en",
    feedbackMode: "prefix",
    // 선톡 설정(20261115) — 저장한 적 없으면 기본값.
    proactivePref: "daily1",
    proactiveHour: null,
    timezone: null,
  });
});

test("CF4. 타인의 프로필은 보이지도 바뀌지도 않는다", async () => {
  await save(clientA, 2001, "self", "tl", null);
  expect(await load(clientB)).toBeNull();
  await save(clientB, 1990, "social", "hi", "separate");
  expect(await load(clientA)).toMatchObject({ birthYear: 2001, l1: "tl" });
});

test("CF5. 생년과 출처는 함께 · 올해를 넘는 생년 · 모르는 값은 22023이고 아무것도 쓰지 않는다", async () => {
  const nextYear = new Date().getUTCFullYear() + 1;
  const invalid: ProfileArgs[] = [
    [2001, null, null, null],
    [null, "self", null, null],
    [nextYear, "self", null, null],
    [1899, "self", null, null],
    [2001, "guess", null, null],
    [null, null, "Tagalog", null],
    [null, null, null, "loud"],
  ];
  for (const args of invalid) {
    await expect(save(clientA, ...args)).rejects.toMatchObject({ code: "22023" });
  }
  expect(await load(clientA)).toBeNull();
});

test("CF6. 로그인 정보가 비면 저장은 28000 · 조회는 null, anon은 두 함수 모두 42501이다", async () => {
  await signIn(clientA, "");
  await expect(save(clientA, 2001, "self", null, null)).rejects.toMatchObject({ code: "28000" });
  expect(await load(clientA)).toBeNull();
  await clientA.query("set role anon");
  await expect(save(clientA, 2001, "self", null, null)).rejects.toMatchObject({ code: "42501" });
  await expect(load(clientA)).rejects.toMatchObject({ code: "42501" });
});

test("CF7. 계정을 지우면 컴패니언 프로필도 함께 지워진다", async () => {
  await save(clientA, 2001, "self", null, null);
  await db.admin.query("delete from auth.users where id = $1", [userA]);
  const result = await db.admin.query("select count(*)::int as n from companion.profiles");
  expect(result.rows[0].n).toBe(0);
});

// CF8 — 표현 동기화는 서버 키만 부릅니다. 앱 사용자가 부르면 전역 표를 지우거나 바꿀 수 있습니다.
test("CF8. sync_expressions는 service_role만 부른다", async () => {
  await expect(sync(clientA, [expression("voca:aaaa0001", "물")], [])).rejects.toMatchObject({
    code: "42501",
  });
  const result = await sync(server, [expression("voca:aaaa0001", "물")], []);
  expect(result.rows[0].result).toEqual({ changed: 1, retired: 0, units: 0 });
});

// CF9 — id는 지우지도 재사용하지도 않습니다. 콘텐츠에서 빠지면 retired, 다시 들어오면 되살립니다.
test("CF9. 입력에서 빠진 표현은 retired가 되고, 다시 들어오면 되살아나며, 대응표는 통째로 바뀐다", async () => {
  const water = expression("voca:aaaa0001", "물");
  const pattern = expression("patt:bbbb0001", "{명사} 주세요");
  await sync(
    server,
    [water, pattern],
    [
      { expression_id: water.id, episode_id: "u01-water", unit_key: "S1" },
      { expression_id: pattern.id, episode_id: "u01-water", unit_key: "S3" },
    ],
  );
  await sync(
    server,
    [water],
    [{ expression_id: water.id, episode_id: "u01-water", unit_key: "S2" }],
  );
  expect(await expressionRows()).toEqual([
    { id: "patt:bbbb0001", surface: "{명사} 주세요", retired: true },
    { id: "voca:aaaa0001", surface: "물", retired: false },
  ]);
  expect(await unitRows()).toEqual([
    { expression_id: "voca:aaaa0001", episode_id: "u01-water", unit_key: "S2" },
  ]);
  await sync(server, [water, pattern], []);
  expect(await expressionRows()).toEqual([
    { id: "patt:bbbb0001", surface: "{명사} 주세요", retired: false },
    { id: "voca:aaaa0001", surface: "물", retired: false },
  ]);
});

test("CF10. 같은 입력을 두 번 넣으면 두 번째는 바뀐 행이 0이다", async () => {
  const rows = [expression("voca:aaaa0001", "물"), expression("expr:cccc0001", "감사합니다")];
  await sync(server, rows, []);
  const second = await sync(server, rows, []);
  expect(second.rows[0].result).toEqual({ changed: 0, retired: 0, units: 0 });
});

test("CF11. 빈 스냅숏 · id 접두사와 kind가 다른 행 · 없는 표현을 가리키는 대응은 거부하고 아무것도 바꾸지 않는다", async () => {
  await sync(server, [expression("voca:aaaa0001", "물")], []);
  await expect(sync(server, [], [])).rejects.toMatchObject({ code: "22023" });
  await expect(
    sync(server, [expression("voca:aaaa0002", "밥", { kind: "patt" })], []),
  ).rejects.toMatchObject({ code: "23514" });
  await expect(
    sync(
      server,
      [expression("voca:aaaa0001", "물")],
      [{ expression_id: "voca:ffff9999", episode_id: "u01-water", unit_key: "S1" }],
    ),
  ).rejects.toMatchObject({ code: "23503" });
  expect(await expressionRows()).toEqual([{ id: "voca:aaaa0001", surface: "물", retired: false }]);
});
