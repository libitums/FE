import { afterAll, beforeAll, beforeEach, expect, test } from "vitest";
import { signIn, startTestDatabase } from "./postgres.test-support";

// 학습 보상은 배포 콘텐츠에 있는 유닛에만(20261130, ADR-0146) — 진행 스냅숏에 임의 키를 저장해 엽전을 받는 길(보안 리뷰 H4)을 막는다.
const user = "00000000-0000-4000-8000-0000000000f1";

let db: Awaited<ReturnType<typeof startTestDatabase>>;
let app: Awaited<ReturnType<typeof db.connect>>;

const claim = async () =>
  (await app.query("select public.companion_claim_coins() as c")).rows[0].c as {
    learning: number;
    bonus: number;
    wallet: { balance: number };
  };

async function progress(catalogProgress: Record<string, string[]>, coinUnits = {}) {
  await db.admin.query(
    `insert into public.learning_progress (user_id, progress) values ($1, $2)
     on conflict (user_id) do update set progress = excluded.progress`,
    [user, JSON.stringify({ version: 1, catalogProgress, coinUnits })],
  );
}

const learningRows = async () =>
  (
    await db.admin.query(
      "select count(*)::int as n from companion.credit_ledger where user_id = $1 and reason = 'learning'",
      [user],
    )
  ).rows[0].n as number;

const level5 = [
  "u01-water",
  "u02-checkin",
  "u03-mina",
  "u04-directions",
  "u05-baekban",
  "u06-cafe",
  "u07-jaemin",
  "u08-umbrella",
  "u09-subway",
  "u10-laundry",
  "u11-bookstore",
  "u12-cafe-missed",
  "u13-pajeon",
  "u14-hanbok",
  "u15-changdeokgung",
  "u16-umbrella-return",
  "u17-samgyeopsal",
];
const lessonUnits = ["CULT", "RP", "S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8"];

beforeAll(async () => {
  db = await startTestDatabase();
  app = await db.connect();
}, 90_000);
afterAll(async () => {
  await db?.close();
});
beforeEach(async () => {
  await db.admin.query("truncate auth.users cascade");
  await db.admin.query(
    "delete from companion.content_units where unit_key = 'S1' and episode_id = 'u18-new'",
  );
  await db.admin.query(
    `insert into auth.users (id, email, raw_app_meta_data) values ($1, 'f@libitum.test', '{}')`,
    [user],
  );
  await signIn(app, user);
});

test("CV-S1. 위조 키만 있으면 학습 보상 0 — 보너스는 그대로 100, 원장에 learning 행 없음", async () => {
  await progress(
    { "u99-fake": ["S1", "S2", "RP"], "u01-water": ["S99", "RP2", "X"], zzzz: ["a"] },
    { "u01-waterx": ["S1"], "u00-tutorial": ["S14", "CULT"] },
  );
  expect(await claim()).toMatchObject({ learning: 0, bonus: 100, wallet: { balance: 100 } });
  expect(await learningRows()).toBe(0);
});

test("CV-S2. 실제 유닛과 위조 키가 섞이면 실제 유닛만 한 번씩 5", async () => {
  await progress(
    { "u01-water": ["S1", "RP", "S77"], "u99-fake": ["S1"] },
    { "u17-samgyeopsal": ["CULT"], "u01-water": ["S1"] },
  );
  expect(await claim()).toMatchObject({ learning: 15, bonus: 100 });
  expect(await claim()).toMatchObject({ learning: 0, bonus: 0, wallet: { balance: 115 } });
});

test("CV-S3. 시드 = level-5 18편 + 역사적 id 13 = 187, intro · INT 없음, check가 INT를 막는다", async () => {
  const rows = (
    await db.admin.query(
      "select episode_id, array_agg(unit_key order by unit_key) as units from companion.content_units group by episode_id",
    )
  ).rows as { episode_id: string; units: string[] }[];
  const byEpisode = Object.fromEntries(rows.map((row) => [row.episode_id, row.units]));
  expect(byEpisode["u00-tutorial"]).toEqual(
    ["RP", ...Array.from({ length: 13 }, (_, i) => `S${i + 1}`)].sort(),
  );
  for (const id of level5) {
    const expected = ["u01-water", "u02-checkin", "u03-mina"].includes(id)
      ? [...lessonUnits, "S9"].sort()
      : lessonUnits;
    expect(byEpisode[id], id).toEqual(expected);
  }
  expect(Object.keys(byEpisode)).toHaveLength(18);
  expect(rows.reduce((sum, row) => sum + row.units.length, 0)).toBe(187);
  await expect(
    db.admin.query(
      "insert into companion.content_units (episode_id, unit_key) values ('u01-water', 'INT')",
    ),
  ).rejects.toBeTruthy();
  await expect(
    db.admin.query(
      "insert into companion.content_units (episode_id, unit_key) values ('u01-water', 'intro')",
    ),
  ).rejects.toBeTruthy();
});

test("CV-S4. 옛 판에서만 깰 수 있던 id(u00 S13 · u02 S9)도 지급한다", async () => {
  await progress({ "u00-tutorial": ["S13"], "u02-checkin": ["S9"] });
  expect(await claim()).toMatchObject({ learning: 10 });
});

test("CV-S5. 앱 역할은 표를 읽거나 쓸 수 없다", async () => {
  await expect(app.query("select * from companion.content_units limit 1")).rejects.toBeTruthy();
  await expect(
    app.query(
      "insert into companion.content_units (episode_id, unit_key) values ('u99-fake', 'S1')",
    ),
  ).rejects.toBeTruthy();
  const anon = await db.connect();
  await anon.query("set role anon");
  await expect(anon.query("select * from companion.content_units limit 1")).rejects.toBeTruthy();
});

test("CV-S6. 도구가 내는 멱등 insert를 두 번 돌려도 한 행 — 새 유닛이 지급 대상이 된다", async () => {
  await progress({ "u18-new": ["S1"] });
  expect(await claim()).toMatchObject({ learning: 0 });
  const sql =
    "insert into companion.content_units (episode_id, unit_key) values\n  ('u01-water', 'RP'),\n  ('u18-new', 'S1')\non conflict do nothing;\n";
  await db.admin.query(sql);
  await db.admin.query(sql);
  const count = await db.admin.query(
    "select count(*)::int as n from companion.content_units where episode_id = 'u18-new'",
  );
  expect(count.rows[0].n).toBe(1);
  expect(await claim()).toMatchObject({ learning: 5, bonus: 0 });
});

// 진행 표는 16KB 상한(20260930)이라 한 스냅숏의 키는 2,000개 안팎이 최대다.
test("CV-S7. 위조 키 2,000개(진행 표 상한 근처)도 문장 제한 안에 0", async () => {
  const forged: Record<string, string[]> = {};
  for (let i = 0; i < 40; i += 1) forged[`f${i}`] = Array.from({ length: 50 }, (_, j) => `K${j}`);
  await progress(forged);
  expect(await claim()).toMatchObject({ learning: 0, bonus: 100 });
  expect(await learningRows()).toBe(0);
});

// ADR-0146 「이미 위조 키로 받은 엽전」의 감사 질의가 위조 지급만 골라내는지 — 문서의 문장 그대로.
test("CV-S8. 감사 질의는 표에 없는 유닛의 learning 지급만 센다", async () => {
  await progress({ "u01-water": ["S1"] });
  await claim();
  // 이 마이그레이션 전에 위조 키로 받은 지급을 흉내 낸다.
  await db.admin.query("select companion.grant_once($1::uuid, 5, 'learning', $2::text)", [
    user,
    `${user}:u99-fake:S1`,
  ]);
  const audit = await db.admin.query(`
    select l.user_id, u.email, count(*) as forged_grants, sum(l.delta) as forged_coins,
           min(l.created_at) as first_at, max(l.created_at) as last_at
    from companion.credit_ledger l
    join auth.users u on u.id = l.user_id
    where l.kind = 'grant' and l.reason = 'learning'
      and not exists (
        select 1 from companion.content_units cu
        where l.ref_id = l.user_id::text || ':' || cu.episode_id || ':' || cu.unit_key
      )
    group by l.user_id, u.email
    order by forged_coins desc`);
  expect(audit.rows).toHaveLength(1);
  expect(audit.rows[0]).toMatchObject({ user_id: user, forged_grants: "1", forged_coins: "5" });
});
