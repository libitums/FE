import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";
import { readFile } from "node:fs/promises";
import { startTestDatabase } from "./postgres.test-support";

// 운영 도구 에셋 수(20261227, ops-dashboard docs/admin-contract.md §E-A): ops_search_users의 줄마다 snapshots · voices,
// p_sort snapshots · voices(많은 순 · 적은 순).
const a = "00000000-0000-4000-8000-0000000000e1";
const b = "00000000-0000-4000-8000-0000000000e2";
const c = "00000000-0000-4000-8000-0000000000e3";
const d = "00000000-0000-4000-8000-0000000000e4";
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

/** 완료 n개 + 완료가 아닌 것들(세지 않는다). */
async function media(
  db: Db,
  user: string,
  kind: "snapshot" | "voice",
  complete: number,
  other: string[] = [],
) {
  const charge = kind === "voice" ? "voice" : "photo";
  for (let i = 0; i < complete; i += 1) {
    await db.admin.query(
      `insert into companion.media (user_id, character_id, message_id, kind, status, charge, cost, storage_path)
       values ($1, 'mina', gen_random_uuid(), $2, 'complete', $3, 35, $4)`,
      [user, kind, charge, `${user}/${kind}-${i}`],
    );
  }
  for (const status of other) {
    await db.admin.query(
      `insert into companion.media (user_id, character_id, message_id, kind, status, charge, cost)
       values ($1, 'mina', gen_random_uuid(), $2, $3, $4, 0)`,
      [user, kind, status, charge],
    );
  }
}

async function seed(db: Db) {
  await db.admin.query("truncate auth.users cascade");
  await db.admin.query("truncate ops.audit_log");
  // 가입: a 가장 옛날 → d 가장 최근.
  await db.admin.query(
    `insert into auth.users (id, email, raw_app_meta_data, created_at) values
       ($1, 'a@example.com', '{}', now() - interval '40 days'),
       ($2, 'b@example.com', '{"duru_tester": "true"}', now() - interval '30 days'),
       ($3, 'c@example.com', '{}', now() - interval '20 days'),
       ($4, 'd@example.com', '{}', now() - interval '10 days')`,
    [a, b, c, d],
  );
  // a: 스냅샷 3 · 음성 1, b: 스냅샷 1 · 음성 4, c: 완료 없음(막힘 · 실패 · 만드는 중만), d: 미디어 없음.
  await media(db, a, "snapshot", 3, ["blocked"]);
  await media(db, a, "voice", 1);
  await media(db, b, "snapshot", 1);
  await media(db, b, "voice", 4, ["failed"]);
  await media(db, c, "snapshot", 0, ["blocked", "failed", "pending"]);
}

describe("ops_search_users 에셋 수", () => {
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

  const search = (args: Record<string, unknown> = {}) =>
    named(server, "ops_search_users", { p_actor: ACTOR, ...args });
  const ids = async (args: Record<string, unknown>) =>
    (await search(args)).items.map((u: Json) => u.id);

  test("OM-1 줄마다 완료된 스냅샷 · 음성 수(없으면 0), 옛 인수 꼴도 그대로", async () => {
    const page = await search();
    expect(page.items.map((u: Json) => [u.id, u.snapshots, u.voices])).toEqual([
      [d, 0, 0],
      [c, 0, 0],
      [b, 1, 4],
      [a, 3, 1],
    ]);
    expect(page.total).toBe(4);
    expect(page.items[3]).toMatchObject({ email: "a@example.com", balance: 0, tester: false });
    expect(await ids({ p_sort: "email", p_dir: "asc" })).toEqual([a, b, c, d]);
  });

  test("OM-2 p_sort snapshots · voices: 오름 · 내림, 같은 수는 id 순, 다른 필터 · 쪽 넘기기와 함께", async () => {
    expect(await ids({ p_sort: "snapshots", p_dir: "desc" })).toEqual([a, b, c, d]);
    expect(await ids({ p_sort: "snapshots", p_dir: "asc" })).toEqual([c, d, b, a]);
    expect(await ids({ p_sort: "voices", p_dir: "desc" })).toEqual([b, a, c, d]);
    expect(await ids({ p_sort: "voices", p_dir: "asc" })).toEqual([c, d, a, b]);
    expect(await ids({ p_sort: "voices", p_dir: "desc", p_limit: 1, p_offset: 1 })).toEqual([a]);
    expect(await ids({ p_sort: "snapshots", p_dir: "desc", p_tester: false })).toEqual([a, c, d]);
  });

  test("OM-3 목록 밖 정렬은 invalid_sort", async () => {
    for (const sort of ["media", "snapshot", "voices desc"]) {
      await expect(search({ p_sort: sort })).rejects.toThrow(/invalid_sort/);
    }
  });

  test("OM-4 열람 기록에 sort · dir", async () => {
    await search();
    await search({ p_sort: "voices", p_dir: "desc" });
    const rows = (await db.admin.query("select detail from ops.audit_log order by id")).rows;
    expect(rows.map((r) => r.detail)).toEqual([
      { limit: 50, offset: 0 },
      { limit: 50, offset: 0, sort: "voices", dir: "desc" },
    ]);
  });

  test("OM-5 함수는 하나(20261214 인수 꼴 그대로)이고 service_role만 부른다", async () => {
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
    expect(rows[0].args).toMatch(/p_sort text, p_dir text$/);
  });

  test("OM-6 첫 판(인수 13개)을 적용한 DB에 다시 적용하면 그 함수가 지워진다", async () => {
    await db.admin.query(
      `create function public.ops_search_users(p_actor text, p_query text, p_country text, p_tester boolean, p_tier text,
         p_joined_after timestamptz, p_joined_before timestamptz, p_limit integer, p_offset integer, p_sort text, p_dir text,
         p_min_snapshots integer, p_min_voices integer) returns jsonb language sql as $$ select '{}'::jsonb $$`,
    );
    await db.admin.query(
      await readFile(
        new URL("./20261227120000_ops_admin_media_counts.sql", import.meta.url),
        "utf8",
      ),
    );
    const count = (
      await db.admin.query(
        `select count(*)::int as n from pg_proc p join pg_namespace n on n.oid = p.pronamespace
         where n.nspname = 'public' and p.proname = 'ops_search_users'`,
      )
    ).rows[0].n;
    expect(count).toBe(1);
    expect(await ids({ p_sort: "snapshots", p_dir: "desc" })).toEqual([a, b, c, d]);
  });
});
