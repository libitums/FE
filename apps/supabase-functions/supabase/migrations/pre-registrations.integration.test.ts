import { afterAll, beforeAll, beforeEach, expect, test } from "vitest";
import { startTestDatabase } from "./postgres.test-support";

// 웹 체험판 사전 등록 표(spec-r2 §6.4). 랜딩은 공개 키(anon)로 PostgREST insert만 한다 —
// 읽기 · 고치기 · 지우기 · 다른 열 지정은 권한 오류, 같은 email(대소문자 · 공백 달라도)은 고유 충돌(23505 → PostgREST 409).

let db: Awaited<ReturnType<typeof startTestDatabase>>;
let client: Awaited<ReturnType<typeof db.connect>>;

type Row = { email: string; locale?: string; source?: string };
const insert = (row: Row) =>
  client.query("insert into public.pre_registrations (email, locale, source) values ($1, $2, $3)", [
    row.email,
    row.locale ?? "en",
    row.source ?? "web-trial",
  ]);
async function stored(): Promise<{ email: string; locale: string; source: string }[]> {
  const result = await db.admin.query(
    "select email, locale, source from public.pre_registrations order by id",
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
  await db.admin.query("truncate public.pre_registrations restart identity");
  await client.query("set role anon");
});

test("MG1. anon은 email · locale · source로 insert한다 — 앞뒤 공백 · 대문자는 소문자로 정규화해 저장", async () => {
  await insert({ email: "  Mina.Kim@Example.COM ", locale: "ko" });
  expect(await stored()).toEqual([
    { email: "mina.kim@example.com", locale: "ko", source: "web-trial" },
  ]);
});

test("MG2. 같은 email은 대소문자 · 공백이 달라도 고유 충돌 23505(PostgREST 409)이고 행은 하나", async () => {
  await insert({ email: "mina@example.com" });
  await expect(insert({ email: " MINA@example.com" })).rejects.toMatchObject({ code: "23505" });
  expect(await stored()).toHaveLength(1);
});

test("MG3. anon은 읽을 수 없다(select 42501)", async () => {
  await insert({ email: "mina@example.com" });
  await expect(client.query("select * from public.pre_registrations")).rejects.toMatchObject({
    code: "42501",
  });
  await expect(client.query("select count(*) from public.pre_registrations")).rejects.toMatchObject(
    { code: "42501" },
  );
});

test("MG4. anon은 고치거나 지울 수 없다(update · delete 42501)", async () => {
  await insert({ email: "mina@example.com" });
  await expect(
    client.query("update public.pre_registrations set locale = 'ko'"),
  ).rejects.toMatchObject({ code: "42501" });
  await expect(client.query("delete from public.pre_registrations")).rejects.toMatchObject({
    code: "42501",
  });
  await expect(client.query("truncate public.pre_registrations")).rejects.toMatchObject({
    code: "42501",
  });
  expect(await stored()).toHaveLength(1);
});

test("MG5. anon은 id · created_at을 정할 수 없다(열 권한 42501)", async () => {
  await expect(
    client.query(
      "insert into public.pre_registrations (email, locale, source, created_at) values ('a@b.co', 'en', 'web-trial', now() - interval '1 year')",
    ),
  ).rejects.toMatchObject({ code: "42501" });
  await expect(
    client.query(
      "insert into public.pre_registrations (id, email, locale, source) overriding system value values (99, 'a@b.co', 'en', 'web-trial')",
    ),
  ).rejects.toMatchObject({ code: "42501" });
  expect(await stored()).toEqual([]);
});

test("MG6. authenticated 역할은 표에 닿지 않는다(insert · select 42501)", async () => {
  await client.query("reset role");
  await client.query("set role authenticated");
  await expect(insert({ email: "mina@example.com" })).rejects.toMatchObject({ code: "42501" });
  await expect(client.query("select * from public.pre_registrations")).rejects.toMatchObject({
    code: "42501",
  });
});

test("MG7. 형식이 틀린 email은 23514", async () => {
  for (const email of ["mina", "mina@example", "mi na@example.com", "@example.com", "a@b.c"]) {
    await expect(insert({ email })).rejects.toMatchObject({ code: "23514" });
  }
  await expect(insert({ email: `${"a".repeat(250)}@b.co` })).rejects.toMatchObject({
    code: "23514",
  });
  expect(await stored()).toEqual([]);
});

test("MG8. locale은 en · ko, source는 web-trial만(그 밖 23514 · RLS 정책)", async () => {
  await expect(insert({ email: "a@b.co", locale: "ja" })).rejects.toMatchObject({ code: "23514" });
  await expect(insert({ email: "a@b.co", source: "app" })).rejects.toMatchObject({
    code: expect.stringMatching(/^(23514|42501)$/),
  });
  await insert({ email: "a@b.co" });
  expect(await stored()).toEqual([{ email: "a@b.co", locale: "en", source: "web-trial" }]);
});
