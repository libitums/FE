import { afterAll, beforeAll, beforeEach, expect, test } from "vitest";
import { signIn, startTestDatabase } from "./postgres.test-support";

// 답변 평가 · 고쳐서 다시 보내기(20261124): 평가 저장 · 지우기 · 막기, 메시지 목록의 rating, 평가 지표, 마지막 유저 메시지만 고치기 ·
// 숨기기 · 되돌리기 · 재시도, 숨긴 턴이 목록 · 지난 대화에서 빠지기.
const tester = "00000000-0000-4000-8000-0000000000d4";
const other = "00000000-0000-4000-8000-0000000000d5";
const now = new Date(Math.floor(Date.now() / 1000) * 1000).toISOString();

let db: Awaited<ReturnType<typeof startTestDatabase>>;
let server: Awaited<ReturnType<typeof db.connect>>;
let app: typeof server;

type Begun = { result: string; userMessageId: string; holdId: string; history: unknown[] };

async function begin(text: string, clientId: string = crypto.randomUUID()) {
  return (
    await server.query(
      "select public.companion_begin_turn($1, 'duksu', $2, $3, 'text', 20, null, $4) as t",
      [tester, clientId, text, now],
    )
  ).rows[0].t as Begun;
}

async function replace(replaces: string, text: string, clientId: string = crypto.randomUUID()) {
  return (
    await server.query(
      "select public.companion_begin_replacement($1, 'duksu', $2, $3, 'text', 20, null, $4, $5) as t",
      [tester, clientId, text, now, replaces],
    )
  ).rows[0].t as Begun;
}

async function finish(begun: Begun, origin = "turn") {
  const assistantId = crypto.randomUUID();
  await server.query(
    "select public.companion_finish_turn($1, 'complete', $2::jsonb, '[]'::jsonb, '{}', $3, null, 0, null, $4)",
    [
      begun.userMessageId,
      JSON.stringify({
        id: assistantId,
        origin,
        segments: [{ kind: "speech", text: "네!" }],
        meta: { model: "claude-sonnet-5-5", playground: true },
      }),
      now,
      begun.holdId,
    ],
  );
  return assistantId;
}

async function turn(text: string) {
  const begun = await begin(text);
  expect(begun.result).toBe("ok");
  return { userMessageId: begun.userMessageId, assistantId: await finish(begun) };
}

async function list() {
  await signIn(app, tester);
  return (
    (await app.query("select public.companion_list_messages('duksu', null, 50) as p")).rows[0]
      .p as { messages: Record<string, unknown>[] }
  ).messages;
}

const rate = (
  id: string,
  rating: string | null,
  reasons: string[] = [],
  note: string | null = null,
) => app.query("select public.companion_rate_message($1, $2, $3, $4)", [id, rating, reasons, note]);

beforeAll(async () => {
  db = await startTestDatabase();
  server = await db.connect();
  app = await db.connect();
  await server.query("set role service_role");
}, 30_000);
afterAll(async () => {
  await db?.close();
});
beforeEach(async () => {
  await db.admin.query("truncate auth.users cascade");
  await db.admin.query("update companion.settings set testers_only = true, trial_limit = 100");
  await db.admin.query(
    `insert into auth.users (id, email, raw_app_meta_data) values
       ($1, 'rr@libitum.test', '{"duru_tester": true}'), ($2, 'other@libitum.test', '{}')`,
    [tester, other],
  );
});

test("RR1. 평가 — 👍 · 👎(이유 · 글) 저장, 바꾸기, 지우기 · 목록의 rating", async () => {
  const { userMessageId, assistantId } = await turn("안녕하세요");
  await signIn(app, tester);
  await rate(assistantId, "up");
  let messages = await list();
  expect(messages.find((m) => m.id === assistantId)?.rating).toEqual({
    value: "up",
    reasons: [],
    note: null,
  });
  expect(messages.find((m) => m.id === userMessageId)?.rating).toBeNull();
  await rate(assistantId, "down", ["too_hard", "awkward_korean", "too_hard"], "  너무 길어요 ");
  messages = await list();
  expect(messages.find((m) => m.id === assistantId)?.rating).toEqual({
    value: "down",
    reasons: ["awkward_korean", "too_hard"],
    note: "너무 길어요",
  });
  await rate(assistantId, null);
  expect((await list()).find((m) => m.id === assistantId)?.rating).toBeNull();
});

test("RR2. 평가 막기 — 유저 메시지 · 남의 메시지 · 👍에 이유 · 모르는 이유 · 긴 글 · 로그인 없음", async () => {
  const { userMessageId, assistantId } = await turn("안녕하세요");
  await signIn(app, tester);
  await expect(rate(userMessageId, "up")).rejects.toMatchObject({ code: "P0002" });
  await expect(rate(assistantId, "up", ["too_hard"])).rejects.toMatchObject({ code: "22023" });
  await expect(rate(assistantId, "down", ["boring"])).rejects.toMatchObject({ code: "22023" });
  await expect(rate(assistantId, "down", ["other"], "가".repeat(201))).rejects.toMatchObject({
    code: "22023",
  });
  await expect(rate(assistantId, "meh")).rejects.toMatchObject({ code: "22023" });
  await signIn(app, other);
  await expect(rate(assistantId, "up")).rejects.toMatchObject({ code: "P0002" });
  await app.query("reset role");
  await app.query("select set_config('request.jwt.claim.sub', '', false)");
  await app.query("set role authenticated");
  await expect(rate(assistantId, "up")).rejects.toMatchObject({ code: "28000" });
});

test("RR3. 운영 평가는 시험 계정만 · 지표는 캐릭터 · 모델 · 출처 · 이유 · 최근 👎(원문)", async () => {
  const first = await turn("물 주세요");
  const second = await turn("카드로 할게요");
  await server.query("select public.companion_operator_rate_message($1, $2, 'up', '{}', null)", [
    tester,
    first.assistantId,
  ]);
  await server.query(
    "select public.companion_operator_rate_message($1, $2, 'down', '{out_of_character}', '이상해요')",
    [tester, second.assistantId],
  );
  await expect(
    server.query("select public.companion_operator_rate_message($1, $2, 'up', '{}', null)", [
      other,
      first.assistantId,
    ]),
  ).rejects.toMatchObject({ code: "P0002" });
  const stats = (
    await server.query("select public.companion_rating_stats($1, null, 10) as s", [
      new Date(Date.now() - 86_400_000).toISOString(),
    ])
  ).rows[0].s;
  expect(stats).toMatchObject({
    up: 1,
    down: 1,
    byCharacter: { duksu: { up: 1, down: 1 } },
    byModel: { "claude-sonnet-5-5": { up: 1, down: 1 } },
    byOrigin: { turn: { up: 1, down: 1 } },
    reasons: { out_of_character: 1 },
  });
  expect(stats.recentDown).toEqual([
    expect.objectContaining({
      messageId: second.assistantId,
      characterId: "duksu",
      userText: "카드로 할게요",
      reasons: ["out_of_character"],
      note: "이상해요",
      segments: [{ kind: "speech", text: "네!" }],
    }),
  ]);
  await signIn(app, tester);
  await expect(
    app.query("select public.companion_rating_stats(now(), null, 10)"),
  ).rejects.toMatchObject({ code: "42501" });
});

test("RR4. 고쳐서 다시 보내기 — 이전 턴을 숨기고 새 턴, 목록 · 지난 대화에서 빠지고 meta로 잇는다", async () => {
  const kept = await turn("안녕하세요");
  const old = await turn("물 주새요");
  await signIn(app, tester);
  await rate(old.assistantId, "down", ["awkward_korean"]);
  const begun = await replace(old.userMessageId, "물 주세요");
  expect(begun.result).toBe("ok");
  // 지난 대화는 숨긴 턴 없이 앞 턴만.
  expect(begun.history).toEqual([
    { role: "user", text: "안녕하세요", segments: [] },
    { role: "assistant", text: null, segments: [{ kind: "speech", text: "네!" }] },
  ]);
  const rows = (
    await db.admin.query(
      "select id, hidden, meta from companion.messages where id = any($1) order by created_at",
      [[old.userMessageId, old.assistantId, begun.userMessageId, kept.assistantId]],
    )
  ).rows as { id: string; hidden: boolean; meta: Record<string, unknown> }[];
  const byId = Object.fromEntries(rows.map((row) => [row.id, row]));
  expect(byId[old.userMessageId]).toMatchObject({
    hidden: true,
    meta: { replacedBy: begun.userMessageId },
  });
  expect(byId[old.assistantId]).toMatchObject({
    hidden: true,
    meta: { replacedBy: begun.userMessageId },
  });
  expect(byId[begun.userMessageId]?.meta).toMatchObject({ replaces: old.userMessageId });
  expect(byId[kept.assistantId]?.hidden).toBe(false);
  await finish(begun);
  const ids = (await list()).map((m) => m.id);
  expect(ids).not.toContain(old.userMessageId);
  expect(ids).not.toContain(old.assistantId);
  expect(ids).toContain(begun.userMessageId);
  // 숨긴 답은 평가할 수 없다(평가 행은 남는다 — 운영 조회용).
  await expect(rate(old.assistantId, "up")).rejects.toMatchObject({ code: "P0002" });
});

test("RR5. 마지막 유저 메시지만 — 앞 메시지 · 선톡 뒤 · 도는 중 · 같은 id · 남의 것은 막고, 재시도는 멱등", async () => {
  const first = await turn("하나");
  const second = await turn("둘");
  expect((await replace(first.userMessageId, "하나!")).result).toBe("not_latest_message");
  expect(
    (await replace(second.userMessageId, "둘!", await clientIdOf(second.userMessageId))).result,
  ).toBe("duplicate_message");
  expect((await replace(crypto.randomUUID(), "?")).result).toBe("not_latest_message");

  // 재시도: 같은 client_message_id로 두 번 — 두 번째는 숨기기를 건너뛰고 같은 메시지로.
  const clientId: string = crypto.randomUUID();
  const once = await replace(second.userMessageId, "둘!", clientId);
  const twice = await replace(second.userMessageId, "둘!", clientId);
  expect(once.result).toBe("ok");
  expect(twice.userMessageId).toBe(once.userMessageId);
  // 다른 요청으로 이미 고친 메시지를 또 고치려면 막는다.
  expect((await replace(second.userMessageId, "둘!!")).result).toBe("not_latest_message");
  // 지금 도는 중(pending)이면 turn_in_progress.
  expect((await replace(once.userMessageId, "둘!!!")).result).toBe("turn_in_progress");
  await finish(once);

  // 그 답 뒤에 선톡이 오면 더는 고칠 수 없다.
  const conversation = (
    await db.admin.query("select conversation_id from companion.messages where id = $1", [
      once.userMessageId,
    ])
  ).rows[0].conversation_id;
  await db.admin.query(
    `insert into companion.messages (conversation_id, user_id, role, origin, status, segments)
     values ($1, $2, 'assistant', 'proactive', 'complete', '[{"kind":"speech","text":"뭐 해요?"}]')`,
    [conversation, tester],
  );
  expect((await replace(once.userMessageId, "둘?")).result).toBe("not_latest_message");
});

test("RR6. 시작이 막히면(크레딧 부족) 숨기기도 되돌린다", async () => {
  const old = await turn("안녕");
  await db.admin.query("update companion.settings set trial_limit = 0, message_cost = 5");
  const blocked = await replace(old.userMessageId, "안녕하세요");
  expect(["insufficient_credits", "trial_exhausted"]).toContain(blocked.result);
  const hidden = (
    await db.admin.query("select bool_or(hidden) as h from companion.messages where id = any($1)", [
      [old.userMessageId, old.assistantId],
    ])
  ).rows[0].h;
  expect(hidden).toBe(false);
  expect((await list()).map((m) => m.id)).toContain(old.assistantId);
});

async function clientIdOf(messageId: string) {
  return (
    await db.admin.query("select client_message_id from companion.messages where id = $1", [
      messageId,
    ])
  ).rows[0].client_message_id as string;
}
