import { afterAll, beforeAll, expect, test } from "vitest";
import { signIn, startTestDatabase } from "./postgres.test-support";

// 「문서」 화면의 운영 조회 둘(20261114): 서버 키만 읽고, 프롬프트가 쓰는 페르소나 칸 · 설정 한 행을 그대로 돌려준다.
const tester = "00000000-0000-4000-8000-000000000001";

let db: Awaited<ReturnType<typeof startTestDatabase>>;
let app: Awaited<ReturnType<typeof db.connect>>;
let server: typeof app;
let anon: typeof app;

beforeAll(async () => {
  db = await startTestDatabase();
  app = await db.connect();
  server = await db.connect();
  anon = await db.connect();
  await server.query("set role service_role");
  await anon.query("set role anon");
  await db.admin.query("insert into auth.users (id) values ($1)", [tester]);
  await signIn(app, tester);
}, 90_000);
afterAll(async () => {
  await db?.close();
});

type InspectedCharacter = {
  id: string;
  bibleVersion: string;
  active: boolean;
  sortOrder: number;
  maxSpeechLevel: string;
  persona: Record<string, unknown>;
};

test("ID1. 캐릭터 — 순서대로 카드 전체 · 말투 상한 · 활성, 덕수쌤은 반말이 교정", async () => {
  const result = await server.query("select public.companion_inspect_characters() as c");
  const characters = result.rows[0].c as InspectedCharacter[];
  const stored = await db.admin.query(
    "select id, persona from companion.characters order by sort_order, id",
  );
  expect(characters.map((character) => character.id)).toEqual(stored.rows.map((row) => row.id));
  expect(characters.length).toBeGreaterThanOrEqual(5);
  for (const [index, character] of characters.entries()) {
    expect(character.persona).toEqual(stored.rows[index].persona);
    expect(["polite", "casual", "slang"]).toContain(character.maxSpeechLevel);
  }
  const duksu = characters.find((character) => character.id === "duksu")!;
  expect(duksu).toMatchObject({
    active: true,
    maxSpeechLevel: "polite",
    persona: { name: "덕수쌤", banmalFeedback: "correction", topics: expect.any(Array) },
  });
  expect(
    characters
      .filter((character) => character.persona["banmalFeedback"] !== undefined)
      .map((c) => c.id),
  ).toEqual(["duksu"]);
});

test("ID2. 설정 — 한 행 전체(값을 바꾸면 그대로 보인다)", async () => {
  await db.admin.query("update companion.settings set trial_limit = 31");
  const result = await server.query("select public.companion_inspect_settings() as s");
  const settings = result.rows[0].s as Record<string, unknown>;
  expect(settings).toMatchObject({ trial_limit: 31, testers_only: true, trial_character: "duksu" });
  expect(settings).not.toHaveProperty("id");
  const columns = await db.admin.query(
    "select column_name from information_schema.columns where table_schema = 'companion' and table_name = 'settings' and column_name <> 'id'",
  );
  expect(Object.keys(settings).sort()).toEqual(columns.rows.map((row) => row.column_name).sort());
});

test("ID3. 앱 사용자 · anon은 두 함수를 부르지 못한다(42501)", async () => {
  for (const client of [app, anon]) {
    for (const fn of ["companion_inspect_characters", "companion_inspect_settings"]) {
      await expect(client.query(`select public.${fn}()`)).rejects.toMatchObject({ code: "42501" });
    }
  }
});
