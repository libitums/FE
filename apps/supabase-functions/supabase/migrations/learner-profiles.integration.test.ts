import { afterAll, beforeAll, beforeEach, expect, test } from "vitest";
import { signIn, startTestDatabase } from "./postgres.test-support";

const userA = "00000000-0000-4000-8000-000000000001";
const userB = "00000000-0000-4000-8000-000000000002";

let db: Awaited<ReturnType<typeof startTestDatabase>>;
let clientA: Awaited<ReturnType<typeof db.connect>>;
let clientB: typeof clientA;

type Client = typeof clientA;
const save = (client: Client, name: string | null, countryCode: string | null) =>
  client.query("select public.save_learner_profile($1, $2)", [name, countryCode]);
async function load(client: Client): Promise<unknown> {
  const result = await client.query("select public.load_learner_profile() as profile");
  return result.rows[0].profile;
}
async function rowCount(): Promise<number> {
  const result = await db.admin.query("select count(*)::int as n from public.learner_profiles");
  return result.rows[0].n;
}
async function storedName(userId: string): Promise<unknown> {
  const result = await db.admin.query(
    "select name from public.learner_profiles where user_id = $1",
    [userId],
  );
  return result.rows[0]?.name;
}

beforeAll(async () => {
  db = await startTestDatabase();
  clientA = await db.connect();
  clientB = await db.connect();
}, 30_000);
afterAll(async () => {
  await db?.close();
});
beforeEach(async () => {
  await clientA.query("reset role");
  await clientB.query("reset role");
  await db.admin.query("truncate auth.users cascade");
  await db.admin.query("insert into auth.users (id) values ($1), ($2)", [userA, userB]);
  await signIn(clientA, userA);
  await signIn(clientB, userB);
});

test("D1. 본인이 저장한 값을 조회하고, 저장한 적 없으면 null이다", async () => {
  expect(await load(clientA)).toBeNull();
  await save(clientA, "Emma", "DE");
  expect(await load(clientA)).toEqual({ name: "Emma", countryCode: "DE" });
});

test("D2. 다시 저장하면 두 열을 통째로 덮어쓰고 행은 하나다", async () => {
  await save(clientA, "Emma", "DE");
  await save(clientA, "Mia", "FR");
  expect(await load(clientA)).toEqual({ name: "Mia", countryCode: "FR" });
  expect(await rowCount()).toBe(1);
});

test("D3. 타인의 행은 보이지도 바뀌지도 않는다", async () => {
  await save(clientA, "Emma", "DE");
  expect(await load(clientB)).toBeNull();
  await save(clientB, "Noah", "US");
  expect(await load(clientA)).toEqual({ name: "Emma", countryCode: "DE" });
  expect(await load(clientB)).toEqual({ name: "Noah", countryCode: "US" });
  expect(await rowCount()).toBe(2);
});

test("D4. 로그인 정보가 비면 저장은 28000, 조회는 null이다", async () => {
  await signIn(clientA, "");
  await expect(save(clientA, "Emma", "DE")).rejects.toMatchObject({ code: "28000" });
  expect(await load(clientA)).toBeNull();
  expect(await rowCount()).toBe(0);
});

test("D5. anon 역할은 두 함수 모두 권한 오류(42501)다", async () => {
  await clientA.query("set role anon");
  await expect(save(clientA, "Emma", "DE")).rejects.toMatchObject({ code: "42501" });
  await expect(load(clientA)).rejects.toMatchObject({ code: "42501" });
});

test.each([
  ["select", "select * from public.learner_profiles"],
  [
    "insert",
    `insert into public.learner_profiles (user_id, name, country_code) values ('${userA}', 'Emma', 'DE')`,
  ],
  ["update", "update public.learner_profiles set name = 'Emma'"],
  ["delete", "delete from public.learner_profiles"],
  ["truncate", "truncate public.learner_profiles"],
])("D6. authenticated는 표를 직접 %s할 수 없다", async (_name, sql) => {
  await expect(clientA.query(sql)).rejects.toMatchObject({ code: "42501" });
});

test.each([
  ["이름 null + 나라 null", null, null],
  ["이름 null", null, "DE"],
  ["이름 공백뿐", "   ", "DE"],
  ["이름 빈 문자열", "", "DE"],
  ["나라 null", "Emma", null],
  ["31자", "a".repeat(31), "DE"],
  ["한글 31자", "가".repeat(31), "DE"],
  ["{ 포함", "Em{ma", "DE"],
  ["} 포함", "Em}ma", "DE"],
  ["줄바꿈 포함", "Em\nma", "DE"],
  ["U+007F 포함", "Em\u007Fma", "DE"],
  ["U+0085 포함", "Em\u0085ma", "DE"],
  ["U+2028 포함", "Em ma", "DE"],
  ["나라 소문자", "Emma", "kr"],
  ["나라 한 글자", "Emma", "K"],
  ["나라 세 글자", "Emma", "KOR"],
  ["나라 숫자", "Emma", "K1"],
  ["나라 빈 문자열", "Emma", ""],
  ["나라 앞 공백", "Emma", " DE"],
])("D7. 잘못된 입력(%s)은 22023이고 기존 행은 그대로다", async (_name, name, code) => {
  await save(clientA, "Emma", "DE");
  await expect(save(clientA, name, code)).rejects.toMatchObject({ code: "22023" });
  expect(await load(clientA)).toEqual({ name: "Emma", countryCode: "DE" });
});

test("D7b. 인자 타입이 text가 아니면 함수가 선택되지 않는다", async () => {
  await expect(
    clientA.query("select public.save_learner_profile(1::int, 'DE'::text)"),
  ).rejects.toMatchObject({ code: "42883" });
  await expect(
    clientA.query("select public.save_learner_profile('Emma'::text, 1::int)"),
  ).rejects.toMatchObject({ code: "42883" });
  expect(await rowCount()).toBe(0);
});

test.each([
  ["공백 연속", "  Mary   Ann  ", "Mary Ann"],
  ["탭", "Mary\t\tAnn", "Mary Ann"],
  ["앞뒤 탭", "\tMary\t", "Mary"],
])("D8. 서버가 정규화한다: %s", async (_name, input, expected) => {
  await save(clientA, input, "DE");
  expect(await storedName(userA)).toBe(expected);
  expect(await load(clientA)).toEqual({ name: expected, countryCode: "DE" });
});

test.each([
  ["영문 30자", "a".repeat(30)],
  ["한글 30자", "가".repeat(30)],
  ["이모지 포함 30 코드 포인트", `${"😀".repeat(5)}${"a".repeat(25)}`],
  ["한글 이름", "김하늘"],
  ["하이픈 · 아포스트로피", "Anne-Marie O'Neil"],
  ["악센트", "José"],
])("D9. 허용: %s", async (_name, name) => {
  await save(clientA, name, "KR");
  expect(await load(clientA)).toEqual({ name, countryCode: "KR" });
});

test("D10. 형식만 맞는 모르는 나라 코드도 저장된다", async () => {
  await save(clientA, "Emma", "ZZ");
  expect(await load(clientA)).toEqual({ name: "Emma", countryCode: "ZZ" });
});

test("D11. 계정을 지우면 그 행도 지워지고 다른 사용자의 행은 남는다", async () => {
  await save(clientA, "Emma", "DE");
  await save(clientB, "Noah", "US");
  await db.admin.query("delete from auth.users where id = $1", [userA]);
  expect(await load(clientA)).toBeNull();
  expect(await load(clientB)).toEqual({ name: "Noah", countryCode: "US" });
  expect(await rowCount()).toBe(1);
});

test.each([
  ["31자", [userA, "a".repeat(31), "DE"], "23514"],
  ["{ 포함", [userA, "Em{ma", "DE"], "23514"],
  ["소문자 코드", [userA, "Emma", "de"], "23514"],
  ["앞 공백", [userA, " Emma", "DE"], "23514"],
  ["이름 null", [userA, null, "DE"], "23502"],
  ["나라 null", [userA, "Emma", null], "23502"],
])("D12. 함수 밖 직접 쓰기도 막힌다: %s", async (_name, values, code) => {
  await expect(
    db.admin.query(
      "insert into public.learner_profiles (user_id, name, country_code) values ($1, $2, $3)",
      values,
    ),
  ).rejects.toMatchObject({ code });
  expect(await rowCount()).toBe(0);
});
