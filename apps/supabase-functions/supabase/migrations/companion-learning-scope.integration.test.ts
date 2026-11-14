import { afterAll, beforeAll, beforeEach, expect, test } from "vitest";
import { signIn, startTestDatabase } from "./postgres.test-support";

// 배운 표현 범위(20261126): 자동(끝낸 유닛 전부) · 수동(고른 에피소드의 끝낸 유닛만) · 수동인데 고른 것 없음(넣지 않음) ·
// 콘텐츠에서 빠진 에피소드 건너뜀 · 에피소드 제목 동기화 · 입력 검사 · 권한(앱 · 시험 계정 운영자 함수).
const tester = "00000000-0000-4000-8000-0000000000f1";
const other = "00000000-0000-4000-8000-0000000000f2";

let db: Awaited<ReturnType<typeof startTestDatabase>>;
let server: Awaited<ReturnType<typeof db.connect>>;
let app: typeof server;

type Scope = {
  scope: string;
  units: string[];
  empty: boolean;
  options: {
    episode: string;
    title: string | null;
    completedUnits: number;
    expressions: number;
    selected: boolean;
  }[];
};
type Context = {
  episodes: string[];
  expressions: { id: string }[];
  scope: { mode: string; units: string[]; empty: boolean };
};

const context = async () =>
  (await server.query("select public.companion_learning_context($1, 50) as c", [tester])).rows[0]
    .c as Context;
const setScope = async (scope: string, units: string[] | null) =>
  (
    await server.query("select public.companion_operator_set_learning_scope($1, $2, $3) as s", [
      tester,
      scope,
      units,
    ])
  ).rows[0].s as Scope;

beforeAll(async () => {
  db = await startTestDatabase();
  server = await db.connect();
  app = await db.connect();
  await server.query("set role service_role");
}, 90_000);
afterAll(async () => {
  await db?.close();
});
beforeEach(async () => {
  await db.admin.query("truncate auth.users cascade");
  await db.admin.query(
    "truncate companion.expression_units, companion.user_expressions, companion.episodes",
  );
  await db.admin.query("delete from companion.expressions");
  await db.admin.query(
    `insert into auth.users (id, email, raw_app_meta_data) values
      ($1, 'ls@libitum.test', '{"duru_tester": true}'), ($2, 'ls2@libitum.test', '{}')`,
    [tester, other],
  );
  await db.admin.query(`
    insert into companion.expressions (id, kind, surface) values
      ('expr:hello', 'expr', '안녕하세요'), ('expr:fine', 'expr', '괜찮아요.'),
      ('voca:water', 'voca', '물'), ('voca:card', 'voca', '카드'), ('voca:umbrella', 'voca', '우산');
    insert into companion.expression_units values
      ('expr:hello', 'u00-tutorial', 'S1'),
      ('expr:fine', 'u01-water', 'S1'), ('voca:water', 'u01-water', 'S2'), ('voca:card', 'u01-water', 'S3'),
      ('voca:umbrella', 'u08-umbrella', 'S1');
  `);
  // u01은 S1 · S2만 끝냈다(S3의 카드는 범위 밖). u02는 끝냈지만 표현이 없다.
  await db.admin.query("insert into public.learning_progress (user_id, progress) values ($1, $2)", [
    tester,
    JSON.stringify({
      version: 1,
      catalogProgress: {
        "u00-tutorial": ["S1"],
        "u01-water": ["S1", "S2"],
        "u02-checkin": ["S1"],
        "u08-umbrella": ["S1"],
      },
    }),
  ]);
});

test("LS1. 기본은 자동 — 끝낸 유닛 전부, 고를 수 있는 에피소드는 표현이 있는 것만", async () => {
  const ctx = await context();
  expect(ctx.scope).toEqual({ mode: "auto", units: [], empty: false });
  expect(ctx.expressions.map((entry) => entry.id).sort()).toEqual([
    "expr:fine",
    "expr:hello",
    "voca:umbrella",
    "voca:water",
  ]);
  const scope = (
    await server.query("select public.companion_operator_learning_scope($1) as s", [tester])
  ).rows[0].s as Scope;
  expect(scope.scope).toBe("auto");
  expect(scope.options.map((option) => option.episode)).toEqual([
    "u00-tutorial",
    "u01-water",
    "u08-umbrella",
  ]);
  expect(scope.options.find((option) => option.episode === "u01-water")).toMatchObject({
    title: null,
    completedUnits: 2,
    expressions: 2,
    selected: false,
  });
});

test("LS2. 수동 — 고른 에피소드의 끝낸 유닛 표현만, 제목 · 순서는 동기화된 매니페스트", async () => {
  await server.query(
    `select companion.sync_episodes('[{"id":"u08-umbrella","title":"우산 빌리기","order":8},{"id":"u01-water","title":"물 사기","order":1}]'::jsonb)`,
  );
  const scope = await setScope("manual", ["u08-umbrella"]);
  expect(scope).toMatchObject({ scope: "manual", units: ["u08-umbrella"], empty: false });
  expect(scope.options.find((option) => option.episode === "u08-umbrella")).toMatchObject({
    title: "우산 빌리기",
    selected: true,
  });
  const ctx = await context();
  expect(ctx.episodes).toEqual(["u08-umbrella"]);
  expect(ctx.expressions.map((entry) => entry.id)).toEqual(["voca:umbrella"]);
  expect(ctx.scope).toEqual({ mode: "manual", units: ["u08-umbrella"], empty: false });
});

test("LS3. 수동인데 고른 것이 없거나 모두 빠진 에피소드면 비고, 자동으로 돌아가도 고른 목록은 남는다", async () => {
  const empty = await setScope("manual", []);
  expect(empty).toMatchObject({ scope: "manual", units: [], empty: true });
  expect((await context()).expressions).toEqual([]);

  // 끝내지 않았거나 콘텐츠에서 빠진 에피소드(u05)만 고르면 범위가 비어 있다.
  const gone = await setScope("manual", ["u05-baekban", "u08-umbrella"]);
  expect(gone.units).toEqual(["u08-umbrella"]);
  await db.admin.query("delete from companion.expression_units where episode_id = 'u08-umbrella'");
  const after = (
    await server.query("select public.companion_operator_learning_scope($1) as s", [tester])
  ).rows[0].s as Scope;
  expect(after).toMatchObject({ units: [], empty: true });
  expect((await context()).scope.empty).toBe(true);

  const auto = await setScope("auto", null);
  expect(auto.scope).toBe("auto");
  const stored = await db.admin.query(
    "select learning_units from companion.profiles where user_id = $1",
    [tester],
  );
  expect(stored.rows[0].learning_units).toEqual(["u05-baekban", "u08-umbrella"]);
  expect((await context()).expressions.length).toBe(3);
});

test("LS4. 입력 검사 — 모르는 범위 · 잘못된 id · 50개 넘음", async () => {
  await expect(setScope("everything", [])).rejects.toMatchObject({ code: "22023" });
  await expect(setScope("manual", ["U01 Water"])).rejects.toMatchObject({ code: "22023" });
  const many = Array.from({ length: 51 }, (_, index) => `u${index}-x`);
  await expect(setScope("manual", many)).rejects.toMatchObject({ code: "22023" });
});

test("LS5. 권한 — 앱은 자기 설정만, 운영자 함수는 시험 계정만 · 서버만", async () => {
  await signIn(app, tester);
  const mine = (
    await app.query("select public.companion_set_learning_scope('manual', array['u01-water']) as s")
  ).rows[0].s as Scope;
  expect(mine).toMatchObject({ scope: "manual", units: ["u01-water"] });
  const read = (await app.query("select public.companion_learning_scope() as s")).rows[0]
    .s as Scope;
  expect(read.units).toEqual(["u01-water"]);
  await expect(
    app.query("select public.companion_operator_learning_scope($1)", [tester]),
  ).rejects.toMatchObject({ code: "42501" });
  await expect(app.query("select companion.sync_episodes('[]'::jsonb)")).rejects.toMatchObject({
    code: "42501",
  });
  await expect(
    server.query("select public.companion_operator_learning_scope($1)", [other]),
  ).rejects.toMatchObject({ code: "P0002" });
  await app.query("select set_config('request.jwt.claim.sub', '', false)");
  await expect(app.query("select public.companion_learning_scope()")).rejects.toMatchObject({
    code: "28000",
  });
});
