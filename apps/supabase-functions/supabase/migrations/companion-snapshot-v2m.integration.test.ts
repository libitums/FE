import { afterAll, beforeAll, beforeEach, expect, test } from "vitest";
import { startTestDatabase } from "./postgres.test-support";

// 스냅샷 v2m(20270101, ADR-0179): 시험 계정 여부 + 최근 v2m 계획(다양성) · 새 옷 후보 기록 · 대시보드 크론이 읽고 표시하기.
const tester = "00000000-0000-4000-8000-0000000000d1";
const other = "00000000-0000-4000-8000-0000000000d2";

let db: Awaited<ReturnType<typeof startTestDatabase>>;
let server: Awaited<ReturnType<typeof db.connect>>;

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
  await db.admin.query("truncate companion.snapshot_outfit_candidates");
  await db.admin.query(
    `insert into auth.users (id, email, raw_app_meta_data) values
       ($1, 't@libitum.test', '{"duru_tester": true}'), ($2, 'o@libitum.test', '{}')`,
    [tester, other],
  );
});

/** 스냅샷 결과 행 하나(계획 · 상태 · 몇 분 전). */
async function media(user: string, character: string, prompt: unknown, status = "complete", minutesAgo = 0) {
  const result = await db.admin.query(
    `insert into companion.media (user_id, character_id, message_id, kind, status, charge, cost, storage_path, prompt, created_at)
     values ($1, $2, gen_random_uuid(), 'snapshot', $3, 'photo', 0, case when $3 = 'complete' then 'x/' || gen_random_uuid() end,
       $4::jsonb, now() - make_interval(mins => $5)) returning id`,
    [user, character, status, JSON.stringify(prompt), minutesAgo],
  );
  return result.rows[0].id as string;
}
const context = async (user: string, character: string) =>
  (
    await server.query("select public.companion_snapshot_v2_context($1, $2) as c", [user, character])
  ).rows[0].c as { tester: boolean; recent: { shot: string }[] };

test("V2M1. 시험 계정 여부 + 이 유저 × 인물의 완료된 v2m 계획만, 새것부터 6개", async () => {
  for (let i = 0; i < 8; i += 1) await media(tester, "daeun", { pipeline: "v2m", shot: `s${i}` }, "complete", 100 - i);
  await media(tester, "daeun", { pipeline: "v2m", shot: "failed" }, "failed", 0);
  await media(tester, "daeun", { scene: "v1 prompt", aspect: "3:2" }, "complete", 0);
  await media(tester, "doyun", { pipeline: "v2m", shot: "other character" }, "complete", 0);
  await media(other, "daeun", { pipeline: "v2m", shot: "other user" }, "complete", 0);
  const mine = await context(tester, "daeun");
  expect(mine.tester).toBe(true);
  expect(mine.recent.map((p) => p.shot)).toEqual(["s7", "s6", "s5", "s4", "s3", "s2"]);
  const theirs = await context(other, "daeun");
  expect(theirs.tester).toBe(false);
  expect(theirs.recent.map((p) => p.shot)).toEqual(["other user"]);
  expect((await context("00000000-0000-4000-8000-0000000000ff", "daeun")).tester).toBe(false);
});

test("V2M2. 새 옷 후보는 옷 설명만 남기고(빈 설명 · 까닭 none은 버림), 크론이 오래된 것부터 읽고 한 번만 표시한다", async () => {
  const shot = await media(tester, "daeun", { pipeline: "v2m" });
  const record = (description: string, change = "occasion", name: string | null = "festival hanbok") =>
    server.query("select public.companion_snapshot_outfit_candidate($1, $2, $3, $4, $5)", [
      "daeun",
      name,
      description,
      change,
      shot,
    ]);
  await record("red hanbok with a white jeogori");
  await record("   ");
  await record("pyjamas", "none");
  await record("grey lounge set", "home", "  ");
  const pending = (
    await server.query("select public.companion_snapshot_outfit_candidates_pending(10) as p")
  ).rows[0].p as { id: number; name: string | null; description: string; outfitChange: string }[];
  expect(pending.map((c) => [c.description, c.outfitChange, c.name])).toEqual([
    ["red hanbok with a white jeogori", "occasion", "festival hanbok"],
    ["grey lounge set", "home", null],
  ]);
  const marked = await server.query(
    "select public.companion_snapshot_outfit_candidates_mark($1::bigint[], 'drawn') as n",
    [pending.map((c) => c.id)],
  );
  expect(marked.rows[0].n).toBe(2);
  const again = await server.query(
    "select public.companion_snapshot_outfit_candidates_mark($1::bigint[], 'drawn') as n",
    [pending.map((c) => c.id)],
  );
  expect(again.rows[0].n).toBe(0);
  expect(
    (await server.query("select public.companion_snapshot_outfit_candidates_pending(10) as p")).rows[0].p,
  ).toEqual([]);
});

test("V2M3. 앱 키(authenticated · anon)는 부를 수 없다 — 서버 키만", async () => {
  const app = await db.connect();
  try {
    for (const role of ["authenticated", "anon"]) {
      await app.query(`set role ${role}`);
      await expect(
        app.query("select public.companion_snapshot_v2_context($1, 'daeun')", [tester]),
      ).rejects.toThrow(/permission denied/);
      await expect(
        app.query("select public.companion_snapshot_outfit_candidates_pending(10)"),
      ).rejects.toThrow(/permission denied/);
      await app.query("reset role");
    }
  } finally {
    await app.end();
  }
});
