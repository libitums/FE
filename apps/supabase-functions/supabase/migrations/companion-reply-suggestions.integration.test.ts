import { readFile } from "node:fs/promises";

import { afterAll, beforeAll, beforeEach, expect, test } from "vitest";
import { signIn, startTestDatabase } from "./postgres.test-support";

// 추천 답변 칩(20261118): 맥락(chat-send와 같은 판정 · 마지막 캐릭터 메시지 · 차단 · 위기 · 거절 · 최근 대화) · 칩 저장(캐시) ·
// 프로필 설정(앱 · 운영 · 시험 계정 목록).
const tester = "00000000-0000-4000-8000-0000000000b1";
const other = "00000000-0000-4000-8000-0000000000b2";
const now = "2026-11-18T09:00:00Z";
const minutesBefore = (minutes: number) =>
  new Date(Date.parse(now) - minutes * 60_000).toISOString();

let db: Awaited<ReturnType<typeof startTestDatabase>>;
let server: Awaited<ReturnType<typeof db.connect>>;
let app: typeof server;

type Context = {
  result: string;
  ageBand?: string;
  l1?: string | null;
  replySuggestions?: boolean;
  persona?: { name: string };
  speechLevel?: string;
  latest?: {
    id: string;
    status: string;
    origin: string;
    refusal: boolean;
    suggestions: unknown;
  } | null;
  latestTurnBlocked?: boolean;
  history?: { role: string; text: string | null; segments: unknown[] }[];
};

async function context(character = "duksu", user = tester, limit = 6) {
  const result = await server.query(
    "select public.companion_suggest_context($1, $2, $3, $4) as c",
    [user, character, limit, now],
  );
  return result.rows[0].c as Context;
}
async function conversation(user = tester, character = "duksu") {
  const result = await db.admin.query(
    "insert into companion.conversations (user_id, character_id, last_message_at) values ($1, $2, $3) returning id",
    [user, character, now],
  );
  return result.rows[0].id as string;
}
async function message(
  conversationId: string,
  values: {
    role: "user" | "assistant";
    minutesAgo: number;
    status?: string;
    origin?: string;
    text?: string;
    meta?: unknown;
    hidden?: boolean;
    user?: string;
  },
) {
  const result = await db.admin.query(
    `insert into companion.messages (conversation_id, user_id, role, origin, status, client_message_id, text, segments, meta, hidden, created_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10, $11) returning id`,
    [
      conversationId,
      values.user ?? tester,
      values.role,
      values.origin ?? "turn",
      values.status ?? "complete",
      values.role === "user" ? crypto.randomUUID() : null,
      values.role === "user" ? (values.text ?? "안녕하세요") : null,
      JSON.stringify(
        values.role === "assistant"
          ? [{ kind: "speech", text: values.text ?? "반가워요!", translation: "Nice!" }]
          : [],
      ),
      JSON.stringify(values.meta ?? {}),
      values.hidden ?? false,
      minutesBefore(values.minutesAgo),
    ],
  );
  return result.rows[0].id as string;
}
const items = [
  { text: "저도요.", meaning: "Me too.", intent: "continue" },
  { text: "언제요?", meaning: "When?", intent: "ask" },
  { text: "대박!", meaning: "Wow!", intent: "react" },
];
async function save(messageId: string, user = tester, payload: unknown = { items, model: "fake" }) {
  const result = await server.query(
    "select public.companion_save_suggestions($1, $2, $3::jsonb) as ok",
    [user, messageId, JSON.stringify(payload)],
  );
  return result.rows[0].ok as boolean;
}

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
  await db.admin.query("update companion.settings set testers_only = true");
  await db.admin.query(
    `insert into auth.users (id, email, raw_app_meta_data) values
       ($1, 'rs@libitum.test', '{"duru_tester": true}'), ($2, 'other@libitum.test', '{}')`,
    [tester, other],
  );
});

test("RS1. 대화가 없으면 latest null · 기본값(칩 켬 · 존댓말 · 나이 모름)", async () => {
  expect(await context()).toEqual({
    result: "ok",
    ageBand: "unknown",
    l1: null,
    replySuggestions: true,
    persona: expect.objectContaining({ name: expect.any(String) }),
    speechLevel: "polite",
    latest: null,
    latestTurnBlocked: false,
    history: [],
  });
});

test("RS2. 마지막 캐릭터 메시지 · 최근 대화(오래된 것부터, 숨김 · 미완료 빼고) · 칩 저장은 그 메시지에 묶이고 새 턴이면 비어 온다", async () => {
  const id = await conversation();
  await message(id, { role: "user", minutesAgo: 10, text: "첫 말" });
  await message(id, { role: "assistant", minutesAgo: 9, text: "첫 답" });
  await message(id, { role: "assistant", minutesAgo: 8, text: "숨긴 답", hidden: true });
  await message(id, { role: "user", minutesAgo: 7, text: "실패한 말", status: "failed" });
  await message(id, { role: "user", minutesAgo: 6, text: "둘째 말" });
  const latest = await message(id, { role: "assistant", minutesAgo: 5, text: "둘째 답" });

  const read = await context();
  expect(read.latest).toEqual({
    id: latest,
    status: "complete",
    origin: "turn",
    refusal: false,
    suggestions: null,
  });
  expect(read.latestTurnBlocked).toBe(false);
  expect(read.history?.map((entry) => [entry.role, entry.text ?? entry.segments])).toEqual([
    ["user", "첫 말"],
    ["assistant", [{ kind: "speech", text: "첫 답", translation: "Nice!" }]],
    ["user", "둘째 말"],
    ["assistant", [{ kind: "speech", text: "둘째 답", translation: "Nice!" }]],
  ]);
  expect((await context("duksu", tester, 2)).history).toHaveLength(2);

  expect(await save(latest)).toBe(true);
  expect((await context()).latest?.suggestions).toEqual({ items, model: "fake" });
  // 새 턴 — 마지막 캐릭터 메시지가 바뀌어 저장된 칩이 따라오지 않는다.
  await message(id, { role: "user", minutesAgo: 2 });
  const next = await message(id, { role: "assistant", minutesAgo: 1 });
  expect((await context()).latest).toMatchObject({ id: next, suggestions: null });
});

test("RS3. 차단된 마지막 턴 · 위기 답 · 거절 표시 · 선톡", async () => {
  const id = await conversation();
  const answered = await message(id, { role: "assistant", minutesAgo: 10, origin: "proactive" });
  expect((await context()).latest).toMatchObject({ id: answered, origin: "proactive" });
  await message(id, { role: "user", minutesAgo: 9, status: "blocked" });
  expect(await context()).toMatchObject({ latest: { id: answered }, latestTurnBlocked: true });

  await message(id, { role: "user", minutesAgo: 8, status: "crisis" });
  const crisis = await message(id, {
    role: "assistant",
    minutesAgo: 7,
    status: "crisis",
    origin: "crisis",
  });
  expect(await context()).toMatchObject({
    latest: { id: crisis, status: "crisis", origin: "crisis" },
    latestTurnBlocked: false,
  });

  await message(id, { role: "user", minutesAgo: 6 });
  await message(id, { role: "assistant", minutesAgo: 5, meta: { refusal: true } });
  expect((await context()).latest?.refusal).toBe(true);
  await message(id, { role: "user", minutesAgo: 4 });
  await message(id, { role: "assistant", minutesAgo: 3, meta: { refusal: false, model: "x" } });
  expect((await context()).latest?.refusal).toBe(false);
});

test("RS4. chat-send와 같은 판정 — 시험 계정 · 캐릭터 · 티어 · 연령 · 진행 중인 턴", async () => {
  expect(await context("duksu", other)).toEqual({ result: "not_available" });
  expect(await context("nobody")).toEqual({ result: "character_not_found" });
  // 무료 티어는 체험 캐릭터만.
  expect(await context("yoonkyung")).toEqual({ result: "not_available" });
  expect(await context("duksu", "00000000-0000-4000-8000-0000000000ff")).toEqual({
    result: "invalid_session",
  });
  await db.admin.query(
    "insert into companion.profiles (user_id, birth_year, age_source) values ($1, 2020, 'self')",
    [tester],
  );
  expect(await context()).toEqual({ result: "age_restricted" });
  await db.admin.query("update companion.profiles set birth_year = 1990 where user_id = $1", [
    tester,
  ]);
  expect(await context()).toMatchObject({ result: "ok", ageBand: "adult" });
  const id = await conversation();
  await message(id, { role: "user", minutesAgo: 0, status: "pending" });
  expect(await context()).toEqual({ result: "turn_in_progress" });
});

test("RS5. 칩 저장 — 그 유저의 캐릭터 메시지만 · 모양 검사 · 서버 전용", async () => {
  const id = await conversation();
  const userMessage = await message(id, { role: "user", minutesAgo: 2 });
  const answer = await message(id, { role: "assistant", minutesAgo: 1 });
  expect(await save(answer, other)).toBe(false);
  expect(await save(userMessage)).toBe(false);
  expect(await save(crypto.randomUUID())).toBe(false);
  for (const payload of [[], { items: "x" }, { model: "fake" }]) {
    await expect(save(answer, tester, payload)).rejects.toMatchObject({ code: "22023" });
  }
  expect(await save(answer, tester, { items: [], model: "fake" })).toBe(true);
  await signIn(app, tester);
  await expect(
    app.query("select public.companion_save_suggestions($1, $2, '{\"items\":[]}'::jsonb)", [
      tester,
      answer,
    ]),
  ).rejects.toMatchObject({ code: "42501" });
  await expect(
    app.query("select public.companion_suggest_context($1, 'duksu', 6, now())", [tester]),
  ).rejects.toMatchObject({ code: "42501" });
});

test("RS6. 앱 설정 — p_reply_suggestions 저장 · 읽기, 옛 호출(4 · 7인수)은 그대로 · 맥락에 반영", async () => {
  await signIn(app, tester);
  const load = async () =>
    (await app.query("select public.companion_load_profile() as p")).rows[0].p;
  await app.query("select public.companion_save_profile(2000, 'self', 'en', null)");
  expect(await load()).toMatchObject({ birthYear: 2000, replySuggestions: true });
  await app.query(
    "select public.companion_save_profile(null, null, null, null, null, null, null, false)",
  );
  expect(await load()).toMatchObject({ birthYear: 2000, l1: "en", replySuggestions: false });
  expect((await context()).replySuggestions).toBe(false);
  await app.query("select public.companion_save_profile(null, null, null, null, 'daily2', 9, '')");
  expect(await load()).toMatchObject({ proactivePref: "daily2", replySuggestions: false });
  await app.query(
    "select public.companion_save_profile(null, null, null, null, null, null, null, true)",
  );
  expect(await load()).toMatchObject({ replySuggestions: true });
});

test("RS7. 운영 — p_reply_suggestions를 바꾸고 시험 계정 목록에 보인다, 옛 6 · 9인수 호출도 된다", async () => {
  const testers = async () =>
    (await server.query("select public.companion_inspect_testers() as t")).rows[0].t[0];
  expect(await testers()).toMatchObject({ userId: tester, replySuggestions: true });
  await server.query(
    "select public.companion_operator_set_profile($1, null, false, null, null, null, null, null, null, false)",
    [tester],
  );
  expect(await testers()).toMatchObject({ replySuggestions: false });
  await server.query(
    "select public.companion_operator_set_profile($1, 1990, false, null, null, 'PH')",
    [tester],
  );
  await server.query(
    "select public.companion_operator_set_profile($1, null, false, null, null, null, 'off', null, null)",
    [tester],
  );
  expect(await testers()).toMatchObject({
    birthYear: 1990,
    region: "PH",
    proactivePref: "off",
    replySuggestions: false,
  });
  await signIn(app, tester);
  await expect(
    app.query(
      "select public.companion_operator_set_profile($1, null, false, null, null, null, null, null, null, true)",
      [tester],
    ),
  ).rejects.toMatchObject({ code: "42501" });
});

test("RS8. 다시 적용해도 같은 결과 — 저장된 칩 · 설정은 그대로", async () => {
  const id = await conversation();
  const answer = await message(id, { role: "assistant", minutesAgo: 1 });
  await save(answer);
  await db.admin.query(
    "insert into companion.profiles (user_id, reply_suggestions) values ($1, false)",
    [tester],
  );
  const sql = await readFile(
    new URL("./20261118120000_companion_reply_suggestions.sql", import.meta.url),
    "utf8",
  );
  await db.admin.query(sql);
  expect(await context()).toMatchObject({
    replySuggestions: false,
    latest: { id: answer, suggestions: { items } },
  });
});
