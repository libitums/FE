import { afterAll, beforeAll, beforeEach, expect, test } from "vitest";
import { startTestDatabase } from "./postgres.test-support";

// 추천 답변 칩 2판(20261122): 턴 시작 상태의 칩 셋 · 지난 칩 셋 · 운영 설정, 입력 출처 기록과 칩 셋 결과, 기억 원문의 입력 출처,
// 지표, 1판 의도 이름 바꾸기, 첫 인사만 있는 대화의 선톡 제외.
const tester = "00000000-0000-4000-8000-0000000000e2";
const now = new Date(Math.floor(Date.now() / 1000) * 1000).toISOString();

let db: Awaited<ReturnType<typeof startTestDatabase>>;
let server: Awaited<ReturnType<typeof db.connect>>;

const items = [
  { text: "오늘은 단어를 공부했어요.", meaning: "I studied words.", intent: "elaborate" },
  { text: "쌤은 오늘 뭐 했어요?", meaning: "What did you do?", intent: "ask" },
];

type Status = {
  latestSuggestions: string[];
  latestSuggestionSet: { messageId: string; items: { text: string; intent: string }[] } | null;
  recentChoiceSets: { messageId: string; items: unknown[]; outcome: string | null }[];
  suggestionsEnabled: boolean;
  suggestionDisplayMax: number;
};

async function status() {
  const result = await server.query("select public.companion_turn_status($1, 'duksu', $2) as s", [
    tester,
    now,
  ]);
  return result.rows[0].s as Status;
}

/** 턴 하나를 끝까지 — 유저 메시지 · 캐릭터 답. `chips`가 있으면 그 답에 칩을 저장한다. */
async function turn(text: string, chips: unknown[] | null = null, meta: object = {}) {
  const begun = (
    await server.query(
      "select public.companion_begin_turn($1, 'duksu', $2, $3, 'text', 20, null, $4) as t",
      [tester, crypto.randomUUID(), text, now],
    )
  ).rows[0].t as { result: string; userMessageId: string; holdId: string };
  expect(begun.result).toBe("ok");
  const assistantId = crypto.randomUUID();
  await server.query(
    "select public.companion_finish_turn($1, 'complete', $2::jsonb, '[]'::jsonb, '{}', $3, null, 0, null, $4)",
    [
      begun.userMessageId,
      JSON.stringify({
        id: assistantId,
        origin: "turn",
        segments: [{ kind: "speech", text: "네!" }],
        meta: { suggestions: chips === null ? "generation_failed" : "ok", ...meta },
      }),
      now,
      begun.holdId,
    ],
  );
  if (chips !== null)
    await server.query("select public.companion_save_suggestions($1, $2, $3::jsonb)", [
      tester,
      assistantId,
      JSON.stringify({ version: 2, items: chips, candidates: [], model: "fake", createdAt: now }),
    ]);
  return { userMessageId: begun.userMessageId, assistantId };
}

async function record(userMessageId: string, choice: object) {
  return (
    await server.query("select public.companion_record_choice($1, $2::jsonb) as r", [
      userMessageId,
      JSON.stringify(choice),
    ])
  ).rows[0].r as { recorded: boolean; outcome: string | null } | null;
}

async function message(id: string) {
  return (
    await db.admin.query("select meta, suggestions from companion.messages where id = $1", [id])
  ).rows[0] as { meta: Record<string, unknown>; suggestions: Record<string, unknown> | null };
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
  await db.admin.query(
    "update companion.settings set testers_only = true, suggestions_enabled = true, suggestion_display_max = 2",
  );
  await db.admin.query(
    `insert into auth.users (id, email, raw_app_meta_data) values ($1, 'sv2@libitum.test', '{"duru_tester": true}')`,
    [tester],
  );
});

test("SV1. 턴 시작 상태 — 마지막 캐릭터 메시지의 칩 셋(id · 글 · 의도) · 지난 칩 셋 · 운영 설정", async () => {
  const empty = await status();
  expect(empty).toMatchObject({
    latestSuggestions: [],
    latestSuggestionSet: null,
    recentChoiceSets: [],
    suggestionsEnabled: true,
    suggestionDisplayMax: 2,
  });
  const first = await turn("안녕하세요", items);
  expect((await status()).latestSuggestionSet).toEqual({
    messageId: first.assistantId,
    items: items.map(({ text, intent }) => ({ text, intent })),
  });
  const second = await turn("저도요", null);
  const after = await status();
  expect(after.latestSuggestionSet).toEqual({ messageId: second.assistantId, items: [] });
  // 칩이 보인 셋만 — 오래된 것부터.
  expect(after.recentChoiceSets).toEqual([
    {
      messageId: first.assistantId,
      items: items.map(({ text, intent }) => ({ text, intent })),
      outcome: null,
    },
  ]);
  await db.admin.query(
    "update companion.settings set suggestions_enabled = false, suggestion_display_max = 3",
  );
  expect(await status()).toMatchObject({ suggestionsEnabled: false, suggestionDisplayMax: 3 });
  await expect(
    db.admin.query("update companion.settings set suggestion_display_max = 4"),
  ).rejects.toThrow(/settings_suggestion_display_max_check/);
});

test("SV2. 입력 출처 기록 — 유저 메시지 meta와 앞 칩 셋의 결과(고름 · 무시)를 한 번 적는다", async () => {
  const first = await turn("안녕하세요", items);
  const chosen = await turn(items[1]!.text, items);
  expect(
    await record(chosen.userMessageId, {
      inputSource: "suggestion",
      suggestionMessageId: first.assistantId,
      suggestionIndex: 1,
      suggestionIntent: "ask",
    }),
  ).toEqual({ recorded: true, outcome: "chosen" });
  expect((await message(chosen.userMessageId)).meta).toMatchObject({
    inputSource: "suggestion",
    suggestionMessageId: first.assistantId,
    suggestionIndex: 1,
    suggestionIntent: "ask",
  });
  expect((await message(first.assistantId)).suggestions).toMatchObject({
    outcome: "chosen",
    outcomeIndex: 1,
    outcomeMessageId: chosen.userMessageId,
  });
  // 결과는 한 번만 — 다시 불러도 바뀌지 않는다.
  expect(await record(chosen.userMessageId, { inputSource: "manual" })).toEqual({
    recorded: true,
    outcome: null,
  });
  expect((await message(first.assistantId)).suggestions).toMatchObject({ outcome: "chosen" });

  // 직접 입력 · 지난 칩(stale)은 무시.
  const typed = await turn("오늘 날씨 좋아요", items);
  expect(
    await record(typed.userMessageId, {
      inputSource: "stale",
      suggestionMessageId: first.assistantId,
      suggestionIndex: 0,
    }),
  ).toEqual({ recorded: true, outcome: "ignored" });
  expect((await message(chosen.assistantId)).suggestions).toMatchObject({ outcome: "ignored" });
  expect((await message(chosen.assistantId)).suggestions).not.toHaveProperty("outcomeIndex");
  expect((await status()).recentChoiceSets.map((set) => set.outcome)).toEqual([
    "chosen",
    "ignored",
    null,
  ]);

  await expect(record(typed.userMessageId, { inputSource: "edited" })).rejects.toThrow(
    /invalid choice/,
  );
  expect(await record(crypto.randomUUID(), { inputSource: "manual" })).toBeNull();
});

test("SV3. 기억 원문에 유저 메시지의 입력 출처가 실린다", async () => {
  await db.admin.query("update companion.settings set memory_every = 2");
  const first = await turn("저는 서울에 살아요", items);
  const second = await turn(items[0]!.text, null);
  await record(second.userMessageId, {
    inputSource: "suggestion",
    suggestionMessageId: first.assistantId,
    suggestionIndex: 0,
  });
  const conversation = (
    await db.admin.query("select id from companion.conversations where user_id = $1", [tester])
  ).rows[0].id as string;
  const source = (
    await server.query("select public.companion_memory_source($1, 40) as s", [conversation])
  ).rows[0].s as { messages: { role: string; text: string | null; inputSource: string | null }[] };
  expect(
    source.messages.filter((m) => m.role === "user").map((m) => [m.text, m.inputSource]),
  ).toEqual([
    ["저는 서울에 살아요", null],
    [items[0]!.text, "suggestion"],
  ]);
  await db.admin.query("update companion.settings set memory_every = 5");
});

test("SV4. 지표 — 노출 성공률 · 칩 수 · 실패 · 고름 · 무시 · 의도 · 빠진 까닭 · 시간 · 토큰", async () => {
  const usage = {
    suggestions: {
      model: "claude-haiku-5-5",
      calls: 1,
      inputTokens: 900,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      outputTokens: 120,
    },
  };
  const first = await turn("안녕하세요", items, { suggestionsMs: 800, usage });
  await db.admin.query(
    "update companion.messages set suggestions = suggestions || $2::jsonb where id = $1",
    [first.assistantId, JSON.stringify({ candidates: [{ text: "x", reason: "duplicate" }] })],
  );
  const second = await turn(items[1]!.text, [items[0]], { suggestionsMs: 1200, usage });
  await record(second.userMessageId, {
    inputSource: "suggestion",
    suggestionMessageId: first.assistantId,
    suggestionIndex: 1,
  });
  const third = await turn("직접 쓴 말", null);
  await record(third.userMessageId, { inputSource: "manual" });
  const fourth = await turn("또 직접", null, { suggestions: "no_valid_candidates" });
  await record(fourth.userMessageId, { inputSource: "manual" });
  const stats = (
    await server.query(
      "select public.companion_suggestion_stats($1::timestamptz - interval '1 hour', null) as s",
      [now],
    )
  ).rows[0].s as Record<string, unknown>;
  expect(stats).toMatchObject({
    eligible: 4,
    shown: 2,
    byCount: { "1": 1, "2": 1, "3": 0, noValid: 1, failed: 1 },
    answered: 2,
    chosen: 1,
    ignored: 1,
    intents: { elaborate: 2, ask: 1 },
    chosenIntents: { ask: 1 },
    dropReasons: { duplicate: 1 },
    latencyMs: { p50: 1000, n: 2 },
    tokens: { model: "claude-haiku-5-5", calls: 2, inputTokens: 1800, outputTokens: 240 },
  });
  const playgroundOnly = (
    await server.query(
      "select public.companion_suggestion_stats(now() - interval '1 day', true) as s",
    )
  ).rows[0].s as { eligible: number };
  expect(playgroundOnly.eligible).toBe(0);
});

test("SV5. 1판 의도 이름 바꾸기 — 다시 적용해도 같다", async () => {
  const first = await turn("안녕하세요", null);
  await db.admin.query("update companion.messages set suggestions = $2::jsonb where id = $1", [
    first.assistantId,
    JSON.stringify({
      items: [
        { text: "a", intent: "continue" },
        { text: "b", intent: "ask" },
        { text: "c", intent: "react" },
      ],
    }),
  ]);
  const migration = await import("node:fs/promises").then((fs) =>
    fs.readFile(new URL("./20261122120000_companion_suggestion_v2.sql", import.meta.url), "utf8"),
  );
  await db.admin.query(migration);
  await db.admin.query(migration);
  expect(
    ((await message(first.assistantId)).suggestions!["items"] as { intent: string }[]).map(
      (item) => item.intent,
    ),
  ).toEqual(["elaborate", "ask", "reflect"]);
});

test("SV6. 선톡 — 첫 인사만 있는 대화는 후보가 아니고 맥락이 hasUserMessage: false", async () => {
  await db.admin.query(
    "insert into companion.profiles (user_id, birth_year, age_source) values ($1, 1990, 'self')",
    [tester],
  );
  const noon = "2026-11-20T12:00:00Z";
  const conversation = (
    await db.admin.query(
      "insert into companion.conversations (user_id, character_id, last_message_at) values ($1, 'duksu', $2) returning id",
      [tester, "2026-11-19T00:00:00Z"],
    )
  ).rows[0].id as string;
  await db.admin.query(
    `insert into companion.messages (conversation_id, user_id, role, origin, status, segments, created_at)
     values ($1, $2, 'assistant', 'greeting', 'complete', '[{"kind":"speech","text":"안녕!"}]', '2026-11-19T00:00:00Z')`,
    [conversation, tester],
  );
  const candidates = async () =>
    (await server.query("select public.companion_proactive_candidates($1, 20) as c", [noon]))
      .rows[0].c as unknown[];
  const context = async () =>
    (
      await server.query("select public.companion_proactive_context($1, 'duksu', 12, $2) as c", [
        tester,
        noon,
      ])
    ).rows[0].c as { hasUserMessage: boolean };
  expect(await candidates()).toEqual([]);
  expect((await context()).hasUserMessage).toBe(false);
  await db.admin.query(
    `insert into companion.messages (conversation_id, user_id, role, origin, status, text, client_message_id, created_at)
     values ($1, $2, 'user', 'turn', 'complete', '안녕하세요', gen_random_uuid(), '2026-11-19T00:00:01Z')`,
    [conversation, tester],
  );
  expect(await candidates()).toHaveLength(1);
  expect((await context()).hasUserMessage).toBe(true);
});
