import { expect, test } from "vitest";

import type { ChatSendEnv, CompanionLlm, ModerationRequest } from "./chat-send.contract.ts";
import { companionSuggestResponseSchema } from "./companion-contract/index.ts";
import { StructuredUnavailable } from "./companion-llm.ts";
import { fakeCompanionLlm } from "./companion-llm-fake.ts";
import type {
  SuggestLogEntry,
  SuggestRequest,
  SuggestionDraft,
} from "./companion-suggest.contract.ts";
import { createSuggestHandler } from "./companion-suggest-handler.ts";
import type { OutboundRequest } from "./delete-account.contract.ts";

const userId = "00000000-0000-4000-8000-000000000001";
const testerId = "00000000-0000-4000-8000-0000000000a1";
const assistantId = "50000000-0000-4000-8000-000000000001";
const legacyKey = "eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.c2lnbmF0dXJl";
const env: ChatSendEnv = {
  supabaseUrl: "https://ref.supabase.co",
  supabaseAnonKey: "anon",
  supabaseServiceRoleKey: "service-secret",
  llm: { kind: "fake" },
  translation: "every",
};

const context = (overrides: Record<string, unknown> = {}) => ({
  result: "ok",
  ageBand: "adult",
  l1: "en",
  replySuggestions: true,
  persona: { name: "덕수쌤", role: "한국어 선생님" },
  speechLevel: "polite",
  latest: {
    id: assistantId,
    status: "complete",
    origin: "turn",
    refusal: false,
    suggestions: null,
  },
  latestTurnBlocked: false,
  history: [
    { role: "user", text: "안녕하세요", segments: [] },
    {
      role: "assistant",
      text: null,
      segments: [
        { kind: "action", text: "손을 흔든다", translation: "waves" },
        { kind: "speech", text: "오늘 뭐 했어요?", translation: "What did you do today?" },
      ],
    },
  ],
  ...overrides,
});

const storedItems = [
  { text: "공부했어요.", meaning: "I studied.", intent: "continue" },
  { text: "쌤은요?", meaning: "And you?", intent: "ask" },
  { text: "좋아요!", meaning: "Nice!", intent: "react" },
];

type Rpc = { fn: string; args: Record<string, unknown> };
type Options = {
  context?: unknown;
  llm?: CompanionLlm | null;
  envOverride?: ChatSendEnv | null;
  authStatus?: number;
  saveStatus?: number;
  suggestTimeoutMs?: number;
};

function setup(options: Options = {}) {
  const rpcs: Rpc[] = [];
  const logs: SuggestLogEntry[] = [];
  const outbound = async (request: OutboundRequest) => {
    if (request.url.includes("/auth/v1/admin/users")) {
      return {
        status: request.headers["apikey"] === legacyKey ? 200 : 401,
        text: async () => "{}",
      };
    }
    if (request.url.endsWith("/auth/v1/user")) {
      return {
        status: options.authStatus ?? 200,
        text: async () => JSON.stringify({ id: userId }),
      };
    }
    const fn = request.url.split("/rpc/")[1]!;
    rpcs.push({ fn, args: JSON.parse(request.body ?? "{}") as Record<string, unknown> });
    if (fn === "companion_save_suggestions")
      return { status: options.saveStatus ?? 200, text: async () => "true" };
    const body = fn === "companion_suggest_context" ? (options.context ?? context()) : null;
    return { status: 200, text: async () => (body === null ? "" : JSON.stringify(body)) };
  };
  const handler = createSuggestHandler({
    env: options.envOverride === undefined ? env : options.envOverride,
    outbound,
    llm: options.llm === undefined ? fakeCompanionLlm() : options.llm,
    nowMs: () => Date.parse("2026-11-18T09:00:00Z"),
    log: (entry) => logs.push(entry),
    suggestTimeoutMs: options.suggestTimeoutMs ?? 500,
  });
  const call = async (
    body: unknown = { character_id: "duksu" },
    token: string | null = "user-token",
    method = "POST",
  ) => {
    const response = await handler(
      new Request("https://ref.supabase.co/functions/v1/companion-suggest", {
        method,
        headers: token === null ? {} : { Authorization: `Bearer ${token}` },
        ...(method === "POST"
          ? { body: typeof body === "string" ? body : JSON.stringify(body) }
          : {}),
      }),
    );
    return { status: response.status, body: (await response.json()) as Record<string, unknown> };
  };
  const saved = () => rpcs.find((rpc) => rpc.fn === "companion_save_suggestions")?.args;
  return { call, rpcs, logs, saved };
}

/** 부른 요청을 모으는 가짜 계층. `drafts`가 차례로 답(배열이면 그 칩, Error면 던진다)이고, 다 쓰면 기본 가짜를 따른다. */
function recordingLlm(drafts: (SuggestionDraft[] | Error)[] = []) {
  const fake = fakeCompanionLlm();
  const suggests: SuggestRequest[] = [];
  const moderations: ModerationRequest[] = [];
  const llm: CompanionLlm = {
    ...fake,
    suggest: async (request) => {
      suggests.push(request);
      const next = drafts.shift();
      if (next instanceof Error) throw next;
      return next ?? fake.suggest(request);
    },
    moderate: async (request) => {
      moderations.push(request);
      return fake.moderate(request);
    },
  };
  return { llm, suggests, moderations };
}

test("SU1. 메서드 · 설정 · 토큰 · 본문 검사", async () => {
  expect((await setup().call(undefined, "user-token", "GET")).status).toBe(405);
  expect((await setup({ envOverride: null }).call()).body).toEqual({
    error: "server_misconfigured",
  });
  expect((await setup({ llm: null }).call()).status).toBe(500);
  expect(await setup().call({ character_id: "duksu" }, null)).toEqual({
    status: 401,
    body: { error: "invalid_session" },
  });
  expect((await setup().call("{not json")).body).toEqual({ error: "invalid_request" });
  expect((await setup().call({})).status).toBe(400);
  expect((await setup().call({ character_id: "duksu", refresh: "yes" })).status).toBe(400);
  expect((await setup({ authStatus: 401 }).call()).status).toBe(401);
  // 앱 토큰으로 다른 유저를 고를 수 없다.
  const { call, rpcs } = setup();
  expect((await call({ character_id: "duksu", user_id: testerId })).status).toBe(401);
  expect(rpcs).toEqual([]);
});

test("SU2. 앱 JWT — 맥락으로 칩 셋을 만들어 마지막 캐릭터 메시지에 저장한다", async () => {
  const { llm, suggests, moderations } = recordingLlm();
  const { call, rpcs, saved, logs } = setup({ llm });
  const { status, body } = await call();
  expect(status).toBe(200);
  expect(companionSuggestResponseSchema.parse(body)).toEqual({
    status: "ok",
    messageId: assistantId,
    items: [
      {
        intent: "continue",
        text: "저도 오늘 한국어 공부했어요.",
        meaning: "[en] 저도 오늘 한국어 공부했어요.",
      },
      { intent: "ask", text: "덕수쌤은 오늘 뭐 했어요?", meaning: "[en] 덕수쌤은 오늘 뭐 했어요?" },
      { intent: "react", text: "와, 진짜요?", meaning: "[en] 와, 진짜요?" },
    ],
    cached: false,
  });
  expect(rpcs[0]).toEqual({
    fn: "companion_suggest_context",
    args: {
      p_user_id: userId,
      p_character_id: "duksu",
      p_history_limit: 6,
      p_now: "2026-11-18T09:00:00.000Z",
    },
  });
  // 맥락은 피드백과 같은 모양 — 글자만(번역 없음).
  expect(suggests).toHaveLength(1);
  expect(suggests[0]).toMatchObject({
    character: { name: "덕수쌤", role: "한국어 선생님" },
    speechLevel: "polite",
    l1: "en",
    history: [
      { role: "user", text: "안녕하세요" },
      { role: "assistant", text: "손을 흔든다\n오늘 뭐 했어요?" },
    ],
  });
  // 성인은 출력 검사를 돌리지 않는다(답과 같은 규칙).
  expect(moderations).toEqual([]);
  expect(saved()).toEqual({
    p_user_id: userId,
    p_message_id: assistantId,
    p_suggestions: {
      items: body["items"],
      model: "fake",
      createdAt: "2026-11-18T09:00:00.000Z",
    },
  });
  expect(logs).toEqual([{ event: "companion_suggest", status: 200, outcome: "generated" }]);
});

test("SU3. 맥락은 마지막 6개 · 한 줄 500자까지", async () => {
  const history = Array.from({ length: 8 }, (_, index) =>
    index % 2 === 0
      ? { role: "user", text: `유저 ${index} ${"가".repeat(600)}`, segments: [] }
      : { role: "assistant", text: null, segments: [{ kind: "speech", text: `캐릭터 ${index}` }] },
  );
  const { llm, suggests } = recordingLlm();
  await setup({ llm, context: context({ history }) }).call();
  const sent = suggests[0]!.history;
  expect(sent).toHaveLength(6);
  expect(sent[0]!.text.startsWith("유저 2")).toBe(true);
  expect(sent[0]!.text).toHaveLength(500);
  expect(sent.at(-1)).toEqual({ role: "assistant", text: "캐릭터 7" });
});

test("SU4. 저장된 칩은 모델 없이 그대로(cached) · refresh면 새로 만든다", async () => {
  const cachedContext = context({
    latest: {
      id: assistantId,
      status: "complete",
      origin: "turn",
      refusal: false,
      suggestions: { items: storedItems, model: "fake" },
    },
  });
  const first = recordingLlm();
  const cachedRun = setup({ llm: first.llm, context: cachedContext });
  expect((await cachedRun.call()).body).toEqual({
    status: "ok",
    messageId: assistantId,
    items: storedItems,
    cached: true,
  });
  expect(first.suggests).toEqual([]);
  expect(cachedRun.saved()).toBeUndefined();

  const second = recordingLlm();
  const refreshed = setup({ llm: second.llm, context: cachedContext });
  const { body } = await refreshed.call({ character_id: "duksu", refresh: true });
  expect(body).toMatchObject({ status: "ok", cached: false });
  expect(second.suggests).toHaveLength(1);
  expect(refreshed.saved()).toBeDefined();
});

test("SU5. 추천할 자리가 아니면 none — 모델을 부르지 않는다", async () => {
  const latest = (overrides: Record<string, unknown>) => ({
    latest: {
      id: assistantId,
      status: "complete",
      origin: "turn",
      refusal: false,
      suggestions: null,
      ...overrides,
    },
  });
  const cases: [Record<string, unknown>, string, string | null][] = [
    [{ replySuggestions: false }, "suggestions_off", assistantId],
    [{ latest: null }, "no_assistant_message", null],
    [{ latestTurnBlocked: true }, "latest_turn_blocked", assistantId],
    [latest({ status: "crisis", origin: "crisis" }), "latest_turn_crisis", assistantId],
    [latest({ refusal: true }), "latest_turn_refusal", assistantId],
  ];
  for (const [overrides, reason, messageId] of cases) {
    const { llm, suggests } = recordingLlm();
    const { body } = await setup({ llm, context: context(overrides) }).call();
    expect(body).toEqual({ status: "none", messageId, items: [], cached: false, reason });
    expect(suggests).toEqual([]);
  }
});

test("SU6. chat-send와 같은 판정에 걸리면 unavailable · 캐릭터 없음 404 · 계정 없음 401", async () => {
  for (const [result, reason] of [
    ["not_available", "not_available"],
    ["age_restricted", "age_restricted"],
    ["temporarily_blocked", "temporarily_blocked"],
    ["usage_time_limit", "usage_time_limit"],
    ["turn_in_progress", "turn_in_progress"],
    ["something_new", "not_available"],
  ]) {
    const { llm, suggests } = recordingLlm();
    const { status, body } = await setup({ llm, context: { result } }).call();
    expect(status).toBe(200);
    expect(body).toEqual({
      status: "unavailable",
      messageId: null,
      items: [],
      cached: false,
      reason,
    });
    expect(suggests).toEqual([]);
  }
  expect(await setup({ context: { result: "character_not_found" } }).call()).toEqual({
    status: 404,
    body: { error: "character_not_found" },
  });
  expect((await setup({ context: { result: "invalid_session" } }).call()).status).toBe(401);
});

test("SU7. 모양이 틀리거나 구조화 출력이 깨지면 한 번만 다시 묻고, 그래도 안 되면 unavailable", async () => {
  const twoOnly: SuggestionDraft[] = [
    { intent: "continue", text: "좋아요", meaning: "Good" },
    { intent: "ask", text: "왜요?", meaning: "Why?" },
  ];
  const retried = recordingLlm([twoOnly]);
  expect((await setup({ llm: retried.llm }).call()).body).toMatchObject({
    status: "ok",
    cached: false,
  });
  expect(retried.suggests).toHaveLength(2);

  const broken = recordingLlm([new StructuredUnavailable("refusal"), twoOnly, twoOnly]);
  const run = setup({ llm: broken.llm });
  expect((await run.call()).body).toEqual({
    status: "unavailable",
    messageId: assistantId,
    items: [],
    cached: false,
    reason: "generation_failed",
  });
  expect(broken.suggests).toHaveLength(2);
  expect(run.saved()).toBeUndefined();
});

test("SU8. 칩 검사 — *행동* · 뜻 빠짐 · 겹침은 받지 않는다", async () => {
  const base: SuggestionDraft[] = [
    { intent: "react", text: "대박!", meaning: "Wow!" },
    { intent: "continue", text: "저도요.", meaning: "Me too." },
    { intent: "ask", text: "언제요?", meaning: "When?" },
  ];
  // 순서가 뒤섞여 와도 continue · ask · react로 낸다.
  const ordered = recordingLlm([base]);
  expect(
    ((await setup({ llm: ordered.llm }).call()).body["items"] as { intent: string }[]).map(
      (item) => item.intent,
    ),
  ).toEqual(["continue", "ask", "react"]);
  for (const bad of [
    base.map((item) => (item.intent === "react" ? { ...item, text: "*웃으며* 대박!" } : item)),
    base.map((item) => (item.intent === "ask" ? { ...item, meaning: null } : item)),
    base.map((item) => (item.intent === "ask" ? { ...item, text: "저도요." } : item)),
    base.map((item) => (item.intent === "ask" ? { ...item, text: "When?" } : item)),
  ]) {
    const { llm } = recordingLlm([bad, bad]);
    expect((await setup({ llm }).call()).body).toMatchObject({ status: "unavailable" });
  }
});

test("SU9. 학습자 언어가 한국어면 뜻은 null", async () => {
  const { llm } = recordingLlm([
    [
      { intent: "continue", text: "저도요.", meaning: "나도" },
      { intent: "ask", text: "언제요?", meaning: null },
      { intent: "react", text: "대박!", meaning: null },
    ],
  ]);
  const { body } = await setup({ llm, context: context({ l1: "ko" }) }).call();
  expect((body["items"] as { meaning: unknown }[]).map((item) => item.meaning)).toEqual([
    null,
    null,
    null,
  ]);
});

test("SU10. 미성년자 · 나이 모름은 칩을 합쳐 출력 검사 — 걸리면 unavailable(저장 안 함)", async () => {
  const safe = recordingLlm();
  const { body } = await setup({ llm: safe.llm, context: context({ ageBand: "minor" }) }).call();
  expect(body).toMatchObject({ status: "ok" });
  expect(safe.moderations).toHaveLength(1);
  expect(safe.moderations[0]).toMatchObject({
    layer: "output_sync",
    ageBand: "minor",
    text: "저도 오늘 한국어 공부했어요.\n덕수쌤은 오늘 뭐 했어요?\n와, 진짜요?",
  });

  const unsafe = recordingLlm();
  const run = setup({
    llm: unsafe.llm,
    context: context({
      ageBand: "unknown",
      history: [{ role: "user", text: "[unsafe-suggest] 안녕", segments: [] }],
    }),
  });
  expect((await run.call()).body).toEqual({
    status: "unavailable",
    messageId: assistantId,
    items: [],
    cached: false,
    reason: "blocked",
  });
  expect(run.saved()).toBeUndefined();
});

test("SU11. 시간 초과는 다시 묻지 않고 unavailable", async () => {
  const fake = fakeCompanionLlm();
  let calls = 0;
  const llm: CompanionLlm = {
    ...fake,
    suggest: () => {
      calls += 1;
      return new Promise(() => undefined);
    },
  };
  const { body } = await setup({ llm, suggestTimeoutMs: 20 }).call();
  expect(body).toMatchObject({ status: "unavailable", reason: "generation_failed" });
  expect(calls).toBe(1);
});

test("SU12. 저장이 실패해도 칩은 돌려준다", async () => {
  const { call, logs } = setup({ saveStatus: 500 });
  expect((await call()).body).toMatchObject({ status: "ok", cached: false });
  expect(logs.map((entry) => entry.outcome)).toEqual(["save_failed", "generated"]);
});

test("SU13. 플레이그라운드 — 서버 키(런타임 키 · Auth가 받는 레거시 키) + user_id", async () => {
  for (const key of ["service-secret", legacyKey]) {
    const { call, rpcs, saved } = setup();
    const { body } = await call({ character_id: "duksu", user_id: testerId.toUpperCase() }, key);
    expect(body).toMatchObject({ status: "ok" });
    expect(rpcs[0]!.args["p_user_id"]).toBe(testerId);
    expect(saved()).toMatchObject({
      p_user_id: testerId,
      p_suggestions: { playground: true },
    });
  }
  // 서버 키가 아니면 user_id를 받지 않는다.
  expect(
    (await setup().call({ character_id: "duksu", user_id: testerId }, "sb_secret_wrong")).status,
  ).toBe(401);
  expect(
    (await setup().call({ character_id: "duksu", user_id: "not-a-uuid" }, "service-secret")).status,
  ).toBe(400);
});
