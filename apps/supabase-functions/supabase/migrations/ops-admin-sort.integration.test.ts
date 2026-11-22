import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";
import { startTestDatabase } from "./postgres.test-support";

// 운영 도구 정렬(20261214, ops-dashboard docs/admin-contract.md §E-A): ops_search_users의 p_sort · p_dir.
const a = "00000000-0000-4000-8000-0000000000d1";
const b = "00000000-0000-4000-8000-0000000000d2";
const c = "00000000-0000-4000-8000-0000000000d3";
const d = "00000000-0000-4000-8000-0000000000d4";
const ACTOR = "komet";

type Db = Awaited<ReturnType<typeof startTestDatabase>>;
type Client = Awaited<ReturnType<Db["connect"]>>;
type Json = Record<string, any>;

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
  await db.admin.query("truncate ops.audit_log");
  // 가입: a 가장 옛날 → d 가장 최근. 로그인 · 국가가 없는 사람(c · d)은 그 정렬에서 늘 뒤.
  await db.admin.query(
    `insert into auth.users (id, email, raw_app_meta_data, created_at, last_sign_in_at) values
       ($1, 'Bravo@example.com', '{}', now() - interval '40 days', now() - interval '1 day'),
       ($2, 'alpha@example.com', '{}', now() - interval '30 days', now() - interval '5 days'),
       ($3, 'charlie@example.com', '{}', now() - interval '20 days', null),
       ($4, 'delta@example.com', '{}', now() - interval '10 days', null)`,
    [a, b, c, d],
  );
  await db.admin.query(
    `insert into public.learner_profiles (user_id, name, country_code) values ($1, 'A', 'US'), ($2, 'B', 'KR')`,
    [a, b],
  );
  // 지갑이 없으면 잔액 0 — d와 c는 같은 0이라 id 순.
  await db.admin.query(
    `insert into companion.credit_wallets (user_id, grant_balance, paid_balance) values ($1, 5, 0), ($2, 30, 12)`,
    [a, b],
  );
}

describe("ops_search_users 정렬", () => {
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

  const ids = async (args: Record<string, unknown>) =>
    (await named(server, "ops_search_users", { p_actor: ACTOR, ...args })).items.map(
      (u: Json) => u.id,
    );

  test("OS-1 기본은 가입 최신순, 옛 인수 꼴(정렬 없이)도 그대로 된다", async () => {
    expect(await ids({})).toEqual([d, c, b, a]);
    expect(await ids({ p_sort: null, p_dir: null })).toEqual([d, c, b, a]);
    expect(await ids({ p_sort: "created_at", p_dir: "asc" })).toEqual([a, b, c, d]);
  });

  test("OS-2 열마다 오름 · 내림, 빈 값은 늘 뒤, 같은 값은 id 순", async () => {
    expect(await ids({ p_sort: "last_sign_in_at", p_dir: "desc" })).toEqual([a, b, c, d]);
    expect(await ids({ p_sort: "last_sign_in_at", p_dir: "asc" })).toEqual([b, a, c, d]);
    expect(await ids({ p_sort: "email", p_dir: "asc" })).toEqual([b, a, c, d]);
    expect(await ids({ p_sort: "email", p_dir: "desc" })).toEqual([d, c, a, b]);
    expect(await ids({ p_sort: "balance", p_dir: "desc" })).toEqual([b, a, c, d]);
    expect(await ids({ p_sort: "balance", p_dir: "asc" })).toEqual([c, d, a, b]);
    expect(await ids({ p_sort: "country", p_dir: "asc" })).toEqual([b, a, c, d]);
    expect(await ids({ p_sort: "country", p_dir: "desc" })).toEqual([a, b, c, d]);
  });

  test("OS-3 쪽 넘기기는 정렬 뒤에 자르고 total은 자르기 전 수", async () => {
    const page = await named(server, "ops_search_users", {
      p_actor: ACTOR,
      p_sort: "email",
      p_dir: "asc",
      p_limit: 2,
      p_offset: 2,
    });
    expect(page.items.map((u: Json) => u.id)).toEqual([c, d]);
    expect(page.total).toBe(4);
    expect(page.items[0].balance).toBe(0);
  });

  test("OS-4 목록 밖 값은 invalid_sort · invalid_dir", async () => {
    for (const [args, code] of [
      [{ p_sort: "name" }, "invalid_sort"],
      [{ p_sort: "created_at; drop table auth.users" }, "invalid_sort"],
      [{ p_dir: "up" }, "invalid_dir"],
    ] as const) {
      await expect(named(server, "ops_search_users", { p_actor: ACTOR, ...args })).rejects.toThrow(
        new RegExp(code),
      );
    }
  });

  test("OS-5 열람 기록: 기본 정렬이면 sort · dir 없음, 아니면 남긴다", async () => {
    await named(server, "ops_search_users", { p_actor: ACTOR });
    await named(server, "ops_search_users", { p_actor: ACTOR, p_sort: "balance", p_dir: "asc" });
    const rows = (await db.admin.query("select detail from ops.audit_log order by id")).rows;
    expect(rows.map((r) => r.detail)).toEqual([
      { limit: 50, offset: 0 },
      { limit: 50, offset: 0, sort: "balance", dir: "asc" },
    ]);
  });

  test("OS-6 새 인수 꼴만 남고 service_role만 부른다", async () => {
    const rows = (
      await db.admin.query(
        `select pg_get_function_identity_arguments(p.oid) as args,
                has_function_privilege('anon', p.oid, 'execute') as anon,
                has_function_privilege('authenticated', p.oid, 'execute') as auth,
                has_function_privilege('service_role', p.oid, 'execute') as service,
                p.prosecdef as definer
         from pg_proc p join pg_namespace n on n.oid = p.pronamespace
         where n.nspname = 'public' and p.proname = 'ops_search_users'`,
      )
    ).rows;
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ anon: false, auth: false, service: true, definer: true });
    // 20261227이 그 뒤에 p_min_snapshots · p_min_voices를 붙였다.
    expect(rows[0].args).toMatch(/p_sort text, p_dir text(, |$)/);
  });
});
