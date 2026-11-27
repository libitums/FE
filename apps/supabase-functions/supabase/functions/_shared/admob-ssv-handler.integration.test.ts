import { afterAll, beforeAll, beforeEach, expect, test } from "vitest";
import { signIn, startTestDatabase } from "../../migrations/postgres.test-support.ts";
import { createAdmobSsvHandler } from "./admob-ssv-handler.ts";
import { createAdmobKeys } from "./admob-ssv.ts";
import { keysJson, signedQuery, testSigner } from "./admob-ssv.test-support.ts";

// AdMob SSV 처리기 + 실제 마이그레이션(ADR-0208) — 서명이 틀린 콜백은 DB에 아무것도 남기지 않고, 맞는 콜백은 한 번만 지급한다.
// 바깥 호출 둘(공개키 목록 · Supabase REST RPC)을 흉내 낸다 — RPC는 service_role 연결로 실제 함수를 부른다.
const user = "00000000-0000-4000-8000-0000000000d1";

let db: Awaited<ReturnType<typeof startTestDatabase>>;
let app: Awaited<ReturnType<typeof db.connect>>;
let server: typeof app;
let signer: Awaited<ReturnType<typeof testSigner>>;
let handler: (request: Request) => Promise<Response>;

beforeAll(async () => {
  db = await startTestDatabase();
  app = await db.connect();
  server = await db.connect();
  await server.query("set role service_role");
  signer = await testSigner();
  const outbound = async (call: { url: string; body: string | null }) => {
    if (call.url.includes("verifier-keys")) {
      return { status: 200, text: async () => keysJson("3335741209", signer.publicKeyBase64) };
    }
    const args = JSON.parse(call.body!) as Record<string, string>;
    const result = await server.query(
      "select public.ad_ticket_grant($1::uuid, $2::uuid, $3, $4) as r",
      [args.p_user_id, args.p_request_id, args.p_transaction_id, args.p_ad_unit],
    );
    return { status: 200, text: async () => JSON.stringify(result.rows[0].r) };
  };
  handler = createAdmobSsvHandler({
    env: {
      supabaseUrl: "https://db.example",
      supabaseServiceRoleKey: "sb_secret_x",
      adUnitIds: ["1234567890"],
    },
    outbound: outbound as never,
    keys: createAdmobKeys({ outbound: outbound as never, nowMs: () => 0 }),
    log: () => {},
  });
}, 90_000);
afterAll(async () => {
  await db?.close();
});
beforeEach(async () => {
  await db.admin.query("truncate auth.users cascade");
  await db.admin.query("update companion.settings set ad_ticket_enabled = true");
  await db.admin.query(
    `insert into auth.users (id, email, raw_app_meta_data, created_at) values ($1, 'd1@libitum.test', '{}', '2026-01-01')`,
    [user],
  );
  await signIn(app, user);
});

const startRequest = async () =>
  ((await app.query("select public.ad_ticket_start(0) as r")).rows[0].r as { requestId: string })
    .requestId;
const statusOf = async (requestId: string) =>
  (await app.query("select public.ad_ticket_status(0, $1::uuid) as r", [requestId])).rows[0].r as {
    used: number;
    request: { status: string };
  };
const call = (query: string) => handler(new Request(`https://fn.example/admob-ssv?${query}`));

test("AS-I1. 서명이 틀린 콜백 — 401, 요청은 pending 그대로 · 거래 기록 없음", async () => {
  const requestId = await startRequest();
  const forged = await signedQuery(
    signer.sign,
    { customData: requestId, userId: user },
    (content) => content.replace("tx-0001", "tx-forged"),
  );
  expect((await call(forged)).status).toBe(401);
  expect(await statusOf(requestId)).toMatchObject({ used: 0, request: { status: "pending" } });
  expect(
    (await db.admin.query("select count(*)::int as n from companion.ad_ticket_transactions"))
      .rows[0].n,
  ).toBe(0);
});

test("AS-I2. 맞는 콜백 — 200 granted, 같은 콜백을 다시 보내면 duplicate(지급 한 번)", async () => {
  const requestId = await startRequest();
  const query = await signedQuery(signer.sign, { customData: requestId, userId: user });
  const first = await call(query);
  expect(first.status).toBe(200);
  expect(await first.json()).toEqual({ outcome: "granted" });
  expect(await (await call(query)).json()).toEqual({ outcome: "duplicate" });
  expect(await statusOf(requestId)).toMatchObject({ used: 1, request: { status: "granted" } });
});
