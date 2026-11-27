import { readFile } from "node:fs/promises";
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";
import { startTestDatabase } from "./postgres.test-support";

// 운영 도구(20261212, ops-dashboard docs/admin-contract.md §A): ops 스키마 · public.ops_* RPC · 열람/쓰기 기록 ·
// 시험 계정 확인(기존 RPC 포함) · 20261129(구독) 표가 있을 때와 없을 때.
const tester = "00000000-0000-4000-8000-0000000000a1";
const real = "00000000-0000-4000-8000-0000000000a2";
const other = "00000000-0000-4000-8000-0000000000a3";
const nobody = "00000000-0000-4000-8000-0000000000ff";
const REQUEST_A = "00000000-0000-4000-8000-0000000000a1";
const REQUEST_B = "00000000-0000-4000-8000-0000000000b2";
const ACTOR = "komet";
const DAY = 86_400_000;
const iso = (offsetMs: number) => new Date(Date.now() + offsetMs).toISOString();

type Db = Awaited<ReturnType<typeof startTestDatabase>>;
type Client = Awaited<ReturnType<Db["connect"]>>;
type Json = Record<string, any>;

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

async function seed(db: Db) {
  await db.admin.query("truncate auth.users cascade");
  await db.admin.query("truncate ops.audit_log, ops.push_sends");
  await db.admin.query("update companion.settings set testers_only = true");
  await db.admin.query(
    `insert into auth.users (id, email, raw_app_meta_data, created_at, last_sign_in_at) values
       ($1, 'tester@libitum.test', '{"duru_tester": true, "provider": "email"}', now() - interval '3 days', now() - interval '1 hour'),
       ($2, 'Real.User@Example.com', '{"provider": "apple"}', now() - interval '2 days', null),
       ($3, 'other_50%@example.com', '{"provider": "google"}', now() - interval '1 day', null)`,
    [tester, real, other],
  );
  await db.admin.query(
    `insert into public.learner_profiles (user_id, name, country_code) values ($1, 'Minji', 'KR'), ($2, 'Alex', 'US')`,
    [tester, real],
  );
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

  test("OA-1 anon · authenticated는 ops_* 를 부르지 못하고 ops 표를 읽지 못한다 — service_role도 표는 RPC로만", async () => {
    const functions = (
      await db.admin.query(
        `select p.oid::regprocedure::text as sig,
                has_function_privilege('anon', p.oid, 'execute') as anon,
                has_function_privilege('authenticated', p.oid, 'execute') as auth,
                has_function_privilege('service_role', p.oid, 'execute') as service,
                p.prosecdef as definer, p.proconfig as config
         from pg_proc p join pg_namespace n on n.oid = p.pronamespace
         where n.nspname = 'public' and p.proname like 'ops\\_%'`,
      )
    ).rows;
    // 20261212의 22개 + 20261213(2차)의 10개 + 20261215(판정 메시지)의 1개 + 20270118(판정 · 기억 · 스토리 조회)의 6개.
    expect(functions.length).toBe(39);
    for (const f of functions) {
      expect({
        sig: f.sig,
        anon: f.anon,
        auth: f.auth,
        service: f.service,
        definer: f.definer,
        // 판정 현황 · 목록(20270120)은 제한 시간 설정을 더 가집니다 — 그 값은 그쪽 테스트(OI-8)가 봅니다.
        config: (f.config as string[]).filter((entry) => !entry.startsWith("statement_timeout=")),
      }).toEqual({
        sig: f.sig,
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
      await expect(client.query("select public.ops_find_users('x', 'tester')")).rejects.toThrow(
        /permission denied/,
      );
      await expect(client.query("select public.ops_settings('x')")).rejects.toThrow(
        /permission denied/,
      );
      await expect(client.query("select count(*) from ops.audit_log")).rejects.toThrow(
        /permission denied/,
      );
      await expect(client.query("select count(*) from ops.user_notes")).rejects.toThrow(
        /permission denied/,
      );
    }
    await expect(server.query("select count(*) from ops.audit_log")).rejects.toThrow(
      /permission denied/,
    );
    await expect(server.query("select ops.is_tester($1)", [tester])).rejects.toThrow(
      /permission denied/,
    );
  });

  test("OA-2 행위자가 비면 actor_required, 200자를 넘으면 invalid_actor", async () => {
    for (const actor of ["", "   ", null]) {
      await expect(rpc(server, "ops_find_users", [actor, "tester"])).rejects.toThrow(
        /actor_required/,
      );
      await expect(rpc(server, "ops_settings", [actor])).rejects.toThrow(/actor_required/);
      await expect(rpc(server, "ops_add_note", [actor, tester, "메모"])).rejects.toThrow(
        /actor_required/,
      );
    }
    await expect(rpc(server, "ops_find_users", ["a".repeat(201), "tester"])).rejects.toThrow(
      /invalid_actor/,
    );
    expect(await auditRows(db)).toEqual([]);
  });

  test("OA-3 찾기: 이메일 · 이름 부분 일치, uuid는 id 일치, % _ 는 글자 그대로 — UserRow 모양 · 열람 기록", async () => {
    await db.admin.query(
      "insert into companion.credit_wallets (user_id, grant_balance, paid_balance) values ($1, 30, 12)",
      [tester],
    );
    const byEmail = await rpc(server, "ops_find_users", [ACTOR, "TESTER@"]);
    expect(byEmail.items).toHaveLength(1);
    const row = byEmail.items[0];
    expect(row).toEqual({
      id: tester,
      email: "tester@libitum.test",
      name: "Minji",
      country: "KR",
      createdAt: expect.any(String),
      lastSignInAt: expect.any(String),
      provider: "email",
      tester: true,
      tier: "free",
      balance: 42,
      blockedUntil: null,
      paid: false,
    });
    expect(Number.isNaN(Date.parse(row.createdAt))).toBe(false);

    expect(
      (await rpc(server, "ops_find_users", [ACTOR, "ale"])).items.map((u: Json) => u.id),
    ).toEqual([real]);
    expect(
      (await rpc(server, "ops_find_users", [ACTOR, real.toUpperCase()])).items.map(
        (u: Json) => u.id,
      ),
    ).toEqual([real]);
    // 이스케이프: '%' 는 아무 글자가 아니라 % 그 자체.
    expect(
      (await rpc(server, "ops_find_users", [ACTOR, "50%"])).items.map((u: Json) => u.id),
    ).toEqual([other]);
    expect((await rpc(server, "ops_find_users", [ACTOR, "%%"])).items).toEqual([]);
    expect(
      (await rpc(server, "ops_find_users", [ACTOR, "r_"])).items.map((u: Json) => u.id),
    ).toEqual([other]);
    // 최신 가입부터, p_limit.
    expect(
      (await rpc(server, "ops_find_users", [ACTOR, "er", 2])).items.map((u: Json) => u.id),
    ).toEqual([other, real]);

    await expect(rpc(server, "ops_find_users", [ACTOR, "a"])).rejects.toThrow(/invalid_query/);
    await expect(rpc(server, "ops_find_users", [ACTOR, "ab", 101])).rejects.toThrow(
      /invalid_limit/,
    );

    const logs = await auditRows(db);
    expect(logs[0]).toEqual({
      actor: ACTOR,
      kind: "view",
      action: "find_users",
      target_user: null,
      detail: { query: "TESTER@" },
      result: "ok",
    });
    expect(logs).toHaveLength(7);
  });

  test("OA-4 목록: 최근 가입 · 사용량(메시지 · 쓴 엽전) · 신고/스트라이크", async () => {
    const conversation = (
      await db.admin.query(
        "insert into companion.conversations (user_id, character_id) values ($1, 'duksu') returning id",
        [real],
      )
    ).rows[0].id;
    await db.admin.query(
      `insert into companion.messages (conversation_id, user_id, role, status, client_message_id, text)
       select $1, $2, 'user', 'complete', gen_random_uuid(), '안녕' from generate_series(1, 3)`,
      [conversation, real],
    );
    const reply = (
      await db.admin.query(
        `insert into companion.messages (conversation_id, user_id, role, status, text) values ($1, $2, 'assistant', 'complete', '반가워요')
         returning id`,
        [conversation, real],
      )
    ).rows[0].id;
    await db.admin.query(
      `insert into companion.credit_ledger (user_id, delta, bucket, kind) values ($1, -9, 'grant', 'reserve'), ($1, 3, 'grant', 'release'),
         ($2, -3, 'grant', 'reserve')`,
      [real, tester],
    );
    await db.admin.query(
      "insert into companion.message_reports (message_id, user_id, reason) values ($1, $2, '이상해요')",
      [reply, real],
    );
    await db.admin.query(
      "insert into companion.moderation_state (user_id, strikes) values ($1, 2), ($2, 1)",
      [other, tester],
    );

    const recent = await rpc(server, "ops_list_users", [ACTOR, "recent"]);
    expect(recent.items.map((u: Json) => u.id)).toEqual([other, real, tester]);
    expect(recent.items[1]).toMatchObject({
      id: real,
      messages: 3,
      creditsSpent: 6,
      reports: 1,
      strikes: 0,
    });

    const usage = await rpc(server, "ops_list_users", [ACTOR, "usage", 1, 10]);
    expect(usage.items.map((u: Json) => [u.id, u.messages, u.creditsSpent])).toEqual([
      [real, 3, 6],
      [tester, 0, 3],
    ]);

    const reports = await rpc(server, "ops_list_users", [ACTOR, "reports"]);
    expect(reports.items.map((u: Json) => [u.id, u.reports, u.strikes])).toEqual([
      [other, 0, 2],
      [tester, 0, 1],
      [real, 1, 0],
    ]);

    await expect(rpc(server, "ops_list_users", [ACTOR, "rich"])).rejects.toThrow(/invalid_kind/);
    await expect(rpc(server, "ops_list_users", [ACTOR, "recent", 91])).rejects.toThrow(
      /invalid_days/,
    );
    await expect(rpc(server, "ops_list_users", [ACTOR, "recent", 7, 201])).rejects.toThrow(
      /invalid_limit/,
    );
    expect((await auditRows(db)).map((r) => [r.action, r.detail])).toEqual([
      ["list_users", { kind: "recent", days: 7 }],
      ["list_users", { kind: "usage", days: 1 }],
      ["list_users", { kind: "reports", days: 7 }],
    ]);
  });

  test("OA-5 붙여 넣기 해석: uuid · 이메일(대소문자 무시, 정확히) · 중복 · 빈 줄 · 못 찾은 줄, 1000줄 상한", async () => {
    const resolved = await rpc(
      server,
      "ops_resolve_users",
      [
        ACTOR,
        [
          " real.user@example.COM ",
          tester,
          "",
          tester.toUpperCase(),
          "nobody@example.com",
          "real.user",
          nobody,
          "nobody@example.com",
        ],
      ],
      ["", "text[]"],
    );
    expect(resolved.found.map((u: Json) => u.id)).toEqual([real, tester]);
    expect(resolved.missing).toEqual(["nobody@example.com", "real.user", nobody]);
    expect(resolved.found[0]).toMatchObject({
      email: "Real.User@Example.com",
      tester: false,
      tier: "free",
    });

    const lines = Array.from({ length: 1001 }, (_, i) => `u${i}@example.com`);
    await expect(rpc(server, "ops_resolve_users", [ACTOR, lines], ["", "text[]"])).rejects.toThrow(
      /too_many_users/,
    );
    expect((await auditRows(db)).map((r) => [r.action, r.detail])).toEqual([
      ["resolve_users", { lines: 8, found: 2, missing: 3 }],
    ]);
  });

  test("OA-6 상세: 모든 칸 · 실제 열 이름 · 없는 값은 null · 열람 기록(대상) · 운영 기록은 열람 빼고", async () => {
    await expect(rpc(server, "ops_user_detail", [ACTOR, nobody])).rejects.toThrow(/not_found/);

    await db.admin.query(
      `insert into companion.profiles (user_id, birth_year, age_source, l1, feedback_mode, last_region, timezone)
       values ($1, 1995, 'self', 'en', 'natural', 'US', 'America/New_York')`,
      [real],
    );
    await db.admin.query(
      `insert into public.learning_days (user_id, day) values ($1, current_date), ($1, current_date - 1), ($1, current_date - 3)`,
      [real],
    );
    await db.admin.query(
      `insert into public.learning_progress (user_id, progress) values ($1, '{"a": 1}')`,
      [real],
    );
    await db.admin.query(
      "insert into public.feedback (user_id, kind, rating, message) values ($1, 'general', 4, '좋아요')",
      [real],
    );
    await db.admin.query(
      `insert into public.push_devices (token, user_id, environment, last_active_at) values ($1, $2, 'production', now())`,
      ["a".repeat(64), real],
    );
    await db.admin.query(
      "insert into companion.relationships (user_id, character_id, intimacy, speech_level) values ($1, 'mina', 12, 'casual')",
      [real],
    );
    await server.query(
      "select public.companion_grant_credits($1, 'paid', 50, 'purchase', 'rc:tx-1', null)",
      [real],
    );
    await db.admin.query(
      `insert into companion.store_events (id, type, action, user_id, environment, product_id, event_at, payload)
       values ('evt-1', 'INITIAL_PURCHASE', 'activate', $1, 'production', 'duru.premium.monthly.v1', now(), '{"store": "APP_STORE"}')`,
      [real],
    );
    await db.admin.query(
      `insert into companion.plan_entitlements (user_id, entitlement, product_id, store, status, expires_at, source_event_id, last_event_at)
       values ($1, 'premium', 'duru.premium.monthly.v1', 'APP_STORE', 'active', now() + interval '30 days', 'evt-1', now())`,
      [real],
    );
    await rpc(server, "ops_add_note", [ACTOR, real, "CS 문의 — 결제 확인"]);
    await rpc(server, "ops_find_users", [ACTOR, "real"]);

    const detail = await rpc(server, "ops_user_detail", [ACTOR, real]);
    expect(Object.keys(detail).sort()).toEqual(
      [
        "user",
        "profile",
        "learning",
        "wallet",
        "plan",
        "moderation",
        "reports",
        "feedback",
        "push",
        "companion",
        "notes",
        "ops",
      ].sort(),
    );
    expect(detail.user).toMatchObject({
      id: real,
      tier: "premium",
      balance: 50,
      country: "US",
      name: "Alex",
    });
    expect(detail.profile).toEqual({
      birthYear: 1995,
      l1: "en",
      feedbackMode: "natural",
      lastRegion: "US",
      timezone: "America/New_York",
      proactivePref: "daily1",
      replySuggestions: true,
    });
    expect(detail.learning).toMatchObject({ days: 3, streak: 2, progressBytes: 8 });
    expect(detail.learning.recentDays).toHaveLength(3);
    expect(detail.wallet).toMatchObject({
      sub: 0,
      subExpiresAt: null,
      grant: 0,
      paid: 50,
      holds: 0,
    });
    expect(detail.wallet.ledger).toEqual([
      {
        at: expect.any(String),
        delta: 50,
        bucket: "paid",
        kind: "grant",
        reason: "purchase",
        refId: "rc:tx-1",
      },
    ]);
    expect(detail.plan).toMatchObject({ tier: "premium", source: "store" });
    expect(detail.plan.entitlements).toEqual([
      expect.objectContaining({ entitlement: "premium", status: "active" }),
    ]);
    expect(detail.plan.storeEvents).toEqual([
      {
        at: expect.any(String),
        type: "INITIAL_PURCHASE",
        productId: "duru.premium.monthly.v1",
        store: "APP_STORE",
        environment: "production",
      },
    ]);
    expect(detail.moderation).toEqual({ strikes: 0, blockedUntil: null, events: [] });
    expect(detail.reports).toEqual({ received: [] });
    expect(detail.feedback).toEqual([
      { at: expect.any(String), kind: "general", rating: 4, message: "좋아요" },
    ]);
    expect(detail.push).toEqual({
      devices: [{ environment: "production", lastActiveAt: expect.any(String) }],
    });
    expect(detail.companion.characters).toEqual([
      { characterId: "mina", intimacy: 12, speechLevel: "casual", messages: 0, lastAt: null },
    ]);
    expect(detail.notes).toEqual([
      {
        id: expect.any(String),
        actor: ACTOR,
        body: "CS 문의 — 결제 확인",
        createdAt: expect.any(String),
      },
    ]);
    expect(detail.ops.map((o: Json) => [o.kind, o.action])).toEqual([["write", "add_note"]]);

    const logs = await auditRows(db);
    expect(logs.at(-1)).toEqual({
      actor: ACTOR,
      kind: "view",
      action: "user_detail",
      target_user: real,
      detail: {},
      result: "ok",
    });

    // 프로필 · 지갑이 없는 사용자: 칸은 그대로 있고 값이 null · 0.
    const empty = await rpc(server, "ops_user_detail", [ACTOR, other]);
    expect(empty.profile).toBeNull();
    expect(empty.learning).toEqual({
      days: 0,
      lastDay: null,
      streak: 0,
      recentDays: [],
      progressBytes: null,
    });
    expect(empty.plan).toEqual({
      tier: "free",
      source: null,
      expiresAt: null,
      entitlements: [],
      storeEvents: [],
    });
  });

  test("OA-7 대화 · 기억 · 미디어 · 타임라인 — 모양과 열람 기록", async () => {
    const conversation = (
      await db.admin.query(
        "insert into companion.conversations (user_id, character_id) values ($1, 'mina') returning id",
        [real],
      )
    ).rows[0].id;
    await db.admin.query(
      `insert into companion.messages (conversation_id, user_id, role, status, client_message_id, text, created_at)
       values ($1, $2, 'user', 'complete', gen_random_uuid(), '첫 메시지', now() - interval '2 minutes')`,
      [conversation, real],
    );
    const reply = (
      await db.admin.query(
        `insert into companion.messages (conversation_id, user_id, role, status, text, credits_spent, created_at)
         values ($1, $2, 'assistant', 'complete', '안녕!', 3, now() - interval '1 minute') returning id`,
        [conversation, real],
      )
    ).rows[0].id;
    await db.admin.query(
      "insert into companion.message_reports (message_id, user_id, reason) values ($1, $2, '무례해요')",
      [reply, real],
    );
    await db.admin.query(
      `insert into companion.moderation_events (user_id, message_id, layer, category, action) values ($1, $2, 'input', 'harassment', 'block'),
         ($1, $2, 'input', 'none', 'allow')`,
      [real, reply],
    );
    await db.admin.query(
      `insert into companion.memories (user_id, character_id, kind, content) values ($1, 'mina', 'fact', '고양이를 키운다'),
         ($1, null, 'fact', '서울에 산다'), ($1, 'duksu', 'fact', '다른 캐릭터 기억')`,
      [real],
    );
    await db.admin.query(
      "insert into companion.relationships (user_id, character_id, intimacy) values ($1, 'mina', 5)",
      [real],
    );
    await db.admin.query(
      `insert into companion.media (user_id, character_id, message_id, kind, status, charge, cost, storage_path)
       values ($1, 'mina', $2, 'snapshot', 'complete', 'photo', 35, 'u/x.png')`,
      [real, reply],
    );
    await server.query(
      "select public.companion_grant_credits($1, 'paid', 10, 'purchase', 'rc:tx-2', null)",
      [real],
    );
    await db.admin.query(
      "insert into public.learning_days (user_id, day) values ($1, current_date)",
      [real],
    );

    const conv = await rpc(server, "ops_user_conversation", [ACTOR, real, "mina", null, 1]);
    expect(conv.messages).toEqual([
      {
        id: reply,
        role: "assistant",
        origin: "turn",
        text: "안녕!",
        segments: [],
        status: "complete",
        creditsSpent: 3,
        createdAt: expect.any(String),
      },
    ]);
    const older = await rpc(server, "ops_user_conversation", [
      ACTOR,
      real,
      "mina",
      conv.messages[0].createdAt,
      100,
    ]);
    expect(older.messages.map((m: Json) => m.text)).toEqual(["첫 메시지"]);
    await expect(
      rpc(server, "ops_user_conversation", [ACTOR, real, "", null, 100]),
    ).rejects.toThrow(/invalid_character/);

    const memory = await rpc(server, "ops_user_memory", [ACTOR, real, "mina"]);
    expect(memory.memories.map((m: Json) => [m.text, m.shared]).sort()).toEqual([
      ["고양이를 키운다", false],
      ["서울에 산다", true],
    ]);
    expect(memory.memories[0]).toEqual({
      id: expect.any(String),
      text: expect.any(String),
      kind: "fact",
      shared: expect.any(Boolean),
      updatedAt: expect.any(String),
      deletedAt: null,
      deletedReason: null,
    });
    expect(memory.relationship).toEqual({ intimacy: 5, speechLevel: "polite" });
    expect((await rpc(server, "ops_user_memory", [ACTOR, real, "doyun"])).relationship).toBeNull();

    const media = await rpc(server, "ops_user_media", [ACTOR, real]);
    expect(media.items).toEqual([
      {
        id: expect.any(String),
        kind: "snapshot",
        status: "complete",
        characterId: "mina",
        storagePath: "u/x.png",
        createdAt: expect.any(String),
      },
    ]);

    await rpc(server, "ops_add_note", [ACTOR, real, "메모 하나"]);
    const timeline = await rpc(server, "ops_user_timeline", [ACTOR, real]);
    const kinds = timeline.items.map((i: Json) => i.kind);
    expect(new Set(kinds)).toEqual(
      new Set(["signup", "learning", "ledger", "report", "moderation", "ops", "note"]),
    );
    // 판정은 allow를 빼고, 시간 내림차순.
    expect(kinds.filter((k: string) => k === "moderation")).toHaveLength(1);
    const ats = timeline.items.map((i: Json) => Date.parse(i.at));
    expect([...ats].sort((a, b) => b - a)).toEqual(ats);
    expect(timeline.items.find((i: Json) => i.kind === "ledger")).toMatchObject({
      summary: "엽전 +10 · purchase",
    });
    expect(timeline.items.find((i: Json) => i.kind === "signup")).toMatchObject({
      summary: "가입 · apple",
    });
    expect((await rpc(server, "ops_user_timeline", [ACTOR, real, 2])).items).toHaveLength(2);

    expect(
      (await auditRows(db))
        .filter((r) => r.kind === "view")
        .map((r) => [r.action, r.target_user, r.detail]),
    ).toEqual([
      ["user_conversation", real, { character: "mina" }],
      ["user_conversation", real, { character: "mina" }],
      ["user_memory", real, { character: "mina" }],
      ["user_memory", real, { character: "doyun" }],
      ["user_media", real, {}],
      ["user_timeline", real, {}],
      ["user_timeline", real, {}],
    ]);
  });

  test("OA-8 엽전 지급: grant 버킷 · 같은 request_id는 한 번만 · 없는 사용자 · 상한 · 감사 한 줄", async () => {
    const request = "11111111-1111-4111-8111-111111111111";
    const grant = (users: string[], amount = 100, requestId = request, reason = "cs") =>
      rpc(
        server,
        "ops_grant_credits",
        [ACTOR, users, amount, reason, "보상", requestId],
        ["", "uuid[]"],
      );

    expect(await grant([real, tester, nobody, real])).toEqual({
      ok: true,
      granted: 2,
      duplicate: 0,
      missing: [nobody],
      total: 200,
    });
    expect(await grant([real, tester, other])).toEqual({
      ok: true,
      granted: 1,
      duplicate: 2,
      missing: [],
      total: 100,
    });
    const ledger = (
      await db.admin.query(
        "select user_id, delta, bucket, kind, reason, ref_id from companion.credit_ledger order by created_at, user_id",
      )
    ).rows;
    expect(ledger).toHaveLength(3);
    expect(ledger.find((l) => l.user_id === real)).toEqual({
      user_id: real,
      delta: 100,
      bucket: "grant",
      kind: "grant",
      reason: "ops_grant",
      ref_id: `ops-${request}-${real}`,
    });
    expect(await ledgerSum(db, real)).toEqual({ w: 100, l: 100 });
    expect(
      (
        await db.admin.query(
          "select sub_expires_at from companion.credit_wallets where user_id = $1",
          [real],
        )
      ).rows[0].sub_expires_at,
    ).toBeNull();

    await expect(grant([real], 0)).rejects.toThrow(/amount_out_of_range/);
    await expect(grant([real], 10_001)).rejects.toThrow(/amount_out_of_range/);
    await expect(grant([real], 10, request, "gift")).rejects.toThrow(/invalid_reason/);
    await expect(grant([])).rejects.toThrow(/invalid_users/);
    const many = Array.from(
      { length: 1001 },
      (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
    );
    await expect(grant(many)).rejects.toThrow(/too_many_users/);
    await expect(
      rpc(
        server,
        "ops_grant_credits",
        [ACTOR, [real], 10, "cs", "x".repeat(201), request],
        ["", "uuid[]"],
      ),
    ).rejects.toThrow(/invalid_memo/);
    await expect(
      rpc(server, "ops_grant_credits", [ACTOR, [real], 10, "cs", "보상", null], ["", "uuid[]"]),
    ).rejects.toThrow(/invalid_request_id/);

    const logs = await auditRows(db);
    expect(logs).toHaveLength(2);
    expect(logs[0]).toEqual({
      actor: ACTOR,
      kind: "write",
      action: "grant_credits",
      target_user: null,
      detail: {
        amount: 100,
        reason: "cs",
        memo: "보상",
        requestId: request,
        count: 3,
        granted: 2,
        duplicate: 0,
        missing: 1,
        users: [real, tester, nobody],
      },
      result: "ok",
    });
    // 한 사람에게 주면 그 사람의 운영 기록(상세 ops)에 남는다.
    await grant([other], 5, "22222222-2222-4222-8222-222222222222", "event");
    expect((await auditRows(db)).at(-1)?.target_user).toBe(other);
    expect(
      (await rpc(server, "ops_user_detail", [ACTOR, other])).ops.map((o: Json) => o.action),
    ).toEqual(["grant_credits"]);
  });

  test("OA-9 시험 계정만 되는 조작: 실제 사용자면 {ok:false, error:'not_a_tester'} · refused 기록 · 값은 그대로", async () => {
    await server.query(
      "select public.companion_grant_credits($1, 'paid', 40, 'purchase', 'rc:tx-9', null)",
      [real],
    );
    expect(await rpc(server, "ops_tester_set_balance", [ACTOR, real, "paid", 0])).toEqual({
      ok: false,
      error: "not_a_tester",
    });
    expect(await rpc(server, "ops_tester_set_tier", [ACTOR, real, "premium", null])).toEqual({
      ok: false,
      error: "not_a_tester",
    });
    expect(await rpc(server, "ops_tester_reset", [ACTOR, real, "mina"])).toEqual({
      ok: false,
      error: "not_a_tester",
    });
    expect(await ledgerSum(db, real)).toEqual({ w: 40, l: 40 });
    expect((await rpc(server, "ops_find_users", [ACTOR, real])).items[0].tier).toBe("free");
    expect(
      (await auditRows(db))
        .filter((r) => r.kind === "write")
        .map((r) => [r.action, r.target_user, r.result, r.detail.error]),
    ).toEqual([
      ["tester_set_balance", real, "refused", "not_a_tester"],
      ["tester_set_tier", real, "refused", "not_a_tester"],
      ["tester_reset", real, "refused", "not_a_tester"],
    ]);
    await expect(rpc(server, "ops_tester_set_balance", [ACTOR, nobody, "paid", 0])).rejects.toThrow(
      /not_found/,
    );
    await expect(rpc(server, "ops_tester_set_balance", [ACTOR, tester, "gold", 0])).rejects.toThrow(
      /invalid_bucket/,
    );
    await expect(
      rpc(server, "ops_tester_set_balance", [ACTOR, tester, "paid", 1_000_001]),
    ).rejects.toThrow(/invalid_balance/);
    await expect(rpc(server, "ops_tester_set_tier", [ACTOR, tester, "gold", null])).rejects.toThrow(
      /invalid_tier/,
    );
  });

  test("OA-10 기존 RPC: companion_grant_credits reason operator · companion_set_entitlement는 시험 계정만, ops_grant는 허용", async () => {
    await expect(
      server.query(
        "select public.companion_grant_credits($1, 'grant', 5, 'operator', null, null)",
        [real],
      ),
    ).rejects.toThrow(/not_a_tester/);
    await expect(
      server.query("select public.companion_set_entitlement($1, 'premium', null, 'playground')", [
        real,
      ]),
    ).rejects.toThrow(/not_a_tester/);
    expect(
      (
        await server.query(
          "select public.companion_grant_credits($1, 'grant', 5, 'operator', null, null) as ok",
          [tester],
        )
      ).rows[0].ok,
    ).toBe(true);
    expect(
      (
        await server.query(
          "select public.companion_grant_credits($1, 'grant', 5, 'ops_grant', 'ops-x', null) as ok",
          [real],
        )
      ).rows[0].ok,
    ).toBe(true);
    // 구독 · 구매 · 가입 지급은 실제 사용자 그대로.
    expect(
      (
        await server.query(
          "select public.companion_grant_credits($1, 'paid', 5, 'purchase', 'rc:y', null) as ok",
          [real],
        )
      ).rows[0].ok,
    ).toBe(true);
    await server.query(
      "select public.companion_set_entitlement($1, 'premium', null, 'playground')",
      [tester],
    );
    expect(
      (await db.admin.query("select tier from companion.entitlements where user_id = $1", [tester]))
        .rows[0].tier,
    ).toBe("premium");
  });

  test("OA-11 시험 계정 잔액 맞추기: 차이를 원장 grant · revoke(reason operator)로, 지갑 합 = 원장 합", async () => {
    expect(await rpc(server, "ops_tester_set_balance", [ACTOR, tester, "grant", 50])).toEqual({
      ok: true,
      before: 0,
      after: 50,
    });
    expect(await rpc(server, "ops_tester_set_balance", [ACTOR, tester, "grant", 20])).toEqual({
      ok: true,
      before: 50,
      after: 20,
    });
    expect(await rpc(server, "ops_tester_set_balance", [ACTOR, tester, "grant", 20])).toEqual({
      ok: true,
      before: 20,
      after: 20,
    });
    expect(await rpc(server, "ops_tester_set_balance", [ACTOR, tester, "sub", 7])).toEqual({
      ok: true,
      before: 0,
      after: 7,
    });
    const ledger = (
      await db.admin.query(
        "select delta, bucket, kind, reason from companion.credit_ledger where user_id = $1 order by created_at",
        [tester],
      )
    ).rows;
    expect(ledger).toEqual([
      { delta: 50, bucket: "grant", kind: "grant", reason: "operator" },
      { delta: -30, bucket: "grant", kind: "revoke", reason: "operator" },
      { delta: 7, bucket: "sub", kind: "grant", reason: "operator" },
    ]);
    expect(await ledgerSum(db, tester)).toEqual({ w: 27, l: 27 });
    expect((await auditRows(db)).map((r) => [r.action, r.detail])).toEqual([
      ["tester_set_balance", { bucket: "grant", before: 0, after: 50 }],
      ["tester_set_balance", { bucket: "grant", before: 50, after: 20 }],
      ["tester_set_balance", { bucket: "grant", before: 20, after: 20 }],
      ["tester_set_balance", { bucket: "sub", before: 0, after: 7 }],
    ]);
  });

  test("OA-12 시험 계정 등급 · 초기화: companion_set_entitlement(source ops_admin) · companion_operator_reset", async () => {
    expect(
      await rpc(server, "ops_tester_set_tier", [ACTOR, tester, "chat_plus", iso(DAY)]),
    ).toEqual({ ok: true });
    expect(
      (
        await db.admin.query("select tier, source from companion.entitlements where user_id = $1", [
          tester,
        ])
      ).rows[0],
    ).toEqual({
      tier: "chat_plus",
      source: "ops_admin",
    });
    expect((await rpc(server, "ops_find_users", [ACTOR, tester])).items[0].tier).toBe("chat_plus");
    expect(await rpc(server, "ops_tester_set_tier", [ACTOR, tester, null, null])).toEqual({
      ok: true,
    });
    expect(
      (
        await db.admin.query(
          "select count(*)::int as n from companion.entitlements where user_id = $1",
          [tester],
        )
      ).rows[0].n,
    ).toBe(0);

    await db.admin.query(
      "insert into companion.relationships (user_id, character_id, intimacy) values ($1, 'mina', 9)",
      [tester],
    );
    expect(await rpc(server, "ops_tester_reset", [ACTOR, tester, "mina"])).toEqual({ ok: true });
    expect(
      (
        await db.admin.query(
          "select count(*)::int as n from companion.relationships where user_id = $1",
          [tester],
        )
      ).rows[0].n,
    ).toBe(0);
    expect(
      (await auditRows(db)).filter((r) => r.kind === "write").map((r) => [r.action, r.result]),
    ).toEqual([
      ["tester_set_tier", "ok"],
      ["tester_set_tier", "ok"],
      ["tester_reset", "ok"],
    ]);
  });

  test("OA-13 정지 · 해제: 실제 사용자 가능, before/after · 스트라이크 초기화", async () => {
    await db.admin.query(
      "insert into companion.moderation_state (user_id, strikes, window_started_at) values ($1, 2, now() - interval '1 hour')",
      [real],
    );
    const until = iso(DAY);
    const suspended = await rpc(server, "ops_set_suspension", [
      ACTOR,
      real,
      until,
      false,
      "반복 위반",
    ]);
    expect(suspended.ok).toBe(true);
    expect(suspended.before).toEqual({ strikes: 2, blockedUntil: null });
    expect(suspended.after.strikes).toBe(2);
    expect(Date.parse(suspended.after.blockedUntil)).toBe(Date.parse(until));
    expect(
      Date.parse((await rpc(server, "ops_find_users", [ACTOR, real])).items[0].blockedUntil),
    ).toBe(Date.parse(until));

    const released = await rpc(server, "ops_set_suspension", [ACTOR, real, null, true, "해제"]);
    expect(released.after).toEqual({ strikes: 0, blockedUntil: null });
    expect(Date.parse(released.before.blockedUntil)).toBe(Date.parse(until));
    expect(
      (
        await db.admin.query(
          "select window_started_at from companion.moderation_state where user_id = $1",
          [real],
        )
      ).rows[0].window_started_at,
    ).toBeNull();

    // 행이 없던 사용자도 정지된다.
    const fresh = await rpc(server, "ops_set_suspension", [ACTOR, other, until, false, "x"]);
    expect(fresh.before).toEqual({ strikes: 0, blockedUntil: null });

    await expect(
      rpc(server, "ops_set_suspension", [ACTOR, real, iso(-DAY), false, "x"]),
    ).rejects.toThrow(/invalid_until/);
    await expect(
      rpc(server, "ops_set_suspension", [ACTOR, real, until, false, " "]),
    ).rejects.toThrow(/invalid_reason/);
    const logs = (await auditRows(db)).filter((r) => r.action === "set_suspension");
    expect(logs).toHaveLength(3);
    expect(logs[1]).toMatchObject({
      target_user: real,
      detail: { resetStrikes: true, reason: "해제", until: null },
    });
  });

  test("OA-14 공개 스위치: ops_settings는 기록 없이 읽고, ops_set_testers_only는 before/after 기록", async () => {
    expect(await rpc(server, "ops_settings", [ACTOR])).toEqual({ testersOnly: true });
    expect(await rpc(server, "ops_set_testers_only", [ACTOR, false])).toEqual({
      ok: true,
      before: true,
      after: false,
    });
    expect(await rpc(server, "ops_settings", [ACTOR])).toEqual({ testersOnly: false });
    expect(
      (await db.admin.query("select testers_only from companion.settings")).rows[0].testers_only,
    ).toBe(false);
    await expect(rpc(server, "ops_set_testers_only", [ACTOR, null])).rejects.toThrow(
      /invalid_value/,
    );
    expect((await auditRows(db)).map((r) => [r.kind, r.action, r.detail])).toEqual([
      ["write", "set_testers_only", { before: true, after: false }],
    ]);
  });

  test("OA-15 푸시: 대상(all · users · inactive) · begin/finish · 두 번 끝내기 거절 · 같은 request_id 두 번 열기 거절 · unknown", async () => {
    await db.admin.query(
      `insert into public.push_devices (token, user_id, environment, last_active_at) values
         ($1, $4, 'production', now()), ($2, $4, 'sandbox', now() - interval '20 days'),
         ($3, $5, 'production', now() - interval '10 days')`,
      ["a".repeat(64), "b".repeat(64), "c".repeat(64), real, other],
    );
    expect(
      await rpc(server, "ops_push_audience", [ACTOR, "all", null, null], ["", "", "uuid[]"]),
    ).toEqual({
      users: 2,
      devices: 3,
      userIds: null,
    });
    expect(
      await rpc(
        server,
        "ops_push_audience",
        [ACTOR, "users", [real, tester, nobody], null],
        ["", "", "uuid[]"],
      ),
    ).toEqual({
      users: 1,
      devices: 2,
      userIds: [real],
    });
    // 모든 기기가 7일보다 오래된 사람만(real은 오늘 쓴 기기가 있다).
    expect(
      await rpc(server, "ops_push_audience", [ACTOR, "inactive", null, 7], ["", "", "uuid[]"]),
    ).toEqual({
      users: 1,
      devices: 1,
      userIds: [other],
    });
    expect(
      await rpc(server, "ops_push_audience", [ACTOR, "inactive", null, 30], ["", "", "uuid[]"]),
    ).toEqual({
      users: 0,
      devices: 0,
      userIds: [],
    });
    await expect(
      rpc(server, "ops_push_audience", [ACTOR, "inactive", null, 0], ["", "", "uuid[]"]),
    ).rejects.toThrow(/invalid_days/);
    await expect(
      rpc(server, "ops_push_audience", [ACTOR, "users", [], null], ["", "", "uuid[]"]),
    ).rejects.toThrow(/invalid_users/);

    // inactive가 1000명을 넘으면 too_many_users.
    await db.admin.query(
      `insert into auth.users (id, email) select gen_random_uuid(), 'bulk' || g || '@example.com' from generate_series(1, 1001) g`,
    );
    await db.admin.query(
      `insert into public.push_devices (token, user_id, environment, last_active_at)
       select md5(id::text) || md5(email), id, 'production', now() - interval '100 days'
       from auth.users where email like 'bulk%'`,
    );
    await expect(
      rpc(server, "ops_push_audience", [ACTOR, "inactive", null, 60], ["", "", "uuid[]"]),
    ).rejects.toThrow(/too_many_users/);
    expect(await auditRows(db)).toEqual([]);

    const begin = await rpc(
      server,
      "ops_push_begin",
      [
        ACTOR,
        { kind: "users", userIds: [tester] },
        1,
        "제목",
        "본문",
        { screen: "home" },
        true,
        REQUEST_A,
      ],
      ["", "jsonb", "", "", "", "jsonb", "", "uuid"],
    );
    expect(begin).toEqual({ ok: true, id: expect.any(String) });
    // 같은 request_id 로 다시 열면 send-push 를 다시 부르지 않게 거절(기록은 refused).
    expect(
      await rpc(
        server,
        "ops_push_begin",
        [ACTOR, { kind: "all" }, 2, "제목", "본문", null, false, REQUEST_A],
        ["", "jsonb", "", "", "", "jsonb", "", "uuid"],
      ),
    ).toEqual({ ok: false, error: "already_sent", id: begin.id });
    expect(
      await rpc(
        server,
        "ops_push_finish",
        [ACTOR, begin.id, "sent", { devices: 1, sent: 1, failed: 0, removed: 0 }],
        ["", "", "", "jsonb"],
      ),
    ).toEqual({
      ok: true,
    });
    expect(
      await rpc(server, "ops_push_finish", [ACTOR, begin.id, "failed", {}], ["", "", "", "jsonb"]),
    ).toEqual({
      ok: false,
      error: "already_finished",
    });
    const send = (await db.admin.query("select * from ops.push_sends where id = $1", [begin.id]))
      .rows[0];
    expect(send).toMatchObject({
      actor: ACTOR,
      user_count: 1,
      title: "제목",
      test: true,
      status: "sent",
      summary: { devices: 1, sent: 1, failed: 0, removed: 0 },
    });
    expect(send.finished_at).not.toBeNull();

    await expect(
      rpc(
        server,
        "ops_push_begin",
        [ACTOR, { kind: "all" }, 2, "x".repeat(101), "본문", null, false, REQUEST_B],
        ["", "jsonb", "", "", "", "jsonb", "", "uuid"],
      ),
    ).rejects.toThrow(/invalid_title/);
    await expect(
      rpc(
        server,
        "ops_push_begin",
        [ACTOR, { kind: "all" }, 2, "제목", "", null, false, REQUEST_B],
        ["", "jsonb", "", "", "", "jsonb", "", "uuid"],
      ),
    ).rejects.toThrow(/invalid_body/);
    await expect(
      rpc(
        server,
        "ops_push_begin",
        [ACTOR, { kind: "all" }, 2, "제목", "본문", null, false, null],
        ["", "jsonb", "", "", "", "jsonb", "", "uuid"],
      ),
    ).rejects.toThrow(/invalid_request_id/);
    // send-push 가 답하지 않은 발송(시간 초과)은 unknown 으로 끝난다 — result 는 error.
    const timedOut = await rpc(
      server,
      "ops_push_begin",
      [ACTOR, { kind: "all" }, 2, "공지", "본문", null, false, REQUEST_B],
      ["", "jsonb", "", "", "", "jsonb", "", "uuid"],
    );
    expect(timedOut).toEqual({ ok: true, id: expect.any(String) });
    expect(
      await rpc(
        server,
        "ops_push_finish",
        [ACTOR, timedOut.id, "unknown", { error: "push_timeout", maybeSent: true }],
        ["", "", "", "jsonb"],
      ),
    ).toEqual({ ok: true });
    expect(
      (
        await db.admin.query("select status, request_id from ops.push_sends where id = $1", [
          timedOut.id,
        ])
      ).rows[0],
    ).toEqual({ status: "unknown", request_id: REQUEST_B });
    await expect(
      rpc(server, "ops_push_finish", [ACTOR, begin.id, "sending", {}], ["", "", "", "jsonb"]),
    ).rejects.toThrow(/invalid_status/);
    await expect(
      rpc(server, "ops_push_finish", [ACTOR, nobody, "sent", {}], ["", "", "", "jsonb"]),
    ).rejects.toThrow(/not_found/);

    expect((await auditRows(db)).map((r) => [r.action, r.target_user, r.result])).toEqual([
      ["push_begin", tester, "ok"],
      ["push_begin", null, "refused"],
      ["push_finish", null, "ok"],
      ["push_finish", null, "refused"],
      ["push_begin", null, "ok"],
      ["push_finish", null, "error"],
    ]);
  });

  test("OA-16 메모 더하기 · 지우기, ops_log · ops_audit(종류 · 대상 · 앞 페이지)", async () => {
    const note = await rpc(server, "ops_add_note", [ACTOR, real, "  첫 메모  "]);
    expect(note).toEqual({ ok: true, id: expect.any(String) });
    expect(
      (await db.admin.query("select body from ops.user_notes where id = $1", [note.id])).rows[0]
        .body,
    ).toBe("첫 메모");
    await expect(rpc(server, "ops_add_note", [ACTOR, real, "x".repeat(2001)])).rejects.toThrow(
      /invalid_body/,
    );
    await expect(rpc(server, "ops_add_note", [ACTOR, nobody, "메모"])).rejects.toThrow(/not_found/);
    expect(await rpc(server, "ops_delete_note", ["hyesung", note.id])).toEqual({ ok: true });
    await expect(rpc(server, "ops_delete_note", [ACTOR, note.id])).rejects.toThrow(/not_found/);
    expect(
      (await db.admin.query("select deleted_by from ops.user_notes where id = $1", [note.id]))
        .rows[0].deleted_by,
    ).toBe("hyesung");
    expect((await rpc(server, "ops_user_detail", [ACTOR, real])).notes).toEqual([]);

    expect(
      await rpc(
        server,
        "ops_log",
        [ACTOR, "export", "users_csv", null, { rows: 10 }],
        ["", "", "", "", "jsonb"],
      ),
    ).toEqual({ ok: true });
    await expect(
      rpc(server, "ops_log", [ACTOR, "delete", "x", null, {}], ["", "", "", "", "jsonb"]),
    ).rejects.toThrow(/invalid_kind/);

    const all = await rpc(server, "ops_audit", [ACTOR, null, null, null, 100]);
    expect(all.items.map((i: Json) => i.action)).toEqual([
      "users_csv",
      "user_detail",
      "delete_note",
      "add_note",
    ]);
    expect(all.items[0]).toEqual({
      id: expect.any(Number),
      at: expect.any(String),
      actor: ACTOR,
      kind: "export",
      action: "users_csv",
      targetUser: null,
      detail: { rows: 10 },
      result: "ok",
    });
    const writes = await rpc(server, "ops_audit", [ACTOR, "write", real, null, 100]);
    expect(writes.items.map((i: Json) => i.action)).toEqual(["delete_note", "add_note"]);
    const page = await rpc(server, "ops_audit", [ACTOR, null, null, all.items[1].id, 1]);
    expect(page.items.map((i: Json) => i.action)).toEqual(["delete_note"]);
    await expect(rpc(server, "ops_audit", [ACTOR, null, null, null, 501])).rejects.toThrow(
      /invalid_limit/,
    );
    // 감사 기록 보기는 기록하지 않는다.
    expect((await auditRows(db)).length).toBe(4);
  });

  test("OA-17 마이그레이션을 다시 적용해도 같다(표 · 기록 유지)", async () => {
    await rpc(server, "ops_add_note", [ACTOR, real, "남는다"]);
    await db.admin.query(
      await readFile(new URL("./20261212120000_ops_admin.sql", import.meta.url), "utf8"),
    );
    expect(
      (await rpc(server, "ops_user_detail", [ACTOR, real])).notes.map((n: Json) => n.body),
    ).toEqual(["남는다"]);
  });
});

describe("구독 표가 없는 DB(20261129 운영 적용 전)", () => {
  let db: Db;
  let server: Client;

  beforeAll(async () => {
    db = await startTestDatabase();
    // 20261129 전의 모양으로 되돌린다: 구독 표 넷을 지우고, 원장 kind · 옛 등급 표 검사 · tier_of를 20261112 판으로.
    // (20261202가 20261129의 plan_free를 써서 그 파일만 빼고 띄울 수는 없다.) 그다음 이 마이그레이션을 다시 적용한다.
    await db.admin.query(`
      drop table companion.store_events, companion.plan_entitlements, companion.store_products, companion.plans cascade;
      alter table companion.credit_ledger drop constraint credit_ledger_kind_check;
      alter table companion.credit_ledger add constraint credit_ledger_kind_check
        check (kind in ('grant', 'reserve', 'settle', 'release', 'expire'));
      alter table companion.entitlements drop constraint entitlements_tier_check;
      alter table companion.entitlements add constraint entitlements_tier_check check (tier in ('free', 'premium'));
      create or replace function companion.tier_of(p_user_id uuid, p_now timestamptz)
      returns text language sql stable as $$
        select coalesce((
          select tier from companion.entitlements
          where user_id = p_user_id and (expires_at is null or expires_at > p_now)
        ), 'free')
      $$;
    `);
    await db.admin.query(
      await readFile(new URL("./20261212120000_ops_admin.sql", import.meta.url), "utf8"),
    );
    server = await db.connect();
    await server.query("set role service_role");
  }, 90_000);
  afterAll(async () => {
    await db?.close();
  });
  beforeEach(async () => {
    await seed(db);
  });

  test("OA-20 마이그레이션이 적용되고 구독 칸은 null, 나머지는 그대로", async () => {
    expect(
      (
        await db.admin.query(
          "select to_regclass('companion.plan_entitlements') as e, to_regclass('companion.store_events') as s",
        )
      ).rows[0],
    ).toEqual({ e: null, s: null });
    const detail = await rpc(server, "ops_user_detail", [ACTOR, real]);
    expect(detail.plan).toEqual({
      tier: "free",
      source: null,
      expiresAt: null,
      entitlements: null,
      storeEvents: null,
    });
    expect(detail.user).toMatchObject({ id: real, tier: "free", balance: 0 });
    const timeline = await rpc(server, "ops_user_timeline", [ACTOR, real]);
    expect(timeline.items.map((i: Json) => i.kind)).toEqual(["signup"]);
    expect((await rpc(server, "ops_list_users", [ACTOR, "recent"])).items).toHaveLength(3);
  });

  test("OA-21 원장 revoke가 생겨 잔액 내리기가 되고, 옛 등급 표는 premium만 받는다", async () => {
    expect(await rpc(server, "ops_tester_set_balance", [ACTOR, tester, "paid", 30])).toEqual({
      ok: true,
      before: 0,
      after: 30,
    });
    expect(await rpc(server, "ops_tester_set_balance", [ACTOR, tester, "paid", 10])).toEqual({
      ok: true,
      before: 30,
      after: 10,
    });
    expect(await ledgerSum(db, tester)).toEqual({ w: 10, l: 10 });

    expect(await rpc(server, "ops_tester_set_tier", [ACTOR, tester, "premium", null])).toEqual({
      ok: true,
    });
    expect((await rpc(server, "ops_find_users", [ACTOR, tester])).items[0].tier).toBe("premium");
    await expect(
      rpc(server, "ops_tester_set_tier", [ACTOR, tester, "chat_plus", null]),
    ).rejects.toThrow(/invalid_tier/);

    const request = "33333333-3333-4333-8333-333333333333";
    expect(
      await rpc(
        server,
        "ops_grant_credits",
        [ACTOR, [real], 10, "test", null, request],
        ["", "uuid[]"],
      ),
    ).toEqual({
      ok: true,
      granted: 1,
      duplicate: 0,
      missing: [],
      total: 10,
    });
  });
});
