import { afterAll, beforeAll, beforeEach, expect, test } from "vitest";
import { signIn, startTestDatabase } from "./postgres.test-support";

// 엽전 먼저 만나기(20261213, ADR-0162 D5): 제안 목록 · 한 번만 차감(구독분 → 지급분 → 구매분, 원장 'spend') · 이미 연 인물은 다시
// 빼지 않음 · 모자라면 모자란 양 · 제안 없는 인물은 no_offer · anon은 부를 수 없음.
// 구독자(20261223): 「모든 인물」 요금제(Chat Plus · Premium)가 살아 있으면 엽전을 빼지 않고 연다.
const user = "00000000-0000-4000-8000-0000000000f1";

let db: Awaited<ReturnType<typeof startTestDatabase>>;
let app: Awaited<ReturnType<typeof db.connect>>;

type Unlock = {
  result: "unlocked" | "already" | "short" | "no_offer";
  shortBy?: number;
  wallet?: { balance: number; sub: number; grant: number; paid: number };
};
const unlock = async (characterId: string) =>
  (await app.query("select public.companion_unlock_early($1) as r", [characterId])).rows[0]
    .r as Unlock;

async function wallet(sub: number, grant: number, paid: number) {
  await db.admin.query(
    `insert into companion.credit_wallets (user_id, sub_balance, grant_balance, paid_balance) values ($1, $2, $3, $4)
     on conflict (user_id) do update set sub_balance = $2, grant_balance = $3, paid_balance = $4`,
    [user, sub, grant, paid],
  );
}
const spends = async () =>
  (
    await db.admin.query(
      `select bucket, delta, reason, ref_id from companion.credit_ledger
       where user_id = $1 and kind = 'spend' order by created_at`,
      [user],
    )
  ).rows as { bucket: string; delta: number; reason: string; ref_id: string }[];

beforeAll(async () => {
  db = await startTestDatabase();
  app = await db.connect();
}, 90_000);
afterAll(async () => {
  await db?.close();
});
beforeEach(async () => {
  await db.admin.query("truncate auth.users cascade");
  await db.admin.query(
    `insert into auth.users (id, email, raw_app_meta_data) values ($1, 'ea@libitum.test', '{}')`,
    [user],
  );
  await signIn(app, user);
});

test("EA1. 제안 목록은 이야기 인물 넷 · 100 · 마감 없음", async () => {
  const offers = (await app.query("select public.companion_early_access_offers() as o")).rows[0]
    .o as { characterId: string; price: number; endsAt: string | null }[];
  expect(offers.map((o) => o.characterId).sort()).toEqual(["doyun", "jaemin", "mina", "yoonkyung"]);
  expect(offers.every((o) => o.price === 100 && o.endsAt === null)).toBe(true);
});

test("EA2. 열기: 구독분 → 지급분 → 구매분 순서로 100을 빼고 버킷마다 spend 줄을 남긴다", async () => {
  await wallet(30, 50, 40);
  expect(await unlock("jaemin")).toMatchObject({
    result: "unlocked",
    wallet: { balance: 20, sub: 0, grant: 0, paid: 20 },
  });
  expect(await spends()).toEqual([
    { bucket: "sub", delta: -30, reason: "early_access", ref_id: `${user}:jaemin` },
    { bucket: "grant", delta: -50, reason: "early_access", ref_id: `${user}:jaemin` },
    { bucket: "paid", delta: -20, reason: "early_access", ref_id: `${user}:jaemin` },
  ]);
});

test("EA3. 이미 연 인물은 already — 두 번 빼지 않는다", async () => {
  await wallet(0, 300, 0);
  await unlock("mina");
  expect(await unlock("mina")).toMatchObject({ result: "already", wallet: { balance: 200 } });
  expect(await spends()).toHaveLength(1);
});

test("EA4. 모자라면 short + 모자란 양, 아무것도 빼지 않는다", async () => {
  await wallet(0, 60, 0);
  expect(await unlock("doyun")).toMatchObject({
    result: "short",
    shortBy: 40,
    wallet: { balance: 60 },
  });
  expect(await spends()).toEqual([]);
  // 지갑 행이 아직 없는 사람도 0으로 본다.
  await db.admin.query("delete from companion.credit_wallets where user_id = $1", [user]);
  expect(await unlock("doyun")).toMatchObject({ result: "short", shortBy: 100 });
});

test("EA5. 제안이 없는 인물(덕수쌤 · 끈 제안)은 no_offer", async () => {
  await wallet(0, 300, 0);
  expect(await unlock("duksu")).toEqual({ result: "no_offer" });
  await db.admin.query(
    "update companion.early_access_offers set active = false where character_id = 'yoonkyung'",
  );
  expect(await unlock("yoonkyung")).toEqual({ result: "no_offer" });
  await db.admin.query(
    "update companion.early_access_offers set active = true where character_id = 'yoonkyung'",
  );
  expect(await spends()).toEqual([]);
});

test("EA6. anon은 두 RPC를 부를 수 없고, 표는 직접 읽을 수 없다", async () => {
  const anon = await db.connect();
  await anon.query("set role anon");
  await expect(anon.query("select public.companion_unlock_early('mina')")).rejects.toMatchObject({
    code: "42501",
  });
  await expect(anon.query("select public.companion_early_access_offers()")).rejects.toMatchObject({
    code: "42501",
  });
  await expect(app.query("select * from companion.early_access_unlocks")).rejects.toMatchObject({
    code: "42501",
  });
  await anon.end();
});

async function subscribe(
  entitlement: string,
  status = "active",
  expires = "now() + interval '20 days'",
) {
  await db.admin.query(
    `insert into companion.plan_entitlements
       (user_id, entitlement, product_id, status, expires_at, source_event_id, last_event_at)
     values ($1, $2, 'duru.' || $2 || '.monthly.v1', $3, ${expires}, 'evt-' || $2, now())
     on conflict (user_id, entitlement) do update set status = $3, expires_at = ${expires}`,
    [user, entitlement, status],
  );
}
const unlockRows = async () =>
  (
    await db.admin.query(
      "select character_id, price from companion.early_access_unlocks where user_id = $1 order by character_id",
      [user],
    )
  ).rows as { character_id: string; price: number }[];

test("EA7. 구독자(Chat Plus · Premium)는 엽전을 빼지 않고 연다 — 잔액이 0이어도, 기록은 값 0", async () => {
  await subscribe("chat_plus");
  expect(await unlock("mina")).toMatchObject({ result: "unlocked", wallet: { balance: 0 } });
  await wallet(0, 300, 0);
  expect(await unlock("jaemin")).toMatchObject({ result: "unlocked", wallet: { balance: 300 } });
  expect(await unlock("jaemin")).toMatchObject({ result: "already", wallet: { balance: 300 } });
  expect(await spends()).toEqual([]);
  expect(await unlockRows()).toEqual([
    { character_id: "jaemin", price: 0 },
    { character_id: "mina", price: 0 },
  ]);
  // 제안이 없는 인물은 구독자도 no_offer(앱이 이 길로 부르지 않는 인물).
  expect(await unlock("duksu")).toEqual({ result: "no_offer" });
});

test("EA8. 학습 전용(티켓 무제한) · 끝난 구독은 지금처럼 엽전을 낸다", async () => {
  await wallet(0, 150, 0);
  await subscribe("unlimited_tickets");
  expect(await unlock("mina")).toMatchObject({ result: "unlocked", wallet: { balance: 50 } });
  await subscribe("premium", "expired", "now() - interval '1 day'");
  expect(await unlock("doyun")).toMatchObject({ result: "short", shortBy: 50 });
  await subscribe("premium", "cancelled", "now() + interval '3 days'");
  expect(await unlock("doyun")).toMatchObject({ result: "unlocked", wallet: { balance: 50 } });
});
