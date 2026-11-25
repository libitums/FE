import { afterAll, beforeAll, beforeEach, expect, test } from "vitest";
import { signIn, startTestDatabase } from "./postgres.test-support";

// Chat Plus 첫 구독 보너스(20270107, ADR-0196): 웹훅이 Chat Plus 유료 기간의 시작(INITIAL_PURCHASE · RENEWAL, periodType NORMAL · INTRO · PREPAID)을
// 적용할 때 엽전 100을 계정당 평생 한 번 — 체험 · 재구독 · 기간 바꿈 · 재전송으로 다시 받지 않고, 환불돼도 회수하지 않는다. 앱은
// `companion_claim_subscription_bonus()`로 「알리지 않은 보너스」를 한 번 꺼낸다.
const user = "00000000-0000-4000-8000-0000000000c1";
const other = "00000000-0000-4000-8000-0000000000c2";
const DAY = 86_400_000;
const MONTHLY = "duru.chatplus.monthly.v1";
const YEARLY = "duru.chatplus.yearly.v1";

let db: Awaited<ReturnType<typeof startTestDatabase>>;
let app: Awaited<ReturnType<typeof db.connect>>;
let server: typeof app;
let seq = 0;

const iso = (offsetMs: number) => new Date(Date.now() + offsetMs).toISOString();

type Applied = { outcome: string; userId: string | null };
/** 정규화 이벤트(웹훅 함수가 넘기는 모양) 하나를 적용한다. `id`를 주면 같은 이벤트의 재전송이다. */
async function apply(
  type: string,
  action: string,
  extra: Record<string, unknown> = {},
): Promise<Applied> {
  seq += 1;
  const event = {
    id: `cb-evt-${seq}`,
    type,
    action,
    userIds: [user],
    productId: MONTHLY,
    newProductId: null,
    store: "APP_STORE",
    environment: "production",
    transactionId: `cb-tx-${seq}`,
    purchasedAt: iso(-60_000),
    expiresAt: iso(30 * DAY),
    graceExpiresAt: null,
    eventAt: iso(-60_000 + seq),
    transferredFrom: [],
    transferredTo: [],
    periodType: "NORMAL",
    ...extra,
  };
  return (await server.query("select public.companion_apply_store_event($1::jsonb) as r", [event]))
    .rows[0].r as Applied;
}
const bonusRows = async (id = user) =>
  (
    await db.admin.query(
      "select delta, bucket, kind, ref_id from companion.credit_ledger where user_id = $1 and reason = 'chat_plus_first_bonus'",
      [id],
    )
  ).rows;
const balance = async (id = user) =>
  (
    await db.admin.query(
      "select coalesce((select sub_balance + grant_balance + paid_balance from companion.credit_wallets where user_id = $1), 0) as b",
      [id],
    )
  ).rows[0].b as number;
type Claim = { amount: number; reason: string; wallet: { balance: number } };
const claim = async (client = app) =>
  (await client.query("select public.companion_claim_subscription_bonus() as c")).rows[0]
    .c as Claim;

beforeAll(async () => {
  db = await startTestDatabase();
  app = await db.connect();
  server = await db.connect();
  await server.query("set role service_role");
}, 90_000);
afterAll(async () => {
  await db?.close();
});
beforeEach(async () => {
  await db.admin.query("truncate auth.users cascade");
  await db.admin.query("truncate companion.store_events");
  await db.admin.query("update companion.settings set chat_plus_first_bonus = 100");
  await db.admin.query(
    `insert into auth.users (id, email, raw_app_meta_data) values ($1, 'c1@libitum.test', '{}'), ($2, 'c2@libitum.test', '{}')`,
    [user, other],
  );
  await signIn(app, user);
});

test("CB-S1 Chat Plus 유료 첫 구매 — grant 버킷에 100 한 행(ref = 사용자 id) · 매달 엽전 300과 따로", async () => {
  expect((await apply("INITIAL_PURCHASE", "activate")).outcome).toBe("activated");
  expect(await bonusRows()).toEqual([{ delta: 100, bucket: "grant", kind: "grant", ref_id: user }]);
  expect(await balance()).toBe(400);
});

test("CB-S2 같은 이벤트를 두 번 받아도 한 번", async () => {
  await apply("INITIAL_PURCHASE", "activate", { id: "cb-same" });
  expect((await apply("INITIAL_PURCHASE", "activate", { id: "cb-same" })).outcome).toBe(
    "duplicate",
  );
  expect(await bonusRows()).toHaveLength(1);
});

test("CB-S3 체험 시작은 주지 않고, 유료로 넘어가는 RENEWAL에서 준다", async () => {
  await apply("INITIAL_PURCHASE", "activate", { periodType: "TRIAL", expiresAt: iso(3 * DAY) });
  expect(await bonusRows()).toEqual([]);
  await apply("RENEWAL", "activate", { periodType: "NORMAL" });
  expect(await bonusRows()).toHaveLength(1);
});

test("CB-S4 해지 뒤 재구독 · 월 → 연 바꿈 · 다음 갱신은 다시 주지 않는다", async () => {
  await apply("INITIAL_PURCHASE", "activate");
  await apply("EXPIRATION", "expire");
  await apply("INITIAL_PURCHASE", "activate");
  await apply("PRODUCT_CHANGE", "product_change", { newProductId: YEARLY });
  await apply("RENEWAL", "activate", { productId: YEARLY });
  await apply("RENEWAL", "activate", { productId: YEARLY });
  expect(await bonusRows()).toHaveLength(1);
});

test("CB-S5 Premium · Unlimited Tickets · 엽전 팩은 받지 않는다", async () => {
  await apply("INITIAL_PURCHASE", "activate", { productId: "duru.premium.monthly.v1" });
  await apply("INITIAL_PURCHASE", "activate", { productId: "duru.tickets.monthly.v1" });
  await apply("NON_RENEWING_PURCHASE", "coins", { productId: "duru.coins.500.v1" });
  expect(await bonusRows()).toEqual([]);
});

test("CB-S6 체험 · 프로모션 · 기간 연장 · 임시 권한 · periodType 없음(옛 함수)은 주지 않는다", async () => {
  await apply("INITIAL_PURCHASE", "activate", { periodType: "PROMOTIONAL" });
  await apply("SUBSCRIPTION_EXTENDED", "activate", { periodType: "NORMAL" });
  await apply("TEMPORARY_ENTITLEMENT_GRANT", "activate", { periodType: "NORMAL" });
  await apply("RENEWAL", "activate", { periodType: null });
  await apply("UNCANCELLATION", "uncancel");
  expect(await bonusRows()).toEqual([]);
  await apply("RENEWAL", "activate", { periodType: "INTRO" });
  expect(await bonusRows()).toHaveLength(1);
});

test("CB-S7 설정 0이면 끔 — 지급도 알림도 없다", async () => {
  await db.admin.query("update companion.settings set chat_plus_first_bonus = 0");
  await apply("INITIAL_PURCHASE", "activate");
  expect(await bonusRows()).toEqual([]);
  expect(await claim()).toMatchObject({ amount: 0, reason: "none" });
});

test("CB-S8 환불돼도 회수하지 않는다 — 지급 행 그대로, revoke 없음", async () => {
  await apply("INITIAL_PURCHASE", "activate");
  expect((await apply("CANCELLATION", "refund")).outcome).toBe("revoked");
  expect(await bonusRows()).toHaveLength(1);
  const revokes = await db.admin.query(
    "select count(*)::int as n from companion.credit_ledger where user_id = $1 and kind = 'revoke'",
    [user],
  );
  expect(revokes.rows[0].n).toBe(0);
  expect(await balance()).toBe(400);
});

test("CB-S9 늦게 온 유료 RENEWAL(stale)도 지급은 한다 — 권한 줄은 그대로", async () => {
  await apply("INITIAL_PURCHASE", "activate", { periodType: "TRIAL", expiresAt: iso(3 * DAY) });
  await apply("CANCELLATION", "cancel", { eventAt: iso(0) });
  const late = await apply("RENEWAL", "activate", { eventAt: iso(-3_600_000) });
  expect(late.outcome).toBe("stale");
  expect(await bonusRows()).toHaveLength(1);
  const row = await db.admin.query(
    "select status from companion.plan_entitlements where user_id = $1",
    [user],
  );
  expect(row.rows[0].status).toBe("cancelled");
});

test("CB-S10 claim — 알리지 않은 보너스를 한 번 꺼내고 announced, 다음은 already_announced · 다른 사용자는 none · 로그인 필수", async () => {
  expect(await claim()).toMatchObject({ amount: 0, reason: "none" });
  await apply("INITIAL_PURCHASE", "activate");
  expect(await claim()).toMatchObject({
    amount: 100,
    reason: "announced",
    wallet: { balance: 400 },
  });
  expect(await claim()).toMatchObject({ amount: 0, reason: "already_announced" });
  const otherClient = await db.connect();
  await signIn(otherClient, other);
  expect(await claim(otherClient)).toMatchObject({ amount: 0, reason: "none" });
  const anon = await db.connect();
  await anon.query("set role authenticated");
  await expect(claim(anon)).rejects.toThrow(/not authenticated/);
  const notices = await db.admin.query(
    "select amount, announced_at is not null as announced from companion.subscription_bonus_notices",
  );
  expect(notices.rows).toEqual([{ amount: 100, announced: true }]);
});
