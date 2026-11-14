import { afterAll, beforeAll, beforeEach, expect, test } from "vitest";
import { signIn, startTestDatabase } from "./postgres.test-support";

// 구독 · 엽전 팩 1단계(20261129, ADR-0144): 혜택 표 · 상품 표 · 권한 · RevenueCat 이벤트 적용 · 관문/차감이 표를 읽음 · 매달 엽전.
const user = "00000000-0000-4000-8000-0000000000b1";
const other = "00000000-0000-4000-8000-0000000000b2";
const DAY = 86_400_000;

let db: Awaited<ReturnType<typeof startTestDatabase>>;
let app: Awaited<ReturnType<typeof db.connect>>;
let server: typeof app;
let seq = 0;

const iso = (offsetMs: number) => new Date(Date.now() + offsetMs).toISOString();

type Applied = { outcome: string; userId: string | null };
/** 정규화 이벤트(웹훅 함수가 넘기는 모양) 하나를 적용한다. */
async function apply(action: string, extra: Record<string, unknown> = {}): Promise<Applied> {
  seq += 1;
  const event = {
    id: `evt-${seq}`,
    type: action.toUpperCase(),
    action,
    userIds: [user],
    productId: "duru.premium.monthly.v1",
    newProductId: null,
    store: "APP_STORE",
    environment: "production",
    transactionId: `tx-${seq}`,
    purchasedAt: iso(-60_000),
    expiresAt: iso(30 * DAY),
    graceExpiresAt: null,
    eventAt: iso(-60_000 + seq),
    transferredFrom: [],
    transferredTo: [],
    ...extra,
  };
  return (await server.query("select public.companion_apply_store_event($1::jsonb) as r", [event]))
    .rows[0].r as Applied;
}
const tier = async (id = user) =>
  (await db.admin.query("select companion.tier_of($1, now()) as t", [id])).rows[0].t as string;
const tickets = async (id = user) =>
  (await db.admin.query("select companion.has_unlimited_tickets($1, now()) as t", [id])).rows[0]
    .t as boolean;
const wallet = async (id = user) =>
  (
    await db.admin.query(
      `select coalesce((select sub_balance + grant_balance + paid_balance from companion.credit_wallets where user_id = $1), 0) as b,
              coalesce((select sum(delta)::int from companion.credit_ledger where user_id = $1), 0) as l`,
      [id],
    )
  ).rows[0] as { b: number; l: number };
const gate = async (character = "yoonkyung") => {
  // 앞 턴의 답이 끝났다고 친다(진행 중인 턴이 있으면 관문이 turn_in_progress).
  await db.admin.query("update companion.messages set status = 'complete' where user_id = $1", [
    user,
  ]);
  return (
    await server.query(
      "select public.companion_turn_gate($1, $2, gen_random_uuid(), now(), null) as g",
      [user, character],
    )
  ).rows[0].g as { result: string; tier?: string; detail?: Record<string, unknown> };
};
const begin = async (character = "yoonkyung") =>
  (
    await server.query(
      "select public.companion_begin_turn($1, $2, gen_random_uuid(), '안녕하세요', 'text', 20, null, now()) as t",
      [user, character],
    )
  ).rows[0].t as { result: string; creditsReserved?: number };
/** 오늘(UTC) 이미 n턴 했다고 친다 — 확정 예약 n개. */
async function turnsToday(n: number, planFree: boolean) {
  await db.admin.query(
    `insert into companion.credit_holds (user_id, client_message_id, character_id, amount, status, plan_free, created_at)
     select $1, gen_random_uuid(), 'yoonkyung', 0, 'settled', $3, now() from generate_series(1, $2)`,
    [user, n, planFree],
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
  await db.admin.query("truncate companion.store_events");
  await db.admin.query(
    "update companion.settings set message_cost = 3, testers_only = false, minor_daily_limit_seconds = null",
  );
  await db.admin.query(
    "update companion.plans set daily_free_messages = 30 where id = 'chat_plus'",
  );
  await db.admin.query(
    `insert into auth.users (id, email, raw_app_meta_data) values ($1, 'a@libitum.test', '{}'), ($2, 'b@libitum.test', '{}')`,
    [user, other],
  );
  await signIn(app, user);
});

test("SB-S1 1판 혜택 · 상품 표, companion_plans()는 가격 없이 혜택 · 상품 id — 로그인 없이도 읽는다", async () => {
  const anon = await db.connect();
  await anon.query("set role anon");
  const plans = (await anon.query("select public.companion_plans() as p")).rows[0].p;
  expect(plans).toEqual({
    version: 1,
    free: { dailyFreeMessages: 3 },
    plans: [
      {
        id: "unlimited_tickets",
        sortOrder: 1,
        chatRank: null,
        dailyFreeMessages: null,
        dailyMessageCap: null,
        monthlyCoins: 0,
        unlimitedTickets: true,
        allCharacters: false,
        highlight: false,
        products: { monthly: "duru.tickets.monthly.v1", yearly: "duru.tickets.yearly.v1" },
      },
      {
        id: "chat_plus",
        sortOrder: 2,
        chatRank: 1,
        dailyFreeMessages: 30,
        dailyMessageCap: null,
        monthlyCoins: 300,
        unlimitedTickets: false,
        allCharacters: true,
        highlight: false,
        products: { monthly: "duru.chatplus.monthly.v1", yearly: "duru.chatplus.yearly.v1" },
      },
      {
        id: "premium",
        sortOrder: 3,
        chatRank: 2,
        dailyFreeMessages: null,
        dailyMessageCap: 200,
        monthlyCoins: 800,
        unlimitedTickets: true,
        allCharacters: true,
        highlight: true,
        products: { monthly: "duru.premium.monthly.v1", yearly: "duru.premium.yearly.v1" },
      },
    ],
    coinPacks: [
      { productId: "duru.coins.500.v1", coins: 500, bonusCoins: 0 },
      { productId: "duru.coins.1200.v1", coins: 1000, bonusCoins: 200 },
      { productId: "duru.coins.3000.v1", coins: 2000, bonusCoins: 1000 },
    ],
  });
});

test("SB-S2 Premium 구매 → 등급 premium · 티켓 무제한 · 800 지급, 같은 이벤트 두 번은 duplicate", async () => {
  expect(await tier()).toBe("free");
  const first = await apply("activate");
  expect(first).toEqual({ outcome: "activated", userId: user });
  expect(await tier()).toBe("premium");
  expect(await tickets()).toBe(true);
  expect(await wallet()).toEqual({ b: 800, l: 800 });
  // 같은 이벤트(같은 id)를 RevenueCat이 다시 보낸 경우.
  const payload = (await db.admin.query("select payload from companion.store_events limit 1"))
    .rows[0].payload;
  const again = (
    await server.query("select public.companion_apply_store_event($1::jsonb) as r", [payload])
  ).rows[0].r as Applied;
  expect(again.outcome).toBe("duplicate");
  expect(await wallet()).toEqual({ b: 800, l: 800 });
});

test("SB-S3 Chat Plus — 모든 인물, 하루 30턴 차감 0, 31번째는 엽전 3, 잔액이 없으면 관문이 막는다", async () => {
  await apply("activate", { productId: "duru.chatplus.monthly.v1" });
  expect(await tier()).toBe("chat_plus");
  expect(await tickets()).toBe(false);
  expect(await wallet()).toMatchObject({ b: 300 });
  expect(await gate()).toMatchObject({ result: "ok", tier: "chat_plus" });
  expect(await begin()).toMatchObject({ result: "ok", creditsReserved: 0 });
  await turnsToday(29, true);
  expect(await begin()).toMatchObject({ result: "ok", creditsReserved: 3 });
  await db.admin.query("update companion.credit_wallets set grant_balance = 0 where user_id = $1", [
    user,
  ]);
  expect(await gate()).toEqual({
    result: "insufficient_credits",
    detail: { required: 3, balance: 0 },
  });
});

test("SB-S4 Premium — 차감 0, 공정 사용 200턴에 usage_time_limit fair_use", async () => {
  await apply("activate");
  expect(await begin()).toMatchObject({ result: "ok", creditsReserved: 0 });
  await turnsToday(198, true);
  expect((await gate()).result).toBe("ok");
  await turnsToday(1, true);
  const capped = await gate();
  expect(capped.result).toBe("usage_time_limit");
  expect(capped.detail).toMatchObject({ limit: "fair_use" });
});

test("SB-S5 무료 사용자는 지금 그대로 — 체험 밖 잔액 0이면 insufficient_credits, 있으면 3 차감", async () => {
  expect(await gate()).toEqual({
    result: "insufficient_credits",
    detail: { required: 3, balance: 0 },
  });
  await db.admin.query("select companion.grant_once($1, 10, 'operator_test', 'x')", [user]);
  expect(await gate()).toMatchObject({ result: "ok", tier: "free" });
  expect(await begin()).toMatchObject({ result: "ok", creditsReserved: 3 });
});

test("SB-S6 취소는 만료까지 유지, 되돌리면 active, 만료되면 free, 결제 문제는 유예 동안 유지", async () => {
  await apply("activate");
  expect((await apply("cancel")).outcome).toBe("cancelled");
  expect(await tier()).toBe("premium");
  expect((await apply("uncancel")).outcome).toBe("uncancelled");
  const row = async () =>
    (
      await db.admin.query(
        "select status, will_renew from companion.plan_entitlements where user_id = $1",
        [user],
      )
    ).rows[0];
  expect(await row()).toEqual({ status: "active", will_renew: true });
  expect(
    (await apply("billing_issue", { graceExpiresAt: iso(3 * DAY), expiresAt: iso(-DAY) })).outcome,
  ).toBe("billing_issue");
  expect(await tier()).toBe("premium");
  expect((await apply("expire", { expiresAt: iso(-1000) })).outcome).toBe("expired");
  expect(await tier()).toBe("free");
  expect(await tickets()).toBe(false);
});

test("SB-S7 매달 엽전 — 연간은 기간 시작부터 달마다 한 번, 다시 불러도 0, 월간 갱신은 새 기간마다 한 번", async () => {
  await apply("activate", {
    productId: "duru.chatplus.yearly.v1",
    purchasedAt: new Date(Date.now() - 95 * DAY).toISOString(),
    expiresAt: iso(270 * DAY),
  });
  // 95일 전 시작 → 0 · 1 · 2 · 3번째 달(구매 때 이미 넷 다 지급됨).
  expect(await wallet()).toMatchObject({ b: 1200 });
  const due = async () =>
    (await server.query("select public.companion_grant_due_plan_coins(now()) as n")).rows[0]
      .n as number;
  expect(await due()).toBe(0);
  const start = iso(-60_000);
  await apply("activate", { productId: "duru.premium.monthly.v1", purchasedAt: start });
  expect(await wallet()).toMatchObject({ b: 2000 });
  await apply("activate", { productId: "duru.premium.monthly.v1", purchasedAt: start }); // 같은 기간의 다른 이벤트
  expect(await wallet()).toMatchObject({ b: 2000 });
  await apply("activate", { productId: "duru.premium.monthly.v1", purchasedAt: iso(0) }); // 갱신 = 새 기간
  expect(await wallet()).toMatchObject({ b: 2800 });
});

test("SB-S8 엽전 팩 — 같은 거래는 한 번, 환불은 잔액이 되면 회수 · 아니면 기록만, 원장 = 지갑", async () => {
  expect(
    (
      await apply("coins", {
        productId: "duru.coins.1200.v1",
        transactionId: "pack-1",
        expiresAt: null,
      })
    ).outcome,
  ).toBe("coins_granted");
  expect(
    (
      await apply("coins", {
        productId: "duru.coins.1200.v1",
        transactionId: "pack-1",
        expiresAt: null,
      })
    ).outcome,
  ).toBe("coins_duplicate");
  expect(await wallet()).toEqual({ b: 1200, l: 1200 });
  expect(
    (await apply("refund", { productId: "duru.coins.1200.v1", transactionId: "pack-1" })).outcome,
  ).toBe("coins_revoked");
  expect(await wallet()).toEqual({ b: 0, l: 0 });
  await apply("coins", {
    productId: "duru.coins.500.v1",
    transactionId: "pack-2",
    expiresAt: null,
  });
  await db.admin.query(
    "update companion.credit_wallets set paid_balance = 100 where user_id = $1",
    [user],
  );
  await db.admin.query(
    "insert into companion.credit_ledger (user_id, delta, bucket, kind) values ($1, -400, 'paid', 'reserve')",
    [user],
  );
  expect(
    (await apply("refund", { productId: "duru.coins.500.v1", transactionId: "pack-2" })).outcome,
  ).toBe("refund_unrecovered");
  expect(await wallet()).toEqual({ b: 100, l: 100 });
});

test("SB-S9 구독 환불은 바로 끊는다", async () => {
  await apply("activate");
  expect((await apply("refund")).outcome).toBe("revoked");
  expect(await tier()).toBe("free");
});

test("SB-S10 모르는 사용자 · 모르는 상품 · 늦게 온 이른 이벤트 · 이전(TRANSFER)", async () => {
  expect((await apply("activate", { userIds: ["$RCAnonymousID:x", "not-a-uuid"] })).outcome).toBe(
    "unknown_user",
  );
  expect((await apply("activate", { productId: "duru.unknown.v9" })).outcome).toBe(
    "unknown_product",
  );
  expect((await apply("activate", { productId: "duru.premium.monthly.v1:base" })).outcome).toBe(
    "activated",
  );
  expect((await apply("cancel", { eventAt: iso(-10 * DAY) })).outcome).toBe("stale");
  expect(await tier()).toBe("premium");
  expect(
    (
      await apply("transfer", {
        userIds: [],
        productId: null,
        transferredFrom: [user],
        transferredTo: [other],
      })
    ).outcome,
  ).toBe("transferred");
  expect(await tier()).toBe("free");
  expect(await tier(other)).toBe("premium");
});

test("SB-S11 companion_entitlements() — 로그인 필요, 활성 권한만", async () => {
  await apply("activate", { productId: "duru.tickets.monthly.v1" });
  await apply("activate", { productId: "duru.chatplus.monthly.v1" });
  const mine = (await app.query("select public.companion_entitlements() as e")).rows[0].e;
  expect(mine).toMatchObject({ tier: "chat_plus", unlimitedTickets: true });
  expect(mine.entitlements.map((e: { id: string }) => e.id).sort()).toEqual([
    "chat_plus",
    "unlimited_tickets",
  ]);
  expect(mine.entitlements[0]).toEqual(
    expect.objectContaining({ productId: expect.any(String), status: "active", willRenew: true }),
  );
  const anon = await db.connect();
  await anon.query("set role anon");
  await expect(anon.query("select public.companion_entitlements()")).rejects.toBeTruthy();
});

test("SB-S12 혜택 표를 고치면 바로 따른다 — Chat Plus 무료 30 → 5(앱 업데이트 없이)", async () => {
  await apply("activate", { productId: "duru.chatplus.monthly.v1" });
  await db.admin.query("update companion.plans set daily_free_messages = 5 where id = 'chat_plus'");
  await turnsToday(5, true);
  expect(await begin()).toMatchObject({ result: "ok", creditsReserved: 3 });
});
