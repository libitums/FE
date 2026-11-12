import { expect, test } from "vitest";

import type { ChatSendEnv, CompanionLlm } from "./chat-send.contract.ts";
import { createCompanionEvalHandler, evalModels } from "./companion-eval-handler.ts";
import { companionLlmWithModel, StructuredUnavailable } from "./companion-llm.ts";
import { feedbackSystem, refusalDirective, refusalUserText } from "./companion-llm-prompts.ts";
import { suggestionSystem } from "./companion-suggest-prompts.ts";
import { companionSystemPrompt, proactiveDirective, stateLine } from "./companion-prompt.ts";
import { moderationInstruction } from "./companion-safety.ts";
import { fakeCompanionLlm } from "./companion-llm-fake.ts";
import type { OutboundRequest } from "./delete-account.contract.ts";

const fakeEnv: ChatSendEnv = {
  supabaseUrl: "https://ref.supabase.co",
  supabaseAnonKey: "anon",
  supabaseServiceRoleKey: "service-secret",
  llm: { kind: "fake" },
  translation: "every",
};
const anthropicEnv: ChatSendEnv = {
  ...fakeEnv,
  llm: {
    kind: "anthropic",
    apiKey: "sk-test",
    model: "claude-sonnet-5-5",
    moderationModel: "claude-haiku-5-5",
    feedbackModel: "claude-sonnet-5-5",
    translationModel: "claude-haiku-5-5",
  },
};

type Options = {
  env?: ChatSendEnv | null;
  llmFor?: ((model: string) => CompanionLlm) | null;
  feedbackTimeoutMs?: number;
  /** 운영 조회 RPC 응답. 없는 이름은 404(마이그레이션 적용 전). */
  rpc?: Record<string, unknown>;
};

function setup(options: Options = {}) {
  const outbound: OutboundRequest[] = [];
  const models: string[] = [];
  const env = options.env === undefined ? fakeEnv : options.env;
  const handler = createCompanionEvalHandler({
    env,
    outbound: async (request) => {
      outbound.push(request);
      const fn = request.url.split("/rest/v1/rpc/")[1];
      if (fn !== undefined) {
        const found = options.rpc !== undefined && fn in options.rpc;
        return {
          status: found ? 200 : 404,
          text: async () => JSON.stringify(found ? options.rpc![fn] : { code: "PGRST202" }),
        };
      }
      return { status: 401, text: async () => "{}" };
    },
    llmFor:
      options.llmFor === undefined
        ? (model) => {
            models.push(model);
            return env === null ? fakeCompanionLlm() : companionLlmWithModel(env, model);
          }
        : options.llmFor,
    nowMs: () => Date.now(),
    log: () => undefined,
    ...(options.feedbackTimeoutMs === undefined
      ? {}
      : { feedbackTimeoutMs: options.feedbackTimeoutMs }),
  });
  const call = async (method: string, body?: unknown, token = "service-secret", query = "") => {
    const response = await handler(
      new Request(`https://ref.supabase.co/functions/v1/companion-eval${query}`, {
        method,
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        ...(body === undefined
          ? {}
          : { body: typeof body === "string" ? body : JSON.stringify(body) }),
      }),
    );
    return { status: response.status, body: (await response.json()) as Record<string, unknown> };
  };
  return { call, outbound, models };
}

test("EV1. 서버 키가 아니면 401 · 다른 메서드는 405 · 설정이 없으면 500", async () => {
  const { call } = setup();
  expect(await call("GET", undefined, "user-token")).toEqual({
    status: 401,
    body: { error: "invalid_session" },
  });
  expect((await call("POST", { kind: "moderation", cases: [] }, "user-token")).status).toBe(401);
  expect((await call("PUT", {})).status).toBe(405);
  expect((await setup({ env: null }).call("GET")).body).toEqual({ error: "server_misconfigured" });
  expect((await setup({ llmFor: null }).call("GET")).status).toBe(500);
});

test("EV2. GET은 단계별 모델 · 고를 수 있는 모델 · LLM 종류", async () => {
  expect(await setup({ env: anthropicEnv, llmFor: () => fakeCompanionLlm() }).call("GET")).toEqual({
    status: 200,
    body: {
      models: {
        reply: "claude-sonnet-5-5",
        feedback: "claude-sonnet-5-5",
        moderation: "claude-haiku-5-5",
      },
      allowed: [...evalModels],
      llm: "anthropic",
    },
  });
  expect((await setup().call("GET")).body).toMatchObject({
    models: { reply: "fake", feedback: "fake", moderation: "fake" },
    llm: "fake",
  });
});

test("EV3. 검사 — 운영 판정 그대로, 기본값은 성인 · 입력 검사", async () => {
  const { call, outbound } = setup();
  const { status, body } = await call("POST", {
    kind: "moderation",
    cases: [
      { id: "safe", text: "안녕하세요" },
      { id: "crisis", text: "죽고 싶어요" },
      { id: "out", text: "[unsafe] 답", layer: "output_sync", context: "질문", ageBand: "minor" },
    ],
  });
  expect(status).toBe(200);
  expect(body["kind"]).toBe("moderation");
  expect(body["model"]).toBe("fake");
  const results = body["results"] as { id: string; ok: boolean; output?: unknown; ms: number }[];
  expect(results.map(({ id, ok, output }) => ({ id, ok, output }))).toEqual([
    { id: "safe", ok: true, output: { category: "safe", action: "allow" } },
    { id: "crisis", ok: true, output: { category: "self_harm", action: "crisis" } },
    { id: "out", ok: true, output: { category: "other_harm", action: "block" } },
  ]);
  expect(results.every((result) => typeof result.ms === "number")).toBe(true);
  // DB에 닿지 않는다 — 나가는 요청은 없다(서버 키가 런타임 키와 같아 Auth에도 묻지 않는다).
  expect(outbound).toEqual([]);
});

test("EV4. 피드백 — 운영 Feedback 그대로 · 모델을 고르지 않으면 설정된 모델", async () => {
  // 설정은 운영과 같은 모양(답변 · 피드백 Sonnet, 검사 Haiku)이고, 계층만 fake로 바꿔 끼운다.
  const models: string[] = [];
  const fakeFor = setup({
    env: anthropicEnv,
    llmFor: (model) => {
      models.push(model);
      return fakeCompanionLlm();
    },
  });
  const { body } = await fakeFor.call("POST", {
    kind: "feedback",
    cases: [
      { id: "fix", text: "학생 이에요", l1: "ko", context: "직업이 뭐예요?" },
      { id: "en", text: "Hello there" },
      { id: "fine", text: "좋아요" },
    ],
  });
  expect(body["model"]).toBe("claude-sonnet-5-5");
  expect((body["results"] as { output: unknown }[]).map((result) => result.output)).toEqual([
    {
      status: "ok",
      kind: "correction",
      original: "학생 이에요",
      corrected: "학생이에요",
      items: [
        {
          original: "학생 이에요",
          corrected: "학생이에요",
          reason: "Attach 이에요/예요 to the noun without a space.",
        },
      ],
      better: null,
      meaning: null,
    },
    {
      status: "ok",
      kind: "l1_to_ko",
      original: "Hello there",
      corrected: "안녕하세요, 반가워요.",
      items: [],
      better: null,
      meaning: "Hello there",
    },
    {
      status: "none",
      kind: null,
      original: "좋아요",
      corrected: null,
      items: [],
      better: null,
      meaning: null,
    },
  ]);
  await fakeFor.call("POST", { kind: "moderation", cases: [{ id: "a", text: "안녕" }] });
  expect(models).toEqual(["claude-sonnet-5-5", "claude-haiku-5-5"]);
});

test("EV5. 모델은 허용 목록 안에서만 — 고른 모델로 계층을 만든다", async () => {
  const models: string[] = [];
  const { call } = setup({
    env: anthropicEnv,
    llmFor: (model) => {
      models.push(model);
      return fakeCompanionLlm();
    },
  });
  const ok = await call("POST", {
    kind: "moderation",
    model: "claude-opus-5-5",
    cases: [{ id: "a", text: "안녕" }],
  });
  expect(ok.status).toBe(200);
  expect(ok.body["model"]).toBe("claude-opus-5-5");
  expect(models).toEqual(["claude-opus-5-5"]);
  const bad = await call("POST", {
    kind: "moderation",
    model: "gpt-9",
    cases: [{ id: "a", text: "안녕" }],
  });
  expect(bad).toEqual({ status: 400, body: { error: "invalid_request" } });
});

test("EV6. 본문이 틀리면 400 invalid_request", async () => {
  const { call } = setup();
  const one = { id: "a", text: "안녕" };
  for (const body of [
    "{not json",
    { kind: "reply", cases: [one] },
    { kind: "moderation", cases: [] },
    { kind: "moderation", cases: Array.from({ length: 21 }, (_, i) => ({ ...one, id: `c${i}` })) },
    { kind: "moderation", cases: [{ ...one, text: "가".repeat(2001) }] },
    { kind: "moderation", cases: [{ ...one, text: "" }] },
    { kind: "moderation", cases: [{ ...one, id: "x".repeat(65) }] },
    { kind: "moderation", cases: [{ ...one, ageBand: "child" }] },
    { kind: "moderation", cases: [{ ...one, layer: "output_async" }] },
  ]) {
    expect(await call("POST", body), JSON.stringify(body).slice(0, 60)).toEqual({
      status: 400,
      body: { error: "invalid_request" },
    });
  }
  expect((await call("POST", { kind: "moderation", cases: Array(20).fill(one) })).status).toBe(200);
});

test("EV7. 케이스 하나의 실패 · 시간 초과는 그 케이스만 ok: false", async () => {
  const fake = fakeCompanionLlm();
  const llm: CompanionLlm = {
    ...fake,
    async feedback(request) {
      if (request.text === "boom") throw Object.assign(new Error("overloaded"), { status: 529 });
      if (request.text === "refuse") throw new StructuredUnavailable("refusal");
      // 신호를 따르지 않는 구현도 제한 시간에 끝나야 한다.
      if (request.text === "hang") return new Promise(() => undefined);
      return fake.feedback(request);
    },
  };
  const { call } = setup({ llmFor: () => llm, feedbackTimeoutMs: 30 });
  const { status, body } = await call("POST", {
    kind: "feedback",
    cases: ["좋아요", "boom", "refuse", "hang", "Hi"].map((text, i) => ({ id: `c${i}`, text })),
  });
  expect(status).toBe(200);
  expect(
    (body["results"] as { id: string; ok: boolean; error?: string }[]).map(({ id, ok, error }) => ({
      id,
      ok,
      error,
    })),
  ).toEqual([
    { id: "c0", ok: true, error: undefined },
    { id: "c1", ok: false, error: "upstream_529" },
    { id: "c2", ok: false, error: "structured_unavailable" },
    { id: "c3", ok: false, error: "timeout" },
    { id: "c4", ok: true, error: undefined },
  ]);
});

test("EV8. 번역 — 한 줄씩 { text }, 모델을 고르지 않으면 번역 모델", async () => {
  const models: string[] = [];
  const { call } = setup({
    env: anthropicEnv,
    llmFor: (model) => {
      models.push(model);
      return fakeCompanionLlm();
    },
  });
  const { status, body } = await call("POST", {
    kind: "translation",
    cases: [
      { id: "vi", text: "안녕하세요!", l1: "vi" },
      { id: "default", text: "반가워요" },
    ],
  });
  expect(status).toBe(200);
  expect(body["model"]).toBe("claude-haiku-5-5");
  expect(models).toEqual(["claude-haiku-5-5"]);
  expect(
    (body["results"] as { id: string; output: unknown }[]).map(({ id, output }) => ({
      id,
      output,
    })),
  ).toEqual([
    { id: "vi", output: { text: "[vi] 안녕하세요!" } },
    { id: "default", output: { text: "[en] 반가워요" } },
  ]);
});

test("EV9. 피드백 케이스의 말투 · 캐릭터가 운영 요청으로 넘어간다", async () => {
  const { call } = setup();
  const { body } = await call("POST", {
    kind: "feedback",
    cases: [
      {
        id: "polite",
        text: "뭐 해?",
        speechLevel: "polite",
        character: { name: "윤경", role: "guesthouse owner" },
      },
      {
        id: "strict",
        text: "뭐 해?",
        speechLevel: "polite",
        character: { name: "덕수쌤", role: "teacher", banmalFeedback: "correction" },
      },
      { id: "casual", text: "뭐 해?", speechLevel: "casual" },
    ],
  });
  expect(
    (body["results"] as { output: { kind?: string; status: string } }[]).map(
      (r) => r.output.kind ?? r.output.status,
    ),
  ).toEqual(["better", "correction", "none"]);
  const bad = await call("POST", {
    kind: "feedback",
    cases: [{ id: "x", text: "뭐 해?", speechLevel: "honorific" }],
  });
  expect(bad.status).toBe(400);
});

const duksuPersona = {
  name: "덕수쌤",
  age: "30대",
  role: "선생님",
  samples: ["소 더하기 고기는? 소고기!"],
  maxSpeechLevel: "polite",
  banmalFeedback: "correction",
};
const inspected = {
  companion_inspect_characters: [
    {
      id: "duksu",
      bibleVersion: "b@1",
      active: true,
      sortOrder: 0,
      maxSpeechLevel: "polite",
      persona: duksuPersona,
    },
    {
      id: "mina",
      bibleVersion: "b@1",
      active: false,
      sortOrder: 3,
      maxSpeechLevel: "slang",
      persona: { name: "미나" },
    },
  ],
  companion_inspect_settings: { trial_limit: 20, testers_only: true },
};

test("EV10. ?docs=1 — 캐릭터마다 말투 상한까지 시스템 프롬프트, 설정, 실제 호출과 같은 프롬프트 글", async () => {
  const { call } = setup({ env: anthropicEnv, llmFor: () => fakeCompanionLlm(), rpc: inspected });
  expect((await call("GET", undefined, "user-token", "?docs=1")).status).toBe(401);
  const { status, body } = await call("GET", undefined, "service-secret", "?docs=1");
  expect(status).toBe(200);
  expect(body["models"]).toEqual({
    reply: "claude-sonnet-5-5",
    feedback: "claude-sonnet-5-5",
    moderation: "claude-haiku-5-5",
    translation: "claude-haiku-5-5",
    // 환경 객체에 칩 모델이 없으면 검사 모델.
    suggest: "claude-haiku-5-5",
  });
  expect(body["settings"]).toEqual(inspected.companion_inspect_settings);
  expect(body["inspectAvailable"]).toBe(true);
  const characters = body["characters"] as Record<string, unknown>[];
  expect(characters.map((c) => [c["id"], Object.keys(c["systemPrompt"] as object)])).toEqual([
    ["duksu", ["polite"]],
    ["mina", ["polite", "casual", "slang"]],
  ]);
  expect(characters[0]).toMatchObject({ ...duksuPersona, id: "duksu", active: true, sortOrder: 0 });
  const rendered = companionSystemPrompt({
    persona: duksuPersona as never,
    speechLevel: "polite",
    ageBand: "adult",
    l1: "en",
    expressions: [],
    summary: null,
    feedbackMode: "separate",
    memories: [],
    directive: null,
  });
  expect((characters[0]!["systemPrompt"] as Record<string, string>)["polite"]).toBe(
    `${rendered.stable}\n\n${rendered.dynamic}`,
  );
  const prompts = body["prompts"] as Record<string, unknown>;
  expect(prompts["moderation"]).toEqual({
    input: {
      adult: moderationInstruction("input", "adult"),
      minor: moderationInstruction("input", "minor"),
      unknown: moderationInstruction("input", "unknown"),
    },
    output_sync: {
      adult: moderationInstruction("output_sync", "adult"),
      minor: moderationInstruction("output_sync", "minor"),
      unknown: moderationInstruction("output_sync", "unknown"),
    },
  });
  expect(prompts["feedback"]).toBe(
    feedbackSystem({
      text: "{{learner message}}",
      l1: "{{l1}}",
      previous: null,
      history: [],
      speechLevel: "polite",
      character: null,
      signal: new AbortController().signal,
    }),
  );
  expect(prompts["translation"]).toContain('BCP 47 tag "{{l1}}"');
  expect(prompts["translation"]).toContain("exactly {{segment count}} strings");
  expect(Object.keys(prompts["memory"] as object)).toEqual(["adult", "minor"]);
  expect((prompts["memory"] as Record<string, string>)["minor"]).toContain("may be a minor");
  expect(prompts["proactiveDirective"]).toBe(proactiveDirective);
  expect(prompts["stateLine"]).toBe(stateLine);
  expect(rendered.stable).toContain(stateLine);
  expect(Object.keys(prompts["feedbackModes"] as object)).toEqual([
    "separate",
    "natural",
    "prefix",
  ]);
  expect(typeof prompts["summary"]).toBe("string");
  // 성격대로 거절 — 실제 호출과 같은 지시 · 앱 안내, 분류 자리만 자리 표시.
  expect(prompts["refusal"]).toEqual({
    deflect: refusalDirective("deflect", "{{category}}"),
    warn: refusalDirective("warn", "{{category}}"),
    userText: refusalUserText("{{category}}"),
  });
  expect((prompts["refusal"] as Record<string, string>)["warn"]).toContain("not okay");
  expect(prompts["suggestions"]).toBe(suggestionSystem);
});

test("EV11. 운영 조회 함수가 아직 없으면 characters · settings는 null, 프롬프트는 그대로", async () => {
  const { call } = setup();
  const { status, body } = await call("GET", undefined, "service-secret", "?docs=1");
  expect(status).toBe(200);
  expect(body).toMatchObject({ characters: null, settings: null, inspectAvailable: false });
  expect(body["prompts"]).toHaveProperty("stateLine");
  // 쿼리 없는 GET은 계약 그대로.
  expect(Object.keys((await call("GET")).body)).toEqual(["models", "allowed", "llm"]);
});

test("EV12. 피드백 케이스의 history는 운영처럼 마지막 6개 맥락으로, context는 앞 캐릭터 말 한 줄로", async () => {
  const seen: unknown[] = [];
  const fake = fakeCompanionLlm();
  const { call } = setup({
    llmFor: () => ({
      ...fake,
      feedback: (request) => {
        seen.push(request);
        return fake.feedback(request);
      },
    }),
  });
  const history = Array.from({ length: 8 }, (_, i) => ({
    role: i % 2 === 0 ? "user" : "assistant",
    text: `줄${i}`,
  }));
  const ok = await call("POST", {
    kind: "feedback",
    cases: [
      { id: "h", text: "좋아요", history },
      { id: "c", text: "좋아요", context: "뭐 해요?" },
    ],
  });
  expect(ok.status).toBe(200);
  expect(seen[0]).toMatchObject({ history: history.slice(-6), previous: null });
  expect(seen[1]).toMatchObject({ history: [], previous: "뭐 해요?" });
  const bad = await call("POST", {
    kind: "feedback",
    cases: [{ id: "x", text: "a", history: [{ role: "system", text: "b" }] }],
  });
  expect(bad.status).toBe(400);
});

test("EV13. 추천 칩 — text는 캐릭터의 마지막 말, 보인 칩과 후보 전부 · 지난 칩 · 모델을 고르지 않으면 칩 모델", async () => {
  const models: string[] = [];
  const requests: unknown[] = [];
  const fake = fakeCompanionLlm();
  const { call } = setup({
    env: anthropicEnv,
    llmFor: (model) => {
      models.push(model);
      return {
        ...fake,
        suggest: async (request) => {
          requests.push({ ...request, signal: undefined });
          return fake.suggest(request);
        },
      };
    },
  });
  const { status, body } = await call("POST", {
    kind: "suggestions",
    cases: [
      {
        id: "casual",
        text: "오늘 뭐 했어?",
        l1: "vi",
        speechLevel: "casual",
        character: { name: "윤경", role: "친구" },
        history: [{ role: "user", text: "안녕!" }],
      },
      { id: "none", text: "[suggest-none] 안녕하세요", pastSuggestions: ["네, 좋아요!"] },
    ],
  });
  expect(status).toBe(200);
  expect(body["model"]).toBe("claude-haiku-5-5");
  expect(models).toEqual(["claude-haiku-5-5"]);
  const results = body["results"] as Record<string, unknown>[];
  expect(results[0]).toMatchObject({
    id: "casual",
    ok: true,
    output: {
      items: [
        {
          intent: "elaborate",
          text: "나도 오늘 한국어 공부를 조금 했어.",
          meaning: "[vi] 나도 오늘 한국어 공부를 조금 했어.",
        },
        { intent: "ask" },
      ],
      candidates: [{ shown: true }, { shown: true }, { intent: "reflect", shown: false }],
    },
  });
  // 통과 후보가 없어도 실패가 아니다 — 빈 칩과 빠진 까닭을 낸다(채점은 대시보드).
  expect(results[1]).toMatchObject({
    id: "none",
    ok: true,
    output: {
      items: [],
      candidates: [{ reason: "markup" }, { reason: "markup" }, { reason: "markup" }],
    },
  });
  expect(requests[1]).toMatchObject({
    recentChoiceSets: [{ items: [{ text: "네, 좋아요!", intent: null }], outcome: null }],
  });
  expect(requests[0]).toMatchObject({
    character: { name: "윤경", role: "친구" },
    speechLevel: "casual",
    l1: "vi",
    history: [
      { role: "user", text: "안녕!" },
      { role: "assistant", text: "오늘 뭐 했어?" },
    ],
  });
});

test("EV14. 학습 표현 — 노출 · 유도는 답 모델에 지시를 붙여 답과 판정을, 칩은 표현을 넣은 칩을 낸다(모델을 고르지 않으면 답 모델)", async () => {
  const models: string[] = [];
  const { call } = setup({
    env: anthropicEnv,
    llmFor: (model) => {
      models.push(model);
      return fakeCompanionLlm();
    },
  });
  const { status, body } = await call("POST", {
    kind: "learning",
    cases: [
      { id: "expose", text: "오늘 비가 와요", target: { surface: "괜찮아요.", mode: "expose" } },
      { id: "elicit", text: "배고파요", target: { surface: "드릴까요?", mode: "elicit" } },
      {
        id: "chip",
        text: "어떻게 계산할래요?",
        target: { surface: "{수단}로 할게요.", kind: "patt", mode: "chip" },
      },
    ],
  });
  expect(status).toBe(200);
  expect(models).toEqual([anthropicEnv.llm.kind === "anthropic" ? anthropicEnv.llm.model : ""]);
  const results = body["results"] as { id: string; ok: boolean; output: Record<string, unknown> }[];
  expect(results[0]).toMatchObject({
    ok: true,
    output: { mode: "expose", learned: true, done: true },
  });
  expect(JSON.stringify(results[0]!.output["segments"])).toContain("괜찮아요.");
  expect(results[1]).toMatchObject({
    ok: true,
    output: { mode: "elicit", learned: true, done: true },
  });
  expect(results[2]).toMatchObject({ ok: true, output: { mode: "chip", done: true } });
  expect((results[2]!.output["items"] as { text: string }[])[0]!.text).toContain("카드로 할게요");
});
