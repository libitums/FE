import { afterAll, beforeAll, beforeEach, expect, test } from "vitest";
import { startTestDatabase } from "./postgres.test-support";

// 웹 체험판 인식 글자 수집 표. 랜딩은 공개 키(anon)로 PostgREST insert만 한다 —
// 읽기 · 고치기 · 지우기 · 다른 열 지정은 권한 오류, 길이 · 개수 · 값 범위는 check 제약(23514), 보관 90일은 삭제 함수.

let db: Awaited<ReturnType<typeof startTestDatabase>>;
let client: Awaited<ReturnType<typeof db.connect>>;

const SESSION = "6f1c2b8e-1d2a-4c3b-9e8f-0a1b2c3d4e5f";
const COLUMNS =
  "session_id, episode_version, turn_index, expected, alternatives, outcome, similarity, browser, locale";

type Row = {
  session_id?: string;
  episode_version?: string;
  turn_index?: number;
  expected?: string;
  alternatives?: (string | null)[];
  outcome?: string;
  similarity?: number;
  browser?: string;
  locale?: string;
};

const valuesOf = (row: Row) => [
  row.session_id ?? SESSION,
  row.episode_version ?? "u00-tutorial@1",
  row.turn_index ?? 0,
  row.expected ?? "지금부터요!",
  row.alternatives ?? ["지금 부터요", "지금부터 요"],
  row.outcome ?? "lenient",
  row.similarity ?? 0.944,
  row.browser ?? "android-chrome",
  row.locale ?? "ko",
];

const insert = (row: Row = {}) =>
  client.query(
    `insert into public.trial_speech_samples (${COLUMNS}) values ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    valuesOf(row),
  );

async function stored(): Promise<Record<string, unknown>[]> {
  const result = await db.admin.query(
    `select ${COLUMNS} from public.trial_speech_samples order by id`,
  );
  return result.rows;
}

beforeAll(async () => {
  db = await startTestDatabase();
  client = await db.connect();
}, 30_000);
afterAll(async () => {
  await db?.close();
});
beforeEach(async () => {
  await client.query("reset role");
  await db.admin.query("truncate public.trial_speech_samples restart identity");
  await client.query("set role anon");
});

test("SS1. anon은 정해진 열 아홉으로 insert한다", async () => {
  await insert();
  const rows = await stored();
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({
    session_id: SESSION,
    episode_version: "u00-tutorial@1",
    turn_index: 0,
    expected: "지금부터요!",
    alternatives: ["지금 부터요", "지금부터 요"],
    outcome: "lenient",
    browser: "android-chrome",
    locale: "ko",
  });
  expect(rows[0]?.["similarity"]).toBeCloseTo(0.944, 3);
});

test("SS2. anon은 읽거나 고치거나 지울 수 없다(42501)", async () => {
  await insert();
  for (const sql of [
    "select * from public.trial_speech_samples",
    "select count(*) from public.trial_speech_samples",
    "update public.trial_speech_samples set outcome = 'strict'",
    "delete from public.trial_speech_samples",
    "truncate public.trial_speech_samples",
  ]) {
    await expect(client.query(sql), sql).rejects.toMatchObject({ code: "42501" });
  }
  expect(await stored()).toHaveLength(1);
});

test("SS3. anon은 id · created_at을 정할 수 없다(열 권한 42501)", async () => {
  await expect(
    client.query(
      `insert into public.trial_speech_samples (${COLUMNS}, created_at) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, now() - interval '1 year')`,
      valuesOf({}),
    ),
  ).rejects.toMatchObject({ code: "42501" });
  await expect(
    client.query(
      `insert into public.trial_speech_samples (id, ${COLUMNS}) overriding system value values (99, $1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      valuesOf({}),
    ),
  ).rejects.toMatchObject({ code: "42501" });
  expect(await stored()).toEqual([]);
});

test("SS4. authenticated 역할은 표에 닿지 않는다(insert · select 42501)", async () => {
  await client.query("reset role");
  await client.query("set role authenticated");
  await expect(insert()).rejects.toMatchObject({ code: "42501" });
  await expect(client.query("select * from public.trial_speech_samples")).rejects.toMatchObject({
    code: "42501",
  });
});

test("SS5. 대안은 1 ~ 3개 · 각 1 ~ 200자 · null 없음(그 밖 23514)", async () => {
  for (const alternatives of [[], ["a", "b", "c", "d"], ["가".repeat(201)], [""], ["a", null]]) {
    await expect(insert({ alternatives }), JSON.stringify(alternatives)).rejects.toMatchObject({
      code: "23514",
    });
  }
  await insert({ alternatives: ["가".repeat(200), "b", "c"] });
  expect(await stored()).toHaveLength(1);
});

test("SS6. expected는 1 ~ 200자, episode_version은 1 ~ 40자(그 밖 23514)", async () => {
  for (const row of [
    { expected: "" },
    { expected: "가".repeat(201) },
    { episode_version: "" },
    { episode_version: "v".repeat(41) },
  ]) {
    await expect(insert(row), JSON.stringify(row)).rejects.toMatchObject({ code: "23514" });
  }
  await insert({ expected: "가".repeat(200) });
  expect(await stored()).toHaveLength(1);
});

test("SS7. outcome · browser · locale · similarity · turn_index 범위(그 밖 23514)", async () => {
  // outcome은 RLS 정책(insert check)이 먼저 막을 수 있다 — 어느 쪽이든 거부.
  await expect(insert({ outcome: "no-speech" })).rejects.toMatchObject({
    code: expect.stringMatching(/^(23514|42501)$/),
  });
  for (const row of [
    { browser: "Mozilla/5.0" },
    { locale: "ja" },
    { similarity: 1.01 },
    { similarity: -0.01 },
    { turn_index: -1 },
    { turn_index: 10 },
  ]) {
    await expect(insert(row), JSON.stringify(row)).rejects.toMatchObject({ code: "23514" });
  }
  for (const outcome of ["strict", "lenient", "incorrect"]) await insert({ outcome });
  for (const browser of ["ios-safari", "in-app", "desktop", "other"]) await insert({ browser });
  expect(await stored()).toHaveLength(7);
});

test("SS8. 보관 90일 — purge가 90일 넘은 행만 지우고 지운 수를 돌려준다, anon은 부를 수 없다", async () => {
  await client.query("reset role");
  await db.admin.query(
    `insert into public.trial_speech_samples (${COLUMNS}, created_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, now() - interval '91 days'),
            ($1, $2, $3, $4, $5, $6, $7, $8, $9, now() - interval '89 days'),
            ($1, $2, $3, $4, $5, $6, $7, $8, $9, now())`,
    valuesOf({}),
  );
  await client.query("set role anon");
  await expect(client.query("select public.purge_trial_speech_samples()")).rejects.toMatchObject({
    code: "42501",
  });
  await client.query("reset role");
  await client.query("set role authenticated");
  await expect(client.query("select public.purge_trial_speech_samples()")).rejects.toMatchObject({
    code: "42501",
  });
  const purged = await db.admin.query("select public.purge_trial_speech_samples() as gone");
  expect(purged.rows[0]?.gone).toBe(1);
  const left = await db.admin.query(
    "select count(*)::int as n from public.trial_speech_samples where created_at < now() - interval '90 days'",
  );
  expect(left.rows[0]?.n).toBe(0);
  expect(await stored()).toHaveLength(2);
});
