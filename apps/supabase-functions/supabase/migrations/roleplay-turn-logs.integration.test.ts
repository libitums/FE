import { afterAll, beforeAll, beforeEach, expect, test } from "vitest";
import { signIn, startTestDatabase } from "./postgres.test-support";

// 롤플레이 턴 로그(ADR-0161). 앱은 `log_roleplay_turns(jsonb)`만 부른다 — 표는 직접 읽지도 쓰지도 못한다.
// 값이 하나라도 틀리면 묶음 전체가 실패하고, 계정을 지우면 함께 지워지며, 1년이 지나면 삭제 함수가 지운다.

const userA = "00000000-0000-4000-8000-000000000001";
const userB = "00000000-0000-4000-8000-000000000002";

let db: Awaited<ReturnType<typeof startTestDatabase>>;
let clientA: Awaited<ReturnType<typeof db.connect>>;
let clientB: typeof clientA;
let guest: typeof clientA;

type Client = typeof clientA;
type Turn = Record<string, unknown>;

const heard = (over: Turn = {}): Turn => ({
  turnIndex: 0,
  attempt: 1,
  outcome: "heard",
  reason: null,
  heard: "아이스 아메리카노 한 잔 주세요",
  verdict: "correct",
  hintShown: false,
  ...over,
});
const unavailable = (over: Turn = {}): Turn => ({
  turnIndex: 1,
  attempt: 1,
  outcome: "unavailable",
  reason: "failed",
  heard: null,
  verdict: null,
  hintShown: true,
  ...over,
});
const skipped = (over: Turn = {}): Turn => ({
  turnIndex: 1,
  attempt: 2,
  outcome: "skipped",
  reason: null,
  heard: null,
  verdict: null,
  hintShown: true,
  ...over,
});

const batchOf = (turns: unknown, over: Record<string, unknown> = {}) => ({
  episodeId: "u06-cafe",
  mode: "scripted",
  platform: "android",
  appVersion: "1.5.0",
  appBuild: 17,
  uiLanguage: "en",
  osVersion: "15",
  turns,
  ...over,
});

const log = (client: Client, batch: unknown) =>
  client.query("select public.log_roleplay_turns($1::jsonb) as n", [JSON.stringify(batch)]);

async function stored(): Promise<Record<string, unknown>[]> {
  const result = await db.admin.query("select * from public.roleplay_turn_logs order by id");
  return result.rows;
}

beforeAll(async () => {
  db = await startTestDatabase();
  clientA = await db.connect();
  clientB = await db.connect();
  guest = await db.connect();
}, 90_000);
afterAll(async () => {
  await db?.close();
});
beforeEach(async () => {
  for (const client of [clientA, clientB, guest]) await client.query("reset role");
  await db.admin.query("truncate auth.users cascade");
  await db.admin.query("truncate public.roleplay_turn_logs restart identity");
  await db.admin.query("insert into auth.users (id) values ($1), ($2)", [userA, userB]);
  await signIn(clientA, userA);
  await signIn(clientB, userB);
  await guest.query("set role anon");
});

test("TL1. 한 판의 줄을 한 번에 남기고 남긴 수를 돌려준다 — 같은 play_id · 호출한 사용자", async () => {
  const result = await log(clientA, batchOf([heard(), unavailable(), skipped()]));
  expect(result.rows[0].n).toBe(3);
  const rows = await stored();
  expect(rows).toHaveLength(3);
  expect(new Set(rows.map((row) => row["play_id"])).size).toBe(1);
  expect(rows.every((row) => row["user_id"] === userA)).toBe(true);
  expect(rows[0]).toMatchObject({
    episode_id: "u06-cafe",
    mode: "scripted",
    turn_index: 0,
    attempt: 1,
    outcome: "heard",
    fail_reason: null,
    recognized_text: "아이스 아메리카노 한 잔 주세요",
    verdict: "correct",
    hint_shown: false,
    platform: "android",
    app_version: "1.5.0",
    app_build: 17,
    ui_language: "en",
    os_version: "15",
  });
  expect(rows[1]).toMatchObject({
    outcome: "unavailable",
    fail_reason: "failed",
    recognized_text: null,
    verdict: null,
    hint_shown: true,
  });
  expect(rows[2]).toMatchObject({ outcome: "skipped", fail_reason: null, attempt: 2 });
});

test("TL2. 판마다 play_id가 다르고, 사용자끼리 섞이지 않는다", async () => {
  await log(clientA, batchOf([heard()]));
  await log(clientA, batchOf([heard()]));
  await log(clientB, batchOf([heard()]));
  const rows = await stored();
  expect(new Set(rows.map((row) => row["play_id"])).size).toBe(3);
  expect(rows.map((row) => row["user_id"])).toEqual([userA, userA, userB]);
});

test("TL3. 빈 글자(듣고도 못 읽음)와 운영체제 버전 없음도 받는다", async () => {
  await log(
    clientA,
    batchOf([heard({ heard: "", verdict: "incorrect" })], { osVersion: null, platform: "ios" }),
  );
  await log(clientA, batchOf([heard()], { osVersion: "  " }));
  const rows = await stored();
  expect(rows[0]).toMatchObject({ recognized_text: "", verdict: "incorrect", os_version: null });
  expect(rows[1]?.["os_version"]).toBeNull();
});

test("TL4. 로그인이 없으면 부를 수 없다", async () => {
  await expect(log(guest, batchOf([heard()]))).rejects.toMatchObject({ code: "42501" });
  await guest.query("reset role");
  await guest.query("set role authenticated");
  await guest.query("select set_config('request.jwt.claim.sub', '', false)");
  await expect(log(guest, batchOf([heard()]))).rejects.toMatchObject({ code: "28000" });
  expect(await stored()).toHaveLength(0);
});

test("TL5. 앱 역할은 표를 읽거나 쓰거나 지울 수 없다(42501)", async () => {
  await log(clientA, batchOf([heard()]));
  for (const client of [clientA, guest]) {
    for (const sql of [
      "select * from public.roleplay_turn_logs",
      "insert into public.roleplay_turn_logs (user_id) values (null)",
      "update public.roleplay_turn_logs set verdict = 'correct'",
      "delete from public.roleplay_turn_logs",
      "select public.purge_roleplay_turn_logs()",
    ]) {
      await expect(client.query(sql), sql).rejects.toMatchObject({ code: "42501" });
    }
  }
});

test("TL6. 묶음의 모양이 틀리면 거절한다(22023) — 객체 아님 · 줄 없음 · 201줄", async () => {
  const many = Array.from({ length: 201 }, (_, index) => heard({ turnIndex: index % 200 }));
  for (const batch of [
    null,
    [],
    "x",
    batchOf([]),
    batchOf("x"),
    batchOf(many),
    { episodeId: "u06-cafe" },
  ]) {
    await expect(log(clientA, batch), JSON.stringify(batch)?.slice(0, 60)).rejects.toMatchObject({
      code: "22023",
    });
  }
  expect(await stored()).toHaveLength(0);
});

test("TL7. 200줄까지는 받는다", async () => {
  const rows = Array.from({ length: 200 }, (_, index) => heard({ turnIndex: index }));
  const result = await log(clientA, batchOf(rows));
  expect(result.rows[0].n).toBe(200);
});

test("TL8. 값이 하나라도 틀리면 묶음 전체가 실패한다", async () => {
  const bad: [string, unknown][] = [
    ["모르는 결과", batchOf([heard(), heard({ outcome: "guessed" })])],
    ["모르는 모드", batchOf([heard()], { mode: "karaoke" })],
    ["모르는 플랫폼", batchOf([heard()], { platform: "web" })],
    ["모르는 판정", batchOf([heard({ verdict: "close" })])],
    ["모르는 까닭", batchOf([unavailable({ reason: "tired" })])],
    ["201자 글자", batchOf([heard({ heard: "가".repeat(201) })])],
    ["들었는데 글자 없음", batchOf([heard({ heard: null })])],
    ["들었는데 판정 없음", batchOf([heard({ verdict: null })])],
    ["못 들었는데 글자 있음", batchOf([unavailable({ heard: "네" })])],
    ["못 들었는데 까닭 없음", batchOf([unavailable({ reason: null })])],
    ["넘겼는데 까닭 있음", batchOf([skipped({ reason: "failed" })])],
    ["턴 번호 음수", batchOf([heard({ turnIndex: -1 })])],
    ["기록 번호 0", batchOf([heard({ attempt: 0 })])],
    ["힌트 값 없음", batchOf([heard({ hintShown: null })])],
    ["에피소드 id 없음", batchOf([heard()], { episodeId: "" })],
    ["에피소드 id에 공백", batchOf([heard()], { episodeId: "u06 cafe" })],
    ["앱 버전 없음", batchOf([heard()], { appVersion: "" })],
    ["빌드 음수", batchOf([heard()], { appBuild: -1 })],
    ["언어 코드 틀림", batchOf([heard()], { uiLanguage: "English" })],
    ["운영체제 버전 33자", batchOf([heard()], { osVersion: "1".repeat(33) })],
  ];
  for (const [name, batch] of bad) {
    await expect(log(clientA, batch), name).rejects.toThrow();
  }
  expect(await stored()).toHaveLength(0);
});

test("TL9. 한 시간에 60판까지만 받는다(P0001) — 다른 사용자는 영향이 없다", async () => {
  for (let index = 0; index < 60; index += 1) await log(clientA, batchOf([heard()]));
  await expect(log(clientA, batchOf([heard()]))).rejects.toMatchObject({ code: "P0001" });
  await expect(log(clientB, batchOf([heard()]))).resolves.toBeDefined();
  // 한 시간이 지난 판은 세지 않는다.
  await db.admin.query(
    "update public.roleplay_turn_logs set created_at = now() - interval '61 minutes' where user_id = $1",
    [userA],
  );
  await expect(log(clientA, batchOf([heard()]))).resolves.toBeDefined();
});

test("TL10. 계정을 지우면 그 사용자의 줄만 지워진다", async () => {
  await log(clientA, batchOf([heard(), skipped()]));
  await log(clientB, batchOf([heard()]));
  await db.admin.query("delete from auth.users where id = $1", [userA]);
  const rows = await stored();
  expect(rows.map((row) => row["user_id"])).toEqual([userB]);
});

test("TL11. 보관 1년 — 넘은 줄만 지우고 지운 수를 돌려준다", async () => {
  await log(clientA, batchOf([heard(), skipped()]));
  await log(clientB, batchOf([heard()]));
  await db.admin.query(
    "update public.roleplay_turn_logs set created_at = now() - interval '366 days' where user_id = $1",
    [userA],
  );
  await db.admin.query(
    "update public.roleplay_turn_logs set created_at = now() - interval '364 days' where user_id = $1",
    [userB],
  );
  const result = await db.admin.query("select public.purge_roleplay_turn_logs() as n");
  expect(result.rows[0].n).toBe(2);
  expect((await stored()).map((row) => row["user_id"])).toEqual([userB]);
});
