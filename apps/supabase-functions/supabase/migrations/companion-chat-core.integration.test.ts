import { afterAll, beforeAll, beforeEach, expect, test } from "vitest";
import { signIn, startTestDatabase } from "./postgres.test-support";

const tester = "00000000-0000-4000-8000-000000000001";
const stranger = "00000000-0000-4000-8000-000000000002";
// 메시지 시각은 DB의 실제 시계(clock_timestamp)라 판정 시각도 실제 시각을 기준으로 잡습니다.
const now = new Date(Math.floor(Date.now() / 1000) * 1000).toISOString();
const after = (minutes: number) => new Date(Date.parse(now) + minutes * 60_000).toISOString();

let db: Awaited<ReturnType<typeof startTestDatabase>>;
let app: Awaited<ReturnType<typeof db.connect>>;
// 서버 키 역할의 연결입니다(chat-send · ops-dashboard). 표 확인은 admin으로 합니다.
let server: typeof app;
type Client = typeof app;

const messageId = (n: number) => `10000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

async function gate(
  clientMessageId: string,
  options: { user?: string; character?: string; at?: string; region?: string | null } = {},
) {
  const result = await server.query(
    "select public.companion_turn_gate($1, $2, $3, $4, $5) as gate",
    [
      options.user ?? tester,
      options.character ?? "duksu",
      clientMessageId,
      options.at ?? now,
      options.region ?? null,
    ],
  );
  return result.rows[0].gate as Record<string, unknown>;
}
async function begin(clientMessageId: string, text = "안녕하세요", user = tester) {
  const result = await server.query(
    "select public.companion_begin_turn($1, 'duksu', $2, $3, 'text', 20, null, $4) as turn",
    [user, clientMessageId, text, now],
  );
  return result.rows[0].turn as {
    result: string;
    holdId: string;
    conversationId: string;
    userMessageId: string;
    speechLevel: string;
    history: { role: string; text: string | null; segments: unknown[] }[];
  };
}
const assistantId = (n: number) => `20000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
async function finish(
  userMessageId: string,
  status: string,
  options: { assistant?: number; notices?: string[]; moderation?: unknown[]; at?: string } = {},
) {
  const turn = await db.admin.query(
    "select h.id from companion.credit_holds h join companion.messages m on m.client_message_id = h.client_message_id and m.user_id = h.user_id where m.id = $1 and h.status = 'open'",
    [userMessageId],
  );
  await server.query(
    "select public.companion_finish_turn($1, $2, $3::jsonb, $4::jsonb, $5, $6, null, 0, null, $7)",
    [
      userMessageId,
      status,
      options.assistant === undefined
        ? null
        : JSON.stringify({
            id: assistantId(options.assistant),
            segments: [{ kind: "speech", text: "반가워요!" }],
            meta: { model: "fake" },
          }),
      JSON.stringify(options.moderation ?? []),
      options.notices ?? [],
      options.at ?? now,
      turn.rows[0]?.id ?? null,
    ],
  );
}
async function listMessages(client: Client, limit = 50, before: string | null = null) {
  const result = await client.query(
    "select public.companion_list_messages('duksu', $1, $2) as page",
    [before, limit],
  );
  return result.rows[0].page as {
    messages: { id: string; role: string; status: string; text: string | null; notice: unknown }[];
    hasMore: boolean;
  };
}

beforeAll(async () => {
  db = await startTestDatabase();
  app = await db.connect();
  server = await db.connect();
  await server.query("set role service_role");
}, 30_000);
afterAll(async () => {
  await db?.close();
});
beforeEach(async () => {
  await app.query("reset role");
  await db.admin.query("truncate auth.users cascade");
  await db.admin.query("truncate companion.expression_units, companion.expressions");
  await db.admin.query(
    `insert into auth.users (id, email, raw_app_meta_data) values
       ($1, 'tester@libitum.test', '{"duru_tester": true}'), ($2, 'someone@example.com', '{}')`,
    [tester, stranger],
  );
  await signIn(app, tester);
});

// CH1 — 서버용 · 운영 조회 함수는 사용자 id를 인자로 받습니다. 앱 토큰으로 부를 수 있으면 남의 대화를 읽고 쓸 수 있습니다.
test("CH1. 앱 역할은 서버용 · 운영 조회 함수를 부르지 못하고(42501) 컴패니언 표에도 닿지 못한다", async () => {
  for (const role of ["authenticated", "anon"]) {
    await app.query(`set role ${role}`);
    for (const call of [
      `select public.companion_turn_gate('${tester}', 'duksu', '${messageId(1)}', now(), null::text)`,
      `select public.companion_begin_turn('${tester}', 'duksu', '${messageId(1)}', 'hi', 'text', 5, null, now())`,
      `select public.companion_finish_turn('${messageId(1)}', 'complete', null, '[]', '{}', now(), null, 0, null, null)`,
      `select public.companion_learning_context('${tester}', 10)`,
      "select public.companion_inspect_testers()",
      `select public.companion_inspect_conversation('${tester}', 'duksu', null, 10)`,
      "select public.companion_inspect_moderation(null, null, 10)",
      "select public.companion_inspect_reports(null, 10)",
      "select * from companion.messages",
      "select * from companion.characters",
    ]) {
      await expect(app.query(call), call).rejects.toMatchObject({ code: "42501" });
    }
  }
});

test("CH2. 판정 — 시험 계정 · 캐릭터 · 연령", async () => {
  expect(await gate(messageId(1), { user: stranger })).toEqual({ result: "not_available" });
  expect(await gate(messageId(1), { character: "nobody" })).toEqual({
    result: "character_not_found",
  });
  expect(await gate(messageId(1), { user: "00000000-0000-4000-8000-00000000dead" })).toEqual({
    result: "invalid_session",
  });

  // 나이를 모르면 막지 않고 미성년자 기본값 — 첫 턴에 AI 고지와 미성년자 안내.
  expect(await gate(messageId(1))).toMatchObject({
    result: "ok",
    ageBand: "unknown",
    l1: null,
    notices: ["ai_disclosure", "minor_notice"],
  });

  await db.admin.query(
    "insert into companion.profiles (user_id, birth_year, age_source, l1) values ($1, 2016, 'self', 'en')",
    [tester],
  );
  expect(await gate(messageId(1))).toEqual({
    result: "age_restricted",
    detail: { reason: "guardian_consent_required" },
  });
  await db.admin.query("update companion.profiles set birth_year = 1990 where user_id = $1", [
    tester,
  ]);
  expect(await gate(messageId(1))).toMatchObject({
    result: "ok",
    ageBand: "adult",
    l1: "en",
    notices: ["ai_disclosure"],
  });
});

// CH3 — 같은 메시지를 다시 보내도 답이 둘 생기면 안 되고, 한 대화에 턴은 동시에 하나입니다(API §1.4 · §2.1 판정 9).
test("CH3. 멱등 · 동시성 — 처리 중이면 turn_in_progress, 끝났으면 duplicate_message, 실패면 다시 돈다", async () => {
  const first = await begin(messageId(1));
  expect(await gate(messageId(1))).toEqual({ result: "turn_in_progress" });
  expect(await gate(messageId(2))).toEqual({ result: "turn_in_progress" });

  await finish(first.userMessageId, "complete", { assistant: 1 });
  expect(await gate(messageId(1))).toEqual({
    result: "duplicate_message",
    detail: { messageId: first.userMessageId, messageStatus: "complete" },
  });
  expect(await gate(messageId(2))).toMatchObject({ result: "ok" });

  const second = await begin(messageId(2));
  await finish(second.userMessageId, "failed");
  expect(await gate(messageId(2))).toMatchObject({ result: "ok" });
  const retried = await begin(messageId(2), "다시");
  expect(retried.userMessageId).toBe(second.userMessageId);
  const count = await db.admin.query(
    "select count(*)::int as n from companion.messages where role = 'user'",
  );
  expect(count.rows[0].n).toBe(2);

  // 서버가 죽어 pending으로 남은 턴은 제한 시간 뒤 다시 보낼 수 있다.
  expect(await gate(messageId(3), { at: after(10) })).toMatchObject({ result: "ok" });
});

test("CH4. 턴 끝 — 답 · 고지 · 판정이 저장되고, 고지는 3시간 동안 다시 오지 않는다", async () => {
  const turn = await begin(messageId(1));
  expect(turn.speechLevel).toBe("polite");
  await finish(turn.userMessageId, "complete", {
    assistant: 1,
    notices: ["ai_disclosure", "minor_notice"],
    moderation: [{ layer: "input", category: "safe", action: "allow" }],
  });
  const rows = await db.admin.query(
    "select role, notice_kind, status from companion.messages order by created_at",
  );
  expect(rows.rows).toEqual([
    { role: "user", notice_kind: null, status: "complete" },
    { role: "notice", notice_kind: "ai_disclosure", status: "complete" },
    { role: "notice", notice_kind: "minor_notice", status: "complete" },
    { role: "assistant", notice_kind: null, status: "complete" },
  ]);
  expect(await gate(messageId(2), { at: after(179) })).toMatchObject({ notices: [] });
  expect(await gate(messageId(2), { at: after(181) })).toMatchObject({
    notices: ["ai_disclosure"],
  });

  const events = await db.admin.query(
    "select layer, category, action from companion.moderation_events",
  );
  expect(events.rows).toEqual([{ layer: "input", category: "safe", action: "allow" }]);
});

test("CH5. 다음 턴의 기록에는 정상 턴만 들어간다(차단 · 위기 턴 제외)", async () => {
  const one = await begin(messageId(1), "첫 말");
  await finish(one.userMessageId, "complete", { assistant: 1 });
  const two = await begin(messageId(2), "나쁜 말");
  await finish(two.userMessageId, "blocked");
  const three = await begin(messageId(3), "셋째 말");
  expect(three.history.map((entry) => [entry.role, entry.text])).toEqual([
    ["user", "첫 말"],
    ["assistant", null],
  ]);
  expect(three.history[1]!.segments).toEqual([{ kind: "speech", text: "반가워요!" }]);
});

test("CH6. 메시지 목록 — 본인 것만, 처리 중은 빠지고, 페이지가 나뉜다", async () => {
  const one = await begin(messageId(1), "하나");
  await finish(one.userMessageId, "complete", { assistant: 1 });
  await begin(messageId(2), "처리 중");

  const page = await listMessages(app);
  expect(page.messages.map((m) => [m.role, m.text])).toEqual([
    ["assistant", null],
    ["user", "하나"],
  ]);
  expect(page.hasMore).toBe(false);
  const first = await listMessages(app, 1);
  expect(first.hasMore).toBe(true);
  expect(first.messages).toHaveLength(1);

  await signIn(app, stranger);
  expect(await listMessages(app)).toEqual({ messages: [], hasMore: false });
  await expect(
    app.query("select public.companion_list_messages('duksu', null, 0)"),
  ).rejects.toMatchObject({ code: "22023" });
  await app.query("select set_config('request.jwt.claim.sub', '', false)");
  await expect(
    app.query("select public.companion_list_messages('duksu', null, 5)"),
  ).rejects.toMatchObject({ code: "28000" });
});

test("CH7. 신고는 본인 대화의 메시지만 — 남의 것은 P0002", async () => {
  const one = await begin(messageId(1));
  await finish(one.userMessageId, "complete", { assistant: 1 });
  await app.query("select public.companion_report_message($1, '이상한 답')", [assistantId(1)]);
  await app.query("select public.companion_report_message($1, '다시 신고')", [assistantId(1)]);
  const reports = await db.admin.query("select reason from companion.message_reports");
  expect(reports.rows).toEqual([{ reason: "다시 신고" }]);

  await signIn(app, stranger);
  await expect(
    app.query("select public.companion_report_message($1, 'x')", [assistantId(1)]),
  ).rejects.toMatchObject({ code: "P0002" });
});

test("CH8. 학습 맥락 — catalogProgress의 끝낸 유닛에 걸린 표현만, retired는 뺀다", async () => {
  await db.admin.query(`
    insert into companion.expressions (id, kind, surface, gloss_en, retired) values
      ('voca:water', 'voca', '물', 'water', false),
      ('voca:old', 'voca', '옛말', null, true),
      ('patt:juseyo', 'patt', '주세요', 'please give', false),
      ('voca:later', 'voca', '나중', 'later', false);
    insert into companion.expression_units values
      ('voca:water', 'u01-water', 'S1'), ('voca:old', 'u01-water', 'S1'),
      ('patt:juseyo', 'u01-water', 'S2'), ('voca:later', 'u02-cafe', 'S1');
  `);
  await db.admin.query("insert into public.learning_progress (user_id, progress) values ($1, $2)", [
    tester,
    JSON.stringify({ version: 1, catalogProgress: { "u01-water": ["S1", "S2"] } }),
  ]);
  const result = await server.query("select public.companion_learning_context($1, 10) as context", [
    tester,
  ]);
  expect(result.rows[0].context).toEqual({
    episodes: ["u01-water"],
    expressions: [
      { id: "patt:juseyo", kind: "patt", surface: "주세요", roman: null, gloss: "please give" },
      { id: "voca:water", kind: "voca", surface: "물", roman: null, gloss: "water" },
    ],
  });
  const empty = await server.query("select public.companion_learning_context($1, 10) as context", [
    stranger,
  ]);
  expect(empty.rows[0].context).toEqual({ episodes: [], expressions: [] });
});

test("CH9. 운영 조회 — 시험 계정 목록 · 대화(내부 상태 · 판정 · 신고) · 판정 목록", async () => {
  const testers = await server.query("select public.companion_inspect_testers() as testers");
  expect(testers.rows[0].testers).toEqual([
    {
      userId: tester,
      email: "tester@libitum.test",
      ageBand: "unknown",
      birthYear: null,
      l1: null,
      region: null,
      feedbackMode: null,
      proactivePref: "daily1",
      proactiveHour: null,
      timezone: null,
    },
  ]);

  const one = await begin(messageId(1), "죽고 싶어");
  await finish(one.userMessageId, "crisis", {
    assistant: 1,
    moderation: [{ layer: "input", category: "self_harm", action: "crisis" }],
  });
  await begin(messageId(2), "처리 중");

  const result = await server.query(
    "select public.companion_inspect_conversation($1, 'duksu', null, 50) as c",
    [tester],
  );
  const inspected = result.rows[0].c as {
    conversation: { speechLevel: string };
    messages: Record<string, unknown>[];
  };
  expect(inspected.conversation.speechLevel).toBe("polite");
  expect(inspected.messages.map((m) => [m["role"], m["rawStatus"]])).toEqual([
    ["user", "pending"],
    ["assistant", "crisis"],
    ["user", "crisis"],
  ]);
  expect(inspected.messages[2]!["moderation"]).toMatchObject([
    { layer: "input", category: "self_harm", action: "crisis" },
  ]);

  const moderation = await server.query(
    "select public.companion_inspect_moderation(null, 'crisis', 10) as m",
  );
  expect(moderation.rows[0].m).toMatchObject([
    { userId: tester, action: "crisis", text: "죽고 싶어" },
  ]);
});

test("CH10. 캐릭터 목록 — 시험 계정 · 티어에 따라 열리고 말투와 마지막 메시지 시각이 붙는다", async () => {
  const before = await app.query("select public.companion_list_characters() as list");
  // 무료 티어는 체험 캐릭터(덕수쌤)만 열린다(M4).
  expect(before.rows[0].list[0]).toEqual({
    id: "duksu",
    available: true,
    unavailableReason: null,
    speechLevel: "polite",
    lastMessageAt: null,
  });
  expect(
    (before.rows[0].list as { id: string; unavailableReason: string | null }[]).map((c) => [
      c.id,
      c.unavailableReason,
    ]),
  ).toEqual([
    ["duksu", null],
    ["yoonkyung", "not_available"],
    ["mina", "not_available"],
    ["doyun", "not_available"],
    ["jaemin", "not_available"],
  ]);
  const one = await begin(messageId(1));
  await finish(one.userMessageId, "complete", { assistant: 1 });
  const after = await app.query("select public.companion_list_characters() as list");
  expect(after.rows[0].list[0].lastMessageAt).toBe(now);

  await signIn(app, stranger);
  const closed = await app.query("select public.companion_list_characters() as list");
  expect(closed.rows[0].list[0]).toMatchObject({
    available: false,
    unavailableReason: "not_available",
  });
});
