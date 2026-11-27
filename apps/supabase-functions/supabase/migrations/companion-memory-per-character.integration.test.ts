import { readFile } from "node:fs/promises";
import { afterAll, beforeAll, beforeEach, expect, test } from "vitest";
import { startTestDatabase } from "./postgres.test-support";

// ADR-0210: 기억 원문의 학습자 현지 날짜(20270114120000, D3 — 프로필 시간대 → 접속 지역 → 학습 프로필의 나라 → UTC)와
// 공유 기억을 나온 대화의 캐릭터 층으로 옮기기(20270114130000, D6) · 넣는 기억 수(20270114140000, D8).
const perCharacter = new URL(
  "./20270114130000_companion_memory_per_character.sql",
  import.meta.url,
);
const user = "00000000-0000-4000-8000-0000000000d4";
// UTC 11-20 23:30 = 서울 11-21 08:30 = 자카르타 11-21 06:30.
const lateUtc = "2026-11-20T23:30:00Z";

let db: Awaited<ReturnType<typeof startTestDatabase>>;
let server: Awaited<ReturnType<typeof db.connect>>;

async function conversationWithMessage(at: string) {
  const result = await db.admin.query(
    "insert into companion.conversations (user_id, character_id, last_message_at) values ($1, 'duksu', $2) returning id",
    [user, at],
  );
  const id = result.rows[0].id as string;
  await db.admin.query(
    `insert into companion.messages (conversation_id, user_id, role, origin, status, text, client_message_id, meta, created_at)
     values ($1, $2, 'user', 'turn', 'complete', '내일 시험이 있어요', gen_random_uuid(), '{}', $3)`,
    [id, user, at],
  );
  return id;
}
const localDate = async (conversationId: string) =>
  (
    (
      await server.query("select public.companion_memory_source($1, 40, true) as s", [
        conversationId,
      ])
    ).rows[0].s as { localDate: string }
  ).localDate;

beforeAll(async () => {
  db = await startTestDatabase();
  server = await db.connect();
  await server.query("set role service_role");
}, 90_000);
afterAll(async () => {
  await db?.close();
});
beforeEach(async () => {
  await db.admin.query("truncate auth.users cascade");
  await db.admin.query(
    `insert into auth.users (id, email, raw_app_meta_data) values ($1, 'd@libitum.test', '{"duru_tester": true}')`,
    [user],
  );
  await db.admin.query(
    "insert into companion.profiles (user_id, birth_year, age_source) values ($1, 1990, 'self')",
    [user],
  );
});

test("LD1. 시간대를 모르면 마지막 메시지의 UTC 날짜", async () => {
  expect(await localDate(await conversationWithMessage(lateUtc))).toBe("2026-11-20");
});

test("LD2. 프로필 시간대가 있으면 그 날짜 — 접속 지역보다 앞선다", async () => {
  await db.admin.query(
    "update companion.profiles set timezone = 'Asia/Seoul', last_region = 'US' where user_id = $1",
    [user],
  );
  expect(await localDate(await conversationWithMessage(lateUtc))).toBe("2026-11-21");
});

test("LD3. 프로필 시간대 · 접속 지역이 없으면 학습 프로필의 나라", async () => {
  await db.admin.query(
    "insert into public.learner_profiles (user_id, name, country_code) values ($1, 'Ana', 'ID')",
    [user],
  );
  expect(await localDate(await conversationWithMessage(lateUtc))).toBe("2026-11-21");
});

async function sharedMemory(content: string, sourceMessageId: string | null) {
  const result = await db.admin.query(
    `insert into companion.memories (user_id, character_id, kind, content, source_message_id)
     values ($1, null, 'fact', $2, $3) returning id`,
    [user, content, sourceMessageId],
  );
  return result.rows[0].id as string;
}

test("PC1. 공유 기억은 나온 대화의 캐릭터 층으로 — 같은 글이 있으면 잊고, 원본이 사라졌으면 잊는다 · 다시 돌려도 같다", async () => {
  const duksu = await conversationWithMessage(lateUtc);
  const haejun = (
    await db.admin.query(
      "insert into companion.conversations (user_id, character_id, last_message_at) values ($1, 'haejun', $2) returning id",
      [user, lateUtc],
    )
  ).rows[0].id as string;
  const said = async (conversationId: string) =>
    (
      await db.admin.query(
        `insert into companion.messages (conversation_id, user_id, role, origin, status, text, client_message_id, meta)
         values ($1, $2, 'user', 'turn', 'complete', '말', gen_random_uuid(), '{}') returning id`,
        [conversationId, user],
      )
    ).rows[0].id as string;
  const toDuksu = await sharedMemory("이름은 아유크임", await said(duksu));
  const toHaejun = await sharedMemory("수박을 그냥 먹음", await said(haejun));
  await db.admin.query(
    "insert into companion.memories (user_id, character_id, kind, content) values ($1, 'haejun', 'fact', '수박을 그냥 먹음.')",
    [user],
  );
  const orphan = await sharedMemory("한국 드라마를 좋아함", null);

  await db.admin.query(await readFile(perCharacter, "utf8"));
  await db.admin.query(await readFile(perCharacter, "utf8"));

  const rows = async (id: string) =>
    (
      await db.admin.query(
        "select character_id, deleted_reason, history->-1->>'op' as op from companion.memories where id = $1",
        [id],
      )
    ).rows[0];
  expect(await rows(toDuksu)).toEqual({ character_id: "duksu", deleted_reason: null, op: "move" });
  expect(await rows(toHaejun)).toEqual({
    character_id: null,
    deleted_reason: "forgotten",
    op: "forget",
  });
  expect(await rows(orphan)).toEqual({
    character_id: null,
    deleted_reason: "forgotten",
    op: "forget",
  });
  // 원문 묶음의 기존 기억은 이 캐릭터 층만.
  const source = (
    await server.query("select public.companion_memory_source($1, 40, true) as s", [haejun])
  ).rows[0].s as { existing: { content: string; shared: boolean }[] };
  expect(source.existing.map((memory) => memory.content)).toEqual(["수박을 그냥 먹음."]);
  const left = await db.admin.query(
    "select count(*)::int as n from companion.memories where character_id is null and deleted_at is null",
  );
  expect(left.rows[0].n).toBe(0);
});

test("PL1. 답 프롬프트에 넣는 기억 수는 캐릭터 층 상한과 같은 50(ADR-0210 D8)", async () => {
  const settings = await db.admin.query(
    "select memory_prompt_limit, memory_cap from companion.settings",
  );
  expect(settings.rows[0]).toEqual({ memory_prompt_limit: 50, memory_cap: 50 });
});
