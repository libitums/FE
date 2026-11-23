import { afterAll, beforeAll, beforeEach, expect, test } from "vitest";
import { signIn, startTestDatabase } from "./postgres.test-support";

// 학습 티켓을 엽전으로 사기(20261231, 사용자 결정 2026-11-23): 「Get more tickets」 한 번 = 티켓 1장 = 엽전 20.
// 서버는 엽전만 뺀다 — 티켓 원장은 앱(기기)에 있다(learning-tickets). 같은 요청 id는 한 번만 뺀다(다시 보내기 안전).
const user = "00000000-0000-4000-8000-0000000000f1";
const requestA = "11111111-1111-4111-8111-111111111111";
const requestB = "22222222-2222-4222-8222-222222222222";

let db: Awaited<ReturnType<typeof startTestDatabase>>;
let app: Awaited<ReturnType<typeof db.connect>>;
let anon: typeof app;

type Purchase = {
  result: "bought" | "already" | "short";
  price: number;
  shortBy?: number;
  wallet: { balance: number; grant: number; paid: number };
};

const buy = async (requestId: string, client = app) =>
  (await client.query("select public.companion_buy_ticket($1::uuid) as r", [requestId])).rows[0]
    .r as Purchase;

async function fund(grant: number, paid = 0) {
  await db.admin.query(
    `insert into companion.credit_wallets (user_id, grant_balance, paid_balance) values ($1, $2, $3)
     on conflict (user_id) do update set grant_balance = excluded.grant_balance, paid_balance = excluded.paid_balance`,
    [user, grant, paid],
  );
}

const spendRows = async () =>
  (
    await db.admin.query(
      `select delta, bucket, kind, reason, ref_id from companion.credit_ledger
       where user_id = $1 and reason = 'ticket'
       order by created_at, array_position(array['sub', 'grant', 'paid'], bucket)`,
      [user],
    )
  ).rows as { delta: number; bucket: string; kind: string; reason: string; ref_id: string }[];

beforeAll(async () => {
  db = await startTestDatabase();
  app = await db.connect();
  anon = await db.connect();
  await anon.query("set role anon");
}, 90_000);
afterAll(async () => {
  await db?.close();
});
beforeEach(async () => {
  await db.admin.query("truncate auth.users cascade");
  await db.admin.query(
    `insert into auth.users (id, email, raw_app_meta_data, created_at) values ($1, 'a@libitum.test', '{}', '2026-01-01')`,
    [user],
  );
  await signIn(app, user);
});

test("TP1. 엽전이 20 이상이면 20을 빼고 bought · 남은 잔액을 돌려준다 — 지급분부터, 원장에 spend/ticket", async () => {
  await fund(15, 30);
  const result = await buy(requestA);
  expect(result).toMatchObject({ result: "bought", price: 20, wallet: { balance: 25 } });
  expect(await spendRows()).toEqual([
    { delta: -15, bucket: "grant", kind: "spend", reason: "ticket", ref_id: requestA },
    { delta: -5, bucket: "paid", kind: "spend", reason: "ticket", ref_id: requestA },
  ]);
});

test("TP2. 모자라면 빼지 않고 short · 모자란 수", async () => {
  await fund(12);
  const result = await buy(requestA);
  expect(result).toMatchObject({ result: "short", price: 20, shortBy: 8, wallet: { balance: 12 } });
  expect(await spendRows()).toEqual([]);
});

test("TP3. 같은 요청 id를 다시 보내면 다시 빼지 않고 already — 다른 id는 또 산다", async () => {
  await fund(100);
  expect((await buy(requestA)).result).toBe("bought");
  const again = await buy(requestA);
  expect(again).toMatchObject({ result: "already", wallet: { balance: 80 } });
  expect((await buy(requestB)).wallet.balance).toBe(60);
  expect((await spendRows()).map((row) => row.delta)).toEqual([-20, -20]);
});

test("TP4. 값은 설정(companion.settings.ticket_price)을 따른다", async () => {
  await db.admin.query("update companion.settings set ticket_price = 7");
  await fund(10);
  expect(await buy(requestA)).toMatchObject({ result: "bought", price: 7, wallet: { balance: 3 } });
  await db.admin.query("update companion.settings set ticket_price = 20");
});

test("TP5. 지갑이 없는 계정은 0으로 보고 short", async () => {
  expect(await buy(requestA)).toMatchObject({
    result: "short",
    shortBy: 20,
    wallet: { balance: 0 },
  });
});

test("TP6. 로그인하지 않은 호출은 쓸 수 없다", async () => {
  await expect(buy(requestA, anon)).rejects.toThrow(/permission denied|not authenticated/);
});
