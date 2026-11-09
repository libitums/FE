import { expect, test } from "vitest";

import type { ChatSendEnv, CompanionLlm } from "./chat-send.contract.ts";
import { createCompanionEvalHandler, evalModels } from "./companion-eval-handler.ts";
import { companionLlmWithModel, StructuredUnavailable } from "./companion-llm.ts";
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
};

function setup(options: Options = {}) {
  const outbound: OutboundRequest[] = [];
  const models: string[] = [];
  const env = options.env === undefined ? fakeEnv : options.env;
  const handler = createCompanionEvalHandler({
    env,
    outbound: async (request) => {
      outbound.push(request);
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
  const call = async (method: string, body?: unknown, token = "service-secret") => {
    const response = await handler(
      new Request("https://ref.supabase.co/functions/v1/companion-eval", {
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
      items: [
        {
          original: "학생 이에요",
          corrected: "학생이에요",
          reason: "Attach 이에요/예요 to the noun without a space.",
        },
      ],
    },
    {
      status: "ok",
      kind: "l1_to_ko",
      l1ToKo: { text: "안녕하세요, 반가워요.", meaning: "Hello there" },
    },
    { status: "none" },
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
        character: { name: "덕수쌤", role: "teacher" },
      },
      { id: "casual", text: "뭐 해?", speechLevel: "casual" },
    ],
  });
  expect(
    (body["results"] as { output: { kind?: string; status: string } }[]).map(
      (r) => r.output.kind ?? r.output.status,
    ),
  ).toEqual(["better", "none"]);
  const bad = await call("POST", {
    kind: "feedback",
    cases: [{ id: "x", text: "뭐 해?", speechLevel: "honorific" }],
  });
  expect(bad.status).toBe(400);
});
