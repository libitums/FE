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
            finalMessage: async () => ({ stop_reason: "end_turn" }),
          };
        },
      },
    };
    messages = {
      async parse(params: Record<string, unknown>) {
        calls.parse.push(params);
        return {
          stop_reason: "end_turn",
          parsed_output: {
            status: "none",
            kind: null,
            category: "safe",
            action: "allow",
            items: [],
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
  await llm.feedback({ text: "안녕", l1: null, previous: null, signal });
  await llm.moderate({ layer: "input", text: "안녕", context: null, ageBand: "adult", signal });
  await llm.extractMemories({ userText: "a", reply: "b", existing: [], minor: false, signal });
  expect(calls.parse.map((params) => params["model"])).toEqual([
    "claude-sonnet-5-5",
    "claude-haiku-5-5",
    "claude-haiku-5-5",
  ]);
});

test("LL3. 모델 바꿔 보기는 모든 단계를 그 모델로", async () => {
  const llm = companionLlmWithModel(
    { supabaseUrl: "", supabaseAnonKey: "", supabaseServiceRoleKey: "", llm: config },
    "claude-opus-5-5",
  );
  expect(llm.model).toBe("claude-opus-5-5");
  await llm.feedback({ text: "안녕", l1: null, previous: null, signal });
  await llm.moderate({ layer: "input", text: "안녕", context: null, ageBand: "adult", signal });
  expect(calls.parse.map((params) => params["model"])).toEqual([
    "claude-opus-5-5",
    "claude-opus-5-5",
  ]);
});
