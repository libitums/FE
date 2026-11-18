import { expect, test } from "vitest";

import type { ChatSendEnv, CompanionLlm } from "./chat-send.contract.ts";
import { companionGreetResponseSchema } from "./companion-contract/index.ts";
import { createGreetHandler, type GreetLogEntry } from "./companion-greet-handler.ts";
import { unlockGreeting } from "./companion-greet-lines.ts";
import { fakeCompanionLlm } from "./companion-llm-fake.ts";
import type { OutboundRequest } from "./delete-account.contract.ts";

const userId = "00000000-0000-4000-8000-000000000001";
const testerId = "00000000-0000-4000-8000-0000000000a1";
const messageId = "60000000-0000-4000-8000-000000000001";
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
  feedbackMode: "separate",
  replySuggestions: true,
  persona: {
    name: "미나",
    role: "룸메이트",
    greetingLines: { polite: "안녕하세요! 저는 미나예요.", casual: "안녕! 나는 미나야." },
  },
  speechLevel: "polite",
  hasMessages: false,
  memories: ["필리핀에서 왔다"],
  ...overrides,
});

type Rpc = { fn: string; args: Record<string, unknown> };
type Options = {
  context?: unknown;
  llm?: CompanionLlm;
  saved?: boolean;
  authStatus?: number;
  learning?: unknown;
};

function setup(options: Options = {}) {
  const rpcs: Rpc[] = [];
  const logs: GreetLogEntry[] = [];
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
    const body =
      fn === "companion_greet_context"
        ? (options.context ?? context())
        : fn === "companion_learning_context"
          ? (options.learning ?? { episodes: [], expressions: [] })
          : { saved: options.saved ?? true, messageId };
    return { status: 200, text: async () => JSON.stringify(body) };
  };
  const handler = createGreetHandler({
    env,
    outbound,
    llm: options.llm ?? fakeCompanionLlm(),
    nowMs: () => Date.parse("2026-11-10T09:00:00Z"),
    randomUuid: () => messageId,
    log: (entry) => logs.push(entry),
    greetTimeoutMs: 500,
    translationTimeoutMs: 500,
    suggestionTimeoutMs: 500,
  });
  const call = async (body: unknown = { character_id: "mina" }, token = "user-token") => {
    const response = await handler(
      new Request("https://ref.supabase.co/functions/v1/companion-greet", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      }),
    );
    return { status: response.status, body: (await response.json()) as Record<string, unknown> };
  };
  const save = () => rpcs.find((rpc) => rpc.fn === "companion_save_greeting")?.args;
  return { call, rpcs, logs, save };
}

/** 단계별 호출 수를 센다. `reply`가 던지거나 출력 검사가 막게 바꿀 수 있다. */
const watching = (overrides: { replyFails?: boolean; block?: boolean } = {}) => {
  const base = fakeCompanionLlm();
  const calls: string[] = [];
  const llm: CompanionLlm = {
    ...base,
    async *reply(request) {
      calls.push("reply");
      if (overrides.replyFails) throw new Error("upstream down");
      yield* base.reply(request);
    },
    async moderate(request) {
      calls.push(`moderate:${request.layer}`);
      if (overrides.block) return { category: "other_harm", action: "block" };
      return base.moderate(request);
    },
    async translate(request) {
      calls.push("translate");
      return base.translate(request);
    },
    async suggest(request) {
      calls.push("suggest");
      return base.suggest(request);
    },
  };
  return { llm, calls };
};

test("GT1. 빈 대화면 인사를 만들어 출력 검사(성인도) · 번역 · 칩을 붙여 저장하고 돌려준다", async () => {
  const { llm, calls } = watching();
  const { call, save } = setup({ llm });
  const { status, body } = await call();
  expect(status).toBe(200);
  expect(companionGreetResponseSchema.parse(body)).toEqual(body);
  expect(body).toMatchObject({
    status: "ok",
    messageId,
    source: "model",
    segments: [
      { kind: "action", text: "손을 흔든다", translation: "[en] 손을 흔든다" },
      { kind: "speech", text: "어서 와요! 처음 보네요. 이름이 뭐예요?" },
    ],
    suggestions: { messageId, status: "ok" },
  });
  expect((body.suggestions as { items: unknown[] }).items).toHaveLength(2);
  expect(calls).toEqual(
    expect.arrayContaining(["reply", "moderate:output_sync", "translate", "suggest"]),
  );
  expect(save()).toMatchObject({
    p_user_id: userId,
    p_character_id: "mina",
    p_message_id: messageId,
    p_segments: body.segments,
    p_meta: {
      model: "fake",
      greeting: "model",
      translation: "ok",
      suggestions: "ok",
      suggestionsMs: expect.any(Number),
    },
    p_suggestions: {
      version: 2,
      items: (body.suggestions as { items: unknown[] }).items,
      candidates: expect.any(Array),
      model: "fake",
    },
  });
});

test("GT2. 메시지가 이미 있으면 모델 · 저장 없이 none", async () => {
  const { llm, calls } = watching();
  const { call, save } = setup({ llm, context: context({ hasMessages: true }) });
  expect((await call()).body).toEqual({
    status: "none",
    messageId: null,
    segments: [],
    suggestions: null,
    reason: "has_messages",
  });
  expect(calls).toEqual([]);
  expect(save()).toBeUndefined();
});

test("GT3. 생성 실패 · 출력 검사 차단이면 페르소나의 정해진 인사(없으면 기본 줄)로 저장한다", async () => {
  for (const [overrides, persona, text] of [
    [{ replyFails: true }, undefined, "안녕하세요! 저는 미나예요."],
    [{ block: true }, undefined, "안녕하세요! 저는 미나예요."],
    [{ block: true }, { name: "누군가" }, "안녕하세요! 만나서 반가워요. 오늘 하루는 어땠어요?"],
  ] as const) {
    const { llm } = watching(overrides);
    const { call, save } = setup({
      llm,
      context: persona === undefined ? context() : context({ persona }),
    });
    const { body } = await call();
    expect(body).toMatchObject({ status: "ok", source: "canned" });
    expect((body.segments as { text: string }[])[0]!.text).toBe(text);
    expect(save()).toMatchObject({
      p_meta: {
        greeting: "canned",
        greetingFallback: "replyFails" in overrides ? "failed" : "blocked",
      },
    });
  }
});

test("GT4. 칩 스위치가 꺼져 있으면 칩을 만들지 않는다 · 말투 단계의 정해진 인사", async () => {
  const { llm, calls } = watching({ replyFails: true });
  const { call, save } = setup({
    llm,
    context: context({ replySuggestions: false, speechLevel: "casual" }),
  });
  const { body } = await call();
  expect(body.suggestions).toBeNull();
  expect((body.segments as { text: string }[])[0]!.text).toBe("안녕! 나는 미나야.");
  expect(calls).not.toContain("suggest");
  expect(save()).toMatchObject({ p_suggestions: null });
  expect(save()!.p_meta).not.toHaveProperty("suggestions");
});

test("GT5. 만드는 사이 메시지가 생겼으면(저장 거절) none으로 끝난다", async () => {
  const { call, logs } = setup({ saved: false });
  expect((await call()).body).toMatchObject({ status: "none", reason: "has_messages" });
  expect(logs.at(-1)).toMatchObject({ outcome: "raced" });
});

test("GT6. 판정 · 호출자 · 요청 오류", async () => {
  const gate = setup({ context: { result: "temporarily_blocked" } });
  expect((await gate.call()).body).toMatchObject({
    status: "unavailable",
    reason: "temporarily_blocked",
  });
  const unknown = setup({ context: { result: "something_new" } });
  expect((await unknown.call()).body).toMatchObject({ reason: "not_available" });
  expect((await setup({ context: { result: "character_not_found" } }).call()).status).toBe(404);
  expect((await setup().call({ character_id: "" })).status).toBe(400);
  // 앱 토큰으로 user_id를 보내면 거절 · 서버 키 + user_id는 플레이그라운드.
  expect((await setup().call({ character_id: "mina", user_id: testerId })).status).toBe(401);
  const playground = setup();
  expect(
    (await playground.call({ character_id: "mina", user_id: testerId }, legacyKey)).status,
  ).toBe(200);
  expect(playground.save()).toMatchObject({
    p_user_id: testerId,
    p_meta: { playground: true },
    p_suggestions: { playground: true },
  });
  expect((await setup({ authStatus: 401 }).call()).status).toBe(401);
});

test("GT7. 배운 표현이 있으면 첫 인사에 노출로 하나 — 지시 · meta.learning · 기록(튜토리얼만 끝낸 유저도)", async () => {
  const systems: string[] = [];
  const base = fakeCompanionLlm();
  const llm: CompanionLlm = {
    ...base,
    reply(request) {
      systems.push(request.system);
      return base.reply(request);
    },
  };
  const { call, rpcs, save } = setup({
    llm,
    learning: {
      episodes: ["u00-tutorial"],
      expressions: [
        { id: "expr:hello", kind: "expr", surface: "안녕하세요", roman: null, gloss: "Hello" },
      ],
    },
  });
  expect((await call()).status).toBe(200);
  expect(systems[0]).toContain('- e1: "안녕하세요" (Hello) — say it only');
  expect((save()?.["p_meta"] as Record<string, unknown>)["learning"]).toEqual({
    mode: "expose",
    expressionId: "expr:hello",
    surface: "안녕하세요",
    done: true,
  });
  expect(rpcs.find((rpc) => rpc.fn === "companion_record_learning")?.args).toMatchObject({
    p_events: [{ expression_id: "expr:hello", kind: "exposed" }],
  });
});

// 해금 선톡(ADR-0152): 인물이 해금된 순간 앱이 `trigger: "unlock"`으로 부른다 — 정해진 말을 그대로 저장한다.
test("GT8. 해금 선톡 — 모델 · 출력 검사 · 학습 표현 없이 페르소나의 정해진 말풍선들을 번역 · 칩과 함께 저장한다", async () => {
  const { llm, calls } = watching();
  const unlockLines = ["안녕하세요! 카페 끌림 도윤이에요.", " 아, 그런데 이름이 뭐예요? "];
  const { call, rpcs, save } = setup({
    llm,
    context: context({
      persona: {
        name: "미나",
        greetingLines: { polite: "안녕하세요! 저는 미나예요." },
        unlockLines,
      },
    }),
    learning: {
      episodes: ["u00-tutorial"],
      expressions: [
        { id: "expr:hello", kind: "expr", surface: "안녕하세요", roman: null, gloss: "Hello" },
      ],
    },
  });
  const { status, body } = await call({ character_id: "mina", trigger: "unlock" });
  expect(status).toBe(200);
  expect(companionGreetResponseSchema.parse(body)).toEqual(body);
  expect(body).toMatchObject({
    status: "ok",
    source: "scripted",
    segments: [
      { kind: "speech", text: "안녕하세요! 카페 끌림 도윤이에요." },
      { kind: "speech", text: "아, 그런데 이름이 뭐예요?" },
    ],
  });
  expect(calls).not.toContain("reply");
  expect(calls.filter((name) => name.startsWith("moderate"))).toEqual([]);
  expect(calls).toEqual(expect.arrayContaining(["translate", "suggest"]));
  expect(rpcs.map((rpc) => rpc.fn)).not.toContain("companion_learning_context");
  expect(rpcs.map((rpc) => rpc.fn)).not.toContain("companion_record_learning");
  expect(save()).toMatchObject({
    p_segments: body.segments,
    p_meta: { greeting: "scripted", translation: "ok" },
  });
  expect(save()?.["p_meta"]).not.toHaveProperty("greetingFallback");
  expect(save()?.["p_meta"]).not.toHaveProperty("learning");
});

test("GT9. 해금 선톡 — 정해진 말이 없으면 정해진 첫 인사 · 메시지가 이미 있으면 none · trigger open은 모델 인사", async () => {
  const bare = setup();
  expect((await bare.call({ character_id: "mina", trigger: "unlock" })).body).toMatchObject({
    status: "ok",
    source: "scripted",
    segments: [{ kind: "speech", text: "안녕하세요! 저는 미나예요." }],
  });
  expect(unlockGreeting({ name: "누구", unlockLines: ["", "  "] }, "polite")[0]?.text).toContain(
    "만나서 반가워요",
  );

  const existing = setup({ context: context({ hasMessages: true }) });
  const again = await existing.call({ character_id: "mina", trigger: "unlock" });
  expect(again.body).toMatchObject({ status: "none", reason: "has_messages" });
  expect(existing.save()).toBeUndefined();

  const opened = setup();
  expect((await opened.call({ character_id: "mina", trigger: "open" })).body).toMatchObject({
    source: "model",
  });
  expect((await setup().call({ character_id: "mina", trigger: "later" })).status).toBe(400);
});

test("GT10. 정해진 첫 말이 있는 인물은 방을 열 때의 첫 인사도 그 말이다 — 덕수쌤 · 해금 순간에 못 받은 인물", async () => {
  const { llm, calls } = watching();
  const lines = [
    "안녕하세요! 덕수쌤이에요.",
    "한국어나 한국 문화에 대해 궁금한 게 있으면 언제든지 물어봐요.",
  ];
  const { call, save } = setup({
    llm,
    context: context({ persona: { name: "덕수쌤", unlockLines: lines } }),
  });
  for (const request of [{ character_id: "duksu" }, { character_id: "duksu", trigger: "open" }]) {
    expect((await call(request)).body).toMatchObject({
      status: "ok",
      source: "scripted",
      segments: lines.map((text) => ({ kind: "speech", text })),
    });
  }
  expect(calls).not.toContain("reply");
  expect(save()).toMatchObject({ p_meta: { greeting: "scripted" } });
});

test("GT11. 적용 수위가 open이면 모델 인사의 프롬프트 · 출력 검사가 open을 싣는다 · 친구의 정해진 첫 말은 모델 없이", async () => {
  const base = fakeCompanionLlm();
  const seen: { system?: string; tiers: (string | undefined)[] } = { tiers: [] };
  const llm: CompanionLlm = {
    ...base,
    async *reply(request) {
      seen.system ??= request.system;
      yield* base.reply(request);
    },
    async moderate(request) {
      seen.tiers.push(request.romanceTier);
      return base.moderate(request);
    },
  };
  const persona = { name: "차서연", kind: "friend", romanceTier: "open", met: "friend_app" };
  const { call } = setup({
    llm,
    context: context({ persona, romanceTier: "open", replySuggestions: false }),
  });
  expect((await call({ character_id: "seoyeon" })).body).toMatchObject({ status: "ok" });
  expect(seen.system).toContain("You may be a couple, say 사랑해");
  expect(seen.system).toContain("an ordinary person living in Korea");
  expect(seen.tiers).toEqual(["open"]);
  // 추가하자마자 오는 정해진 첫 말(unlockLines = firstMessage.ko)은 모델 · 검사를 부르지 않는다.
  const watched = watching();
  const scripted = setup({
    llm: watched.llm,
    context: context({
      persona: {
        ...persona,
        unlockLines: ["안녕하세요, 차서연이에요.", "한국엔 왜 왔어요? 궁금해요."],
      },
      romanceTier: "open",
      replySuggestions: false,
    }),
  });
  const answer = await scripted.call({ character_id: "seoyeon", trigger: "unlock" });
  expect(answer.body).toMatchObject({
    status: "ok",
    source: "scripted",
    segments: [
      { kind: "speech", text: "안녕하세요, 차서연이에요." },
      { kind: "speech", text: "한국엔 왜 왔어요? 궁금해요." },
    ],
  });
  expect(watched.calls.filter((name) => name !== "translate")).toEqual([]);
});

test("GT12. 저장 meta에 적용 수위 — open은 성인일 때만, 옛 DB(수위 없음)는 standard", async () => {
  const persona = { name: "차서연", kind: "friend", romanceTier: "open", met: "friend_app" };
  const cases: [Record<string, unknown>, string][] = [
    [{ romanceTier: "open" }, "open"],
    [{ romanceTier: "open", ageBand: "unknown" }, "standard"],
    [{}, "standard"],
  ];
  for (const [overrides, expected] of cases) {
    const { call, save } = setup({
      context: context({ persona, replySuggestions: false, ...overrides }),
    });
    expect((await call({ character_id: "seoyeon" })).body).toMatchObject({ status: "ok" });
    expect(save()!.p_meta, JSON.stringify(overrides)).toMatchObject({ romanceTier: expected });
  }
});
