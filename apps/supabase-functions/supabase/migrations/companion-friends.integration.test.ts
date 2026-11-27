import { readFile } from "node:fs/promises";

import { afterAll, beforeAll, beforeEach, expect, test } from "vitest";
import { signIn, startTestDatabase } from "./postgres.test-support";

// 20261216(ADR-0164): 추천 친구 넷 · 출시 스위치 · 합산 체험 · 완화 수위(open) · 성인 확인 동의.
const tester = "00000000-0000-4000-8000-000000000001";
const member = "00000000-0000-4000-8000-000000000002";
const migration = new URL("./20261216120000_companion_friends.sql", import.meta.url);
// 20261218(ADR-0168): 다은 · 건우의 로맨스 태도를 고친다 — 친구 마이그레이션을 다시 적용하면 이것도 이어서 다시 적용해야 지금 상태다.
const ladder = new URL("./20261218120000_companion_romance_ladder.sql", import.meta.url);
// 20270112(ADR-0203): 해준의 로맨스 태도를 고친다 — 다시 적용하면 이것도 이어서.
const haejunWarmth = new URL("./20270112120000_companion_haejun_warmth.sql", import.meta.url);
const friendsJson = new URL("../../../../docs/content/companion-friends.json", import.meta.url);
const year = new Date().getUTCFullYear();
const adultYear = year - 30;
const minorYear = year - 15;

type Friend = {
  id: string;
  name: string;
  mbti: string;
  met: string;
  romanceTier: "open" | "standard";
  maxSpeechLevel: string;
  firstMessage: { ko: string[]; en: string[] };
  look: { identity: string };
  voiceId: string;
  persona: Record<
    "history" | "values" | "people" | "goals" | "likes" | "dislikes" | "hooks",
    string[]
  > & { romance: string };
};

let db: Awaited<ReturnType<typeof startTestDatabase>>;
let app: Awaited<ReturnType<typeof db.connect>>;
let server: typeof app;
let anon: typeof app;

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

async function friends(user: string) {
  await signIn(app, user);
  const result = await app.query("select public.companion_friends() as f");
  return (result.rows[0].f as { friends: { id: string; romanceTier: string }[] }).friends;
}
const friendIds = async (user: string) => (await friends(user)).map((friend) => friend.id);

async function ackAdult(user: string) {
  await signIn(app, user);
  return (await app.query("select public.companion_ack_adult() as a")).rows[0].a as {
    ok: boolean;
    adultAck: boolean;
  };
}

async function gate(user: string, character: string) {
  const result = await server.query(
    "select public.companion_turn_gate($1, $2, gen_random_uuid(), now(), null) as g",
    [user, character],
  );
  return result.rows[0].g as { result: string; romanceTier?: string; detail?: unknown };
}

async function begin(user: string, character: string) {
  const result = await server.query(
    "select public.companion_begin_turn($1, $2, gen_random_uuid(), '안녕하세요', 'text', 20, null, now()) as t",
    [user, character],
  );
  return result.rows[0].t as {
    result: string;
    trial?: boolean;
    creditsReserved?: number;
    romanceTier?: string;
    holdId?: string;
    detail?: unknown;
  };
}

const context = async (fn: string, user: string, character: string) =>
  (
    await server.query(
      fn === "companion_greet_context"
        ? `select public.${fn}($1, $2, now()) as c`
        : `select public.${fn}($1, $2, 6, now()) as c`,
      [user, character],
    )
  ).rows[0].c as { result?: string; romanceTier?: string; allowed?: boolean };

beforeAll(async () => {
  db = await startTestDatabase();
  app = await db.connect();
  server = await db.connect();
  anon = await db.connect();
  await server.query("set role service_role");
  await anon.query("set role anon");
}, 90_000);
afterAll(async () => {
  await db?.close();
});
beforeEach(async () => {
  await db.admin.query("truncate auth.users cascade");
  await settings(
    "testers_only = false, friends_mode = 'testers', trial_limit = 20, message_cost = 3, minor_daily_limit_seconds = null",
  );
  await db.admin.query(
    `insert into auth.users (id, email, raw_app_meta_data) values
       ($1, 't@libitum.test', '{"duru_tester": true}'), ($2, 'm@libitum.test', '{}')`,
    [tester, member],
  );
});

test("FR1. 페르소나 넷이 companion-friends.json과 같다 — 이름 · 선톡 줄 · 수위 · MBTI, 스토리 다섯에는 MBTI · standard", async () => {
  const content = JSON.parse(await readFile(friendsJson, "utf8")) as {
    friends: Friend[];
    storyProfiles: Record<string, { mbti: string } | string>;
  };
  const rows = await db.admin.query(
    "select id, persona, media, active, sort_order from companion.characters order by sort_order, id",
  );
  const byId = new Map(rows.rows.map((row) => [row.id as string, row]));
  expect(rows.rows.map((row) => row.id)).toEqual([
    "duksu",
    "yoonkyung",
    "mina",
    "doyun",
    "jaemin",
    ...content.friends.map((friend) => friend.id),
  ]);
  for (const friend of content.friends) {
    const row = byId.get(friend.id)!;
    expect(row.persona, friend.id).toMatchObject({
      kind: "friend",
      name: friend.name,
      mbti: friend.mbti,
      met: friend.met,
      romanceTier: friend.romanceTier,
      maxSpeechLevel: friend.maxSpeechLevel,
      unlockLines: friend.firstMessage.ko,
    });
    expect(row.active).toBe(true);
    expect(row.sort_order).toBeGreaterThan(4);
    expect(row.media.refSlugs).toEqual([friend.id]);
    expect(row.media.voiceId).toBe(friend.voiceId);
    expect((row.media.look as string).startsWith(friend.look.identity), friend.id).toBe(true);
    for (const key of ["role", "speech", "romance"])
      expect((row.persona[key] as string).length, `${friend.id} ${key}`).toBeGreaterThan(20);
    for (const key of ["samples", "doNot", "background", "personality", "topics"])
      expect(row.persona[key].length, `${friend.id} ${key}`).toBeGreaterThan(2);
    for (const key of [
      "history",
      "values",
      "people",
      "goals",
      "likes",
      "dislikes",
      "hooks",
    ] as const)
      expect(row.persona[key], `${friend.id} ${key}`).toEqual(friend.persona[key]);
    // 로맨스 태도(ADR-0168 — 다은 · 건우는 사다리에 맞춰 20261218에 고쳤다).
    expect(row.persona.romance, `${friend.id} romance`).toBe(friend.persona.romance);
  }
  expect(byId.get("haejun")!.persona.dialect).toContain("Busan");
  for (const [id, value] of Object.entries(content.storyProfiles)) {
    if (typeof value === "string") continue;
    expect(byId.get(id)!.persona, id).toMatchObject({ mbti: value.mbti, romanceTier: "standard" });
  }
  // 로맨스 대상이 아닌 인물(ADR-0168 D4) — 덕수쌤 · 윤경만.
  for (const row of rows.rows)
    expect(row.persona.romanceOff === true, row.id as string).toBe(
      row.id === "duksu" || row.id === "yoonkyung",
    );
});

test("FR2. companion_friends() — 스위치(off · testers · on) × 시험 계정 × 연령대", async () => {
  const all = ["seoyeon", "haejun", "daeun", "geonwoo"];
  const standardOnly = ["daeun", "geonwoo"];
  const cases: [mode: string, birthYear: number | null, tester: string[], member: string[]][] = [
    ["off", adultYear, [], []],
    ["off", minorYear, [], []],
    ["testers", adultYear, all, []],
    ["testers", null, all, []],
    ["testers", minorYear, standardOnly, []],
    ["on", adultYear, all, all],
    ["on", null, all, all],
    ["on", minorYear, standardOnly, standardOnly],
  ];
  for (const [mode, birthYear, forTester, forMember] of cases) {
    await settings(`friends_mode = '${mode}'`);
    await profile(tester, birthYear);
    await profile(member, birthYear);
    expect(await friendIds(tester), `${mode} ${birthYear} tester`).toEqual(forTester);
    expect(await friendIds(member), `${mode} ${birthYear} member`).toEqual(forMember);
  }
  // 수위는 인물의 성격(open · standard)이다. 앱 전체가 시험 계정 전용이면 시험 계정이 아닌 사람은 빈 목록.
  expect(await friends(tester)).toEqual([
    { id: "daeun", romanceTier: "standard" },
    { id: "geonwoo", romanceTier: "standard" },
  ]);
  await profile(tester, adultYear);
  expect((await friends(tester))[0]).toEqual({ id: "seoyeon", romanceTier: "open" });
  await settings("testers_only = true");
  expect(await friendIds(member)).toEqual([]);
  await expect(anon.query("select public.companion_friends()")).rejects.toMatchObject({
    code: "42501",
  });
});

test("FR3. 관문 — 숨긴 친구는 not_available, 보이는 친구 · 스토리 인물은 그대로 · 목록에서도 빠진다", async () => {
  await profile(member, adultYear);
  expect((await gate(member, "seoyeon")).result).toBe("not_available");
  expect((await gate(member, "duksu")).result).toBe("ok");
  expect((await gate(tester, "seoyeon")).result).toBe("ok");
  await settings("friends_mode = 'off'");
  expect((await gate(tester, "daeun")).result).toBe("not_available");
  await settings("friends_mode = 'on'");
  expect((await gate(member, "seoyeon")).result).toBe("ok");
  // 생년으로 미성년자: open 친구는 숨기고 standard 친구는 연다.
  await profile(member, minorYear);
  expect((await gate(member, "seoyeon")).result).toBe("not_available");
  expect((await gate(member, "haejun")).result).toBe("not_available");
  expect((await gate(member, "daeun")).result).toBe("ok");
  await signIn(app, member);
  const list = (await app.query("select public.companion_list_characters() as l")).rows[0].l as {
    id: string;
  }[];
  expect(list.map((entry) => entry.id)).toEqual([
    "duksu",
    "yoonkyung",
    "mina",
    "doyun",
    "jaemin",
    "daeun",
    "geonwoo",
  ]);
  // 칩 · 첫 인사 · 스냅샷 맥락도 같은 관문을 쓴다.
  expect((await context("companion_suggest_context", member, "seoyeon")).result).toBe(
    "not_available",
  );
});

test("FR4. 합산 체험 — 두 인물이 한 묶음을 나눠 쓰고, 다 쓰면 어느 인물이든 엽전", async () => {
  await settings("trial_limit = 2");
  expect(await begin(member, "duksu")).toMatchObject({
    result: "ok",
    trial: true,
    creditsReserved: 0,
  });
  expect(await begin(member, "mina")).toMatchObject({
    result: "ok",
    trial: true,
    creditsReserved: 0,
  });
  const wallet = async () => {
    await signIn(app, member);
    return (await app.query("select public.companion_get_wallet() as w")).rows[0].w as {
      trialRemaining: number;
    };
  };
  expect((await wallet()).trialRemaining).toBe(0);
  expect(await begin(member, "yoonkyung")).toEqual({
    result: "trial_exhausted",
    detail: { characterId: "yoonkyung" },
  });
  expect(await gate(member, "duksu")).toEqual({
    result: "insufficient_credits",
    detail: { required: 3, balance: 0 },
  });
  await signIn(app, member);
  const list = (await app.query("select public.companion_list_characters() as l")).rows[0].l as {
    id: string;
    unavailableReason: string | null;
  }[];
  expect(new Set(list.map((entry) => entry.unavailableReason))).toEqual(
    new Set(["trial_exhausted"]),
  );
  // 예약을 풀면 그 인물 몫이 돌아와 묶음에 하나가 남는다.
  const held = (
    await db.admin.query(
      "select id from companion.credit_holds where user_id = $1 and character_id = 'mina'",
      [member],
    )
  ).rows[0].id as string;
  await db.admin.query("select companion.release_hold($1)", [held]);
  expect((await wallet()).trialRemaining).toBe(1);
  expect(await begin(member, "jaemin")).toMatchObject({ result: "ok", trial: true });
  // 엽전이 있으면 체험 뒤에도 어느 인물이든 3씩.
  await db.admin.query("select companion.grant_once($1, 10, 'operator_test', 'fr4')", [member]);
  expect(await begin(member, "doyun")).toMatchObject({
    result: "ok",
    trial: false,
    creditsReserved: 3,
  });
});

test("FR5. 성인 확인 동의 — 생년상 성인만 남고, 나이 모름 · 미성년자 · 프로필 없음은 거짓", async () => {
  expect(await ackAdult(member)).toEqual({ ok: false, adultAck: false });
  await profile(member, null);
  expect(await ackAdult(member)).toEqual({ ok: false, adultAck: false });
  await profile(member, minorYear);
  expect(await ackAdult(member)).toEqual({ ok: false, adultAck: false });
  expect(await ackAt(member)).toBeNull();
  await profile(member, adultYear);
  expect(await ackAdult(member)).toEqual({ ok: true, adultAck: true });
  expect(await ackAt(member)).not.toBeNull();
  await signIn(app, member);
  expect((await app.query("select public.companion_load_profile() as p")).rows[0].p).toMatchObject({
    birthYear: adultYear,
    adultAck: true,
  });
  await expect(anon.query("select public.companion_ack_adult()")).rejects.toMatchObject({
    code: "42501",
  });
});

test("FR6. 적용 수위 — open 인물 × {성인 + 동의, 성인 동의 없음, 나이 모름, 미성년자}와 standard 인물", async () => {
  await settings("friends_mode = 'on'");
  const tier = async (character: string) => (await gate(member, character)).romanceTier;
  await profile(member, adultYear);
  expect(await tier("seoyeon")).toBe("standard");
  await ackAdult(member);
  expect(await tier("seoyeon")).toBe("open");
  expect(await tier("haejun")).toBe("open");
  expect(await tier("daeun")).toBe("standard");
  expect(await tier("duksu")).toBe("standard");
  for (const fn of [
    "companion_greet_context",
    "companion_suggest_context",
    "companion_proactive_context",
  ])
    expect((await context(fn, member, "seoyeon")).romanceTier, fn).toBe("open");
  expect(await begin(member, "seoyeon")).toMatchObject({ result: "ok", romanceTier: "open" });
  // 앞 턴이 끝났다고 친다(진행 중인 턴이 있으면 관문이 turn_in_progress).
  await db.admin.query("update companion.messages set status = 'complete' where user_id = $1", [
    member,
  ]);
  // 나이 모름: 동의가 지워지고(트리거) open 친구는 보이지만 수위는 standard.
  await profile(member, null);
  expect(await ackAt(member)).toBeNull();
  expect(await tier("seoyeon")).toBe("standard");
  // 동의 칸이 남아 있어도(직접 쓴 값) 생년이 성인이 아니면 standard다 — 매 턴 지금 연령대로 다시 계산한다.
  await db.admin.query("alter table companion.profiles disable trigger profiles_clear_adult_ack");
  await db.admin.query("update companion.profiles set adult_ack_at = now() where user_id = $1", [
    member,
  ]);
  await db.admin.query("alter table companion.profiles enable trigger profiles_clear_adult_ack");
  expect(await tier("seoyeon")).toBe("standard");
  expect((await context("companion_proactive_context", member, "seoyeon")).romanceTier).toBe(
    "standard",
  );
});

test("FR7. 생년을 바꾸면 수위가 떨어진다 — 미성년자면 동의를 지우고 open 친구를 숨긴다, 다시 성인이어도 동의부터", async () => {
  await profile(member, adultYear);
  await ackAdult(member);
  await settings("friends_mode = 'on'");
  expect((await gate(member, "seoyeon")).romanceTier).toBe("open");
  await db.admin.query("update companion.profiles set birth_year = $2 where user_id = $1", [
    member,
    minorYear,
  ]);
  expect(await ackAt(member)).toBeNull();
  expect((await gate(member, "seoyeon")).result).toBe("not_available");
  expect((await context("companion_proactive_context", member, "seoyeon")).allowed).toBe(false);
  await db.admin.query("update companion.profiles set birth_year = $2 where user_id = $1", [
    member,
    adultYear,
  ]);
  expect((await gate(member, "seoyeon")).romanceTier).toBe("standard");
  await signIn(app, member);
  expect((await app.query("select public.companion_load_profile() as p")).rows[0].p.adultAck).toBe(
    false,
  );
  // 운영의 생년 지우기도 같다.
  await profile(tester, adultYear);
  expect(await ackAdult(tester)).toEqual({ ok: true, adultAck: true });
  await server.query(
    "select public.companion_operator_set_profile($1, null, true, null, null, null)",
    [tester],
  );
  expect(await ackAt(tester)).toBeNull();
});

test("FR8. 첫 인사는 무료 — 체험 · 엽전이 없어도 맥락이 열리고, 연령 판정은 그대로 막는다", async () => {
  await settings("trial_limit = 0");
  expect((await gate(tester, "seoyeon")).result).toBe("insufficient_credits");
  expect(await context("companion_greet_context", tester, "seoyeon")).toMatchObject({
    result: "ok",
    romanceTier: "standard",
  });
  await profile(tester, year - 10);
  expect((await context("companion_greet_context", tester, "daeun")).result).toBe("age_restricted");
});

test("FR9. 다시 적용해도 같은 결과 · 서버용 함수는 앱이 부르지 못한다", async () => {
  await profile(member, adultYear);
  await ackAdult(member);
  const snapshot = () =>
    db.admin.query(
      `select (select jsonb_agg(jsonb_build_object('id', id, 'persona', persona, 'media', media, 'sort', sort_order) order by id)
         from companion.characters) as characters,
       (select friends_mode from companion.settings) as mode,
       (select adult_ack_at is not null from companion.profiles where user_id = $1) as ack`,
      [member],
    );
  const before = (await snapshot()).rows[0];
  await db.admin.query(await readFile(migration, "utf8"));
  await db.admin.query(await readFile(ladder, "utf8"));
  await db.admin.query(await readFile(haejunWarmth, "utf8"));
  expect((await snapshot()).rows[0]).toEqual(before);
  await signIn(app, member);
  await expect(
    app.query("select public.companion_turn_gate($1, 'seoyeon', gen_random_uuid(), now(), null)", [
      member,
    ]),
  ).rejects.toMatchObject({ code: "42501" });
});
