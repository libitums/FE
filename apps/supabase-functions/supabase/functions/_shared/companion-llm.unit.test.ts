import { beforeEach, expect, test, vi } from "vitest";

// SDK 클라이언트를 바꿔 끼워 실제로 보내는 요청 모양만 본다(네트워크 없음).
const calls = vi.hoisted(() => ({
  stream: [] as Record<string, unknown>[],
  parse: [] as Record<string, unknown>[],
}));
vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    beta = {
      messages: {
        stream(params: Record<string, unknown>) {
          calls.stream.push(params);
          return {
            async *[Symbol.asyncIterator]() {
              yield {
                type: "content_block_delta",
                delta: { type: "text_delta", text: "@speech 안녕\n" },
              };
            },
            finalMessage: async () => ({
              stop_reason: "end_turn",
              usage: {
                input_tokens: 300,
                output_tokens: 40,
                cache_read_input_tokens: 1200,
                cache_creation_input_tokens: 80,
              },
            }),
          };
        },
      },
    };
    messages = {
      async parse(params: Record<string, unknown>) {
        calls.parse.push(params);
        return {
          stop_reason: "end_turn",
          usage: {
            input_tokens: 50,
            output_tokens: 20,
            cache_read_input_tokens: null,
            cache_creation_input_tokens: 900,
          },
          parsed_output: {
            status: "none",
            kind: null,
            category: "safe",
            action: "allow",
            items: [],
            lines: ["a", "b"],
          },
        };
      },
    };
  },
}));

const { anthropicCompanionLlm, companionLlmWithModel, serverFallbackOptions } =
  await import("./companion-llm.ts");

const config = {
  kind: "anthropic",
  apiKey: "sk-test",
  model: "claude-sonnet-5-5",
  moderationModel: "claude-haiku-5-5",
  feedbackModel: "claude-sonnet-5-5",
  translationModel: "claude-haiku-5-5",
} as const;
const signal = new AbortController().signal;

async function reply(llm: ReturnType<typeof anthropicCompanionLlm>) {
  const chunks: string[] = [];
  for await (const chunk of llm.reply({ system: "s", history: [], userText: "안녕", signal }))
    chunks.push(chunk);
  return chunks;
}

beforeEach(() => {
  calls.stream.length = 0;
  calls.parse.length = 0;
});

test("LL1. 답변은 서버 쪽 대체 모델을 싣는다 — Haiku만 뺀다", async () => {
  expect(serverFallbackOptions("claude-sonnet-5-5")).toEqual({
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
  });
  expect(serverFallbackOptions("claude-haiku-5-5")).toEqual({});

  expect(await reply(anthropicCompanionLlm(config))).toEqual(["@speech 안녕\n"]);
  expect(calls.stream[0]).toMatchObject({
    model: "claude-sonnet-5-5",
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
  });
  await reply(anthropicCompanionLlm({ ...config, model: "claude-haiku-5-5" }));
  expect(calls.stream[1]?.["model"]).toBe("claude-haiku-5-5");
  expect(calls.stream[1]).not.toHaveProperty("betas");
  expect(calls.stream[1]).not.toHaveProperty("fallbacks");
});

test("LL2. 피드백은 피드백 모델, 검사 · 기억은 검사 모델", async () => {
  const llm = anthropicCompanionLlm(config);
  await llm.feedback({
    text: "안녕",
    l1: null,
    previous: null,
    history: [],
    speechLevel: null,
    character: null,
    signal,
  });
  await llm.moderate({ layer: "input", text: "안녕", context: null, ageBand: "adult", signal });
  await llm.extractMemories({
    messages: [{ role: "user", text: "a" }],
    existing: [],
    minor: false,
    signal,
  });
  expect(calls.parse.map((params) => params["model"])).toEqual([
    "claude-sonnet-5-5",
    "claude-haiku-5-5",
    "claude-haiku-5-5",
  ]);
});

test("LL2b. 칩을 그대로 고른 유저 말은 기억 원문에 표시가 붙고, 시스템 글이 그것을 근거로 쓰지 말라고 한다", async () => {
  const llm = anthropicCompanionLlm(config);
  await llm.extractMemories({
    messages: [
      { role: "user", text: "저는 서울에 살아요", picked: true },
      { role: "user", text: "저는 떡볶이를 좋아해요" },
    ],
    existing: [],
    minor: false,
    signal,
  });
  const params = calls.parse.at(-1)!;
  const content = (params["messages"] as { content: string }[])[0]!.content;
  expect(content).toContain("학습자(추천 답변을 그대로 고름): 저는 서울에 살아요");
  expect(content).toContain("학습자: 저는 떡볶이를 좋아해요");
  expect(JSON.stringify(params["system"])).toContain("never store a fact");
});

test("LL3. 모델 바꿔 보기는 모든 단계를 그 모델로", async () => {
  const llm = companionLlmWithModel(
    {
      supabaseUrl: "",
      supabaseAnonKey: "",
      supabaseServiceRoleKey: "",
      llm: config,
      translation: "every",
    },
    "claude-opus-5-5",
  );
  expect(llm.model).toBe("claude-opus-5-5");
  await llm.feedback({
    text: "안녕",
    l1: null,
    previous: null,
    history: [],
    speechLevel: null,
    character: null,
    signal,
  });
  await llm.moderate({ layer: "input", text: "안녕", context: null, ageBand: "adult", signal });
  expect(calls.parse.map((params) => params["model"])).toEqual([
    "claude-opus-5-5",
    "claude-opus-5-5",
  ]);
});

test("LL4. 번역은 번역 모델로 · 조각마다 한 줄", async () => {
  const llm = anthropicCompanionLlm(config);
  const lines = await llm.translate({
    segments: [
      { kind: "action", text: "손을 흔든다" },
      { kind: "speech", text: "안녕!" },
    ],
    l1: "vi",
    signal,
  });
  expect(lines).toEqual(["a", "b"]);
  expect(calls.parse[0]).toMatchObject({ model: "claude-haiku-5-5" });
  const system = (calls.parse[0]?.["system"] as { text: string }[])
    .map((block) => block.text)
    .join("");
  expect(system).toContain('BCP 47 tag "vi"');
  expect(system).toContain("exactly 2 strings");
  expect(calls.parse[0]?.["messages"]).toEqual([
    { role: "user", content: "1. [action] 손을 흔든다\n2. [speech] 안녕!" },
  ]);
});

test("LL5. 구조화 호출은 시스템 글에 캐시 표시 — 피드백은 바뀌지 않는 앞부분에만", async () => {
  const llm = anthropicCompanionLlm(config);
  await llm.moderate({ layer: "input", text: "안녕", context: null, ageBand: "adult", signal });
  await llm.feedback({
    text: "안녕",
    l1: "vi",
    previous: null,
    history: [],
    speechLevel: "polite",
    character: null,
    signal,
  });
  const [moderation, feedback] = calls.parse.map(
    (params) => params["system"] as { text: string; cache_control?: unknown }[],
  );
  expect(moderation).toHaveLength(1);
  expect(moderation?.[0]?.cache_control).toEqual({ type: "ephemeral" });
  expect(feedback).toHaveLength(2);
  expect(feedback?.[0]?.cache_control).toEqual({ type: "ephemeral" });
  expect(feedback?.[0]?.text).not.toContain('"vi"');
  expect(feedback?.[1]).not.toHaveProperty("cache_control");
  expect(feedback?.[1]?.text).toContain('BCP 47 tag "vi"');
  expect(feedback?.[1]?.text).toContain("The relationship is still polite");
});

test("LL6. 답변은 지난 대화 마지막 메시지에 캐시 표시, 이번 턴 지시는 유저 말 뒤 system 메시지", async () => {
  const llm = anthropicCompanionLlm(config);
  for await (const _ of llm.reply({
    system: "s",
    history: [
      { role: "user", text: "안녕하세요" },
      { role: "assistant", segments: [{ kind: "speech", text: "반가워요" }] },
    ],
    userText: "날씨 좋네요",
    directive: "새 화제를 꺼내세요",
    signal,
  })) {
    // 조각은 LL1이 본다.
  }
  const messages = calls.stream[0]?.["messages"] as { role: string; content: unknown }[];
  expect(messages.map((message) => message.role)).toEqual(["user", "assistant", "user", "system"]);
  expect(messages[0]?.content).toBe("안녕하세요");
  expect(messages[1]?.content).toEqual([
    { type: "text", text: "@speech 반가워요", cache_control: { type: "ephemeral" } },
  ]);
  expect(messages[2]?.content).toBe("날씨 좋네요");
  expect(messages[3]?.content).toBe("새 화제를 꺼내세요");
});

test("LL7. 지시가 없으면 system 메시지를 싣지 않는다 · 지난 대화가 없으면 캐시 표시도 없다", async () => {
  const llm = anthropicCompanionLlm(config);
  await reply(llm);
  expect(calls.stream[0]?.["messages"]).toEqual([{ role: "user", content: "안녕" }]);
});

test("LL8. withUsage — 호출마다 단계 · 모델 · 토큰을 기록한다", async () => {
  const seen: unknown[] = [];
  const llm = anthropicCompanionLlm(config).withUsage!((usage) => seen.push(usage));
  await reply(llm);
  await llm.moderate({
    layer: "output_sync",
    text: "안녕",
    context: "hi",
    ageBand: "minor",
    signal,
  });
  expect(seen).toEqual([
    {
      step: "reply",
      model: "claude-sonnet-5-5",
      inputTokens: 300,
      cacheReadTokens: 1200,
      cacheWriteTokens: 80,
      outputTokens: 40,
    },
    {
      step: "moderation_output",
      model: "claude-haiku-5-5",
      inputTokens: 50,
      cacheReadTokens: 0,
      cacheWriteTokens: 900,
      outputTokens: 20,
    },
  ]);
});

test("LL9. 입력 검사의 맥락은 직전 캐릭터 말로, 출력 검사의 맥락은 유저 말로 적는다", async () => {
  const llm = anthropicCompanionLlm(config);
  await llm.moderate({
    layer: "input",
    text: "응 할게",
    context: "같이 갈래요?",
    ageBand: "adult",
    signal,
  });
  await llm.moderate({
    layer: "output_sync",
    text: "좋아요",
    context: "응 할게",
    ageBand: "minor",
    signal,
  });
  const contents = calls.parse.map(
    (params) => (params["messages"] as { content: string }[])[0]?.content,
  );
  expect(contents[0]).toBe(
    "The character's previous message, for context only:\n같이 갈래요?\n\nText to review:\n응 할게",
  );
  expect(contents[1]).toBe("Learner's message for context:\n응 할게\n\nText to review:\n좋아요");
});
