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
  { text: "오늘은 단어를 공부했어요.", meaning: "I studied words today.", intent: "elaborate" },
  { text: "쌤은 오늘 뭐 했어요?", meaning: "What did you do?", intent: "ask" },
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

test("SU2. 앱 JWT — 후보 셋을 검증해 의도가 다른 둘을 보이고, 후보 전부와 함께 마지막 캐릭터 메시지에 저장한다", async () => {
  const { llm, suggests, moderations } = recordingLlm();
  const { call, rpcs, saved, logs } = setup({ llm });
  const { status, body } = await call();
  expect(status).toBe(200);
  const shown = [
    {
      intent: "elaborate",
      text: "저도 오늘 한국어 공부를 조금 했어요.",
      meaning: "[en] 저도 오늘 한국어 공부를 조금 했어요.",
    },
    { intent: "ask", text: "덕수쌤은 오늘 뭐 했어요?", meaning: "[en] 덕수쌤은 오늘 뭐 했어요?" },
  ];
  expect(companionSuggestResponseSchema.parse(body)).toEqual({
    status: "ok",
    messageId: assistantId,
    items: shown,
    cached: false,
  });
  expect(rpcs[0]).toEqual({
    fn: "companion_suggest_context",
    args: {
      p_user_id: userId,
      p_character_id: "duksu",
      p_history_limit: 8,
      p_now: "2026-11-18T09:00:00.000Z",
    },
  });
  // 맥락 — 글자만(번역 없음) + 요약 · 지난 칩 셋(옛 DB면 없음).
  expect(suggests).toHaveLength(1);
  expect(suggests[0]).toMatchObject({
    character: { name: "덕수쌤", role: "한국어 선생님" },
    speechLevel: "polite",
    l1: "en",
    summary: null,
    recentChoiceSets: [],
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
      version: 2,
      items: shown,
      candidates: [
        { ...shown[0], shown: true },
        { ...shown[1], shown: true },
        {
          intent: "reflect",
          text: "와, 정말 재미있었겠어요!",
          meaning: "[en] 와, 정말 재미있었겠어요!",
          shown: false,
        },
      ],
      model: "fake",
      createdAt: "2026-11-18T09:00:00.000Z",
      ms: expect.any(Number),
    },
  });
  expect(logs).toEqual([{ event: "companion_suggest", status: 200, outcome: "generated" }]);
});

test("SU3. 맥락은 마지막 8개 · 한 줄 500자까지 + 요약 · 지난 칩 셋", async () => {
  const history = Array.from({ length: 10 }, (_, index) =>
    index % 2 === 0
      ? { role: "user", text: `유저 ${index} ${"가".repeat(600)}`, segments: [] }
      : { role: "assistant", text: null, segments: [{ kind: "speech", text: `캐릭터 ${index}` }] },
  );
  const { llm, suggests } = recordingLlm();
  const recentChoiceSets = [
    { messageId: assistantId, items: [{ text: "네, 좋아요!", intent: "reflect" }], outcome: null },
  ];
  await setup({
    llm,
    context: context({ history, summary: "학습자는 서울에 산다.", recentChoiceSets }),
  }).call();
  const sent = suggests[0]!.history;
  expect(sent).toHaveLength(8);
  expect(sent[0]!.text.startsWith("유저 2")).toBe(true);
  expect(sent[0]!.text).toHaveLength(500);
  expect(sent.at(-1)).toEqual({ role: "assistant", text: "캐릭터 9" });
  expect(suggests[0]).toMatchObject({ summary: "학습자는 서울에 산다.", recentChoiceSets });
});

test("SU4. 저장된 칩은 모델 없이 그대로(cached) · refresh면 새로 만든다", async () => {
  const cachedContext = context({
    latest: {
      id: assistantId,
      status: "complete",
      origin: "turn",
      refusal: false,
      suggestions: { version: 2, items: storedItems, model: "fake" },
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

  // 1판 저장(version 없음 · 늘 셋)은 캐시로 쓰지 않는다.
  const legacy = recordingLlm();
  const legacyRun = setup({
    llm: legacy.llm,
    context: context({
      latest: {
        id: assistantId,
        status: "complete",
        origin: "turn",
        refusal: false,
        suggestions: { items: storedItems, model: "fake" },
      },
    }),
  });
  expect((await legacyRun.call()).body).toMatchObject({ status: "ok", cached: false });
  expect(legacy.suggests).toHaveLength(1);
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
    [{ suggestionsEnabled: false }, "suggestions_disabled", assistantId],
    [{ suggestionDisplayMax: 0 }, "suggestions_disabled", assistantId],
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

test("SU7. 통과 후보가 없거나 구조화 출력이 깨지면 한 번만 다시 묻는다 — 그래도 없으면 unavailable", async () => {
  const marked: SuggestionDraft[] = [
    { intent: "elaborate", text: "*웃으며* 좋아요", meaning: "Good" },
    { intent: "ask", text: "Why?", meaning: "Why?" },
  ];
  const retried = recordingLlm([marked]);
  expect((await setup({ llm: retried.llm }).call()).body).toMatchObject({
    status: "ok",
    cached: false,
  });
  expect(retried.suggests).toHaveLength(2);

  // 후보 하나라도 지나면 다시 묻지 않는다(셋을 다 채우려 하지 않는다).
  const one = recordingLlm([
    [
      { intent: "ask", text: "덕수쌤은 주말에 뭐 해요?", meaning: "What do you do on weekends?" },
      { intent: "reflect", text: "*끄덕*", meaning: "nod" },
    ],
  ]);
  expect(((await setup({ llm: one.llm }).call()).body["items"] as unknown[]).length).toBe(1);
  expect(one.suggests).toHaveLength(1);

  const empty = recordingLlm([marked, marked]);
  const emptyRun = setup({ llm: empty.llm });
  expect((await emptyRun.call()).body).toEqual({
    status: "unavailable",
    messageId: assistantId,
    items: [],
    cached: false,
    reason: "no_valid_candidates",
  });
  expect(emptyRun.saved()).toBeUndefined();

  const broken = recordingLlm([new StructuredUnavailable("refusal"), new Error("again")]);
  const run = setup({ llm: broken.llm });
  expect((await run.call()).body).toMatchObject({
    status: "unavailable",
    reason: "generation_failed",
  });
  expect(broken.suggests).toHaveLength(2);
  expect(run.saved()).toBeUndefined();
});

test("SU8. 후보 검증 — 빠진 것만 빼고, 의도가 다른 것을 앞에서부터 고른다", async () => {
  const drafts: SuggestionDraft[] = [
    { intent: "ask", text: "덕수쌤은 언제 한국어를 가르쳤어요?", meaning: "When did you start?" },
    { intent: "ask", text: "덕수쌤은 언제 한국어를 가르쳤어요!", meaning: "dup" },
    { intent: "reflect", text: "와, 오래 하셨네요!", meaning: "Wow, a long time!" },
  ];
  const run = setup({ llm: recordingLlm([drafts]).llm });
  const { body } = await run.call();
  expect((body["items"] as { intent: string }[]).map((item) => item.intent)).toEqual([
    "ask",
    "reflect",
  ]);
  const candidates = (run.saved()!["p_suggestions"] as { candidates: { reason?: string }[] })
    .candidates;
  expect(candidates.map((item) => item.reason ?? "ok")).toEqual(["ok", "duplicate", "ok"]);

  // 같은 의도뿐이면 자리를 채운다 · 서식 · 뜻 빠짐 · 한글 없음 · 너무 김 · 연락처 · 모르는 의도는 뺀다.
  const bad: SuggestionDraft[] = [
    { intent: "elaborate", text: "*웃으며* 좋아요", meaning: "x" },
    { intent: "ask", text: "주말에 뭐 해요?", meaning: null },
    { intent: "ask", text: "What?", meaning: "x" },
    { intent: "ask", text: "가".repeat(81), meaning: "x" },
    { intent: "ask", text: "제 번호는 010-1234-5678이에요.", meaning: "x" },
    { intent: "continue", text: "저도 좋아요.", meaning: "x" },
    { intent: "elaborate", text: "저는 어제 친구랑 시장에 갔어요.", meaning: "x" },
    { intent: "elaborate", text: "오늘은 집에서 쉬고 싶어요.", meaning: "x" },
  ];
  const second = setup({ llm: recordingLlm([bad]).llm });
  expect(((await second.call()).body["items"] as unknown[]).length).toBe(2);
  expect(
    (second.saved()!["p_suggestions"] as { candidates: { reason?: string }[] }).candidates.map(
      (item) => item.reason ?? "ok",
    ),
  ).toEqual([
    "markup",
    "missing_meaning",
    "no_hangul",
    "too_long",
    "contact_info",
    "unknown_intent",
    "ok",
    "ok",
  ]);
});

test("SU9. 학습자 언어가 한국어면 뜻은 null · 지난 칩과 거의 같은 후보는 뺀다", async () => {
  const { llm } = recordingLlm([
    [
      { intent: "elaborate", text: "저도 주말에 쉬었어요.", meaning: "나도" },
      { intent: "ask", text: "덕수쌤은 언제 쉬어요?", meaning: null },
      { intent: "reflect", text: "와, 진짜 좋았겠어요!", meaning: null },
    ],
  ]);
  const recentChoiceSets = [
    {
      messageId: "50000000-0000-4000-8000-000000000000",
      items: [{ text: "와, 진짜 좋았겠어요.", intent: "reflect" }],
      outcome: "ignored",
    },
  ];
  const { body } = await setup({ llm, context: context({ l1: "ko", recentChoiceSets }) }).call();
  expect(body["items"]).toEqual([
    { intent: "elaborate", text: "저도 주말에 쉬었어요.", meaning: null },
    { intent: "ask", text: "덕수쌤은 언제 쉬어요?", meaning: null },
  ]);
});

test("SU10. 미성년자 · 나이 모름은 통과 후보를 합쳐 출력 검사 — 걸리면 unavailable(저장 안 함)", async () => {
  const safe = recordingLlm();
  const { body } = await setup({ llm: safe.llm, context: context({ ageBand: "minor" }) }).call();
  expect(body).toMatchObject({ status: "ok" });
  expect(safe.moderations).toHaveLength(1);
  expect(safe.moderations[0]).toMatchObject({
    layer: "output_sync",
    ageBand: "minor",
    text: "저도 오늘 한국어 공부를 조금 했어요.\n덕수쌤은 오늘 뭐 했어요?\n와, 정말 재미있었겠어요!",
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

test("SU14. 보일 수(settings.suggestion_display_max)만큼 — 3이면 셋", async () => {
  const { body } = await setup({ context: context({ suggestionDisplayMax: 3 }) }).call();
  expect((body["items"] as unknown[]).length).toBe(3);
  const one = await setup({ context: context({ suggestionDisplayMax: 1 }) }).call();
  expect((one.body["items"] as unknown[]).length).toBe(1);
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
