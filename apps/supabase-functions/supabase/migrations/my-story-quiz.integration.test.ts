import { afterAll, beforeAll, beforeEach, expect, test } from "vitest";
import { startTestDatabase } from "./postgres.test-support";

// 20270108120000(ADR-0191 D14): 덕수쌤 퀴즈의 무료 답 — 퀴즈 반응이 저장되면 퀴즈 한 줄(방아쇠) · 첫 답 · 오답 뒤 한 통 무료(금액 0 예약) ·
// 재전송 · 실패한 턴은 세지 않음 · 결과 적기(내 메시지 meta) · 맞히면 친밀도 +2(한 번) · 기한 · 기록의 공개 meta.
const member = "00000000-0000-4000-8000-000000000031";

let db: Awaited<ReturnType<typeof startTestDatabase>>;
let server: Awaited<ReturnType<typeof db.connect>>;

type Json = Record<string, unknown>;
const settings = (assignments: string) =>
  db.admin.query(`update companion.settings set ${assignments}`);
const one = async <T>(sql: string, params: unknown[] = []) =>
  (await db.admin.query(sql, params)).rows[0] as T;
const uuid = async () => (await one<{ id: string }>("select gen_random_uuid() as id")).id;

let conversation = "";

/** 내 단어 스토리 하나와, 덕수쌤이 그 스토리에 단 반응 메시지(각도). */
async function quizReaction(angle = "quiz", postedAgo = "1 hour") {
  const story = (
    await one<{ id: string }>(
      `insert into companion.my_stories (user_id, client_id, kind, word, ko, roman, meaning, lang, posted_at, expires_at)
       values ($1, gen_random_uuid(), 'word', '{"episodeId": "u01", "ref": "w1"}', '도착하다', 'dochakada', 'to arrive', 'en',
         now() - $2::interval, now() - $2::interval + interval '24 hours')
       returning id`,
      [member, postedAgo],
    )
  ).id;
  const message = (
    await one<{ id: string }>(
      `insert into companion.messages (conversation_id, user_id, role, origin, status, segments, meta)
       values ($1, $2, 'assistant', 'story_reaction', 'complete', '[{"kind": "speech", "text": "퀴즈!"}]',
         jsonb_build_object('myStoryId', $3::uuid, 'angle', $4::text, 'model', 'x'))
       returning id`,
      [conversation, member, story, angle],
    )
  ).id;
  return { story, message };
}
const claim = async (client: string) =>
  (
    await server.query("select public.companion_claim_quiz_answer($1, 'duksu', $2, now()) as r", [
      member,
      client,
    ])
  ).rows[0].r as Json;
const answered = async (client: string, correct: boolean) =>
  (
    await server.query("select public.companion_quiz_answered($1, $2, $3, now()) as r", [
      member,
      client,
      correct,
    ])
  ).rows[0].r as Json;
const gate = async (client: string) =>
  (
    await server.query("select public.companion_turn_gate($1, 'duksu', $2, now(), null) as g", [
      member,
      client,
    ])
  ).rows[0].g as Json;
/** 턴이 시작돼 내 메시지가 저장되고(begin), 끝났다(settle)고 친다. */
async function turn(client: string, ok = true) {
  await server.query(
    "select public.companion_begin_turn($1, 'duksu', $2, '답', 'text', 20, null, now()) as t",
    [member, client],
  );
  await db.admin.query(
    `update companion.credit_holds set status = $3, closed_at = now() where user_id = $1 and client_message_id = $2`,
    [member, client, ok ? "settled" : "released"],
  );
}
const meta = async (messageId: string) =>
  (
    await one<{ j: Json }>(
      "select companion.message_json(m) as j from companion.messages m where m.id = $1",
      [messageId],
    )
  ).j["meta"] as Json | null;
const userMeta = async (client: string) =>
  (
    await one<{ j: Json }>(
      "select companion.message_json(m) as j from companion.messages m where m.client_message_id = $1",
      [client],
    )
  ).j["meta"] as Json | null;
const intimacy = async () =>
  (
    await one<{ n: number }>(
      "select intimacy as n from companion.relationships where user_id = $1 and character_id = 'duksu'",
      [member],
    )
  ).n;

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
  await settings(
    "testers_only = false, trial_limit = 0, message_cost = 3, minor_daily_limit_seconds = null",
  );
  await db.admin.query("insert into auth.users (id, email) values ($1, 'q@libitum.test')", [
    member,
  ]);
  conversation = (
    await one<{ id: string }>(
      "insert into companion.conversations (user_id, character_id) values ($1, 'duksu') returning id",
      [member],
    )
  ).id;
  await db.admin.query(
    "insert into companion.relationships (user_id, character_id, intimacy) values ($1, 'duksu', 10)",
    [member],
  );
});

test("MQ1. 퀴즈 반응이 저장되면 퀴즈가 생기고(다른 각도는 없음), 첫 답은 엽전이 없어도 관문을 지난다(금액 0)", async () => {
  await quizReaction("word");
  expect(await claim(await uuid())).toEqual({ result: "none" });
  const { story, message } = await quizReaction();
  expect(await meta(message)).toEqual({
    angle: "quiz",
    myStoryId: story,
    quiz: { freeAnswer: true },
  });

  const plain = await uuid();
  expect((await gate(plain)).result).toBe("insufficient_credits");
  const first = await uuid();
  expect(await claim(first)).toMatchObject({
    result: "quiz",
    attempt: 1,
    word: "도착하다",
    meaning: "to arrive",
  });
  expect((await gate(first)).result).toBe("ok");
  // 재전송은 같은 차례 · 다른 메시지는 그 사이 차례가 없다(앞 답이 아직 끝나지 않음).
  expect(await claim(first)).toMatchObject({ result: "quiz", attempt: 1 });
  expect(await claim(await uuid())).toEqual({ result: "none" });
});

test("MQ2. 오답 → 힌트 · 다음 한 통도 무료 → 또 틀리면 정답 공개로 끝. 내 메시지 meta에 결과, 친밀도는 그대로", async () => {
  const { message } = await quizReaction();
  const first = await uuid();
  await claim(first);
  await turn(first);
  expect(await answered(first, false)).toEqual({ result: "hint", attempt: 1 });
  expect(await userMeta(first)).toEqual({ quiz: { free: true, attempt: 1, result: "hint" } });
  expect(await meta(message)).toMatchObject({ quiz: { freeAnswer: true } });

  const second = await uuid();
  expect(await claim(second)).toMatchObject({ result: "quiz", attempt: 2 });
  await turn(second);
  expect(await answered(second, false)).toEqual({ result: "revealed", attempt: 2 });
  expect(await userMeta(second)).toEqual({ quiz: { free: true, attempt: 2, result: "revealed" } });
  expect(await meta(message)).toMatchObject({ quiz: { freeAnswer: false } });
  // 끝난 퀴즈 — 다음 메시지는 보통 턴.
  expect(await claim(await uuid())).toEqual({ result: "none" });
  expect(await intimacy()).toBe(10);
});

test("MQ3. 맞히면 끝 · 친밀도 +2(재전송해도 한 번)", async () => {
  await quizReaction();
  const first = await uuid();
  await claim(first);
  await turn(first);
  expect(await answered(first, true)).toEqual({ result: "correct", attempt: 1 });
  expect(await answered(first, true)).toEqual({ result: "correct", attempt: 1 });
  expect(await intimacy()).toBe(12);
  expect(await userMeta(first)).toEqual({ quiz: { free: true, attempt: 1, result: "correct" } });
  expect(await claim(await uuid())).toEqual({ result: "none" });
});

test("MQ4. 실패한 턴(예약이 풀림)은 세지 않는다 — 다음 메시지가 같은 차례를 받는다. 재전송이면 다시 무료 예약", async () => {
  await quizReaction();
  const failed = await uuid();
  await claim(failed);
  await turn(failed, false);
  const next = await uuid();
  expect(await claim(next)).toMatchObject({ result: "quiz", attempt: 1 });

  // 앞 메시지를 다시 보내면(예약이 풀린 채) — 다른 메시지가 그 차례를 가졌으므로 그 사이 다시 예약은 두되 차례는 같다.
  await turn(next, false);
  expect(await claim(failed)).toMatchObject({ result: "quiz", attempt: 1 });
  expect(
    (
      await db.admin.query(
        "select amount, status from companion.credit_holds where user_id = $1 and client_message_id = $2 order by created_at",
        [member, failed],
      )
    ).rows,
  ).toEqual([
    { amount: 0, status: "released" },
    { amount: 0, status: "open" },
  ]);
});

test("MQ5. 기한(스토리의 24시간)이 지나면 무료 답이 없다 · 값이 걸린 메시지는 무료로 바꾸지 않는다", async () => {
  await quizReaction("quiz", "25 hours");
  expect(await claim(await uuid())).toEqual({ result: "none" });

  await quizReaction();
  const paid = await uuid();
  await db.admin.query(
    `insert into companion.credit_holds (user_id, client_message_id, character_id, amount) values ($1, $2, 'duksu', 3)`,
    [member, paid],
  );
  expect(await claim(paid)).toEqual({ result: "none" });
});
