import { afterAll, beforeAll, beforeEach, expect, test } from "vitest";
import { startTestDatabase } from "./postgres.test-support";

// 20270109120000(ADR-0191 D15): 조합 스토리 — 바탕(색 · 사진) × 얹은 것(글 · 배운 단어). 사진 · 글이 먼저(덕수쌤은 둘째, 퀴즈는 둘째에서만),
// 색 + 단어만은 옛 단어 카드 규칙, 단어 없으면 덕수쌤 고정 없음 · 퀴즈 단어 = 첫 배운 단어 · 넘어감(skip) · 인용의 한 줄.
const member = "00000000-0000-4000-8000-000000000041";

let db: Awaited<ReturnType<typeof startTestDatabase>>;
let server: Awaited<ReturnType<typeof db.connect>>;

type Json = Record<string, unknown>;
const settings = (assignments: string) =>
  db.admin.query(`update companion.settings set ${assignments}`);
const one = async <T>(sql: string, params: unknown[] = []) =>
  (await db.admin.query(sql, params)).rows[0] as T;
const uuid = async () => (await one<{ id: string }>("select gen_random_uuid() as id")).id;

const text = (ko: string) => ({ kind: "text", ko, x: 0.5, y: 0.5, scale: 1, rotation: 0 });
const word = (ko: string, meaning: string) => ({
  kind: "word",
  ko,
  meaning,
  word: { episodeId: "u01", ref: ko },
  x: 0.2,
  y: 0.2,
  scale: 1,
  rotation: 0,
});

/** 스토리 한 줄을 넣고 답할 인물을 적는다(올리기 RPC의 마지막 단계와 같다). */
async function story(kind: "text" | "photo", ko: string, overlays: unknown[]) {
  const id = (
    await one<{ id: string }>(
      `insert into companion.my_stories (user_id, client_id, kind, word, ko, roman, meaning, lang, posted_at, expires_at,
         status, background, image_path, overlays)
       values ($1::uuid, gen_random_uuid(), $2::text, null, $3, '', '', 'en', now(), now() + interval '24 hours', 'live',
         case when $2::text = 'text' then 'orange' end, case when $2::text = 'photo' then $1::text || '/p' || replace(gen_random_uuid()::text, '-', '') || '.jpg' end, $4)
       returning id`,
      [member, kind, ko, JSON.stringify(overlays)],
    )
  ).id;
  await db.admin.query(
    "select companion.schedule_my_story_reactions(s, now()) from companion.my_stories s where s.id = $1",
    [id],
  );
  return id;
}
const alarms = async (storyId: string) =>
  (
    await db.admin.query(
      "select character_id, rank, angle from companion.my_story_reactions where story_id = $1 order by rank",
      [storyId],
    )
  ).rows as { character_id: string; rank: number; angle: string }[];
async function spoke(character: string) {
  const id = (
    await one<{ id: string }>(
      `insert into companion.conversations (user_id, character_id, last_message_at) values ($1, $2, now() - interval '2 hours')
       on conflict (user_id, character_id) where kind = 'companion' do update set last_message_at = excluded.last_message_at
       returning id`,
      [member, character],
    )
  ).id;
  await db.admin.query(
    `insert into companion.messages (conversation_id, user_id, role, origin, status, text, client_message_id, created_at)
     values ($1, $2, 'user', 'turn', 'complete', '안녕하세요', gen_random_uuid(), now() - interval '2 hours')`,
    [id, member],
  );
  return id;
}
async function reaction(storyId: string, conversation: string, angle: string) {
  return (
    await one<{ id: string }>(
      `insert into companion.messages (conversation_id, user_id, role, origin, status, segments, meta)
       values ($1, $2, 'assistant', 'story_reaction', 'complete', '[{"kind": "speech", "text": "!"}]',
         jsonb_build_object('myStoryId', $3::uuid, 'angle', $4::text))
       returning id`,
      [conversation, member, storyId, angle],
    )
  ).id;
}

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
    `testers_only = false, friends_mode = 'on', my_stories = 'on', story_reactions = 'on', my_story_text = 'on', my_story_rules = '{"twoReplyChance": 1}'`,
  );
  await db.admin.query("insert into auth.users (id, email) values ($1, 'c@libitum.test')", [
    member,
  ]);
  await spoke("mina");
  await spoke("duksu");
  await spoke("yoonkyung");
});

test("MC1. 사진 · 글 + 단어 — 첫째는 다른 인물의 react, 덕수쌤은 둘째(quiz · question · together). 덕수쌤 혼자면 react", async () => {
  for (const [kind, ko, overlays] of [
    ["text", "", [text("비 오는 날"), word("우산", "umbrella")]],
    ["text", "오늘 비가 와요", [word("우산", "umbrella")]],
    ["photo", "바다 왔어", [word("여름", "summer")]],
    ["photo", "바다", [word("여름", "summer"), text("휴가")]],
  ] as const) {
    for (let round = 0; round < 3; round += 1) {
      const picked = await alarms(await story(kind, ko, [...overlays]));
      expect(picked).toHaveLength(2);
      expect(picked[0]).toMatchObject({ rank: 1, angle: "react" });
      expect(picked[0]!.character_id).not.toBe("duksu");
      expect(picked[1]!.character_id).toBe("duksu");
      expect(["quiz", "question", "together"]).toContain(picked[1]!.angle);
    }
  }
  await settings(`my_story_rules = '{"twoReplyChance": 0}'`);
  expect(await alarms(await story("photo", "바다", [word("여름", "summer")]))).toEqual([
    { character_id: "duksu", rank: 1, angle: "react" },
  ]);
});

test("MC2. 색 + 단어만 — 옛 단어 카드 규칙(덕수쌤 고정 · word · quiz). 단어 없는 사진 · 글은 덕수쌤 고정 · 퀴즈 없음", async () => {
  for (let round = 0; round < 4; round += 1) {
    const picked = await alarms(await story("text", "", [word("산책", "a walk")]));
    const duksu = picked.find((alarm) => alarm.character_id === "duksu")!;
    expect(duksu.rank === 1 ? ["word", "quiz"] : ["question", "quiz", "together"]).toContain(
      duksu.angle,
    );
    const other = picked.find((alarm) => alarm.character_id !== "duksu")!;
    expect(other.rank === 1 ? ["word"] : ["question", "together"]).toContain(other.angle);
  }
  for (let round = 0; round < 4; round += 1) {
    const picked = await alarms(await story("photo", "바다 왔어", [text("최고")]));
    expect(picked[0]!.angle).toBe("react");
    expect(picked.map((alarm) => alarm.angle)).not.toContain("quiz");
  }
});

test("MC3. 퀴즈 단어 = 첫 배운 단어 — 퀴즈 반응이 저장되면 그 단어로 퀴즈. 단어가 없으면 퀴즈가 생기지 않는다", async () => {
  const conversation = (
    await one<{ id: string }>(
      "select id from companion.conversations where user_id = $1 and character_id = 'duksu'",
      [member],
    )
  ).id;
  const photo = await story("photo", "바다", [
    text("휴가"),
    word("여름", "summer"),
    word("바다", "sea"),
  ]);
  await reaction(photo, conversation, "quiz");
  expect(
    await one("select word, meaning from companion.my_story_quizzes where story_id = $1", [photo]),
  ).toEqual({ word: "여름", meaning: "summer" });
  const plain = await story("photo", "바다", [text("휴가")]);
  await reaction(plain, conversation, "quiz");
  expect(
    Number(
      (
        await one<{ n: string }>(
          "select count(*) as n from companion.my_story_quizzes where story_id = $1",
          [plain],
        )
      ).n,
    ),
  ).toBe(0);
});

test("MC4. 넘어감(skip) — 그 메시지는 무료로 두고 퀴즈를 닫는다(내 메시지 meta skipped, 친밀도 그대로)", async () => {
  const conversation = (
    await one<{ id: string }>(
      "select id from companion.conversations where user_id = $1 and character_id = 'duksu'",
      [member],
    )
  ).id;
  await db.admin.query(
    "insert into companion.relationships (user_id, character_id, intimacy) values ($1, 'duksu', 10)",
    [member],
  );
  const s = await story("text", "", [word("우산", "umbrella")]);
  const message = await reaction(s, conversation, "quiz");
  const client = await uuid();
  expect(
    (
      await server.query("select public.companion_claim_quiz_answer($1, 'duksu', $2, now()) as r", [
        member,
        client,
      ])
    ).rows[0].r,
  ).toMatchObject({ result: "quiz", attempt: 1, word: "우산" });
  await server.query(
    "select public.companion_begin_turn($1, 'duksu', $2, '오늘 날씨 좋네요', 'text', 20, null, now())",
    [member, client],
  );
  await db.admin.query(
    "update companion.credit_holds set status = 'settled' where user_id = $1 and client_message_id = $2",
    [member, client],
  );
  expect(
    (
      await server.query("select public.companion_quiz_answered($1, $2, 'skip', now()) as r", [
        member,
        client,
      ])
    ).rows[0].r,
  ).toEqual({ result: "skipped", attempt: 1 });
  const meta = async (where: string, param: string) =>
    (
      await one<{ j: Json }>(
        `select companion.message_json(m) as j from companion.messages m where ${where} = $1`,
        [param],
      )
    ).j["meta"];
  expect(await meta("m.client_message_id", client)).toEqual({
    quiz: { free: true, attempt: 1, result: "skipped" },
  });
  expect(await meta("m.id", message)).toMatchObject({ quiz: { freeAnswer: false } });
  expect(
    (
      await server.query("select public.companion_claim_quiz_answer($1, 'duksu', $2, now()) as r", [
        member,
        await uuid(),
      ])
    ).rows[0].r,
  ).toEqual({ result: "none" });
  expect(
    (
      await one<{ n: number }>(
        "select intimacy as n from companion.relationships where user_id = $1 and character_id = 'duksu'",
        [member],
      )
    ).n,
  ).toBe(10);
});

test("MC5. 인용 · 내 스토리 답장의 한 줄 — 쓴 글 → 얹은 글 → 단어 순, 답장의 단어는 첫 배운 단어", async () => {
  const line = async (id: string) =>
    (
      await one<{ l: string }>(
        "select companion.my_story_line(s) as l from companion.my_stories s where s.id = $1",
        [id],
      )
    ).l;
  expect(await line(await story("text", "", [word("우산", "umbrella"), text("비 오는 날")]))).toBe(
    "비 오는 날",
  );
  expect(await line(await story("text", "", [word("우산", "umbrella")]))).toBe("우산");
  expect(await line(await story("photo", "바다 왔어", [text("휴가")]))).toBe("바다 왔어");
  const s = await story("text", "", [text("비 오는 날"), word("우산", "umbrella")]);
  const reply = (
    await one<{ r: Json }>(
      "select companion.claim_my_story_reply($1, $2, 'mina', gen_random_uuid()) as r",
      [member, s],
    )
  ).r;
  expect(reply).toMatchObject({
    result: "mine",
    story: { line: "비 오는 날", wordKo: "우산", meaning: "umbrella" },
  });
});
