import { afterAll, beforeAll, beforeEach, expect, test } from "vitest";
import { signIn, startTestDatabase } from "./postgres.test-support";

// 20261216(ADR-0164 「운영자」): 플레이그라운드가 시험 계정의 성인 확인 동의를 켜고 끄고(`companion_operator_set_adult_ack`),
// 시험 계정 목록 · 기억 읽기(`companion_inspect_testers` · `companion_inspect_memory`)에서 동의 · 접근 · 적용 수위를 본다.
const tester = "00000000-0000-4000-8000-000000000001";
const member = "00000000-0000-4000-8000-000000000002";
const year = new Date().getUTCFullYear();
const adultYear = year - 30;
const minorYear = year - 15;

type Access = {
  friendsMode: string;
  tester: boolean;
  ageBand: string;
  adultAck: boolean;
  kind: string | null;
  personaTier: string;
  romanceTier: string;
  romanceReason: string | null;
  visible: boolean;
  hiddenReason: string | null;
};

let db: Awaited<ReturnType<typeof startTestDatabase>>;
let app: Awaited<ReturnType<typeof db.connect>>;
let server: typeof app;

const settings = (assignments: string) =>
  db.admin.query(`update companion.settings set ${assignments}`);
const profile = (user: string, birthYear: number | null) =>
  db.admin.query(
    `insert into companion.profiles (user_id, birth_year, age_source) values ($1, $2, $3)
     on conflict (user_id) do update set birth_year = excluded.birth_year, age_source = excluded.age_source`,
    [user, birthYear, birthYear === null ? null : "self"],
  );
const ackAt = async (user: string) =>
  (await db.admin.query("select adult_ack_at from companion.profiles where user_id = $1", [user]))
    .rows[0]?.adult_ack_at ?? null;
const setAck = async (user: string, ack: boolean | null) =>
  (await server.query("select public.companion_operator_set_adult_ack($1, $2) as r", [user, ack]))
    .rows[0].r as { result: string; adultAck: boolean; ageBand: string };
const access = async (user: string, character: string) =>
  (
    (await server.query("select public.companion_inspect_memory($1, $2) as m", [user, character]))
      .rows[0].m as { access: Access }
  ).access;
const testerRow = async () =>
  (
    (await server.query("select public.companion_inspect_testers() as t")).rows[0].t as {
      userId: string;
      adultAck: boolean;
      ageBand: string;
    }[]
  ).find((row) => row.userId === tester)!;

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
  await settings("testers_only = false, friends_mode = 'testers'");
  await db.admin.query(
    `insert into auth.users (id, email, raw_app_meta_data) values
       ($1, 't@libitum.test', '{"duru_tester": true}'), ($2, 'm@libitum.test', '{}')`,
    [tester, member],
  );
});

test("FO1. 동의 켜기 · 끄기 — 시험 계정만(P0002), 생년상 성인만 켠다(나이 모름 · 미성년자 · 프로필 없음은 not_adult), p_ack 없음은 22023", async () => {
  await profile(member, adultYear);
  await expect(setAck(member, true)).rejects.toMatchObject({ code: "P0002" });
  expect(await ackAt(member)).toBeNull();

  expect(await setAck(tester, true)).toEqual({
    result: "not_adult",
    adultAck: false,
    ageBand: "unknown",
  });
  for (const [birthYear, band] of [
    [null, "unknown"],
    [minorYear, "minor"],
  ] as const) {
    await profile(tester, birthYear);
    expect(await setAck(tester, true)).toEqual({
      result: "not_adult",
      adultAck: false,
      ageBand: band,
    });
    expect(await ackAt(tester)).toBeNull();
  }

  await profile(tester, adultYear);
  expect(await setAck(tester, true)).toEqual({ result: "ok", adultAck: true, ageBand: "adult" });
  expect(await ackAt(tester)).not.toBeNull();
  expect(await testerRow()).toMatchObject({ adultAck: true, ageBand: "adult" });

  expect(await setAck(tester, false)).toEqual({ result: "ok", adultAck: false, ageBand: "adult" });
  expect(await ackAt(tester)).toBeNull();
  expect(await testerRow()).toMatchObject({ adultAck: false });
  await expect(setAck(tester, null)).rejects.toMatchObject({ code: "22023" });
});

test("FO2. 생년을 미성년자로 바꾸면(기존 set_profile) 동의가 지워진다 — 목록 · 접근 모두 false", async () => {
  await profile(tester, adultYear);
  await setAck(tester, true);
  await server.query(
    "select public.companion_operator_set_profile($1, $2::integer, false, null, null, null)",
    [tester, minorYear],
  );
  expect(await ackAt(tester)).toBeNull();
  expect(await testerRow()).toMatchObject({ adultAck: false, ageBand: "minor" });
  expect(await access(tester, "seoyeon")).toMatchObject({ adultAck: false, visible: false });
});

test("FO3. companion_inspect_memory access — 적용 수위와 까닭(인물 standard → 성인 아님 → 동의 없음)", async () => {
  await profile(tester, adultYear);
  expect(await access(tester, "seoyeon")).toEqual({
    friendsMode: "testers",
    tester: true,
    ageBand: "adult",
    adultAck: false,
    kind: "friend",
    personaTier: "open",
    romanceTier: "standard",
    romanceReason: "no_ack",
    visible: true,
    hiddenReason: null,
  });
  await setAck(tester, true);
  for (const id of ["seoyeon", "haejun"])
    expect(await access(tester, id), id).toMatchObject({
      romanceTier: "open",
      romanceReason: null,
    });
  for (const id of ["daeun", "geonwoo"])
    expect(await access(tester, id), id).toMatchObject({
      kind: "friend",
      personaTier: "standard",
      romanceTier: "standard",
      romanceReason: "persona_standard",
    });
  expect(await access(tester, "duksu")).toMatchObject({
    kind: "story",
    personaTier: "standard",
    romanceTier: "standard",
    romanceReason: "persona_standard",
    visible: true,
  });
  await profile(tester, null); // 트리거가 동의도 지운다
  expect(await access(tester, "seoyeon")).toMatchObject({
    ageBand: "unknown",
    adultAck: false,
    romanceTier: "standard",
    romanceReason: "not_adult",
  });
  expect(await access(tester, "nobody")).toMatchObject({ kind: null, visible: true });
});

test("FO4. access 보임 — 스위치(off · testers · on) × 시험 계정, 미성년자는 open 친구만 숨김", async () => {
  await profile(tester, adultYear);
  await profile(member, adultYear);
  const cases: [mode: string, user: string, id: string, visible: boolean, reason: string | null][] =
    [
      ["off", tester, "daeun", false, "friends_off"],
      ["off", tester, "duksu", true, null],
      ["testers", tester, "daeun", true, null],
      ["testers", member, "daeun", false, "not_tester"],
      ["on", member, "seoyeon", true, null],
    ];
  for (const [mode, user, id, visible, reason] of cases) {
    await settings(`friends_mode = '${mode}'`);
    expect(await access(user, id), `${mode} ${user} ${id}`).toMatchObject({
      friendsMode: mode,
      tester: user === tester,
      visible,
      hiddenReason: reason,
    });
  }
  await settings("friends_mode = 'on'");
  await profile(tester, minorYear);
  expect(await access(tester, "seoyeon")).toMatchObject({
    visible: false,
    hiddenReason: "minor_open",
  });
  expect(await access(tester, "daeun")).toMatchObject({ visible: true, hiddenReason: null });
});

test("FO5. 대화 초기화는 성인 확인 동의를 지우지 않는다(프로필은 그대로)", async () => {
  await profile(tester, adultYear);
  await setAck(tester, true);
  await server.query("select public.companion_operator_reset($1, 'seoyeon')", [tester]);
  expect(await ackAt(tester)).not.toBeNull();
  expect(await access(tester, "seoyeon")).toMatchObject({ romanceTier: "open" });
});

test("FO6. 권한 — 운영자 RPC · 읽기는 service_role만", async () => {
  await profile(tester, adultYear);
  await signIn(app, tester);
  for (const sql of [
    `select public.companion_operator_set_adult_ack('${tester}', true)`,
    "select public.companion_inspect_testers()",
    `select public.companion_inspect_memory('${tester}', 'seoyeon')`,
  ])
    await expect(app.query(sql), sql).rejects.toThrow(/permission denied/);
  await app.query("reset role");
});
