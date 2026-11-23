import { afterAll, beforeAll, beforeEach, expect, test } from "vitest";
import { startTestDatabase } from "./postgres.test-support";

// 20270103(ADR-0180): 턴 시작이 친밀도 숫자도 돌려준다 — 답 프롬프트의 친밀도 구간.
const member = "00000000-0000-4000-8000-000000000002";

let db: Awaited<ReturnType<typeof startTestDatabase>>;
let server: Awaited<ReturnType<typeof db.connect>>;

async function begin(character: string) {
  const result = await server.query(
    "select public.companion_begin_turn($1, $2, gen_random_uuid(), '안녕하세요', 'text', 20, null, now()) as t",
    [member, character],
  );
  return result.rows[0].t as { result: string; intimacy?: number; speechLevel?: string };
}
const finishAll = () =>
  db.admin.query("update companion.messages set status = 'complete' where user_id = $1", [member]);

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
  await db.admin.query(
    "update companion.settings set testers_only = false, friends_mode = 'on', trial_limit = 20, message_cost = 3, minor_daily_limit_seconds = null",
  );
  await db.admin.query(
    "insert into auth.users (id, email, raw_app_meta_data) values ($1, 'm@libitum.test', '{}')",
    [member],
  );
});

test("TI1. 첫 턴은 친밀도 0, 쌓인 친밀도는 그대로 돌려주고 말투 단계 · 그 밖의 칸은 그대로", async () => {
  expect(await begin("geonwoo")).toMatchObject({ result: "ok", intimacy: 0, speechLevel: "polite" });
  await finishAll();
  await db.admin.query(
    "update companion.relationships set intimacy = 42, speech_level = 'casual' where user_id = $1 and character_id = 'geonwoo'",
    [member],
  );
  const turn = await begin("geonwoo");
  expect(turn).toMatchObject({ result: "ok", intimacy: 42, speechLevel: "casual" });
  for (const key of ["conversationId", "userMessageId", "holdId", "persona", "romanceTier", "history"])
    expect(turn, key).toHaveProperty(key);
});
