import { expect, test } from "vitest";

import type { ChatSendEnv, ChatSendLogEntry, CompanionLlm } from "./chat-send.contract.ts";
import { fakeCompanionLlm } from "./companion-llm-fake.ts";
import { createProactiveHandler } from "./companion-proactive-handler.ts";
import type { OutboundRequest } from "./delete-account.contract.ts";

// 선톡(20261123): 답 없는 선톡 판정 · force의 wouldSkip, 지시의 맥락(며칠 · 때 · 마지막 화제 · 최근 선톡 · 답 없음), 칩, 번역 맥락,
// 쉬는 대화의 기억 마저 뽑기.
const userId = "00000000-0000-4000-8000-000000000001";
const messageId = "60000000-0000-4000-8000-000000000002";
const serviceKey = "eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.c2lnbmF0dXJl";
const now = "2026-11-10T09:00:00Z";
const env: ChatSendEnv = {
  supabaseUrl: "https://ref.supabase.co",
  supabaseAnonKey: "anon",
  supabaseServiceRoleKey: "service-secret",
  llm: { kind: "fake" },
  translation: "every",
};

const context = (overrides: Record<string, unknown> = {}) => ({
  persona: { name: "미나", role: "룸메이트" },
  speechLevel: "casual",
  summary: null,
  l1: "en",
  ageBand: "adult",
  hasConversation: true,
  hasUserMessage: true,
  allowed: true,
  capReached: false,
  skipReason: null,
  unanswered: 0,
  lastUserMessageAt: "2026-11-07T09:00:00Z",
  localHour: 18,
  recentProactive: ["요즘 뭐 해?"],
  replySuggestions: true,
  suggestionsEnabled: true,
  suggestionDisplayMax: 2,
  recentChoiceSets: [],
  memories: [],
  history: [
    { role: "user", text: "시험 공부 중이야", segments: [] },
    { role: "assistant", text: null, segments: [{ kind: "speech", text: "화이팅!" }] },
  ],
  ...overrides,
});

type Rpc = { fn: string; args: Record<string, unknown> };

function setup(
  options: { context?: unknown; llm?: CompanionLlm; rpc?: Record<string, unknown> } = {},
) {
  const rpcs: Rpc[] = [];
  const logs: ChatSendLogEntry[] = [];
  const outbound = async (request: OutboundRequest) => {
    if (request.url.includes("/auth/v1/admin/users"))
      return {
        status: request.headers["apikey"] === serviceKey ? 200 : 401,
        text: async () => "{}",
      };
    const fn = request.url.split("/rpc/")[1]!;
    rpcs.push({ fn, args: JSON.parse(request.body ?? "{}") as Record<string, unknown> });
    const body =
      fn === "companion_proactive_context"
        ? (options.context ?? context())
        : fn in (options.rpc ?? {})
          ? options.rpc![fn]
          : null;
    return { status: 200, text: async () => JSON.stringify(body) };
  };
  const handler = createProactiveHandler({
    env,
    outbound,
    llm: options.llm ?? fakeCompanionLlm(),
    nowMs: () => Date.parse(now),
    randomUuid: () => messageId,
    log: (entry) => logs.push(entry),
    translationTimeoutMs: 500,
    suggestionTimeoutMs: 500,
  });
  const call = async (body: unknown) => {
    const response = await handler(
      new Request("https://ref.supabase.co/functions/v1/companion-proactive", {
        method: "POST",
        headers: { Authorization: `Bearer ${serviceKey}` },
        body: JSON.stringify(body),
      }),
    );
    return (await response.json()) as { processed: number; outcomes: Record<string, unknown>[] };
  };
  const save = () => rpcs.find((rpc) => rpc.fn === "companion_save_proactive")?.args;
  return { call, rpcs, logs, save };
}

const one = { user_id: userId, character_id: "mina" };

test("PR1. 답 없는 선톡 판정이면 보내지 않고, force는 보내되 막혔을 까닭을 wouldSkip으로 알린다", async () => {
  const blocked = setup({ context: context({ skipReason: "unanswered_limit", unanswered: 2 }) });
  expect((await blocked.call(one)).outcomes).toEqual([
    { userId, characterId: "mina", result: "unanswered_limit" },
  ]);
  expect(blocked.save()).toBeUndefined();

  const forced = setup({ context: context({ skipReason: "backoff", unanswered: 1 }) });
  const result = await forced.call({ ...one, force: true });
  expect(result.outcomes[0]).toMatchObject({ result: "sent", wouldSkip: "backoff" });
  expect(forced.save()?.["p_meta"]).toMatchObject({
    forced: true,
    wouldSkip: "backoff",
    playground: true,
  });
});

test("PR2. 지시에 며칠 · 때 · 마지막 화제 · 최근 선톡 · 답 없음을 싣는다", async () => {
  const systems: string[] = [];
  const base = fakeCompanionLlm();
  const llm: CompanionLlm = {
    ...base,
    reply(request) {
      systems.push(request.system);
      return base.reply(request);
    },
  };
  const { call } = setup({ llm, context: context({ unanswered: 1 }) });
  await call({ ...one, force: true });
  const system = systems[0]!;
  expect(system).toContain("about 3 days since the learner last wrote");
  expect(system).toContain("It is evening where the learner is");
  expect(system).toContain('The learner\'s last message was: "시험 공부 중이야"');
  expect(system).toContain(
    "Your recent openers (do not repeat their wording, topic or idea):\n- 요즘 뭐 해?",
  );
  expect(system).toContain("has not answered your last opener");
});

test("PR3. 칩 스위치가 켜져 있으면 칩을 만들어 함께 저장하고, 꺼져 있거나 옛 DB면 만들지 않는다", async () => {
  const on = setup();
  const result = await on.call(one);
  expect(result.outcomes[0]?.["suggestions"]).toHaveLength(2);
  const saved = on.save()!;
  expect(saved["p_suggestions"]).toMatchObject({ version: 2, items: expect.any(Array) });
  expect(saved["p_meta"]).toMatchObject({ suggestions: "ok", translation: "ok" });

  for (const overrides of [
    { replySuggestions: false },
    { replySuggestions: undefined },
    { suggestionsEnabled: false },
  ]) {
    const off = setup({ context: context(overrides) });
    await off.call(one);
    expect(off.save()).not.toHaveProperty("p_suggestions");
    expect(off.save()?.["p_meta"]).not.toHaveProperty("suggestions");
  }
});

test("PR4. 번역은 앞 대화 맥락과 캐릭터 이름을 받는다", async () => {
  const requests: Parameters<CompanionLlm["translate"]>[0][] = [];
  const base = fakeCompanionLlm();
  const { call } = setup({
    llm: {
      ...base,
      translate(request) {
        requests.push(request);
        return base.translate(request);
      },
    },
  });
  await call(one);
  expect(requests[0]?.context).toEqual([
    { role: "user", text: "시험 공부 중이야" },
    { role: "assistant", text: "화이팅!" },
  ]);
  expect(requests[0]?.glossary).toEqual({ characterName: "미나" });
});

test("PR5. 쉬는 대화의 기억 마저 뽑기 — 후보마다 묶음이 차지 않아도 뽑고, 꺼진 판정은 표시만 옮긴다", async () => {
  const conversation = "70000000-0000-4000-8000-000000000001";
  const off = "70000000-0000-4000-8000-000000000002";
  const source = {
    until: "2026-11-10T08:00:00Z",
    sourceMessageId: "40000000-0000-4000-8000-000000000001",
    messages: [{ role: "user", text: "저는 떡볶이를 좋아해요", segments: [] }],
    existing: [],
  };
  const { call, rpcs, logs } = setup({
    rpc: {
      companion_memory_flush_candidates: [
        {
          userId,
          characterId: "mina",
          conversationId: conversation,
          memoryEnabled: true,
          minor: false,
        },
        { userId, characterId: "duksu", conversationId: off, memoryEnabled: false, minor: true },
      ],
      companion_memory_source: source,
      companion_apply_memory_ops: {
        added: 1,
        updated: 0,
        forgotten: 0,
        evicted: 0,
        skipped: 0,
        protected: 0,
        full: false,
      },
    },
  });
  const result = await call({ mode: "memory_flush", batch: 5 });
  expect(result.processed).toBe(2);
  expect(result.outcomes).toMatchObject([
    { conversationId: conversation, result: "extracted", added: 1 },
    { conversationId: off, result: "disabled", added: 0 },
  ]);
  expect(rpcs.find((rpc) => rpc.fn === "companion_memory_flush_candidates")?.args).toEqual({
    p_now: new Date(now).toISOString(),
    p_limit: 5,
  });
  expect(rpcs.filter((rpc) => rpc.fn === "companion_memory_source").map((rpc) => rpc.args)).toEqual(
    [
      { p_conversation_id: conversation, p_limit: 40, p_flush: true },
      { p_conversation_id: off, p_limit: 40, p_flush: true },
    ],
  );
  expect(rpcs.filter((rpc) => rpc.fn === "companion_apply_memory_ops")).toHaveLength(1);
  expect(rpcs.filter((rpc) => rpc.fn === "companion_mark_memories")).toHaveLength(2);
  expect(logs).toContainEqual({
    event: "companion_memory_flush",
    status: 200,
    outcome: "extracted=1/2",
  });
});
