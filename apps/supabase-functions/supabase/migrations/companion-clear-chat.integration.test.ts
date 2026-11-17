import { afterAll, beforeAll, beforeEach, expect, test } from "vitest";
import { signIn, startTestDatabase } from "./postgres.test-support";

// 대화 비우기(20261211, ADR-0156): `companion_clear_chat` — 그 인물과의 대화 · 그 인물 기억 · 친밀도만 지우고, 공유 기억 · 다른 인물 ·
// 엽전 · 체험 사용량 · 앨범은 남긴다. 진행 중인 턴이 있으면 busy. 로그인하지 않았거나 모르는 인물이면 거절. 여러 번 불러도 같다.
const learner = "00000000-0000-4000-8000-000000000001";
const other = "00000000-0000-4000-8000-000000000002";

let db: Awaited<ReturnType<typeof startTestDatabase>>;
let app: Awaited<ReturnType<typeof db.connect>>;

async function conversation(userId: string, characterId: string): Promise<string> {
  const result = await db.admin.query(
    `insert into companion.conversations (user_id, character_id) values ($1, $2) returning id`,
    [userId, characterId],
  );
  return result.rows[0].id as string;
}
async function message(
  conversationId: string,
  userId: string,
  status = "complete",
  ago = "1 hour",
) {
  await db.admin.query(
    `insert into companion.messages (conversation_id, user_id, role, status, client_message_id, text, created_at)
     values ($1, $2, 'user', $3, gen_random_uuid(), '안녕하세요', now() - $4::interval)`,
    [conversationId, userId, status, ago],
  );
}
async function seed(userId: string) {
  const duksu = await conversation(userId, "duksu");
  await message(duksu, userId);
  const mina = await conversation(userId, "mina");
  await message(mina, userId);
  await db.admin.query(
    `insert into companion.memories (user_id, character_id, kind, content) values
       ($1, 'duksu', 'fact', '커피를 좋아한다'), ($1, null, 'fact', '서울에 산다'), ($1, 'mina', 'fact', '고양이를 키운다')`,
    [userId],
  );
  await db.admin.query(
    `insert into companion.relationships (user_id, character_id, intimacy, speech_level) values
       ($1, 'duksu', 40, 'casual'), ($1, 'mina', 10, 'polite')`,
    [userId],
  );
  await db.admin.query(
    `insert into companion.trial_usage (user_id, character_id, used) values ($1, 'duksu', 12)`,
    [userId],
  );
  return duksu;
}
const count = async (sql: string, params: unknown[]) =>
  Number((await db.admin.query(sql, params)).rows[0].n);
const clear = async (characterId: string) =>
  (await app.query("select public.companion_clear_chat($1) as r", [characterId])).rows[0].r as {
    status: string;
  };

beforeAll(async () => {
  db = await startTestDatabase();
  app = await db.connect();
}, 30_000);
afterAll(async () => {
  await db?.close();
});
beforeEach(async () => {
  await db.admin.query("truncate auth.users cascade");
  await db.admin.query(
    `insert into auth.users (id, email) values ($1, 'a@libitum.test'), ($2, 'b@libitum.test')`,
    [learner, other],
  );
  await signIn(app, learner);
});

test("CC1. 그 인물의 대화 · 기억 · 친밀도만 지우고 공유 기억 · 다른 인물 · 체험 사용량 · 다른 계정은 남긴다", async () => {
  await seed(learner);
  await seed(other);

  expect(await clear("duksu")).toEqual({ status: "cleared" });

  const mine = [learner];
  expect(
    await count(
      "select count(*) n from companion.conversations where user_id = $1 and character_id = 'duksu'",
      mine,
    ),
  ).toBe(0);
  expect(
    await count(
      "select count(*) n from companion.messages m join companion.conversations c on c.id = m.conversation_id where c.user_id = $1 and c.character_id = 'mina'",
      mine,
    ),
  ).toBe(1);
  expect(
    await count(
      "select count(*) n from companion.memories where user_id = $1 and character_id = 'duksu'",
      mine,
    ),
  ).toBe(0);
  expect(
    await count(
      "select count(*) n from companion.memories where user_id = $1 and character_id is null",
      mine,
    ),
  ).toBe(1);
  expect(
    await count(
      "select count(*) n from companion.memories where user_id = $1 and character_id = 'mina'",
      mine,
    ),
  ).toBe(1);
  expect(
    await count(
      "select count(*) n from companion.relationships where user_id = $1 and character_id = 'duksu'",
      mine,
    ),
  ).toBe(0);
  expect(
    await count(
      "select used n from companion.trial_usage where user_id = $1 and character_id = 'duksu'",
      mine,
    ),
  ).toBe(12);
  expect(
    await count("select count(*) n from companion.conversations where user_id = $1", [other]),
  ).toBe(2);
  expect(await count("select count(*) n from companion.memories where user_id = $1", [other])).toBe(
    3,
  );
});

test("CC2. 진행 중인 턴(보류된 내 글, 3분 안)이 있으면 busy로 아무것도 지우지 않는다 · 오래된 보류는 지운다", async () => {
  const duksu = await seed(learner);
  await message(duksu, learner, "pending", "10 seconds");

  expect(await clear("duksu")).toEqual({ status: "busy" });
  expect(
    await count(
      "select count(*) n from companion.conversations where user_id = $1 and character_id = 'duksu'",
      [learner],
    ),
  ).toBe(1);

  await db.admin.query(
    "update companion.messages set created_at = now() - interval '10 minutes' where status = 'pending'",
  );
  expect(await clear("duksu")).toEqual({ status: "cleared" });
});

test("CC3. 여러 번 불러도 같다(빈 대화도 cleared) · 모르는 인물은 22023 · 로그인하지 않으면 28000", async () => {
  expect(await clear("duksu")).toEqual({ status: "cleared" });
  expect(await clear("duksu")).toEqual({ status: "cleared" });
  await expect(clear("nobody")).rejects.toMatchObject({ code: "22023" });
  await app.query("select set_config('request.jwt.claim.sub', '', false)");
  await expect(clear("duksu")).rejects.toMatchObject({ code: "28000" });
});

test("CC4. 실행 권한은 authenticated에만 — anon은 부를 수 없다", async () => {
  const anon = await db.connect();
  await anon.query("set role anon");
  await expect(anon.query("select public.companion_clear_chat('duksu')")).rejects.toMatchObject({
    code: "42501",
  });
});
