import { afterAll, beforeAll, beforeEach, expect, test } from "vitest";
import { signIn, startTestDatabase } from "./postgres.test-support";

// 칩을 그대로 보낸 메시지의 피드백 건너뛰기(20261121): 턴 시작 상태가 마지막 캐릭터 메시지의 칩 글을 돌려주고(`latestSuggestions`),
// 건너뛴 카드(`status: 'skipped'`, `reason: 'suggestion'`)가 저장되어 메시지 목록에 그대로 나온다.
const tester = "00000000-0000-4000-8000-0000000000e1";
const now = new Date(Math.floor(Date.now() / 1000) * 1000).toISOString();

let db: Awaited<ReturnType<typeof startTestDatabase>>;
let server: Awaited<ReturnType<typeof db.connect>>;
let app: typeof server;

const items = [
  { text: "저도 좋아요.", meaning: "I like it too.", intent: "continue" },
  { text: "쌤은 뭐 좋아해요?", meaning: "What do you like?", intent: "ask" },
  { text: "진짜요?", meaning: "Really?", intent: "react" },
];

async function status() {
  const result = await server.query("select public.companion_turn_status($1, 'duksu', $2) as s", [
    tester,
    now,
  ]);
  return result.rows[0].s as { strikes: number; latestSuggestions: string[] };
}

/** 턴 하나를 끝까지 — 유저 메시지 저장 · 캐릭터 답 · 피드백. 캐릭터 메시지 id를 돌려준다. */
async function turn(text: string, feedback: Record<string, unknown> | null) {
  const begun = (
    await server.query(
      "select public.companion_begin_turn($1, 'duksu', $2, $3, 'text', 20, null, $4) as t",
      [tester, crypto.randomUUID(), text, now],
    )
  ).rows[0].t as { result: string; userMessageId: string; holdId: string };
  expect(begun.result).toBe("ok");
  const assistantId = crypto.randomUUID();
  await server.query(
    "select public.companion_finish_turn($1, 'complete', $2::jsonb, '[]'::jsonb, '{}', $3, $4::jsonb, 0, null, $5)",
    [
      begun.userMessageId,
      JSON.stringify({
        id: assistantId,
        origin: "turn",
        segments: [{ kind: "speech", text: "네!" }],
      }),
      now,
      feedback === null ? null : JSON.stringify(feedback),
      begun.holdId,
    ],
  );
  return { userMessageId: begun.userMessageId, assistantId };
}

beforeAll(async () => {
  db = await startTestDatabase();
  server = await db.connect();
  app = await db.connect();
  await server.query("set role service_role");
}, 90_000);
afterAll(async () => {
  await db?.close();
});
beforeEach(async () => {
  await db.admin.query("truncate auth.users cascade");
  await db.admin.query("update companion.settings set testers_only = true");
  await db.admin.query(
    `insert into auth.users (id, email, raw_app_meta_data) values ($1, 'sf@libitum.test', '{"duru_tester": true}')`,
    [tester],
  );
});

test("SN1. 턴 시작 상태가 마지막 캐릭터 메시지의 칩 글을 돌려준다 — 없으면 빈 배열, 새 답이 오면 그 답의 칩", async () => {
  expect((await status()).latestSuggestions).toEqual([]);
  const first = await turn("안녕하세요", null);
  expect((await status()).latestSuggestions).toEqual([]);
  await server.query("select public.companion_save_suggestions($1, $2, $3::jsonb)", [
    tester,
    first.assistantId,
    JSON.stringify({ items, model: "fake", createdAt: now }),
  ]);
  expect((await status()).latestSuggestions).toEqual(items.map((item) => item.text));
  // 다음 답에는 칩이 없다 — 지난 답의 칩으로 건너뛰지 않는다.
  await turn("저도 좋아요.", null);
  expect((await status()).latestSuggestions).toEqual([]);
});

test("SN2. 건너뛴 카드가 저장되고 메시지 목록에 reason과 함께 나온다 — 보통 카드에는 reason이 없다", async () => {
  const skipped = {
    status: "skipped",
    reason: "suggestion",
    kind: null,
    original: "저도 좋아요.",
    corrected: null,
    items: [],
    better: null,
    meaning: null,
  };
  const chip = await turn("저도 좋아요.", skipped);
  const typed = await turn("오늘 날씨 좋아요", { ...skipped, status: "none", reason: undefined });
  await signIn(app, tester);
  const page = (await app.query("select public.companion_list_messages('duksu', null, 20) as page"))
    .rows[0].page as { messages: { id: string; feedback: Record<string, unknown> | null }[] };
  const feedbackOf = (id: string) => page.messages.find((message) => message.id === id)?.feedback;
  expect(feedbackOf(chip.userMessageId)).toEqual({ userMessageId: chip.userMessageId, ...skipped });
  expect(feedbackOf(typed.userMessageId)).toMatchObject({ status: "none" });
  expect(feedbackOf(typed.userMessageId)).not.toHaveProperty("reason");
});
