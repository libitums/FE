import { describe, expect, test } from "vitest";

import type {
  ChatSendEnv,
  ChatSendLogEntry,
  Feedback,
  LearningExpression,
} from "./chat-send.contract.ts";
import { chatWordCandidates, withChatWords } from "./chat-send-chat-words.ts";
import type { OutboundRequest } from "./delete-account.contract.ts";

const env: ChatSendEnv = {
  supabaseUrl: "https://ref.supabase.co",
  supabaseAnonKey: "anon",
  supabaseServiceRoleKey: "service-secret",
  llm: { kind: "fake" },
  translation: "every",
};
const userId = "00000000-0000-4000-8000-000000000001";
const messageId = "40000000-0000-4000-8000-000000000001";
const entry = (id: string, surface: string): LearningExpression => ({
  id,
  kind: id.split(":")[0]!,
  surface,
  roman: null,
  gloss: null,
});
const pool = [
  entry("voca:warm", "따뜻하다"),
  entry("voca:student", "학생"),
  entry("voca:coffee", "커피"),
  entry("expr:fine", "괜찮아요."),
];
const card = (overrides: Partial<Feedback> = {}): Feedback => ({
  status: "ok",
  kind: "correction",
  original: "오늘 따뜻해요. 저는 학생 이에요",
  corrected: "오늘 따뜻해요. 저는 학생이에요",
  items: [{ original: "학생 이에요", corrected: "학생이에요", reason: "No space." }],
  better: null,
  meaning: null,
  learnedUsed: [
    { id: "voca:warm", surface: "따뜻하다" },
    { id: "voca:student", surface: "학생" },
  ],
  ...overrides,
});

function fakeDeps(respond: (request: OutboundRequest) => { status: number; body: string }) {
  const requests: OutboundRequest[] = [];
  const logs: ChatSendLogEntry[] = [];
  const deps = {
    outbound: async (request: OutboundRequest) => {
      requests.push(request);
      const { status, body } = respond(request);
      return { status, text: async () => body };
    },
    log: (log: ChatSendLogEntry) => logs.push(log),
    nowMs: () => Date.parse("2026-11-20T09:00:00Z"),
  };
  return { deps, requests, logs };
}

describe("chatWordCandidates", () => {
  test("CWS-U1 learnedUsed 가운데 voca이고 풀에 있는 것만 · 같은 id는 한 번", () => {
    const feedback = card({
      items: [],
      learnedUsed: [
        { id: "voca:warm", surface: "따뜻하다" },
        { id: "expr:fine", surface: "괜찮아요." },
        { id: "voca:unknown", surface: "모름" },
        { id: "voca:warm", surface: "따뜻하다" },
        { id: "voca:coffee", surface: "커피" },
      ],
    });
    expect(chatWordCandidates(feedback, pool)).toEqual({
      counted: ["voca:warm", "voca:coffee"],
      pending: [],
    });
  });

  test("CWS-U2 교정 items[].original(공백 · 부호 걷음)에 단어 조각(어간)이 있으면 pending, 아니면 counted", () => {
    expect(chatWordCandidates(card(), pool)).toEqual({
      counted: ["voca:warm"],
      pending: ["voca:student"],
    });
    // 어간 기준: 따뜻하다 → 「따뜻」. 원문이 띄어 쓰고 부호가 붙어도 짚힌 것으로 본다.
    const stem = card({
      items: [{ original: "따 뜻 했어여!", corrected: "따뜻했어요", reason: "Spelling." }],
    });
    expect(chatWordCandidates(stem, pool)).toEqual({
      counted: ["voca:student"],
      pending: ["voca:warm"],
    });
  });

  test("CWS-U3 skipped(칩 그대로) · learnedUsed 없음 · 빈 배열이면 둘 다 빈 — RPC도 부르지 않는다", async () => {
    const empty = { counted: [], pending: [] };
    expect(chatWordCandidates(card({ status: "skipped", reason: "suggestion" }), pool)).toEqual(
      empty,
    );
    const { learnedUsed: _ignored, ...bare } = card();
    expect(chatWordCandidates(bare, pool)).toEqual(empty);
    expect(chatWordCandidates(card({ learnedUsed: [] }), pool)).toEqual(empty);
    const only = card({ learnedUsed: [{ id: "expr:fine", surface: "괜찮아요." }] });
    const { deps, requests } = fakeDeps(() => ({ status: 200, body: "{}" }));
    expect(await withChatWords(deps, env, userId, messageId, only, pool)).toBe(only);
    expect(requests).toHaveLength(0);
  });
});

describe("withChatWords", () => {
  test("CWS-U4 RPC 인수 · 돌려받은 id를 풀의 표면형으로 · 모르는 id는 버림 · 카드에 chatWords", async () => {
    const { deps, requests, logs } = fakeDeps(() => ({
      status: 200,
      body: JSON.stringify({
        counted: ["voca:warm", "voca:gone"],
        pending: ["voca:student"],
        weekTotal: 4,
      }),
    }));
    const feedback = card();
    const result = await withChatWords(deps, env, userId, messageId, feedback, pool);
    expect(requests).toHaveLength(1);
    expect(requests[0]!.url).toBe("https://ref.supabase.co/rest/v1/rpc/ranking_record_chat_words");
    expect(JSON.parse(requests[0]!.body ?? "{}")).toEqual({
      p_user_id: userId,
      p_message_id: messageId,
      p_counted: ["voca:warm"],
      p_pending: ["voca:student"],
      p_now: "2026-11-20T09:00:00.000Z",
    });
    expect(result).toEqual({
      ...feedback,
      chatWords: {
        counted: [{ id: "voca:warm", surface: "따뜻하다" }],
        pending: [{ id: "voca:student", surface: "학생" }],
        weekTotal: 4,
      },
    });
    expect(logs).toEqual([]);
  });

  test("CWS-U5 RPC 실패 · 모양이 틀린 응답이면 카드 그대로 + chat_words_failed 로그", async () => {
    const feedback = card();
    for (const response of [
      { status: 500, body: "" },
      { status: 200, body: "" },
      { status: 200, body: JSON.stringify({ counted: "voca:warm", pending: [], weekTotal: 1 }) },
      { status: 200, body: JSON.stringify({ counted: [], pending: [], weekTotal: -1 }) },
    ]) {
      const { deps, logs } = fakeDeps(() => response);
      expect(await withChatWords(deps, env, userId, messageId, feedback, pool)).toBe(feedback);
      expect(logs).toEqual([
        { event: "chat_send", status: "stream", outcome: "chat_words_failed" },
      ]);
    }
    const { deps, logs } = fakeDeps(() => {
      throw new Error("network");
    });
    expect(await withChatWords(deps, env, userId, messageId, feedback, pool)).toBe(feedback);
    expect(logs).toHaveLength(1);
  });
});

describe("두 글자 어간", () => {
  test("CWS-U6 맛있다처럼 두 글자 어간 「-다」 단어는 learnedUsed에 없어도 어간 전체(맛있)로 찾아 센다 — 맛 하나로는 세지 않는다", () => {
    const words = [entry("voca:tasty", "맛있다"), entry("voca:student", "학생")];
    const plain = (original: string): Feedback =>
      card({ status: "none", kind: null, original, corrected: null, items: [], learnedUsed: [] });
    expect(chatWordCandidates(plain("정말 맛있어요!"), words)).toEqual({
      counted: ["voca:tasty"],
      pending: [],
    });
    expect(chatWordCandidates(plain("맛이 없어요"), words)).toEqual({ counted: [], pending: [] });
  });
});
