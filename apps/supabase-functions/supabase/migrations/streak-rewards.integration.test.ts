import { afterAll, beforeAll, beforeEach, expect, test } from "vitest";
import { signIn, startTestDatabase } from "./postgres.test-support";

// 연속 학습 엽전 보상(20261128, ADR-0143): `companion_claim_streak_reward(p_today)`가 서버의 학습한 날 표로 연속을 세어
// 이정표(3 · 7 · 14 · 30일마다)를 연속 한 번에 한 번 지급한다.
const user = "00000000-0000-4000-8000-0000000000f1";

let db: Awaited<ReturnType<typeof startTestDatabase>>;
let app: Awaited<ReturnType<typeof db.connect>>;
let today: string;

type Claim = {
  days: number;
  amount: number;
  granted: boolean;
  wallet: { balance: number; grant: number };
};
const claim = async (day = today, client = app) =>
  (await client.query("select public.companion_claim_streak_reward($1::date) as c", [day])).rows[0]
    .c as Claim;

/** 오늘에서 `from`일 전부터 `to`일 전까지(포함) 학습한 날을 넣는다. 0 = 오늘. */
async function learned(from: number, to = 0) {
  await db.admin.query(
    `insert into public.learning_days (user_id, day)
     select $1, $2::date - g from generate_series($4::int, $3::int) g on conflict do nothing`,
    [user, today, from, to],
  );
}

beforeAll(async () => {
  db = await startTestDatabase();
  app = await db.connect();
  today = (await db.admin.query("select ((now() at time zone 'utc')::date)::text as d")).rows[0].d;
}, 30_000);
afterAll(async () => {
  await db?.close();
});
beforeEach(async () => {
  await db.admin.query("truncate auth.users cascade");
  await db.admin.query(
    `insert into auth.users (id, email, raw_app_meta_data, created_at) values ($1, 'a@libitum.test', '{}', now() - interval '400 days')`,
    [user],
  );
  await signIn(app, user);
});

test("SR-S1 오늘 포함 7일 연속 → 40 지급, 다시 불러도 두 번 주지 않는다", async () => {
  await learned(6);
  expect(await claim()).toMatchObject({
    days: 7,
    amount: 40,
    granted: true,
    wallet: { balance: 40, grant: 40 },
  });
  expect(await claim()).toMatchObject({
    days: 7,
    amount: 40,
    granted: false,
    wallet: { balance: 40 },
  });
});

test("SR-S2 끊겼다가 새로 시작한 연속이 다시 7일에 닿으면 또 받는다", async () => {
  // 20 ~ 14일 전 7일 연속을 그때 받았다고 치고(그날을 p_today로), 13일 전은 쉰다.
  await learned(20, 14);
  const then = (await db.admin.query("select ($1::date - 14)::text as d", [today])).rows[0].d;
  // 창(UTC 오늘 ±1) 밖이라 지난날로는 부를 수 없다 — 원장에 그 연속의 지급을 직접 남긴다.
  await db.admin.query(
    `select companion.grant_once($1::uuid, 40, 'streak', $1::uuid::text || ':' || ($2::date - 6)::text || ':7')`,
    [user, then],
  );
  await learned(6);
  expect(await claim()).toMatchObject({
    days: 7,
    amount: 40,
    granted: true,
    wallet: { balance: 80 },
  });
});

test("SR-S3 이정표가 아닌 날(5일)은 0 · 지급 없음 · 원장 없음", async () => {
  await learned(4);
  expect(await claim()).toMatchObject({
    days: 5,
    amount: 0,
    granted: false,
    wallet: { balance: 0 },
  });
  const rows = await db.admin.query("select count(*)::int as n from companion.credit_ledger");
  expect(rows.rows[0].n).toBe(0);
});

test("SR-S4 오늘 아직 안 했고 어제까지 3일이면 어제 기준 3일 이정표 15, 오늘 해도 같은 연속이라 다시 안 준다", async () => {
  await learned(3, 1);
  expect(await claim()).toMatchObject({ days: 3, amount: 15, granted: true });
  await learned(0);
  expect(await claim()).toMatchObject({
    days: 4,
    amount: 0,
    granted: false,
    wallet: { balance: 15 },
  });
});

test("SR-S5 30일 · 60일은 150", async () => {
  await learned(29);
  expect(await claim()).toMatchObject({ days: 30, amount: 150, granted: true });
  await db.admin.query("truncate companion.credit_ledger, companion.credit_wallets");
  await learned(59);
  expect(await claim()).toMatchObject({ days: 60, amount: 150, granted: true });
});

test("SR-S6 로그인 없으면 거절, 오늘이 서버 날짜에서 하루 넘게 다르면 22023", async () => {
  const anon = await db.connect();
  await anon.query("set role anon");
  await expect(
    anon.query("select public.companion_claim_streak_reward($1::date)", [today]),
  ).rejects.toBeTruthy();
  const far = (await db.admin.query("select ($1::date + 3)::text as d", [today])).rows[0].d;
  await expect(claim(far)).rejects.toMatchObject({ code: "22023" });
});

test("SR-S7 원장 합 = 지갑", async () => {
  await learned(6);
  await claim();
  const sums = await db.admin.query(
    `select (select sum(delta)::int from companion.credit_ledger where user_id = $1) as ledger,
            (select grant_balance from companion.credit_wallets where user_id = $1) as wallet`,
    [user],
  );
  expect(sums.rows[0]).toEqual({ ledger: 40, wallet: 40 });
});
