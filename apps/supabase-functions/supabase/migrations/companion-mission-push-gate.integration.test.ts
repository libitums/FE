import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { afterAll, beforeAll, beforeEach, expect, test } from "vitest";

import { startTestDatabase } from "./postgres.test-support";

// 20270122(미션)이 다시 정의한 선톡 푸시 문 `companion_proactive_push_gate` — `hasRoom`은 메신저 방(`kind = 'companion'`)만 센다.
// 롤플레이 미션 판(`kind = 'mission'`, 캐스트 상대역의 `character_id`를 가짐)만 있는 사용자는 그 인물과 방이 없다(사용자 결정 2026-11-26).
// 그 밖의 칸(mode · tester · hasDevice · pushedToday)은 원본(20261228 friend_stories + my_stories)과 같다.
const user = "00000000-0000-4000-8000-0000000000a7";
const cafe = JSON.parse(
  readFileSync(
    fileURLToPath(new URL("../functions/_shared/missions/u06-cafe.json", import.meta.url)),
    "utf8",
  ),
);

let db: Awaited<ReturnType<typeof startTestDatabase>>;
let server: Awaited<ReturnType<typeof db.connect>>;

const gate = async (character = "doyun") =>
  (
    await server.query("select public.companion_proactive_push_gate($1, $2) as g", [
      user,
      character,
    ])
  ).rows[0].g as Record<string, unknown>;

async function spokeIn(kind: "companion" | "mission", at: string) {
  const mission =
    kind === "mission"
      ? {
          cols: ", kind, mission_id, mission_version, status, mission_state",
          vals: ", 'mission', 'u06-cafe', $4, 'active', '{}'::jsonb",
          args: [cafe.version],
        }
      : { cols: "", vals: "", args: [] };
  const id = (
    await db.admin.query(
      `insert into companion.conversations (user_id, character_id, last_message_at${mission.cols})
       values ($1, $2, $3${mission.vals}) returning id`,
      [user, "doyun", at, ...mission.args],
    )
  ).rows[0].id as string;
  await db.admin.query(
    `insert into companion.messages (conversation_id, user_id, role, origin, status, text, client_message_id, created_at)
     values ($1, $2, 'user', 'turn', 'complete', '아메리카노 주세요', gen_random_uuid(), $3)`,
    [id, user, at],
  );
}

beforeAll(async () => {
  db = await startTestDatabase();
  server = await db.connect();
  await server.query("set role service_role");
  await server.query("select public.companion_upsert_mission($1::jsonb)", [JSON.stringify(cafe)]);
}, 90_000);
afterAll(async () => {
  await db?.close();
});
beforeEach(async () => {
  await db.admin.query("truncate auth.users cascade");
  await db.admin.query(
    `insert into auth.users (id, email, raw_app_meta_data) values ($1, 'p@libitum.test', '{}')`,
    [user],
  );
  await db.admin.query(
    "insert into public.push_devices (token, user_id, environment, created_at) values ($2, $1, 'production', '2026-11-20T00:00:00Z')",
    [user, "ab".repeat(32)],
  );
});

test("MG1. 미션 판만 있으면 hasRoom은 거짓 — 기기 등록 뒤 그 인물(도윤)과 롤플레이로 말했어도", async () => {
  await spokeIn("mission", "2026-11-25T00:00:00Z");
  expect(await gate()).toMatchObject({ hasDevice: true, hasRoom: false, pushedToday: false });
});

test("MG2. 메신저 방이 있으면 hasRoom은 참(기존 동작 그대로) — 미션 판이 함께 있어도", async () => {
  await spokeIn("mission", "2026-11-25T00:00:00Z");
  await spokeIn("companion", "2026-11-24T00:00:00Z");
  expect(await gate()).toMatchObject({ hasDevice: true, hasRoom: true });
  expect(Object.keys(await gate()).sort()).toEqual([
    "hasDevice",
    "hasRoom",
    "mode",
    "pushedToday",
    "tester",
  ]);
});
