import { describe, expect, test } from "vitest";

import type {
  ChatSendEnv,
  ChatSendLogEntry,
  CompanionLlm,
  Feedback,
  ModerationVerdict,
} from "./chat-send.contract.ts";
import { createChatSendHandler } from "./chat-send-handler.ts";
import { fakeCompanionLlm } from "./companion-llm-fake.ts";
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
  translation: "every",
};
const okGate = {
  result: "ok",
  ageBand: "unknown",
  l1: "en",
  region: null,
  tier: "free",
  feedbackMode: "separate",
  memoryEnabled: true,
  notices: ["ai_disclosure", "minor_notice"],
};
const begun = {
  result: "ok",
  holdId: "70000000-0000-4000-8000-000000000001",
  creditsReserved: 0,
  trial: true,
  topicState: null,
  memories: [{ kind: "fact", content: "고양이를 키운다", shared: true }],
  conversationId: "30000000-0000-4000-8000-000000000001",
  userMessageId: "40000000-0000-4000-8000-000000000001",
  speechLevel: "polite",
  persona: { name: "덕수쌤", topics: ["퀴즈"] },
  summary: null,
  history: [{ role: "user", text: "전에 한 말", segments: [] }],
};
const finished = {
  speechLevel: "polite",
  speechLevelChanged: false,
  creditsSpent: 0,
  balance: null,
};
const assistantId = "50000000-0000-4000-8000-000000000001";
const legacyKey = "eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.c2lnbmF0dXJl";

type Rpc = { fn: string; args: Record<string, unknown> };
type Options = {
  gate?: unknown;
  begin?: unknown;
  finish?: unknown;
  summarySource?: unknown;
  llm?: CompanionLlm | null;
  envOverride?: ChatSendEnv | null;
  authStatus?: number;
  translationTimeoutMs?: number;
};

function setup(options: Options = {}) {
  const rpcs: Rpc[] = [];
  const logs: ChatSendLogEntry[] = [];
  const pending: Promise<unknown>[] = [];
  const responses: Record<string, unknown> = {
    companion_turn_gate: options.gate ?? okGate,
    companion_begin_turn: options.begin ?? begun,
    companion_learning_context: {
      episodes: ["u01-water"],
      expressions: [{ id: "voca:water", kind: "voca", surface: "물", roman: null, gloss: "water" }],
    },
    companion_finish_turn: options.finish ?? finished,
    companion_add_memories: 1,
    companion_summary_source: options.summarySource ?? null,
    companion_save_summary: null,
  };
  const outbound = async (request: OutboundRequest) => {
    // 서버 키 확인: 런타임 키와 다른 레거시 키를 Auth 관리 API가 받아 준다.
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
    const body = responses[fn] ?? null;
    return { status: 200, text: async () => (body === null ? "" : JSON.stringify(body)) };
  };
  const handler = createChatSendHandler({
    env: options.envOverride === undefined ? env : options.envOverride,
    outbound,
    llm: options.llm === undefined ? fakeCompanionLlm() : options.llm,
    nowMs: () => Date.parse("2026-11-09T09:00:00Z"),
    randomUuid: () => assistantId,
    waitUntil: (work) => pending.push(work),
    log: (entry) => logs.push(entry),
    pingIntervalMs: 60_000,
    translationTimeoutMs: options.translationTimeoutMs ?? 500,
    llmTimeoutMs: 2_000,
    feedbackTimeoutMs: 200,
    // 분기 확률을 넘기지 않게 고정 — 지시가 붙지 않는다.
    random: () => 0.99,
  });
  const finishArgs = () => rpcs.find((rpc) => rpc.fn === "companion_finish_turn")?.args;
  return { handler, rpcs, logs, finishArgs, settle: () => Promise.all(pending) };
}

const body = (overrides: Record<string, unknown> = {}) =>
  JSON.stringify({
    contract_version: 1,
    character_id: "duksu",
    client_message_id: "6f1c3a2e-8d4b-4c1a-9f2e-1a2b3c4d5e6f",
    text: "안녕하세요 저는 마리아 이에요",
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
  overrides: Partial<{
    input: ModerationVerdict;
    output: ModerationVerdict;
    failures: number;
    feedback: () => Promise<Feedback>;
  }>,
): CompanionLlm => {
  const base = fakeCompanionLlm();
  let failures = overrides.failures ?? 0;
  return {
    ...base,
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
    feedback: overrides.feedback ?? base.feedback,
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

  test("CS2. 판정 · 예약 결과가 정해진 HTTP 오류로 나간다", async () => {
    const closed = await setup({
      gate: { result: "temporarily_blocked", detail: { until: "2026-11-09T09:30:00Z" } },
    }).handler(post());
    expect(closed.status).toBe(403);
    expect(await closed.json()).toEqual({
      error: "temporarily_blocked",
      retryable: false,
      detail: { until: "2026-11-09T09:30:00Z" },
    });
    const trial = await setup({
      begin: { result: "trial_exhausted", detail: { characterId: "duksu" } },
    }).handler(post());
    expect(trial.status).toBe(402);
    expect(await trial.json()).toMatchObject({ error: "trial_exhausted" });
    const credits = await setup({
      begin: { result: "insufficient_credits", detail: { required: 1, balance: 0 } },
    }).handler(post());
    expect(await credits.json()).toEqual({
      error: "insufficient_credits",
      retryable: false,
      detail: { required: 1, balance: 0 },
    });
  });

  test("CS3. 플레이그라운드 경로 — 서버 키 + 유저 헤더, 지역은 판정 · 시작에 넘긴다", async () => {
    const { handler, rpcs, finishArgs, settle } = setup();
    const playground = "00000000-0000-4000-8000-0000000000aa";
    const response = await handler(
      post(body({ client_region: "US" }), {
        Authorization: "Bearer service-secret",
        "x-companion-user-id": playground,
      }),
    );
    await response.text();
    await settle();
    expect(rpcs[0]).toMatchObject({
      fn: "companion_turn_gate",
      args: { p_user_id: playground, p_region: "US" },
    });
    expect(rpcs.find((rpc) => rpc.fn === "companion_begin_turn")?.args).toMatchObject({
      p_region: "US",
    });
    expect(finishArgs()).toMatchObject({ p_assistant: { meta: { playground: true } } });
    const asPlayground = (key: string, user: string = playground) =>
      handler(post(body(), { Authorization: `Bearer ${key}`, "x-companion-user-id": user }));
    expect((await asPlayground("service-secret", "not-a-uuid")).status).toBe(401);
    // 운영(2026-11-09): 런타임은 새 비밀 키, 대시보드는 레거시 service_role 키 — Auth가 받아 주면 통과한다.
    const legacy = await asPlayground(legacyKey);
    expect(legacy.status).toBe(200);
    await legacy.text();
    expect((await asPlayground("eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiYW5vbiJ9.Zm9yZ2Vk")).status).toBe(
      401,
    );
    await settle();
  });
});

describe("턴 스트림", () => {
  test("CS4. 정상 턴 — 출력 검사 뒤 조각, 교정 한 번, state · done은 저장 결과로", async () => {
    const { handler, finishArgs, settle } = setup({
      finish: { speechLevel: "casual", speechLevelChanged: true, creditsSpent: 1, balance: 4 },
    });
    const list = await events(await handler(post()));
    await settle();
    expect(checkTurnOrder(list)).toEqual({ ok: true });
    expect(names(list).slice(0, 3)).toEqual(["start", "notice", "notice"]);
    expect(list.filter((event) => event.event === "correction")).toEqual([
      {
        event: "correction",
        id: expect.any(Number),
        data: {
          userMessageId: begun.userMessageId,
          status: "ok",
          kind: "correction",
          items: [
            { original: "마리아 이에요", corrected: "마리아이에요", reason: expect.any(String) },
          ],
        },
      },
    ]);
    expect(list.at(-2)).toMatchObject({
      event: "state",
      data: { speechLevel: "casual", speechLevelChanged: true },
    });
    expect(list.at(-1)).toMatchObject({ event: "done", data: { creditsSpent: 1, balance: 4 } });
    // @state 줄은 말풍선으로 나가지 않고 친밀도 · 화제로 저장된다.
    expect(
      list.some((event) => event.event === "delta" && event.data.text.includes("@state")),
    ).toBe(false);
    expect(finishArgs()).toMatchObject({
      p_status: "complete",
      p_hold_id: begun.holdId,
      p_intimacy_delta: 1,
      p_topic_state: { turn: 1, topic: "인사", topicTurns: 1 },
      p_feedback: { status: "ok", kind: "correction" },
      p_moderation: [
        { layer: "input", category: "safe", action: "allow" },
        { layer: "output_sync", category: "safe", action: "allow" },
      ],
    });
  });

  test("CS5. 위기 — 답 · 교정 없이 crisis와 done, 위기로 저장(예약 해제는 finish가 한다)", async () => {
    const { handler, finishArgs, settle } = setup();
    const list = await events(
      await handler(post(body({ text: "요즘 죽고 싶어요", client_region: "PH" }))),
    );
    await settle();
    expect(checkTurnOrder(list)).toEqual({ ok: true });
    expect(names(list)).toEqual(["start", "notice", "notice", "crisis", "done"]);
    expect(list[3]).toMatchObject({ data: { region: "PH", resources: [{ phone: "1553" }] } });
    expect(finishArgs()).toMatchObject({
      p_status: "crisis",
      p_hold_id: begun.holdId,
      p_feedback: null,
    });
  });

  test("CS6. 입력 차단 · 출력 차단 — 조각 · 교정 없이 guardrail_blocked", async () => {
    for (const text of ["사랑해 [block]", "괜찮아요 [unsafe-reply]"]) {
      const { handler, finishArgs, settle } = setup();
      const list = await events(await handler(post(body({ text }))));
      await settle();
      expect(checkTurnOrder(list)).toEqual({ ok: true });
      expect(names(list).filter((name) => name === "delta" || name === "correction")).toEqual([]);
      expect(list.at(-1)).toMatchObject({
        event: "error",
        data: { code: "guardrail_blocked", retryable: false },
      });
      expect(finishArgs()).toMatchObject({ p_status: "blocked", p_assistant: null });
    }
  });

  test("CS7. 성인은 받는 대로 보내고, 피드백이 늦으면 unavailable로 끝낸다", async () => {
    const slow = llmWith({
      feedback: () =>
        new Promise((resolve) => setTimeout(() => resolve({ status: "none" }), 5_000)),
    });
    const { handler, finishArgs, settle } = setup({
      gate: { ...okGate, ageBand: "adult", notices: [] },
      llm: slow,
    });
    const list = await events(await handler(post()));
    await settle();
    expect(checkTurnOrder(list)).toEqual({ ok: true });
    expect(list.find((event) => event.event === "correction")).toMatchObject({
      data: { status: "unavailable" },
    });
    expect((finishArgs()!["p_moderation"] as unknown[]).length).toBe(1);
  });

  test("CS8. LLM 실패 — 한 번 다시 시도, 그래도 실패면 upstream_unavailable · failed 저장", async () => {
    const once = setup({ llm: llmWith({ failures: 1 }) });
    expect(names(await events(await once.handler(post()))).at(-1)).toBe("done");
    await once.settle();
    const twice = setup({ llm: llmWith({ failures: 2 }) });
    const failed = await events(await twice.handler(post()));
    await twice.settle();
    expect(failed.at(-1)).toMatchObject({
      event: "error",
      data: { code: "upstream_unavailable", retryable: true },
    });
    expect(twice.finishArgs()).toMatchObject({ p_status: "failed", p_notices: [] });
  });

  test("CS9. 앱이 끊어도 턴과 뒤 작업(기억 · 요약)은 끝까지 돈다", async () => {
    const { handler, rpcs, settle } = setup({
      summarySource: {
        summary: null,
        until: "2026-11-09T08:00:00Z",
        messages: [{ role: "user", text: "옛말", segments: [] }],
      },
    });
    const response = await handler(post(body({ text: "저는 떡볶이를 좋아해요 [slow]" })));
    await response.body!.cancel();
    await settle();
    expect(rpcs.find((rpc) => rpc.fn === "companion_finish_turn")?.args).toMatchObject({
      p_status: "complete",
    });
    expect(rpcs.find((rpc) => rpc.fn === "companion_add_memories")?.args).toMatchObject({
      p_items: [{ kind: "fact", content: "떡볶이를 좋아한다", shared: true }],
    });
    expect(rpcs.find((rpc) => rpc.fn === "companion_save_summary")?.args).toMatchObject({
      p_until: "2026-11-09T08:00:00Z",
    });
  });

  test("CS10. 장기 메모리를 끈 판정이면 추출하지 않는다(미국 12 ~ 15세)", async () => {
    const { handler, rpcs, settle } = setup({ gate: { ...okGate, memoryEnabled: false } });
    await (await handler(post(body({ text: "저는 떡볶이를 좋아해요" })))).text();
    await settle();
    expect(rpcs.some((rpc) => rpc.fn === "companion_add_memories")).toBe(false);
  });
});

describe("L1 번역", () => {
  const adult = { ...okGate, ageBand: "adult", notices: [] };
  const translationsOf = (list: TurnEvent[]) =>
    list.flatMap((event) => (event.event === "translation" ? [event.data] : []));
  const storedSegments = (args: Record<string, unknown> | undefined) =>
    (args?.["p_assistant"] as { segments: { kind: string; text: string; translation?: string }[] })
      .segments;
  const translatingWith = (translate: CompanionLlm["translate"]): CompanionLlm => ({
    ...fakeCompanionLlm(),
    translate,
  });

  test("CS11. 조각 delta 뒤 · state 앞에 조각마다 translation, 저장 조각에도 번역", async () => {
    for (const gate of [okGate, adult]) {
      const { handler, finishArgs, settle } = setup({ gate });
      const list = await events(await handler(post()));
      await settle();
      expect(checkTurnOrder(list)).toEqual({ ok: true });
      const kinds = names(list);
      const firstTranslation = kinds.indexOf("translation");
      expect(kinds.lastIndexOf("delta")).toBeLessThan(firstTranslation);
      expect(kinds.lastIndexOf("translation")).toBeLessThan(kinds.indexOf("state"));
      const segments = storedSegments(finishArgs());
      expect(translationsOf(list)).toEqual(
        segments.map((segment, index) => ({ segment: index, text: `[en] ${segment.text}` })),
      );
      expect(segments.length).toBe(3);
      expect(segments[0]).toEqual({
        kind: "action",
        text: "이동식 칠판을 끌고 온다",
        translation: "[en] 이동식 칠판을 끌고 온다",
      });
      expect(finishArgs()).toMatchObject({ p_assistant: { meta: { translation: "ok" } } });
    }
  });

  test("CS12. COMPANION_TRANSLATION=off면 번역 이벤트 · 저장 번역이 없다", async () => {
    const { handler, finishArgs, settle } = setup({ envOverride: { ...env, translation: "off" } });
    const list = await events(await handler(post()));
    await settle();
    expect(translationsOf(list)).toEqual([]);
    expect(storedSegments(finishArgs()).some((segment) => "translation" in segment)).toBe(false);
    expect(finishArgs()).toMatchObject({ p_assistant: { meta: { translation: "off" } } });
  });

  test("CS13. 학습자 언어가 한국어면 건너뛰고, 모르면 영어", async () => {
    const korean = setup({ gate: { ...okGate, l1: "ko-KR" } });
    expect(translationsOf(await events(await korean.handler(post())))).toEqual([]);
    await korean.settle();
    expect(korean.finishArgs()).toMatchObject({
      p_assistant: { meta: { translation: "skipped_ko" } },
    });
    const unknown = setup({ gate: { ...okGate, l1: null } });
    const list = await events(await unknown.handler(post()));
    await unknown.settle();
    expect(translationsOf(list)[0]?.text.startsWith("[en] ")).toBe(true);
  });

  test("CS14. 번역 실패 · 시간 초과 · 개수 틀림은 턴을 실패시키지 않는다 — 번역만 없고 로그에 남는다", async () => {
    const cases: [CompanionLlm["translate"], string][] = [
      [async () => Promise.reject(new Error("overloaded")), "failed"],
      [() => new Promise(() => undefined), "timeout"],
      [async () => ["하나뿐"], "mismatch"],
    ];
    for (const [translate, status] of cases) {
      const { handler, finishArgs, logs, settle } = setup({
        llm: translatingWith(translate),
        translationTimeoutMs: 50,
      });
      const list = await events(await handler(post()));
      await settle();
      expect(checkTurnOrder(list)).toEqual({ ok: true });
      expect(list.at(-1)?.event).toBe("done");
      expect(translationsOf(list)).toEqual([]);
      expect(finishArgs()).toMatchObject({
        p_status: "complete",
        p_assistant: { meta: { translation: status } },
      });
      expect(logs).toContainEqual({
        event: "chat_send",
        status: "stream",
        outcome: "translation_unavailable",
        error: status,
      });
    }
  });

  test("CS15. 미성년자 · 나이 모름 — 출력 검사에 걸린 답은 번역을 내보내지도 저장하지도 않는다", async () => {
    const seen: AbortSignal[] = [];
    const llm: CompanionLlm = {
      ...llmWith({ output: { category: "other_harm", action: "block" } }),
      translate: (request) => {
        seen.push(request.signal);
        return new Promise(() => undefined);
      },
    };
    const { handler, finishArgs, settle } = setup({ llm });
    const list = await events(await handler(post()));
    await settle();
    expect(names(list).filter((name) => name === "delta" || name === "translation")).toEqual([]);
    expect(list.at(-1)).toMatchObject({ event: "error", data: { code: "guardrail_blocked" } });
    expect(finishArgs()).toMatchObject({ p_status: "blocked", p_assistant: null });
    // 검사와 동시에 시작했어도 차단되면 끊는다.
    expect(seen.length).toBe(1);
    expect(seen[0]?.aborted).toBe(true);
  });

  test("CS16. 저장된 번역은 답 모델의 history로 다시 들어가지 않는다 · 피드백은 말투 · 캐릭터를 받는다", async () => {
    const histories: unknown[] = [];
    const feedbackRequests: unknown[] = [];
    const base = fakeCompanionLlm();
    const llm: CompanionLlm = {
      ...base,
      reply: (request) => {
        histories.push(request.history);
        return base.reply(request);
      },
      feedback: (request) => {
        feedbackRequests.push(request);
        return base.feedback(request);
      },
    };
    const history = [
      { role: "user", text: "안녕", segments: [] },
      {
        role: "assistant",
        text: null,
        segments: [{ kind: "speech", text: "반가워요", translation: "Nice to meet you" }],
      },
    ];
    const { handler, settle } = setup({ llm, begin: { ...begun, history } });
    await (await handler(post())).text();
    await settle();
    expect(histories[0]).toEqual([
      { role: "user", text: "안녕" },
      { role: "assistant", segments: [{ kind: "speech", text: "반가워요" }] },
    ]);
    expect(feedbackRequests[0]).toMatchObject({
      previous: "반가워요",
      speechLevel: "polite",
      character: { name: "덕수쌤", role: null, banmalFeedback: "better" },
    });
    // 페르소나가 정하면 그대로 넘어간다(덕수쌤은 마이그레이션 20261114가 correction으로 둔다).
    const strict = setup({
      llm,
      begin: { ...begun, persona: { name: "덕수쌤", banmalFeedback: "correction" } },
    });
    await (await strict.handler(post())).text();
    await strict.settle();
    expect(feedbackRequests[1]).toMatchObject({ character: { banmalFeedback: "correction" } });
  });
});
