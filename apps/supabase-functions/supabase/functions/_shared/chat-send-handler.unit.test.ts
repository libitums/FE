import { describe, expect, test } from "vitest";

import type { ChatSendEnv, CompanionLlm, ModerationVerdict } from "./chat-send.contract.ts";
import { createChatSendHandler } from "./chat-send-handler.ts";
import { fakeCompanionLlm } from "./companion-llm.ts";
import {
  checkTurnOrder,
  decodeTurnEvent,
  parseSse,
  type TurnEvent,
} from "./companion-contract/index.ts";
import type { OutboundRequest } from "./delete-account.contract.ts";

const userId = "00000000-0000-4000-8000-000000000001";
const env: ChatSendEnv = {
  supabaseUrl: "https://ref.supabase.co",
  supabaseAnonKey: "anon",
  supabaseServiceRoleKey: "service-secret",
  llm: { kind: "fake" },
  dailyLimitSeconds: null,
};
const okGate = {
  result: "ok",
  ageBand: "unknown",
  l1: "en",
  notices: ["ai_disclosure", "minor_notice"],
};
const begun = {
  conversationId: "30000000-0000-4000-8000-000000000001",
  userMessageId: "40000000-0000-4000-8000-000000000001",
  speechLevel: "polite",
  persona: { name: "덕수쌤" },
  summary: null,
  history: [{ role: "user", text: "전에 한 말", segments: [] }],
};
const assistantId = "50000000-0000-4000-8000-000000000001";

type Rpc = { fn: string; args: Record<string, unknown> };

function setup(
  options: {
    gate?: unknown;
    llm?: CompanionLlm | null;
    envOverride?: ChatSendEnv | null;
    authStatus?: number;
  } = {},
) {
  const rpcs: Rpc[] = [];
  const pending: Promise<unknown>[] = [];
  const outbound = async (request: OutboundRequest) => {
    if (request.url.endsWith("/auth/v1/user")) {
      const status = options.authStatus ?? 200;
      return { status, text: async () => JSON.stringify({ id: userId }) };
    }
    const fn = request.url.split("/rpc/")[1]!;
    const args = JSON.parse(request.body ?? "{}") as Record<string, unknown>;
    rpcs.push({ fn, args });
    const body =
      fn === "companion_turn_gate"
        ? (options.gate ?? okGate)
        : fn === "companion_begin_turn"
          ? begun
          : fn === "companion_learning_context"
            ? {
                episodes: ["u01-water"],
                expressions: [
                  { id: "voca:water", kind: "voca", surface: "물", roman: null, gloss: "water" },
                ],
              }
            : null;
    return { status: 200, text: async () => (body === null ? "" : JSON.stringify(body)) };
  };
  const handler = createChatSendHandler({
    env: options.envOverride === undefined ? env : options.envOverride,
    outbound,
    llm: options.llm === undefined ? fakeCompanionLlm() : options.llm,
    nowMs: () => Date.parse("2026-11-09T09:00:00Z"),
    randomUuid: () => assistantId,
    waitUntil: (work) => pending.push(work),
    log: () => undefined,
    pingIntervalMs: 60_000,
    llmTimeoutMs: 2_000,
  });
  return { handler, rpcs, settle: () => Promise.all(pending) };
}

const body = (overrides: Record<string, unknown> = {}) =>
  JSON.stringify({
    contract_version: 1,
    character_id: "duksu",
    client_message_id: "6f1c3a2e-8d4b-4c1a-9f2e-1a2b3c4d5e6f",
    text: "안녕하세요 저는 마리아예요",
    input_mode: "text",
    ...overrides,
  });
const post = (
  payload: string = body(),
  headers: Record<string, string> = { Authorization: "Bearer user-token" },
) =>
  new Request("https://ref.supabase.co/functions/v1/chat-send", {
    method: "POST",
    headers,
    body: payload,
  });

async function events(response: Response): Promise<TurnEvent[]> {
  return parseSse(await response.text()).map((raw) => {
    const decoded = decodeTurnEvent(raw);
    if (!decoded.ok) throw new Error(`invalid event ${raw.event}: ${raw.data}`);
    return decoded.event;
  });
}
const names = (list: TurnEvent[]) => list.map((event) => event.event);

const llmWith = (
  overrides: Partial<{ input: ModerationVerdict; output: ModerationVerdict; failures: number }>,
): CompanionLlm => {
  const base = fakeCompanionLlm();
  let failures = overrides.failures ?? 0;
  return {
    model: "test",
    async *reply(request) {
      if (failures > 0) {
        failures -= 1;
        throw new Error("upstream down");
      }
      yield* base.reply(request);
    },
    async moderate(request) {
      if (request.layer === "input")
        return overrides.input ?? { category: "safe", action: "allow" };
      return overrides.output ?? { category: "safe", action: "allow" };
    },
  };
};

describe("스트림 전 판정", () => {
  test("CS1. 메서드 · 설정 · 토큰 · 본문", async () => {
    const { handler } = setup();
    expect((await handler(new Request("https://x/chat-send", { method: "GET" }))).status).toBe(405);
    expect((await setup({ envOverride: null }).handler(post())).status).toBe(500);
    expect((await handler(post(body(), {}))).status).toBe(401);
    expect((await setup({ authStatus: 401 }).handler(post())).status).toBe(401);

    const invalid = await handler(post(body({ text: "   " })));
    expect(invalid.status).toBe(400);
    expect(await invalid.json()).toEqual({
      error: "invalid_request",
      retryable: false,
      detail: { field: "text" },
    });
    const version = await handler(post(body({ contract_version: 9 })));
    expect(await version.json()).toEqual({
      error: "unsupported_contract_version",
      retryable: false,
      detail: { supported: [1] },
    });
  });

  test("CS2. 판정 결과가 정해진 HTTP 오류로 나간다", async () => {
    const closed = await setup({ gate: { result: "not_available" } }).handler(post());
    expect(closed.status).toBe(403);
    expect(await closed.json()).toEqual({ error: "not_available", retryable: false });
    const duplicate = await setup({
      gate: {
        result: "duplicate_message",
        detail: { messageId: begun.userMessageId, messageStatus: "complete" },
      },
    }).handler(post());
    expect(duplicate.status).toBe(409);
    expect(await duplicate.json()).toMatchObject({ detail: { messageStatus: "complete" } });
  });

  // CS3 — 서버 키를 가진 ops-dashboard만 다른 유저로 턴을 돌릴 수 있습니다. 헤더 없는 서버 키는 사용자가 아닙니다.
  test("CS3. 플레이그라운드 경로 — 서버 키 + 유저 헤더", async () => {
    const { handler, rpcs, settle } = setup();
    const playground = "00000000-0000-4000-8000-0000000000aa";
    const response = await handler(
      post(body(), { Authorization: "Bearer service-secret", "x-companion-user-id": playground }),
    );
    expect(response.status).toBe(200);
    await response.text();
    await settle();
    expect(rpcs[0]).toMatchObject({ fn: "companion_turn_gate", args: { p_user_id: playground } });
    expect(rpcs.at(-1)?.args).toMatchObject({ p_assistant: { meta: { playground: true } } });
    expect((await handler(post(body(), { Authorization: "Bearer service-secret" }))).status).toBe(
      401,
    );
  });
});

describe("턴 스트림", () => {
  test("CS4. 나이 모름 — 출력 검사를 지난 뒤 조각이 나가고 순서 규칙을 지킨다", async () => {
    const { handler, rpcs, settle } = setup();
    const response = await handler(post());
    expect(response.headers.get("content-type")).toBe("text/event-stream; charset=utf-8");
    const list = await events(response);
    await settle();
    expect(checkTurnOrder(list)).toEqual({ ok: true });
    expect(names(list).slice(0, 3)).toEqual(["start", "notice", "notice"]);
    expect(names(list).slice(-2)).toEqual(["state", "done"]);
    expect(list.filter((event) => event.event === "delta").length).toBeGreaterThan(0);

    const finish = rpcs.find((rpc) => rpc.fn === "companion_finish_turn")!;
    expect(finish.args).toMatchObject({
      p_status: "complete",
      p_notices: ["ai_disclosure", "minor_notice"],
      p_moderation: [
        { layer: "input", category: "safe", action: "allow" },
        { layer: "output_sync", category: "safe", action: "allow" },
      ],
      p_assistant: {
        id: assistantId,
        segments: [
          { kind: "action", text: "이동식 칠판을 끌고 온다" },
          { kind: "speech", text: "오, '안녕하세요 저는 마리아예요'! 좋아요, 좋아요!" },
          { kind: "speech", text: "그럼 퀴즈! 소 더하기 고기는?" },
        ],
        meta: { model: "fake", expressions: ["voca:water"], playground: false },
      },
    });
  });

  test("CS5. 위기 — 답 없이 crisis와 done(차감 0), 위기로 저장", async () => {
    const { handler, rpcs, settle } = setup();
    const list = await events(
      await handler(post(body({ text: "요즘 죽고 싶어요", client_region: "PH" }))),
    );
    await settle();
    expect(checkTurnOrder(list)).toEqual({ ok: true });
    expect(names(list)).toEqual(["start", "notice", "notice", "crisis", "done"]);
    expect(list[3]).toMatchObject({ data: { region: "PH", resources: [{ phone: "1553" }] } });
    expect(rpcs.at(-1)?.args).toMatchObject({
      p_status: "crisis",
      p_assistant: { origin: "crisis", segments: [] },
    });
  });

  test("CS6. 입력 차단 · 출력 차단 — 조각 없이 guardrail_blocked, 차단으로 저장", async () => {
    for (const llm of [
      llmWith({ input: { category: "romance", action: "block" } }),
      llmWith({ output: { category: "sexual", action: "block" } }),
    ]) {
      const { handler, rpcs, settle } = setup({ llm });
      const list = await events(await handler(post()));
      await settle();
      expect(checkTurnOrder(list)).toEqual({ ok: true });
      expect(names(list).filter((name) => name === "delta")).toEqual([]);
      expect(list.at(-1)).toEqual({
        event: "error",
        id: list.length - 1,
        data: { code: "guardrail_blocked", retryable: false },
      });
      expect(rpcs.at(-1)?.args).toMatchObject({ p_status: "blocked", p_assistant: null });
    }
  });

  test("CS7. 성인은 출력 검사 없이 받는 대로 보낸다", async () => {
    const { handler, rpcs, settle } = setup({ gate: { ...okGate, ageBand: "adult", notices: [] } });
    const list = await events(await handler(post()));
    await settle();
    expect(checkTurnOrder(list)).toEqual({ ok: true });
    expect(names(list)[0]).toBe("start");
    expect((rpcs.at(-1)!.args["p_moderation"] as unknown[]).length).toBe(1);
  });

  // CS8 — 조각을 하나도 보내기 전의 실패는 서버가 한 번 더 시도합니다. 두 번 실패하면 다시 보내도 되는 오류입니다.
  test("CS8. LLM 실패 — 한 번 다시 시도, 그래도 실패면 upstream_unavailable · failed 저장", async () => {
    const once = setup({ llm: llmWith({ failures: 1 }) });
    const recovered = await events(await once.handler(post()));
    await once.settle();
    expect(names(recovered).at(-1)).toBe("done");

    const twice = setup({ llm: llmWith({ failures: 2 }) });
    const failed = await events(await twice.handler(post()));
    await twice.settle();
    expect(failed.at(-1)).toMatchObject({
      event: "error",
      data: { code: "upstream_unavailable", retryable: true },
    });
    expect(twice.rpcs.at(-1)?.args).toMatchObject({ p_status: "failed", p_notices: [] });
  });

  test("CS9. 앱이 끊어도 턴은 끝까지 돌아 저장된다", async () => {
    const { handler, rpcs, settle } = setup();
    const response = await handler(post(body({ text: "천천히 [slow]" })));
    await response.body!.cancel();
    await settle();
    expect(rpcs.at(-1)).toMatchObject({
      fn: "companion_finish_turn",
      args: { p_status: "complete" },
    });
  });
});
