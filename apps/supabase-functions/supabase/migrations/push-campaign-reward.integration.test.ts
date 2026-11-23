import { afterAll, beforeAll, beforeEach, expect, test } from "vitest";
import { signIn, startTestDatabase } from "./postgres.test-support";

// 푸시 캠페인 보상(20261224, ADR-0175): 콘솔(service_role)이 보상 · 보낸 그룹 수신자를 적고, 알림을 눌러 들어온 수신자가
// 기한 안에 한 번 받는다. 대조군 · 다른 사람은 받지 못한다. 엽전은 grant 버킷, 무제한 티켓은 시간 한정 권한(ticket_passes).
const user = "00000000-0000-4000-8000-0000000000a1";
const control = "00000000-0000-4000-8000-0000000000a2";

let db: Awaited<ReturnType<typeof startTestDatabase>>;
let app: Awaited<ReturnType<typeof db.connect>>;
let server: Awaited<ReturnType<typeof db.connect>>;

type Claim = {
  status: string;
  campaignId: string | null;
  kind: string | null;
  amount: number | null;
  hours: number | null;
  passUntil: string | null;
  wallet: { balance: number; grant: number } | null;
};
const claim = async (campaignId: string | null, client = app) =>
  (await client.query("select public.push_campaign_claim_reward($1) as c", [campaignId])).rows[0]
    .c as Claim;

/** 콘솔이 하는 일 — 보상 한 줄과 수신자(보낸 그룹만)를 넣는다. */
async function addReward(
  campaignId: string,
  reward: { kind: "coins"; amount: number } | { kind: "unlimited_tickets"; hours: number },
  options: { sentAgo?: string; claimHours?: number; recipients?: readonly string[] } = {},
) {
  await server.query(
    `insert into public.push_campaign_rewards (campaign_id, kind, amount, hours, sent_at, claim_until)
     values ($1, $2, $3, $4, now() - $5::interval, now() - $5::interval + make_interval(hours => $6))`,
    [
      campaignId,
      reward.kind,
      reward.kind === "coins" ? reward.amount : null,
      reward.kind === "unlimited_tickets" ? reward.hours : null,
      options.sentAgo ?? "1 minute",
      options.claimHours ?? 48,
    ],
  );
  for (const id of options.recipients ?? [user])
    await server.query(
      "insert into public.push_campaign_reward_recipients (campaign_id, user_id) values ($1, $2)",
      [campaignId, id],
    );
}

beforeAll(async () => {
  db = await startTestDatabase();
  app = await db.connect();
  server = await db.connect();
  // 운영 Supabase의 service_role은 RLS를 건너뜁니다(BYPASSRLS) — 콘솔이 쓰는 그 권한 그대로 시험합니다.
  await db.admin.query("alter role service_role bypassrls");
  await server.query("set role service_role");
}, 90_000);
afterAll(async () => {
  await db?.close();
});
beforeEach(async () => {
  await db.admin.query("truncate auth.users cascade");
  await db.admin.query("truncate public.push_campaign_rewards cascade");
  await db.admin.query("insert into auth.users (id) values ($1), ($2)", [user, control]);
  await signIn(app, user);
});

test("PCR-S1. 수신자는 엽전을 한 번 받는다 — grant 버킷 · 원장 push_campaign · 받은 줄 하나", async () => {
  await addReward("c-coins", { kind: "coins", amount: 100 });
  expect(await claim("c-coins")).toMatchObject({
    status: "granted",
    campaignId: "c-coins",
    kind: "coins",
    amount: 100,
    wallet: { balance: 100, grant: 100 },
  });
  const ledger = await db.admin.query(
    "select delta, bucket, reason, ref_id from companion.credit_ledger where user_id = $1",
    [user],
  );
  expect(ledger.rows).toEqual([
    { delta: 100, bucket: "grant", reason: "push_campaign", ref_id: `${user}:c-coins` },
  ]);
  const claims = await server.query(
    "select campaign_id, user_id, kind, amount from public.push_campaign_reward_claims",
  );
  expect(claims.rows).toEqual([
    { campaign_id: "c-coins", user_id: user, kind: "coins", amount: 100 },
  ]);
});

test("PCR-S2. 다시 부르면 already_claimed — 잔액 · 원장 그대로(멱등)", async () => {
  await addReward("c-coins", { kind: "coins", amount: 100 });
  await claim("c-coins");
  expect(await claim("c-coins")).toMatchObject({
    status: "already_claimed",
    kind: "coins",
    wallet: { balance: 100 },
  });
  const ledger = await db.admin.query(
    "select count(*)::int as n from companion.credit_ledger where user_id = $1",
    [user],
  );
  expect(ledger.rows[0].n).toBe(1);
});

test("PCR-S3. 대조군(수신자 표에 없음)은 not_recipient — 앱이 캠페인 id를 보내도 받지 못한다", async () => {
  await addReward("c-coins", { kind: "coins", amount: 100 });
  await signIn(app, control);
  expect(await claim("c-coins")).toMatchObject({ status: "not_recipient", kind: null });
  const ledger = await db.admin.query("select count(*)::int as n from companion.credit_ledger");
  expect(ledger.rows[0].n).toBe(0);
});

test("PCR-S4. 기한이 지나면 expired, 모르는 id · 틀린 형식은 unknown", async () => {
  await addReward("c-old", { kind: "coins", amount: 100 }, { sentAgo: "49 hours", claimHours: 48 });
  expect(await claim("c-old")).toMatchObject({ status: "expired" });
  expect(await claim("c-missing")).toMatchObject({ status: "unknown" });
  expect(await claim("../x")).toMatchObject({ status: "unknown" });
});

test("PCR-S5. 무제한 티켓 — 지금부터 H시간 권한, 이미 살아 있으면 그 끝에서 이어 붙인다", async () => {
  await addReward("c-t1", { kind: "unlimited_tickets", hours: 24 });
  await addReward("c-t2", { kind: "unlimited_tickets", hours: 12 });
  const first = await claim("c-t1");
  expect(first).toMatchObject({ status: "granted", kind: "unlimited_tickets", hours: 24 });
  const second = await claim("c-t2");
  expect(Date.parse(second.passUntil ?? "") - Date.parse(first.passUntil ?? "")).toBe(
    12 * 3_600_000,
  );
  const passes = await db.admin.query(
    `select source, ref_id, round(extract(epoch from (expires_at - starts_at)) / 3600)::int as hours
     from companion.ticket_passes where user_id = $1 order by expires_at`,
    [user],
  );
  expect(passes.rows).toEqual([
    { source: "push_campaign", ref_id: "c-t1", hours: 24 },
    { source: "push_campaign", ref_id: "c-t2", hours: 12 },
  ]);
  // 이미 받은 티켓은 같은 끝 시각을 돌려줘 다른 기기 · 재설치가 이용권을 되살린다.
  expect(await claim("c-t1")).toMatchObject({
    status: "already_claimed",
    passUntil: first.passUntil,
  });
});

test("PCR-S6. 캠페인 id가 없으면 받을 보상이 있어도 지급 0 — null은 unknown, 인자 없는 호출은 함수가 없다", async () => {
  await addReward("c-coins", { kind: "coins", amount: 30 });
  await addReward("c-tickets", { kind: "unlimited_tickets", hours: 24 });
  for (const id of [null, ""])
    expect(await claim(id)).toMatchObject({ status: "unknown", campaignId: null, wallet: null });
  await expect(app.query("select public.push_campaign_claim_reward()")).rejects.toMatchObject({
    code: "42883",
  });
  for (const table of [
    "public.push_campaign_reward_claims",
    "companion.ticket_passes",
    "companion.credit_ledger",
  ])
    expect((await db.admin.query(`select count(*)::int as n from ${table}`)).rows[0].n).toBe(0);
});

test("PCR-S7. 로그인이 없으면 28000, 앱 역할은 표를 읽거나 쓰지 못한다", async () => {
  const anon = await db.connect();
  await anon.query("set role anon");
  await expect(claim("c-coins", anon)).rejects.toThrow(/./);
  await expect(app.query("select * from public.push_campaign_rewards")).rejects.toThrow(/./);
  await expect(
    app.query("insert into public.push_campaign_reward_recipients values ('c', $1)", [user]),
  ).rejects.toThrow(/./);
  await expect(app.query("select * from companion.ticket_passes")).rejects.toThrow(/./);
  await signIn(app, user);
});

test("PCR-S8. 콘솔 지표 — 캠페인별 받은 수(service_role만)", async () => {
  await addReward("c-coins", { kind: "coins", amount: 100 }, { recipients: [user, control] });
  await claim("c-coins");
  const counts = await server.query(
    "select * from public.push_campaign_reward_claim_counts(array['c-coins', 'c-none'])",
  );
  expect(counts.rows).toEqual([{ campaign_id: "c-coins", claimed: 1 }]);
  await expect(
    app.query("select * from public.push_campaign_reward_claim_counts(array['c-coins'])"),
  ).rejects.toThrow(/./);
});

test("PCR-S9. 보상 표의 범위 — 엽전 1 ~ 1,000, 티켓 1 ~ 168시간, 종류와 칸이 맞아야 한다", async () => {
  await expect(addReward("c-big", { kind: "coins", amount: 1001 })).rejects.toThrow(/./);
  await expect(addReward("c-long", { kind: "unlimited_tickets", hours: 169 })).rejects.toThrow(/./);
  await expect(
    server.query(
      `insert into public.push_campaign_rewards (campaign_id, kind, amount, hours, claim_until)
       values ('c-mix', 'coins', 100, 24, now() + interval '1 hour')`,
    ),
  ).rejects.toThrow(/./);
});
