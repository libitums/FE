import { readFile } from "node:fs/promises";
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";
import { startTestDatabase } from "./postgres.test-support";

// 운영 도구 2차(20261213, ops-dashboard docs/admin-contract.md §E-A): 필터 찾기 · 국가 · 시험 계정 목록 · 상태 · 전환 ·
// 프로필 · 학습 범위 · 친밀도 · 구독 플랜 · 학습 초기화, UserRow paid · 대화 segments · 지급 메모 필수.
const tester = "00000000-0000-4000-8000-0000000000c1";
const real = "00000000-0000-4000-8000-0000000000c2";
const other = "00000000-0000-4000-8000-0000000000c3";
const nobody = "00000000-0000-4000-8000-0000000000ff";
const ACTOR = "komet";
const DAY = 86_400_000;
const iso = (offsetMs: number) => new Date(Date.now() + offsetMs).toISOString();

type Db = Awaited<ReturnType<typeof startTestDatabase>>;
type Client = Awaited<ReturnType<Db["connect"]>>;
type Json = Record<string, any>;

const NEW_FUNCTIONS = [
  "ops_search_users",
  "ops_countries",
  "ops_list_testers",
  "ops_tester_state",
  "ops_set_tester",
  "ops_tester_set_profile",
  "ops_tester_set_learning_scope",
  "ops_tester_set_intimacy",
  "ops_tester_set_plan",
  "ops_tester_reset_learning",
];

/** `select public.<fn>($1, …) as r` — 인수 꼴은 `casts`로 적는다(배열 · jsonb). */
async function rpc(
  client: Client,
  fn: string,
  args: unknown[],
  casts: string[] = [],
): Promise<Json> {
  const params = args.map((_, i) => `$${i + 1}${casts[i] ? `::${casts[i]}` : ""}`).join(", ");
  const result = await client.query(`select public.${fn}(${params}) as r`, args);
  return result.rows[0].r as Json;
}

/** 이름 붙인 인수로 부른다(PostgREST처럼). */
async function named(client: Client, fn: string, args: Record<string, unknown>): Promise<Json> {
  const keys = Object.keys(args);
  const params = keys.map((k, i) => `${k} => $${i + 1}`).join(", ");
  const result = await client.query(
    `select public.${fn}(${params}) as r`,
    keys.map((k) => args[k]),
  );
  return result.rows[0].r as Json;
}

async function seed(db: Db) {
  await db.admin.query("truncate auth.users cascade");
  await db.admin.query("truncate ops.audit_log, ops.push_sends");
  await db.admin.query(
    `insert into auth.users (id, email, raw_app_meta_data, created_at) values
       ($1, 'tester@libitum.test', '{"duru_tester": true, "provider": "email"}', now() - interval '30 days'),
       ($2, 'real@example.com', '{"provider": "apple"}', now() - interval '10 days'),
       ($3, 'other_50%@example.com', '{"provider": "google"}', now() - interval '1 day')`,
    [tester, real, other],
  );
  await db.admin.query(
    `insert into public.learner_profiles (user_id, name, country_code) values ($1, 'Minji', 'KR'), ($2, 'Alex', 'US')`,
    [tester, real],
  );
  // 학습자 프로필 국가가 없으면 컴패니언 마지막 지역.
  await db.admin.query("insert into companion.profiles (user_id, last_region) values ($1, 'US')", [
    other,
  ]);
}

const auditRows = async (db: Db) =>
  (
    await db.admin.query(
      "select actor, kind, action, target_user, detail, result from ops.audit_log order by id",
    )
  ).rows as {
    actor: string;
    kind: string;
    action: string;
    target_user: string | null;
    detail: Json;
    result: string;
  }[];
const ledgerSum = async (db: Db, user: string) =>
  (
    await db.admin.query(
      `select coalesce((select sub_balance + grant_balance + paid_balance from companion.credit_wallets where user_id = $1), 0) as w,
              coalesce((select sum(delta)::int from companion.credit_ledger where user_id = $1), 0) as l`,
      [user],
    )
  ).rows[0] as { w: number; l: number };

describe("구독 표가 있는 DB", () => {
  let db: Db;
  let server: Client;

  beforeAll(async () => {
    db = await startTestDatabase();
    server = await db.connect();
    await server.query("set role service_role");
  }, 90_000);
  afterAll(async () => {
    await db?.close();
  });
  beforeEach(async () => {
    await seed(db);
  });

  test("OT-1 새 RPC는 service_role만 · security definer · search_path 비움, anon · authenticated는 부르지 못한다", async () => {
    const functions = (
      await db.admin.query(
        `select p.proname as name,
                has_function_privilege('anon', p.oid, 'execute') as anon,
                has_function_privilege('authenticated', p.oid, 'execute') as auth,
                has_function_privilege('service_role', p.oid, 'execute') as service,
                p.prosecdef as definer, p.proconfig as config
         from pg_proc p join pg_namespace n on n.oid = p.pronamespace
         where n.nspname = 'public' and p.proname = any ($1)`,
        [[...NEW_FUNCTIONS, "ops_user_conversation", "ops_grant_credits"]],
      )
    ).rows;
    expect(functions.map((f) => f.name).sort()).toEqual(
      [...NEW_FUNCTIONS, "ops_user_conversation", "ops_grant_credits"].sort(),
    );
    for (const f of functions) {
      expect(f).toEqual({
        name: f.name,
        anon: false,
        auth: false,
        service: true,
        definer: true,
        config: ['search_path=""'],
      });
    }
    for (const role of ["anon", "authenticated"]) {
      const client = await db.connect();
      await client.query(`set role ${role}`);
      await expect(client.query("select public.ops_search_users('x')")).rejects.toThrow(
        /permission denied/,
      );
      await expect(client.query("select public.ops_countries('x')")).rejects.toThrow(
        /permission denied/,
      );
      await expect(
        client.query("select public.ops_set_tester('x', $1, true)", [real]),
      ).rejects.toThrow(/permission denied/);
    }
    await expect(server.query("select ops.is_paid($1)", [real])).rejects.toThrow(
      /permission denied/,
    );
    await expect(rpc(server, "ops_countries", [" "])).rejects.toThrow(/actor_required/);
    await expect(rpc(server, "ops_list_testers", [null])).rejects.toThrow(/actor_required/);
    await expect(rpc(server, "ops_set_tester", ["", real, true])).rejects.toThrow(/actor_required/);
    expect(await auditRows(db)).toEqual([]);
  });

  test("OT-2 대화는 segments를 그대로 내고, 엽전 지급은 메모가 늘 필수다", async () => {
    const conversation = (
      await db.admin.query(
        "insert into companion.conversations (user_id, character_id) values ($1, 'mina') returning id",
        [real],
      )
    ).rows[0].id;
    await db.admin.query(
      `insert into companion.messages (conversation_id, user_id, role, status, client_message_id, text, created_at)
       values ($1, $2, 'user', 'complete', gen_random_uuid(), '안녕', now() - interval '1 minute')`,
      [conversation, real],
    );
    const segments = [
      { kind: "action", text: "손을 흔든다" },
      { kind: "speech", text: "안녕!", translation: "Hi!" },
      { kind: "narration", text: "햇살이 비친다" },
    ];
    await db.admin.query(
      `insert into companion.messages (conversation_id, user_id, role, status, segments) values ($1, $2, 'assistant', 'complete', $3)`,
      [conversation, real, JSON.stringify(segments)],
    );
    const conv = await rpc(server, "ops_user_conversation", [ACTOR, real, "mina"]);
    expect(conv.messages.map((m: Json) => [m.role, m.text, m.segments])).toEqual([
      ["assistant", null, segments],
      ["user", "안녕", []],
    ]);

    const request = "11111111-1111-4111-8111-111111111111";
    for (const memo of [null, "", "   ", "x".repeat(201)]) {
      await expect(
        rpc(server, "ops_grant_credits", [ACTOR, [real], 10, "cs", memo, request], ["", "uuid[]"]),
      ).rejects.toThrow(/invalid_memo/);
    }
    expect(
      await rpc(
        server,
        "ops_grant_credits",
        [ACTOR, [real], 10, "cs", "  보상  ", request],
        ["", "uuid[]"],
      ),
    ).toEqual({ ok: true, granted: 1, duplicate: 0, missing: [], total: 10 });
    const logs = await auditRows(db);
    expect(logs.at(-1)).toMatchObject({ action: "grant_credits", detail: { memo: "보상" } });
  });

  test("OT-3 UserRow paid: 스토어 이벤트 · 구매/구독 지급이면 true, 시험 계정 잔액 맞추기(operator)는 아니다", async () => {
    const paidOf = async (user: string) =>
      (await rpc(server, "ops_search_users", [ACTOR, user])).items[0].paid;
    expect(await paidOf(real)).toBe(false);
    await rpc(server, "ops_tester_set_balance", [ACTOR, tester, "paid", 50]);
    expect(await paidOf(tester)).toBe(false);
    await server.query(
      "select public.companion_grant_credits($1, 'paid', 10, 'purchase', 'rc:tx-1', null)",
      [real],
    );
    expect(await paidOf(real)).toBe(true);
    await db.admin.query(
      `insert into companion.store_events (id, type, action, user_id, environment, product_id, event_at, payload)
       values ('evt-1', 'INITIAL_PURCHASE', 'activate', $1, 'production', 'duru.premium.monthly.v1', now(), '{}')`,
      [other],
    );
    expect(await paidOf(other)).toBe(true);
    // 기존 RPC도 같은 UserRow를 낸다.
    expect((await rpc(server, "ops_find_users", [ACTOR, "real@"])).items[0].paid).toBe(true);
  });

  test("OT-4 필터 찾기: 검색어 · 국가 · 시험 계정 · 티어 · 가입일 AND, 가입 최신순 · total · limit/offset · 열람 기록", async () => {
    const ids = async (args: Record<string, unknown>) => {
      const r = await named(server, "ops_search_users", { p_actor: ACTOR, ...args });
      return { ids: r.items.map((u: Json) => u.id), total: r.total };
    };
    expect(await ids({})).toEqual({ ids: [other, real, tester], total: 3 });
    expect(await ids({ p_query: "  " })).toEqual({ ids: [other, real, tester], total: 3 });
    expect(await ids({ p_query: "ALEX" })).toEqual({ ids: [real], total: 1 });
    expect(await ids({ p_query: tester.toUpperCase() })).toEqual({ ids: [tester], total: 1 });
    expect(await ids({ p_query: "50%" })).toEqual({ ids: [other], total: 1 });
    expect(await ids({ p_query: "%%" })).toEqual({ ids: [], total: 0 });
    expect(await ids({ p_country: "US" })).toEqual({ ids: [other, real], total: 2 });
    expect(await ids({ p_country: "US", p_query: "example" })).toEqual({
      ids: [other, real],
      total: 2,
    });
    expect(await ids({ p_tester: true })).toEqual({ ids: [tester], total: 1 });
    expect(await ids({ p_tester: false })).toEqual({ ids: [other, real], total: 2 });
    expect(await ids({ p_joined_after: iso(-15 * DAY) })).toEqual({
      ids: [other, real],
      total: 2,
    });
    expect(await ids({ p_joined_before: iso(-5 * DAY) })).toEqual({
      ids: [real, tester],
      total: 2,
    });
    expect(await ids({ p_limit: 1, p_offset: 1 })).toEqual({ ids: [real], total: 3 });
    expect(await ids({ p_offset: 5 })).toEqual({ ids: [], total: 3 });

    expect(await ids({ p_tier: "free" })).toEqual({ ids: [other, real, tester], total: 3 });
    await rpc(server, "ops_tester_set_plan", [ACTOR, tester, "chat_plus", true, null]);
    expect(await ids({ p_tier: "chat_plus" })).toEqual({ ids: [tester], total: 1 });
    await rpc(server, "ops_tester_set_plan", [ACTOR, tester, "chat_plus", false, null]);
    await rpc(server, "ops_tester_set_plan", [ACTOR, tester, "unlimited_tickets", true, null]);
    expect(await ids({ p_tier: "unlimited_tickets" })).toEqual({ ids: [tester], total: 1 });
    expect(await ids({ p_tier: "free" })).toEqual({ ids: [other, real], total: 2 });

    for (const [args, code] of [
      [{ p_query: "a" }, "invalid_query"],
      [{ p_query: "a".repeat(201) }, "invalid_query"],
      [{ p_country: "us" }, "invalid_country"],
      [{ p_country: "USA" }, "invalid_country"],
      [{ p_tier: "gold" }, "invalid_tier"],
      [{ p_limit: 0 }, "invalid_limit"],
      [{ p_limit: 1001 }, "invalid_limit"],
      [{ p_offset: -1 }, "invalid_offset"],
      [{ p_offset: 100_001 }, "invalid_offset"],
    ] as const) {
      await expect(named(server, "ops_search_users", { p_actor: ACTOR, ...args })).rejects.toThrow(
        new RegExp(code),
      );
    }

    await db.admin.query("truncate ops.audit_log");
    const after = iso(-15 * DAY);
    await named(server, "ops_search_users", {
      p_actor: ACTOR,
      p_query: " min ",
      p_country: "KR",
      p_tester: true,
      p_joined_after: after,
    });
    const [log] = await auditRows(db);
    expect(log).toEqual({
      actor: ACTOR,
      kind: "view",
      action: "search_users",
      target_user: null,
      detail: {
        query: "min",
        country: "KR",
        tester: true,
        joinedAfter: expect.any(String),
        limit: 50,
        offset: 0,
      },
      result: "ok",
    });
    expect(Date.parse(log!.detail.joinedAfter)).toBe(Date.parse(after));
  });

  test("OT-5 국가 목록: UserRow country 기준 · 많은 순 · 모르는 사람은 빼고 · 기록하지 않음", async () => {
    await db.admin.query(
      "insert into auth.users (id, email) values ('00000000-0000-4000-8000-0000000000c4', 'none@example.com')",
    );
    expect(await rpc(server, "ops_countries", [ACTOR])).toEqual({
      items: [
        { country: "US", users: 2 },
        { country: "KR", users: 1 },
      ],
    });
    expect(await auditRows(db)).toEqual([]);
  });

  test("OT-6 시험 계정 목록: 시험 계정만 · 이메일 순 · UserRow · 열람 기록", async () => {
    await db.admin.query(
      `insert into auth.users (id, email, raw_app_meta_data) values
         ('00000000-0000-4000-8000-0000000000c5', 'a-tester@libitum.test', '{"duru_tester": true}')`,
    );
    const r = await rpc(server, "ops_list_testers", [ACTOR]);
    expect(r.items.map((u: Json) => u.email)).toEqual([
      "a-tester@libitum.test",
      "tester@libitum.test",
    ]);
    expect(r.items[1]).toMatchObject({ id: tester, tester: true, paid: false, country: "KR" });
    expect(await auditRows(db)).toEqual([
      {
        actor: ACTOR,
        kind: "view",
        action: "list_testers",
        target_user: null,
        detail: {},
        result: "ok",
      },
    ]);
  });

  test("OT-7 시험 계정 상태: 모든 칸 · 캐릭터 전부(관계 없으면 0) · 아니면 not_a_tester(refused) · 없으면 not_found", async () => {
    expect(await rpc(server, "ops_tester_state", [ACTOR, real])).toEqual({
      ok: false,
      error: "not_a_tester",
    });
    await expect(rpc(server, "ops_tester_state", [ACTOR, nobody])).rejects.toThrow(/not_found/);

    await db.admin.query(
      "insert into companion.credit_wallets (user_id, sub_balance, grant_balance, paid_balance) values ($1, 1, 2, 3)",
      [tester],
    );
    await db.admin.query(
      "insert into companion.relationships (user_id, character_id, intimacy, speech_level) values ($1, 'mina', 25, 'casual')",
      [tester],
    );
    const conversation = (
      await db.admin.query(
        "insert into companion.conversations (user_id, character_id) values ($1, 'mina') returning id",
        [tester],
      )
    ).rows[0].id;
    await db.admin.query(
      `insert into companion.messages (conversation_id, user_id, role, status, client_message_id, text)
       select $1, $2, 'user', 'complete', gen_random_uuid(), '안녕' from generate_series(1, 2)`,
      [conversation, tester],
    );
    await db.admin.query(
      "insert into public.learning_progress (user_id, progress) values ($1, '{}')",
      [tester],
    );
    await db.admin.query(
      "insert into public.learning_days (user_id, day) values ($1, current_date - 1), ($1, current_date)",
      [tester],
    );
    await db.admin.query(
      "insert into companion.moderation_state (user_id, strikes) values ($1, 2)",
      [tester],
    );
    await rpc(server, "ops_tester_set_tier", [ACTOR, tester, "premium", null]);
    await rpc(server, "ops_tester_set_plan", [ACTOR, tester, "chat_plus", true, null]);

    const state = await rpc(server, "ops_tester_state", [ACTOR, tester]);
    expect(state).toEqual({
      ok: true,
      user: expect.objectContaining({ id: tester, tester: true, balance: 6, tier: "chat_plus" }),
      profile: {
        birthYear: null,
        ageSource: null,
        l1: null,
        feedbackMode: null,
        region: null,
        proactivePref: "daily1",
        proactiveHour: null,
        timezone: null,
        replySuggestions: true,
        snapshotSelf: "female",
        learningScope: "auto",
        learningUnits: [],
      },
      wallet: { sub: 1, grant: 2, paid: 3, subExpiresAt: null },
      tier: { tier: "premium", expiresAt: null },
      plans: [
        {
          entitlement: "chat_plus",
          status: "active",
          expiresAt: null,
          store: "ops",
          productId: "ops_tester",
        },
      ],
      plansAvailable: ["unlimited_tickets", "chat_plus", "premium"],
      characters: expect.any(Array),
      learning: {
        hasProgress: true,
        updatedAt: expect.any(String),
        days: 2,
        lastDay: expect.any(String),
        coinClaims: 0,
      },
      moderation: { strikes: 2, blockedUntil: null },
    });
    const characters = (
      await db.admin.query("select id from companion.characters order by sort_order, id")
    ).rows.map((r) => r.id);
    expect(state.characters.map((c: Json) => c.character)).toEqual(characters);
    expect(state.characters.find((c: Json) => c.character === "mina")).toEqual({
      character: "mina",
      name: "미나",
      intimacy: 25,
      speechLevel: "casual",
      messages: 2,
    });
    expect(state.characters.find((c: Json) => c.character === "duksu")).toMatchObject({
      intimacy: 0,
      speechLevel: "polite",
      messages: 0,
    });

    const logs = (await auditRows(db)).filter((l) => l.action === "tester_state");
    expect(logs.map((l) => [l.kind, l.target_user, l.detail, l.result])).toEqual([
      ["view", real, { error: "not_a_tester" }, "refused"],
      ["view", tester, {}, "ok"],
    ]);
  });

  test("OT-8 전환 · 해제: duru_tester 켜기 · 지우기(다른 키는 그대로) · before/after/paid · 쓰기 기록", async () => {
    await server.query(
      "select public.companion_grant_credits($1, 'paid', 10, 'purchase', 'rc:tx-9', null)",
      [real],
    );
    expect(await rpc(server, "ops_set_tester", [ACTOR, real, true])).toEqual({
      ok: true,
      before: false,
      after: true,
      paid: true,
      removed: { plans: 0, tier: 0 },
    });
    const meta = async (user: string) =>
      (await db.admin.query("select raw_app_meta_data as m from auth.users where id = $1", [user]))
        .rows[0].m;
    expect(await meta(real)).toEqual({ provider: "apple", duru_tester: true });
    // 이제 시험 계정만 되는 조작이 된다.
    expect((await rpc(server, "ops_tester_state", [ACTOR, real])).ok).toBe(true);

    expect(await rpc(server, "ops_set_tester", [ACTOR, tester, false])).toEqual({
      ok: true,
      before: true,
      after: false,
      paid: false,
      removed: { plans: 0, tier: 0 },
    });
    expect(await meta(tester)).toEqual({ provider: "email" });
    expect(await rpc(server, "ops_set_tester", [ACTOR, tester, false])).toMatchObject({
      before: false,
      after: false,
    });

    await expect(rpc(server, "ops_set_tester", [ACTOR, nobody, true])).rejects.toThrow(/not_found/);
    await expect(rpc(server, "ops_set_tester", [ACTOR, real, null])).rejects.toThrow(
      /invalid_value/,
    );
    const logs = (await auditRows(db)).filter((l) => l.action === "set_tester");
    expect(logs.map((l) => [l.kind, l.target_user, l.detail, l.result])).toEqual([
      [
        "write",
        real,
        { before: false, after: true, paid: true, removed: { plans: 0, tier: 0 } },
        "ok",
      ],
      [
        "write",
        tester,
        { before: true, after: false, paid: false, removed: { plans: 0, tier: 0 } },
        "ok",
      ],
      [
        "write",
        tester,
        { before: false, after: false, paid: false, removed: { plans: 0, tier: 0 } },
        "ok",
      ],
    ]);
  });

  test("OT-8b 해제는 운영자가 넣은 등급(플랜 ops 행 · 옛 등급 ops_admin · playground)을 지운다 — 스토어 행은 그대로, 엽전 크론도 멈춘다", async () => {
    await rpc(server, "ops_tester_set_plan", [ACTOR, tester, "premium", true, null]);
    await rpc(server, "ops_tester_set_tier", [ACTOR, tester, "premium", null]);
    // 스토어(RevenueCat) 행 — 다른 플랜.
    await db.admin.query(
      `insert into companion.plan_entitlements (user_id, entitlement, product_id, store, environment, status, will_renew,
         period_started_at, expires_at, source_event_id, last_event_at)
       values ($1, 'chat_plus', 'chat_plus_monthly', 'app_store', 'production', 'active', true,
         now() - interval '1 day', now() + interval '29 days', 'rc:evt-1', now())`,
      [tester],
    );
    expect(await rpc(server, "ops_set_tester", [ACTOR, tester, false])).toEqual({
      ok: true,
      before: true,
      after: false,
      paid: false,
      removed: { plans: 1, tier: 1 },
    });
    const plans = (
      await db.admin.query(
        "select entitlement, store from companion.plan_entitlements where user_id = $1",
        [tester],
      )
    ).rows;
    expect(plans).toEqual([{ entitlement: "chat_plus", store: "app_store" }]);
    expect(
      (
        await db.admin.query(
          "select count(*)::int as n from companion.entitlements where user_id = $1",
          [tester],
        )
      ).rows[0].n,
    ).toBe(0);
    // 다른 source(실제 등급)의 옛 등급 행은 그대로.
    await db.admin.query(
      "insert into companion.entitlements (user_id, tier, expires_at, source) values ($1, 'premium', null, 'revenuecat')",
      [real],
    );
    await rpc(server, "ops_set_tester", [ACTOR, real, false]);
    expect(
      (await db.admin.query("select source from companion.entitlements where user_id = $1", [real]))
        .rows,
    ).toEqual([{ source: "revenuecat" }]);

    // 크론(grant_plan_coins)은 이제 스토어 플랜 엽전만 준다.
    await db.admin.query("select companion.grant_plan_coins($1, now())", [tester]);
    const coins = (
      await db.admin.query(
        "select ref_id from companion.credit_ledger where user_id = $1 and reason = 'plan_coins'",
        [tester],
      )
    ).rows.map((r) => r.ref_id as string);
    expect(coins).toHaveLength(1);
    expect(coins[0]).toContain(":chat_plus:");
    const [log] = (await auditRows(db)).filter((l) => l.action === "set_tester");
    expect(log!.detail).toEqual({
      before: true,
      after: false,
      paid: false,
      removed: { plans: 1, tier: 1 },
    });
  });

  test("OT-9 프로필: companion_operator_set_profile와 같은 뜻(null = 그대로 · '' / -1 / clear_age = 지움) · 칸마다 invalid_*", async () => {
    const set = (args: Record<string, unknown>, user = tester) =>
      named(server, "ops_tester_set_profile", { p_actor: ACTOR, p_user: user, ...args });
    const r = await set({
      p_birth_year: 2000,
      p_l1: "en",
      p_feedback_mode: "natural",
      p_region: "KR",
      p_proactive_pref: "daily2",
      p_proactive_hour: 9,
      p_timezone: "Asia/Seoul",
      p_reply_suggestions: false,
      p_snapshot_self: "hidden",
    });
    expect(r).toEqual({
      ok: true,
      profile: {
        birthYear: 2000,
        ageSource: "self",
        l1: "en",
        feedbackMode: "natural",
        region: "KR",
        proactivePref: "daily2",
        proactiveHour: 9,
        timezone: "Asia/Seoul",
        replySuggestions: false,
        snapshotSelf: "hidden",
        learningScope: "auto",
        learningUnits: [],
      },
    });
    // null은 그대로.
    expect((await set({ p_l1: "ja" })).profile).toMatchObject({
      l1: "ja",
      birthYear: 2000,
      region: "KR",
      proactiveHour: 9,
    });
    expect(
      (await set({ p_clear_age: true, p_region: "", p_proactive_hour: -1, p_timezone: "" }))
        .profile,
    ).toMatchObject({
      birthYear: null,
      ageSource: null,
      region: null,
      proactiveHour: null,
      timezone: null,
      l1: "ja",
    });

    for (const [args, code] of [
      [{ p_birth_year: 1899 }, "invalid_birth_year"],
      [{ p_birth_year: new Date().getFullYear() + 1 }, "invalid_birth_year"],
      [{ p_l1: "EN" }, "invalid_l1"],
      [{ p_feedback_mode: "loud" }, "invalid_feedback_mode"],
      [{ p_region: "kr" }, "invalid_region"],
      [{ p_proactive_pref: "hourly" }, "invalid_proactive_pref"],
      [{ p_proactive_hour: 24 }, "invalid_proactive_hour"],
      [{ p_timezone: "Mars/Base" }, "invalid_timezone"],
      [{ p_snapshot_self: "true" }, "invalid_snapshot_self"],
    ] as const) {
      await expect(set(args)).rejects.toThrow(new RegExp(code));
    }
    await expect(set({ p_l1: "en" }, nobody)).rejects.toThrow(/not_found/);
    expect(await set({ p_l1: "en" }, real)).toEqual({ ok: false, error: "not_a_tester" });
    expect(
      (
        await db.admin.query(
          "select count(*)::int as n from companion.profiles where user_id = $1",
          [real],
        )
      ).rows[0].n,
    ).toBe(0);

    const logs = (await auditRows(db)).filter((l) => l.action === "tester_set_profile");
    expect(logs.map((l) => [l.target_user, l.detail, l.result])).toEqual([
      [
        tester,
        {
          birthYear: 2000,
          l1: "en",
          feedbackMode: "natural",
          region: "KR",
          proactivePref: "daily2",
          proactiveHour: 9,
          timezone: "Asia/Seoul",
          replySuggestions: false,
          snapshotSelf: "hidden",
        },
        "ok",
      ],
      [tester, { l1: "ja" }, "ok"],
      [tester, { clearAge: true, region: "", proactiveHour: -1, timezone: "" }, "ok"],
      [real, { l1: "en", error: "not_a_tester" }, "refused"],
    ]);
  });

  test("OT-10 학습 범위: companion_operator_set_learning_scope · units null은 그대로 · 검사 · 거절", async () => {
    expect(
      await rpc(
        server,
        "ops_tester_set_learning_scope",
        [ACTOR, tester, "manual", ["ep-2", "ep-1", "ep-2"]],
        ["", "", "", "text[]"],
      ),
    ).toEqual({ ok: true, learningScope: "manual", learningUnits: ["ep-1", "ep-2"] });
    expect(
      await rpc(
        server,
        "ops_tester_set_learning_scope",
        [ACTOR, tester, "auto", null],
        ["", "", "", "text[]"],
      ),
    ).toEqual({ ok: true, learningScope: "auto", learningUnits: ["ep-1", "ep-2"] });
    await expect(
      rpc(
        server,
        "ops_tester_set_learning_scope",
        [ACTOR, tester, "all", null],
        ["", "", "", "text[]"],
      ),
    ).rejects.toThrow(/invalid_scope/);
    await expect(
      rpc(
        server,
        "ops_tester_set_learning_scope",
        [ACTOR, tester, "manual", ["Bad Id"]],
        ["", "", "", "text[]"],
      ),
    ).rejects.toThrow(/invalid_units/);
    const many = Array.from({ length: 51 }, (_, i) => `ep-${i}`);
    await expect(
      rpc(
        server,
        "ops_tester_set_learning_scope",
        [ACTOR, tester, "manual", many],
        ["", "", "", "text[]"],
      ),
    ).rejects.toThrow(/invalid_units/);
    expect(
      await rpc(
        server,
        "ops_tester_set_learning_scope",
        [ACTOR, real, "manual", ["ep-1"]],
        ["", "", "", "text[]"],
      ),
    ).toEqual({ ok: false, error: "not_a_tester" });
    const logs = (await auditRows(db)).filter((l) => l.action === "tester_set_learning_scope");
    expect(logs.map((l) => l.result)).toEqual(["ok", "ok", "refused"]);
  });

  test("OT-11 친밀도: 0 ~ 10000 · 관계 행을 만든다 · 말투는 턴과 같은 문턱(캐릭터 상한까지) · 거절", async () => {
    expect(await rpc(server, "ops_tester_set_intimacy", [ACTOR, tester, "mina", 60])).toEqual({
      ok: true,
      before: 0,
      after: 60,
    });
    const rel = async (character: string) =>
      (
        await db.admin.query(
          "select intimacy, speech_level from companion.relationships where user_id = $1 and character_id = $2",
          [tester, character],
        )
      ).rows[0];
    expect(await rel("mina")).toEqual({ intimacy: 60, speech_level: "slang" });
    expect(await rpc(server, "ops_tester_set_intimacy", [ACTOR, tester, "mina", 25])).toEqual({
      ok: true,
      before: 60,
      after: 25,
    });
    expect(await rel("mina")).toEqual({ intimacy: 25, speech_level: "casual" });
    await rpc(server, "ops_tester_set_intimacy", [ACTOR, tester, "mina", 0]);
    expect(await rel("mina")).toEqual({ intimacy: 0, speech_level: "polite" });
    // 덕수쌤은 끝까지 존댓말(maxSpeechLevel polite).
    await rpc(server, "ops_tester_set_intimacy", [ACTOR, tester, "duksu", 10000]);
    expect(await rel("duksu")).toEqual({ intimacy: 10000, speech_level: "polite" });

    await expect(
      rpc(server, "ops_tester_set_intimacy", [ACTOR, tester, "mina", -1]),
    ).rejects.toThrow(/invalid_value/);
    await expect(
      rpc(server, "ops_tester_set_intimacy", [ACTOR, tester, "mina", 10001]),
    ).rejects.toThrow(/invalid_value/);
    await expect(
      rpc(server, "ops_tester_set_intimacy", [ACTOR, tester, "nobody", 1]),
    ).rejects.toThrow(/invalid_character/);
    expect(await rpc(server, "ops_tester_set_intimacy", [ACTOR, real, "mina", 5])).toEqual({
      ok: false,
      error: "not_a_tester",
    });
    expect(
      (
        await db.admin.query(
          "select count(*)::int as n from companion.relationships where user_id = $1",
          [real],
        )
      ).rows[0].n,
    ).toBe(0);
    const logs = (await auditRows(db)).filter((l) => l.action === "tester_set_intimacy");
    expect(logs[0]).toMatchObject({
      kind: "write",
      target_user: tester,
      detail: { character: "mina", before: 0, after: 60, speechLevel: "slang" },
      result: "ok",
    });
    expect(logs.at(-1)).toMatchObject({ target_user: real, result: "refused" });
  });

  test("OT-12 구독 플랜: 켜면 운영 표시 행 upsert(등급이 바뀜) · 끄면 지움 · 모르는 플랜 · 거절", async () => {
    const until = iso(7 * DAY);
    const on = await rpc(server, "ops_tester_set_plan", [ACTOR, tester, "premium", true, until]);
    expect(on).toEqual({
      ok: true,
      plans: [
        {
          entitlement: "premium",
          status: "active",
          expiresAt: expect.any(String),
          store: "ops",
          productId: "ops_tester",
        },
      ],
    });
    expect(Date.parse(on.plans[0].expiresAt)).toBe(Date.parse(until));
    const row = (
      await db.admin.query(
        "select environment, will_renew, source_event_id, last_event_at from companion.plan_entitlements where user_id = $1",
        [tester],
      )
    ).rows[0];
    expect(row).toMatchObject({ environment: "sandbox", will_renew: false });
    expect(row.source_event_id).toMatch(/^ops:[0-9a-f-]{36}$/);
    expect((await rpc(server, "ops_search_users", [ACTOR, tester])).items[0].tier).toBe("premium");

    // 다시 켜면 만료를 바꾼다(만료 없음).
    expect(
      (await rpc(server, "ops_tester_set_plan", [ACTOR, tester, "premium", true, null])).plans[0]
        .expiresAt,
    ).toBeNull();
    // 상태가 끝난 행도 다시 active로.
    await db.admin.query(
      "update companion.plan_entitlements set status = 'expired' where user_id = $1",
      [tester],
    );
    expect(
      (await rpc(server, "ops_tester_set_plan", [ACTOR, tester, "premium", true, null])).plans[0]
        .status,
    ).toBe("active");

    expect(await rpc(server, "ops_tester_set_plan", [ACTOR, tester, "premium", false])).toEqual({
      ok: true,
      plans: [],
    });
    expect((await rpc(server, "ops_search_users", [ACTOR, tester])).items[0].tier).toBe("free");

    await expect(rpc(server, "ops_tester_set_plan", [ACTOR, tester, "free", true])).rejects.toThrow(
      /invalid_entitlement/,
    );
    await expect(rpc(server, "ops_tester_set_plan", [ACTOR, tester, "gold", true])).rejects.toThrow(
      /invalid_entitlement/,
    );
    await expect(
      rpc(server, "ops_tester_set_plan", [ACTOR, tester, "premium", null]),
    ).rejects.toThrow(/invalid_value/);
    expect(await rpc(server, "ops_tester_set_plan", [ACTOR, real, "premium", true])).toEqual({
      ok: false,
      error: "not_a_tester",
    });
    expect(
      (await db.admin.query("select count(*)::int as n from companion.plan_entitlements")).rows[0]
        .n,
    ).toBe(0);
    const logs = (await auditRows(db)).filter((l) => l.action === "tester_set_plan");
    expect(logs.map((l) => l.result)).toEqual(["ok", "ok", "ok", "ok", "refused"]);
    expect(logs[0]!.detail).toEqual({
      entitlement: "premium",
      active: true,
      expiresAt: expect.any(String),
    });
  });

  test("OT-12b 스토어 행이 있는 플랜은 켜기 · 끄기 모두 store_plan(refused) · 다시 켜도 활성 운영 행의 기간은 그대로", async () => {
    // 결제한 사람을 시험 계정으로 바꾼 경우: 취소했지만 만료 전(화면은 꺼짐처럼 보일 수 있음).
    await db.admin.query(
      `insert into companion.plan_entitlements (user_id, entitlement, product_id, store, environment, status, will_renew,
         period_started_at, expires_at, source_event_id, last_event_at)
       values ($1, 'premium', 'premium_monthly', 'app_store', 'production', 'cancelled', false,
         now() - interval '3 days', now() + interval '27 days', 'rc:evt-2', now() - interval '1 day')`,
      [tester],
    );
    const before = (
      await db.admin.query("select * from companion.plan_entitlements where user_id = $1", [tester])
    ).rows;
    for (const active of [true, false]) {
      expect(
        await rpc(server, "ops_tester_set_plan", [ACTOR, tester, "premium", active, null]),
      ).toEqual({
        ok: false,
        error: "store_plan",
      });
    }
    // store가 비어 있는 행도 스토어 행으로 본다.
    await db.admin.query(
      `insert into companion.plan_entitlements (user_id, entitlement, product_id, store, status, source_event_id, last_event_at)
       values ($1, 'unlimited_tickets', 'tickets', null, 'active', 'rc:evt-3', now())`,
      [tester],
    );
    expect(
      await rpc(server, "ops_tester_set_plan", [ACTOR, tester, "unlimited_tickets", false, null]),
    ).toEqual({ ok: false, error: "store_plan" });
    expect(
      (
        await db.admin.query(
          "select * from companion.plan_entitlements where user_id = $1 and entitlement = 'premium'",
          [tester],
        )
      ).rows,
    ).toEqual(before);
    const refused = (await auditRows(db)).filter((l) => l.action === "tester_set_plan");
    expect(refused.map((l) => [l.result, l.detail.error])).toEqual([
      ["refused", "store_plan"],
      ["refused", "store_plan"],
      ["refused", "store_plan"],
    ]);

    // 운영 행: 활성일 때 다시 켜면 period_started_at 그대로 → 크론이 첫 달 엽전을 또 주지 않는다.
    await rpc(server, "ops_tester_set_plan", [ACTOR, tester, "chat_plus", true, null]);
    const period = async () =>
      (
        await db.admin.query(
          "select period_started_at as p from companion.plan_entitlements where user_id = $1 and entitlement = 'chat_plus'",
          [tester],
        )
      ).rows[0].p as Date;
    const first = await period();
    await db.admin.query("select companion.grant_plan_coins($1, now())", [tester]);
    await rpc(server, "ops_tester_set_plan", [ACTOR, tester, "chat_plus", true, iso(5 * DAY)]);
    expect((await period()).getTime()).toBe(first.getTime());
    await db.admin.query("select companion.grant_plan_coins($1, now())", [tester]);
    const grants = async () =>
      (
        await db.admin.query(
          "select count(*)::int as n from companion.credit_ledger where user_id = $1 and reason = 'plan_coins' and ref_id like '%:chat_plus:%'",
          [tester],
        )
      ).rows[0].n;
    expect(await grants()).toBe(1);
    // 끝난 운영 행을 다시 켜면 새 기간.
    await db.admin.query(
      "update companion.plan_entitlements set status = 'expired' where user_id = $1 and entitlement = 'chat_plus'",
      [tester],
    );
    await rpc(server, "ops_tester_set_plan", [ACTOR, tester, "chat_plus", true, null]);
    expect((await period()).getTime()).toBeGreaterThan(first.getTime());
  });

  test("OT-13 학습 초기화: 진도 · 학습일을 지우고 수령 지급의 ref_id를 풀어 다시 받게 한다(원장 · 지갑 그대로)", async () => {
    await db.admin.query(
      "insert into public.learning_progress (user_id, progress) values ($1, '{\"catalogProgress\": {}}')",
      [tester],
    );
    await db.admin.query(
      "insert into public.learning_days (user_id, day) values ($1, current_date - 1), ($1, current_date)",
      [tester],
    );
    const grantOnce = async (reason: string, ref: string) =>
      (
        await db.admin.query("select companion.grant_once($1, 5, $2, $3) as ok", [
          tester,
          reason,
          ref,
        ])
      ).rows[0].ok as boolean;
    expect(await grantOnce("learning", `${tester}:ep-1:u1`)).toBe(true);
    expect(await grantOnce("launch_bonus", `${tester}:2026-11`)).toBe(true);
    expect(await grantOnce("streak", `${tester}:2026-11-17:3`)).toBe(true);
    expect(await grantOnce("learning", `${tester}:ep-1:u1`)).toBe(false);
    // 다른 지급은 건드리지 않는다.
    await server.query(
      "select public.companion_grant_credits($1, 'paid', 10, 'purchase', 'rc:tx-5', null)",
      [tester],
    );
    expect((await rpc(server, "ops_tester_state", [ACTOR, tester])).learning.coinClaims).toBe(3);

    expect(await rpc(server, "ops_tester_reset_learning", [ACTOR, tester])).toEqual({
      ok: true,
      deleted: { progress: 1, days: 2, claims: 3 },
    });
    const state = await rpc(server, "ops_tester_state", [ACTOR, tester]);
    expect(state.learning).toEqual({
      hasProgress: false,
      updatedAt: null,
      days: 0,
      lastDay: null,
      coinClaims: 0,
    });
    expect(state.wallet).toMatchObject({ grant: 15, paid: 10 });
    expect(await ledgerSum(db, tester)).toEqual({ w: 25, l: 25 });
    expect(
      (
        await db.admin.query(
          "select ref_id from companion.credit_ledger where user_id = $1 and reason = 'purchase'",
          [tester],
        )
      ).rows[0].ref_id,
    ).toBe("rc:tx-5");
    // 다시 받을 수 있다.
    expect(await grantOnce("learning", `${tester}:ep-1:u1`)).toBe(true);
    expect(await grantOnce("launch_bonus", `${tester}:2026-11`)).toBe(true);
    // 두 번째 초기화는 새로 받은 것만 푼다(이미 푼 것은 다시 붙이지 않음).
    expect(await rpc(server, "ops_tester_reset_learning", [ACTOR, tester])).toEqual({
      ok: true,
      deleted: { progress: 0, days: 0, claims: 2 },
    });

    expect(await rpc(server, "ops_tester_reset_learning", [ACTOR, real])).toEqual({
      ok: false,
      error: "not_a_tester",
    });
    await expect(rpc(server, "ops_tester_reset_learning", [ACTOR, nobody])).rejects.toThrow(
      /not_found/,
    );
    const logs = (await auditRows(db)).filter((l) => l.action === "tester_reset_learning");
    expect(logs.map((l) => [l.target_user, l.detail, l.result])).toEqual([
      [tester, { deleted: { progress: 1, days: 2, claims: 3 } }, "ok"],
      [tester, { deleted: { progress: 0, days: 0, claims: 2 } }, "ok"],
      [real, { error: "not_a_tester" }, "refused"],
    ]);
  });

  test("OT-14 마이그레이션을 다시 적용해도 같다", async () => {
    await rpc(server, "ops_set_tester", [ACTOR, real, true]);
    await db.admin.query(
      await readFile(new URL("./20261213130000_ops_admin_testers.sql", import.meta.url), "utf8"),
    );
    expect((await rpc(server, "ops_list_testers", [ACTOR])).items.map((u: Json) => u.id)).toEqual([
      real,
      tester,
    ]);
    expect((await auditRows(db)).map((l) => l.action)).toEqual(["set_tester", "list_testers"]);
  });
});

describe("구독 표가 없는 DB(20261129 운영 적용 전)", () => {
  let db: Db;
  let server: Client;

  beforeAll(async () => {
    db = await startTestDatabase();
    // ops-admin.integration.test.ts와 같이 20261129 전 모양으로 되돌린 뒤 20261212 · 20261213 · 20261214를 다시 적용한다
    // (20261213만 다시 적용하면 옛 인수 꼴 ops_search_users가 20261214 것과 함께 남는다).
    await db.admin.query(`
      drop table companion.store_events, companion.plan_entitlements, companion.store_products, companion.plans cascade;
      create or replace function companion.tier_of(p_user_id uuid, p_now timestamptz)
      returns text language sql stable as $$
        select coalesce((
          select tier from companion.entitlements
          where user_id = p_user_id and (expires_at is null or expires_at > p_now)
        ), 'free')
      $$;
    `);
    for (const file of [
      "20261212120000_ops_admin.sql",
      "20261213130000_ops_admin_testers.sql",
      "20261214130000_ops_admin_sort.sql",
      "20261227130000_ops_admin_media_counts.sql",
    ]) {
      await db.admin.query(await readFile(new URL(`./${file}`, import.meta.url), "utf8"));
    }
    server = await db.connect();
    await server.query("set role service_role");
  }, 90_000);
  afterAll(async () => {
    await db?.close();
  });
  beforeEach(async () => {
    await seed(db);
  });

  test("OT-20 플랜 칸은 null · 플랜 켜기는 plans_unavailable(refused) · paid는 원장만 본다", async () => {
    const state = await rpc(server, "ops_tester_state", [ACTOR, tester]);
    expect(state).toMatchObject({ ok: true, plans: null, plansAvailable: null, tier: null });
    expect(await rpc(server, "ops_tester_set_plan", [ACTOR, tester, "premium", true])).toEqual({
      ok: false,
      error: "plans_unavailable",
    });
    const [log] = (await auditRows(db)).filter((l) => l.action === "tester_set_plan");
    expect(log).toMatchObject({
      result: "refused",
      detail: { entitlement: "premium", error: "plans_unavailable" },
    });

    expect((await rpc(server, "ops_search_users", [ACTOR, "real@"])).items[0].paid).toBe(false);
    await server.query(
      "select public.companion_grant_credits($1, 'paid', 10, 'purchase', 'rc:tx-1', null)",
      [real],
    );
    expect((await rpc(server, "ops_search_users", [ACTOR, "real@"])).items[0].paid).toBe(true);
    expect(
      (await named(server, "ops_search_users", { p_actor: ACTOR, p_tier: "free" })).total,
    ).toBe(3);
  });
});
