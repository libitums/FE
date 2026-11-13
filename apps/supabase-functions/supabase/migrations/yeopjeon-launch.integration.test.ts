import { afterAll, beforeAll, beforeEach, expect, test } from "vitest";
import { signIn, startTestDatabase } from "./postgres.test-support";

// 엽전 출시(20261127, ADR-0140): 학습 보상 · 출시 보너스 한 번 지급(`companion_claim_coins`) · 단가 10 ·
// 무료 티어도 엽전이 있으면 체험 캐릭터 밖과 대화.
const user = "00000000-0000-4000-8000-0000000000e1";
const other = "00000000-0000-4000-8000-0000000000e2";
const now = "2026-11-13T10:00:00Z";

let db: Awaited<ReturnType<typeof startTestDatabase>>;
let app: Awaited<ReturnType<typeof db.connect>>;
let server: typeof app;

const claim = async (client = app) =>
  (await client.query("select public.companion_claim_coins() as c")).rows[0].c as {
    learning: number;
    bonus: number;
    wallet: { balance: number; grant: number; tier: string };
  };

// 지급 함수는 저장된 진행 표를 읽기만 한다 — 저장 검증(필수 목록 칸)은 learning-progress 테스트 몫이라 표에 바로 넣는다.
async function progress(
  userId: string,
  catalogProgress: Record<string, string[]>,
  coinUnits: Record<string, string[]> = {},
) {
  await db.admin.query(
    `insert into public.learning_progress (user_id, progress) values ($1, $2)
     on conflict (user_id) do update set progress = excluded.progress`,
    [userId, JSON.stringify({ version: 1, catalogProgress, coinUnits })],
  );
}

beforeAll(async () => {
  db = await startTestDatabase();
  app = await db.connect();
  server = await db.connect();
  await server.query("set role service_role");
}, 30_000);
afterAll(async () => {
  await db?.close();
});
beforeEach(async () => {
  await db.admin.query("truncate auth.users cascade");
  await db.admin.query(
    "update companion.settings set message_cost = 10, testers_only = false, minor_daily_limit_seconds = null",
  );
  await db.admin.query(
    `insert into auth.users (id, email, raw_app_meta_data) values ($1, 'a@libitum.test', '{}'), ($2, 'b@libitum.test', '{}')`,
    [user, other],
  );
  await signIn(app, user);
});

test("YL1. 끝낸 유닛마다 10 — 표지 · 막간 제외, 진행 · 엽전 유닛 합집합, 출시 보너스 100. 잔액 = 합", async () => {
  await progress(
    user,
    { "u01-water": ["intro", "S1", "S2", "INT", "RP"] },
    { "u01-water": ["S1"], "u02-checkin": ["S1"] },
  );
  expect(await claim()).toMatchObject({
    learning: 40,
    bonus: 100,
    wallet: { balance: 140, grant: 140 },
  });
});

test("YL2. 다시 불러도 두 번 주지 않고, 새로 깬 유닛만 더한다", async () => {
  await progress(user, { "u01-water": ["S1"] });
  await claim();
  expect(await claim()).toMatchObject({ learning: 0, bonus: 0, wallet: { balance: 110 } });
  await progress(user, { "u01-water": ["S1", "S2"] });
  expect(await claim()).toMatchObject({ learning: 10, bonus: 0, wallet: { balance: 120 } });
});

test("YL3. 사용자마다 따로 — 다른 사용자의 같은 유닛 · 보너스는 이 사용자를 막지 않는다", async () => {
  await progress(user, { "u01-water": ["S1"] });
  await claim();
  const b = await db.connect();
  await signIn(b, other);
  await progress(other, { "u01-water": ["S1"] });
  expect(await claim(b)).toMatchObject({ learning: 10, bonus: 100, wallet: { balance: 110 } });
});

test("YL4. 진행 기록이 없어도 보너스는 받는다. 로그인 없으면 거절", async () => {
  expect(await claim()).toMatchObject({ learning: 0, bonus: 100, wallet: { balance: 100 } });
  const anon = await db.connect();
  await anon.query("set role anon");
  await expect(anon.query("select public.companion_claim_coins()")).rejects.toBeTruthy();
});

test("YL5. 무료 티어 — 체험 캐릭터 밖은 잔액이 한 턴 값(10) 미만이면 insufficient_credits, 이상이면 열리고 10을 쓴다", async () => {
  const gate = async () =>
    (
      await server.query(
        "select public.companion_turn_gate($1, 'yoonkyung', gen_random_uuid(), $2, null) as g",
        [user, now],
      )
    ).rows[0].g as { result: string; detail?: unknown };
  expect(await gate()).toEqual({
    result: "insufficient_credits",
    detail: { required: 10, balance: 0 },
  });
  await claim();
  expect((await gate()).result).not.toBe("insufficient_credits");
  const begun = (
    await server.query(
      "select public.companion_begin_turn($1, 'yoonkyung', gen_random_uuid(), '안녕하세요', 'text', 20, null, $2) as t",
      [user, now],
    )
  ).rows[0].t as { result: string; creditsReserved: number };
  expect(begun).toMatchObject({ result: "ok", creditsReserved: 10 });
});

test("YL6. 지급은 원장과 지갑이 맞는다", async () => {
  await progress(user, { "u01-water": ["S1", "S2"] });
  await claim();
  const sums = await db.admin.query(
    `select (select sum(delta)::int from companion.credit_ledger where user_id = $1) as ledger,
            (select grant_balance from companion.credit_wallets where user_id = $1) as wallet`,
    [user],
  );
  expect(sums.rows[0]).toEqual({ ledger: 120, wallet: 120 });
});
