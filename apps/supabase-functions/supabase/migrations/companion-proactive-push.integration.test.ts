import { afterAll, beforeAll, beforeEach, expect, test } from "vitest";
import { startTestDatabase } from "./postgres.test-support";

// 20261225(ADR-0127 서버 쪽): 선톡 푸시 스위치 `settings.proactive_push`(off 기본 · testers · on)와 서버 함수
// `companion_proactive_push_gate` — 스위치 · 시험 계정인가 · 푸시 기기가 있는가. 서버 역할만 부를 수 있다.
const tester = "00000000-0000-4000-8000-000000000001";
const member = "00000000-0000-4000-8000-000000000002";

let db: Awaited<ReturnType<typeof startTestDatabase>>;
let server: Awaited<ReturnType<typeof db.connect>>;

const gate = async (user: string) =>
  (await server.query("select public.companion_proactive_push_gate($1) as g", [user])).rows[0]
    .g as { mode: string; tester: boolean; hasDevice: boolean };

beforeAll(async () => {
  db = await startTestDatabase();
  server = await db.connect();
  await server.query("set role service_role");
}, 90_000);
afterAll(async () => {
  await db?.close();
});
beforeEach(async () => {
  await db.admin.query("truncate auth.users cascade");
  await db.admin.query("update companion.settings set proactive_push = default");
  await db.admin.query(
    `insert into auth.users (id, email, raw_app_meta_data) values
       ($1, 't@libitum.test', '{"duru_tester": true}'), ($2, 'm@libitum.test', '{}')`,
    [tester, member],
  );
});

test("PG1. 스위치는 off가 기본이고 off · testers · on만 받는다", async () => {
  expect(await gate(member)).toEqual({ mode: "off", tester: false, hasDevice: false });
  await db.admin.query("update companion.settings set proactive_push = 'testers'");
  expect(await gate(tester)).toEqual({ mode: "testers", tester: true, hasDevice: false });
  await db.admin.query("update companion.settings set proactive_push = 'on'");
  expect((await gate(member)).mode).toBe("on");
  await expect(
    db.admin.query("update companion.settings set proactive_push = 'everyone'"),
  ).rejects.toMatchObject({ code: "23514" });
});

test("PG2. 푸시 기기가 있으면 hasDevice — 다른 사람의 기기는 세지 않는다", async () => {
  await db.admin.query(
    "insert into public.push_devices (token, user_id, environment) values ($1, $2, 'sandbox')",
    ["ab".repeat(32), tester],
  );
  expect((await gate(tester)).hasDevice).toBe(true);
  expect((await gate(member)).hasDevice).toBe(false);
});

test("PG3. 앱 역할(anon · authenticated)은 부를 수 없다", async () => {
  for (const role of ["anon", "authenticated"]) {
    const app = await db.connect();
    await app.query(`set role ${role}`);
    await expect(
      app.query("select public.companion_proactive_push_gate($1)", [member]),
    ).rejects.toMatchObject({ code: "42501" });
    await app.end();
  }
});
