import { afterAll, beforeAll, beforeEach, expect, test } from "vitest";
import { startTestDatabase } from "./postgres.test-support";

// 20261225(ADR-0127 서버 쪽): 선톡 푸시 스위치 `settings.proactive_push`(off 기본 · testers · on)와 서버 함수
// `companion_proactive_push_gate` — 스위치 · 시험 계정인가 · 푸시 기기가 있는가. 서버 역할만 부를 수 있다.
const tester = "00000000-0000-4000-8000-000000000001";
const member = "00000000-0000-4000-8000-000000000002";

let db: Awaited<ReturnType<typeof startTestDatabase>>;
let server: Awaited<ReturnType<typeof db.connect>>;

type Gate = { mode: string; tester: boolean; hasDevice: boolean; hasRoom: boolean };
const gate = async (user: string, character = "mina") =>
  (
    await server.query("select public.companion_proactive_push_gate($1, $2) as g", [
      user,
      character,
    ])
  ).rows[0].g as Gate;
const device = (token: string, user: string, createdAt: string) =>
  db.admin.query(
    "insert into public.push_devices (token, user_id, environment, created_at) values ($1, $2, 'production', $3)",
    [token, user, createdAt],
  );
async function spoke(user: string, character: string, at: string) {
  const id = (
    await db.admin.query(
      "insert into companion.conversations (user_id, character_id, last_message_at) values ($1, $2, $3) returning id",
      [user, character, at],
    )
  ).rows[0].id as string;
  await db.admin.query(
    `insert into companion.messages (conversation_id, user_id, role, origin, status, text, client_message_id, created_at)
     values ($1, $2, 'user', 'turn', 'complete', '안녕하세요', gen_random_uuid(), $3)`,
    [id, user, at],
  );
}

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
  expect(await gate(member)).toEqual({
    mode: "off",
    tester: false,
    hasDevice: false,
    hasRoom: false,
    // 20261228(ADR-0178 D7): 오늘(현지) 선톡 · 스토리 알림이 나갔는가 — 하루 한 번 합산.
    pushedToday: false,
  });
  await db.admin.query("update companion.settings set proactive_push = 'testers'");
  expect(await gate(tester)).toEqual({
    mode: "testers",
    tester: true,
    hasDevice: false,
    hasRoom: false,
    pushedToday: false,
  });
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
      app.query("select public.companion_proactive_push_gate($1, 'mina')", [member]),
    ).rejects.toMatchObject({ code: "42501" });
    await app.end();
  }
});

test("PG4. hasRoom — 가장 새 기기를 등록한 뒤 그 인물에게 말한 적이 있어야 한다(방은 기기에만 있다)", async () => {
  // 11-10에 깐 기기에서 11-12에 미나와 말했다 → 미나 방은 그 기기에 있다. 서연과는 말한 적이 없다.
  await device("ab".repeat(32), member, "2026-11-10T00:00:00Z");
  await spoke(member, "mina", "2026-11-12T00:00:00Z");
  expect((await gate(member, "mina")).hasRoom).toBe(true);
  expect((await gate(member, "seoyeon")).hasRoom).toBe(false);

  // 11-20에 새로 깔았다(새 기기) → 그 뒤로 미나와 말하기 전까지는 방이 없다고 본다.
  await device("cd".repeat(32), member, "2026-11-20T00:00:00Z");
  expect(await gate(member, "mina")).toMatchObject({ hasDevice: true, hasRoom: false });

  // 인물을 넘기지 않는 옛 호출은 hasRoom false.
  const old = (await server.query("select public.companion_proactive_push_gate($1) as g", [member]))
    .rows[0].g as Gate;
  expect(old).toMatchObject({ hasDevice: true, hasRoom: false });
});
