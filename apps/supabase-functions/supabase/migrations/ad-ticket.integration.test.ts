import { afterAll, beforeAll, beforeEach, expect, test } from "vitest";
import { signIn, startTestDatabase } from "./postgres.test-support";

// 광고 보고 티켓 1장(20270114, ADR-0208). 앱이 「광고 시작」 요청 id를 받고(ad_ticket_start), Google SSV 콜백이 서명 확인 뒤
// ad_ticket_grant(service_role)를 부르고, 앱은 ad_ticket_status로 지급을 확인한다. 티켓 원장은 여전히 앱에 있다(ADR-0075).
const user = "00000000-0000-4000-8000-0000000000e1";
const other = "00000000-0000-4000-8000-0000000000e2";
const unknownRequest = "99999999-9999-4999-8999-999999999999";
const offset = 420; // UTC+7

let db: Awaited<ReturnType<typeof startTestDatabase>>;
let app: Awaited<ReturnType<typeof db.connect>>;
let anon: typeof app;
let server: typeof app;

type Start = {
  result: "ok" | "blocked" | "limit";
  reason?: string;
  requestId?: string;
  left: number;
  cap: number;
};
type Status = {
  enabled: boolean;
  eligible: boolean;
  reason: string | null;
  cap: number;
  used: number;
  left: number;
  request: { id: string; status: "pending" | "granted" | "rejected"; reason: string | null } | null;
};

const start = async (client = app, utcOffset = offset) =>
  (await client.query("select public.ad_ticket_start($1) as r", [utcOffset])).rows[0].r as Start;
const status = async (requestId: string | null = null, client = app) =>
  (await client.query("select public.ad_ticket_status($1, $2::uuid) as r", [offset, requestId]))
    .rows[0].r as Status;
const grant = async (requestId: string, transactionId: string, userId = user) =>
  (
    await server.query("select public.ad_ticket_grant($1::uuid, $2::uuid, $3, $4) as r", [
      userId,
      requestId,
      transactionId,
      "1234567890",
    ])
  ).rows[0].r as { outcome: string };

async function addUser(id: string, createdAt: string, anonymous = false) {
  await db.admin.query(
    `insert into auth.users (id, email, raw_app_meta_data, created_at, is_anonymous)
     values ($1, $2, '{}', $3, $4)`,
    [id, `${id.slice(-2)}@libitum.test`, createdAt, anonymous],
  );
}
const enable = (on: boolean) =>
  db.admin.query("update companion.settings set ad_ticket_enabled = $1", [on]);

beforeAll(async () => {
  db = await startTestDatabase();
  app = await db.connect();
  anon = await db.connect();
  server = await db.connect();
  await anon.query("set role anon");
  await server.query("set role service_role");
}, 90_000);
afterAll(async () => {
  await db?.close();
});
beforeEach(async () => {
  await db.admin.query("truncate auth.users cascade");
  await db.admin.query("delete from companion.ad_ticket_transactions");
  await enable(true);
  await addUser(user, "2026-01-01");
  await addUser(other, "2026-01-01");
  await signIn(app, user);
});

test("AT1. 정상: 시작 → 요청 id, 콜백 → granted, 상태가 지급 · 남은 횟수를 보인다", async () => {
  const started = await start();
  expect(started).toMatchObject({ result: "ok", left: 2, cap: 2 });
  expect(await status(started.requestId!)).toMatchObject({
    enabled: true,
    eligible: true,
    used: 0,
    left: 2,
    request: { id: started.requestId, status: "pending" },
  });
  expect(await grant(started.requestId!, "tx-1")).toEqual({ outcome: "granted" });
  expect(await status(started.requestId!)).toMatchObject({
    used: 1,
    left: 1,
    request: { status: "granted", reason: null },
  });
});

test("AT2. 같은 거래 id는 한 번만 — 다시 오면 duplicate, 같은 요청에 다른 거래는 already_granted", async () => {
  const { requestId } = await start();
  expect((await grant(requestId!, "tx-1")).outcome).toBe("granted");
  expect((await grant(requestId!, "tx-1")).outcome).toBe("duplicate");
  expect((await grant(requestId!, "tx-2")).outcome).toBe("already_granted");
  expect((await status()).used).toBe(1);
});

test("AT3. 하루 2회 상한 — 셋째 시작은 limit, 이미 받은 요청 id로 셋째 지급도 limit", async () => {
  const a = await start();
  const b = await start();
  const c = await start();
  expect((await grant(a.requestId!, "tx-a")).outcome).toBe("granted");
  expect((await grant(b.requestId!, "tx-b")).outcome).toBe("granted");
  expect((await grant(c.requestId!, "tx-c")).outcome).toBe("limit");
  expect(await status(c.requestId!)).toMatchObject({
    left: 0,
    request: { status: "rejected", reason: "limit" },
  });
  expect(await start()).toMatchObject({ result: "limit", left: 0 });
  // 상한은 설정을 따른다.
  await db.admin.query("update companion.settings set ad_ticket_daily_cap = 3");
  expect((await start()).result).toBe("ok");
  await db.admin.query("update companion.settings set ad_ticket_daily_cap = 2");
});

test("AT3b. 하루는 앱이 보낸 UTC 오프셋의 자정에 바뀐다 — 어제 받은 것은 세지 않는다", async () => {
  const a = await start();
  const b = await start();
  await grant(a.requestId!, "tx-a");
  await grant(b.requestId!, "tx-b");
  await db.admin.query(
    "update companion.ad_ticket_requests set grant_day = grant_day - 1 where user_id = $1",
    [user],
  );
  expect(await start()).toMatchObject({ result: "ok", left: 2 });
});

test("AT4. 대상 아님 — 구독자 · 계정 24시간 안 · 익명은 시작도 지급도 거절", async () => {
  const { requestId } = await start();
  await db.admin.query(
    `insert into companion.plan_entitlements (user_id, entitlement, product_id, status, expires_at, source_event_id, last_event_at)
     values ($1, 'unlimited_tickets', 'duru.tickets.monthly.v1', 'active', now() + interval '10 days', 'e1', now())`,
    [user],
  );
  expect(await start()).toMatchObject({ result: "blocked", reason: "subscribed" });
  expect((await grant(requestId!, "tx-s")).outcome).toBe("subscribed");
  expect(await status(requestId!)).toMatchObject({
    eligible: false,
    reason: "subscribed",
    request: { status: "rejected", reason: "subscribed" },
  });

  await db.admin.query(
    "update auth.users set created_at = now() - interval '23 hours' where id = $1",
    [other],
  );
  await signIn(app, other);
  expect(await start()).toMatchObject({ result: "blocked", reason: "new_account" });
  await db.admin.query(
    "update auth.users set created_at = now() - interval '25 hours' where id = $1",
    [other],
  );
  expect((await start()).result).toBe("ok");

  await db.admin.query("update auth.users set is_anonymous = true where id = $1", [other]);
  expect(await start()).toMatchObject({ result: "blocked", reason: "anonymous" });
});

test("AT5. 스위치 off(기본값) — 시작 · 지급 · 상태 모두 off", async () => {
  const { requestId } = await start();
  await enable(false);
  expect(await start()).toMatchObject({ result: "blocked", reason: "off" });
  expect((await grant(requestId!, "tx-off")).outcome).toBe("off");
  expect(await status()).toMatchObject({ enabled: false, eligible: false, reason: "off" });
});

test("AT5b. 새로 만든 설정의 스위치 기본값은 off", async () => {
  const row = await db.admin.query(
    `select column_default from information_schema.columns
     where table_schema = 'companion' and table_name = 'settings' and column_name = 'ad_ticket_enabled'`,
  );
  expect(row.rows[0].column_default).toBe("false");
});

test("AT6. 요청 id가 남의 것 · 없는 것 · 24시간 지난 것이면 지급하지 않는다", async () => {
  const { requestId } = await start();
  expect((await grant(requestId!, "tx-o", other)).outcome).toBe("unknown_request");
  expect((await grant(unknownRequest, "tx-u")).outcome).toBe("unknown_request");
  await db.admin.query(
    "update companion.ad_ticket_requests set created_at = now() - interval '25 hours' where id = $1",
    [requestId],
  );
  expect((await grant(requestId!, "tx-e")).outcome).toBe("expired");
  expect((await status()).used).toBe(0);
});

test("AT7. 상태: 남의 요청 id는 보이지 않는다 · 요청 id 없이도 남은 횟수", async () => {
  await signIn(app, other);
  const theirs = await start();
  await signIn(app, user);
  expect((await status(theirs.requestId!)).request).toBeNull();
  expect(await status()).toMatchObject({
    enabled: true,
    eligible: true,
    cap: 2,
    used: 0,
    left: 2,
    request: null,
  });
});

test("AT8. 권한: 로그인 없이 시작 · 상태 불가, 앱은 지급 RPC · 표를 쓸 수 없다", async () => {
  await expect(start(anon)).rejects.toThrow(/permission denied|not authenticated/);
  await expect(status(null, anon)).rejects.toThrow(/permission denied|not authenticated/);
  await expect(
    app.query("select public.ad_ticket_grant($1::uuid, $2::uuid, 'tx', 'u')", [
      user,
      unknownRequest,
    ]),
  ).rejects.toThrow(/permission denied/);
  await expect(app.query("select * from companion.ad_ticket_requests")).rejects.toThrow(
    /permission denied/,
  );
});

test("AT9. 오프셋이 범위 밖이면 0(UTC)으로 본다 — 거절하지 않는다", async () => {
  expect((await start(app, 100_000)).result).toBe("ok");
});

test("AT10. 오프셋을 바꿔도 48시간 안에는 첫 오프셋의 하루로 센다 — 여러 날치를 앞당기지 못한다", async () => {
  const a = await start(app, 840);
  const b = await start(app, 840);
  await grant(a.requestId!, "tx-a");
  await grant(b.requestId!, "tx-b");
  expect(await start(app, -840)).toMatchObject({ result: "limit", left: 0 });
  const stored = await db.admin.query(
    "select distinct utc_offset_min from companion.ad_ticket_requests where user_id = $1",
    [user],
  );
  expect(stored.rows).toEqual([{ utc_offset_min: 840 }]);
});

test("AT11. 같은 사용자의 다른 거래가 동시에 와도 상한(2)을 넘지 않는다", async () => {
  const ids = [await start(), await start(), await start(), await start()].map((s) => s.requestId!);
  const servers = await Promise.all(ids.map(() => db.connect()));
  await Promise.all(servers.map((client) => client.query("set role service_role")));
  const outcomes = await Promise.all(
    ids.map(
      async (id, i) =>
        (
          await servers[i]!.query(
            "select public.ad_ticket_grant($1::uuid, $2::uuid, $3, 'u') as r",
            [user, id, `tx-c${i}`],
          )
        ).rows[0].r.outcome as string,
    ),
  );
  expect(outcomes.filter((o) => o === "granted")).toHaveLength(2);
  expect(outcomes.filter((o) => o === "limit")).toHaveLength(2);
  expect((await status()).used).toBe(2);
});
