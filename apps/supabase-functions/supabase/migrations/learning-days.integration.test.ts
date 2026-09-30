import { afterAll, beforeAll, beforeEach, expect, test } from "vitest";
import { signIn, startTestDatabase } from "./postgres.test-support";

const userA = "00000000-0000-4000-8000-000000000001";
const userB = "00000000-0000-4000-8000-000000000002";
let db: Awaited<ReturnType<typeof startTestDatabase>>;
let client: Awaited<ReturnType<typeof db.connect>>;
let today: string;
let dates: string[];
beforeAll(async () => {
  db = await startTestDatabase();
  client = await db.connect();
  const result = await db.admin.query(
    `select ((now() at time zone 'utc')::date - n)::text as day from generate_series(0, 100) n order by n`,
  );
  dates = result.rows.map((row: { day: string }) => row.day);
  today = dates[0]!;
}, 30_000);
afterAll(async () => {
  await db?.close();
});
beforeEach(async () => {
  await db.admin.query("truncate auth.users cascade");
  await db.admin.query(
    "insert into auth.users (id, created_at) values ($1, now() - interval '90 days'), ($2, now() - interval '90 days')",
    [userA, userB],
  );
  await signIn(client, userA);
});
async function replay(days: unknown, current: unknown = today) {
  return (
    await client.query("select public.record_learning_days($1::date[], $2::date) as streak", [
      days,
      current,
    ])
  ).rows[0].streak;
}
async function saved() {
  return (
    await db.admin.query(
      "select day::text from public.learning_days where user_id = $1 order by day",
      [userA],
    )
  ).rows.map((row: { day: string }) => row.day);
}

test("한 달 전 오프라인 날짜를 보존하고 오래된 연속을 오늘의 연속으로 표시하지 않는다", async () => {
  expect(await replay([dates[30], dates[29]])).toBe(0);
  expect(await saved()).toEqual([dates[30], dates[29]]);
});

test("재전송·역순·중복 날짜는 한 번만 저장하고 오늘의 연속을 복구한다", async () => {
  expect(await replay([today, dates[2], dates[1], today])).toBe(3);
  expect(await replay([dates[1], today])).toBe(3);
  expect(await saved()).toEqual([dates[2], dates[1], today]);
});

test("오늘 학습하지 않았으면 어제까지의 연속을 돌려준다", async () => {
  expect(await replay([dates[2], dates[1]])).toBe(2);
});

test.each([null, [], Array(65).fill("2026-01-01"), [null], ["infinity"], ["-infinity"]])(
  "잘못된 날짜 묶음 %j은 저장 없이 거절한다",
  async (days) => {
    await expect(replay(days)).rejects.toMatchObject({ code: "22023" });
    expect(await saved()).toEqual([]);
  },
);

test("가입 전 날짜 하나가 섞여도 전체 저장을 거절한다", async () => {
  await expect(replay([today, dates[100]])).rejects.toMatchObject({ code: "22023" });
  expect(await saved()).toEqual([]);
});

test("시간대 범위 밖의 미래 날짜와 잘못된 오늘은 거절한다", async () => {
  const future = (
    await db.admin.query("select ((now() at time zone 'utc')::date + 2)::text as day")
  ).rows[0].day;
  await expect(replay([future])).rejects.toMatchObject({ code: "22023" });
  await expect(replay([today], dates[2])).rejects.toMatchObject({ code: "22023" });
  await expect(replay([today], null)).rejects.toMatchObject({ code: "22023" });
  expect(await saved()).toEqual([]);
});

test("다른 계정의 날짜는 연속에 포함하지 않고 계정 삭제 시 함께 지운다", async () => {
  expect(await replay([today, dates[1]])).toBe(2);
  await signIn(client, userB);
  expect(await replay([today])).toBe(1);
  await db.admin.query("delete from auth.users where id = $1", [userA]);
  expect(await saved()).toEqual([]);
  expect(
    (await db.admin.query("select count(*)::integer as n from public.learning_days")).rows[0].n,
  ).toBe(1);
});

test("익명 호출과 사용자 ID 없는 호출은 거절한다", async () => {
  await client.query("select set_config('request.jwt.claim.sub', '', false)");
  await expect(replay([today])).rejects.toMatchObject({ code: "28000" });
  await client.query("set role anon");
  await expect(replay([today])).rejects.toMatchObject({ code: "42501" });
});
