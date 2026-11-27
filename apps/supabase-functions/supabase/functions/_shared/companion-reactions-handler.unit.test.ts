import { expect, test } from "vitest";

import type { ChatSendEnv, CompanionLlm } from "./chat-send.contract.ts";
import { fakeCompanionLlm } from "./companion-llm-fake.ts";
import { reactionPushBody } from "./companion-reaction-push.ts";
import {
  createReactionsHandler,
  REACTION_BATCH,
  REACTION_BUDGET_MS,
  type ReactionsLogEntry,
} from "./companion-reactions-handler.ts";
import type { OutboundRequest } from "./delete-account.contract.ts";

// 내 스토리 반응(ADR-0191): 서버 키 · POST만 → 정리 → claim(상한 · 대화 중 미룸은 서버) → 알람마다 맥락 · 모델 · 출력 검사 · 번역 · 칩 →
// 끝내기(그 인물 방의 메시지로 저장) → 저장됐으면 푸시. 단어는 필수가 아니다. 던지지 않는다.
const serviceKey = "eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.c2lnbmF0dXJl";
const env: ChatSendEnv = {
  supabaseUrl: "https://ref.supabase.co",
  supabaseAnonKey: "anon",
  supabaseServiceRoleKey: "service-secret",
  llm: { kind: "fake" },
  translation: "every",
};
const claimed = (n: number, extra: Record<string, unknown> = {}) => ({
  reactionId: `r${n}`,
  userId: `00000000-0000-4000-8000-00000000000${n}`,
  characterId: "mina",
  storyId: `s${n}`,
  kind: "card",
  ko: "야근",
  roman: "yageun",
  meaning: "overtime",
  exampleKo: "오늘도 야근이야",
  angle: "react",
  rank: 1,
  lang: "es",
  ...extra,
});
const context = (overrides: Record<string, unknown> = {}) => ({
  persona: { name: "윤경", role: "회사원" },
  speechLevel: "casual",
  summary: null,
  l1: "en",
  ageBand: "adult",
  hasConversation: true,
  hasUserMessage: true,
  allowed: true,
  capReached: false,
  memories: [],
  history: [{ role: "user", text: "안녕", segments: [] }],
  ...overrides,
});

/** 정해진 말을 하는 모델 — 번역 · 검사는 가짜 그대로. */
function saying(
  lines: string[],
  seen: { system: string; directive: string | null }[] = [],
): CompanionLlm {
  const fake = fakeCompanionLlm();
  return {
    ...fake,
    async *reply(request) {
      seen.push({ system: request.system, directive: request.directive ?? null });
      for (const line of lines) yield `${line}\n`;
    },
  };
}

type Rpc = { fn: string; args: Record<string, unknown> };
const zero = { gone: 0, pushed: 0, skippedCap: 0, deferred: 0, globalCapped: false };
function setup(options: {
  claims?: unknown[];
  skippedCap?: number;
  deferred?: number;
  globalCapped?: boolean;
  context?: unknown;
  contextStatus?: number;
  llm?: CompanionLlm;
  failing?: string[];
  delayMs?: number;
  saved?: boolean;
  gate?: unknown;
  nowMs?: () => number;
  budgetMs?: number;
  concurrency?: number;
}) {
  const rpcs: Rpc[] = [];
  const sends: { url: string; body: unknown }[] = [];
  const logs: ReactionsLogEntry[] = [];
  let inFlight = 0;
  let most = 0;
  let ids = 0;
  const outbound = async (request: OutboundRequest) => {
    if (request.url.includes("/auth/v1/admin/users"))
      return {
        status: request.headers["apikey"] === serviceKey ? 200 : 401,
        text: async () => "{}",
      };
    if (!request.url.includes("/rpc/")) {
      sends.push({ url: request.url, body: JSON.parse(request.body ?? "null") });
      return { status: 200, text: async () => JSON.stringify({ sent: 1 }) };
    }
    const fn = request.url.split("/rpc/")[1] ?? "";
    rpcs.push({ fn, args: JSON.parse(request.body ?? "{}") as Record<string, unknown> });
    if (options.failing?.includes(fn)) return { status: 500, text: async () => "{}" };
    if (fn === "companion_proactive_context") {
      inFlight += 1;
      most = Math.max(most, inFlight);
      if (options.delayMs !== undefined)
        await new Promise((resolve) => setTimeout(resolve, options.delayMs));
      inFlight -= 1;
      return {
        status: options.contextStatus ?? 200,
        text: async () =>
          JSON.stringify(options.context === undefined ? context() : options.context),
      };
    }
    const body =
      fn === "companion_claim_story_reactions"
        ? {
            rows: options.claims ?? [claimed(1)],
            skippedCap: options.skippedCap ?? 0,
            deferred: options.deferred ?? 0,
            globalCapped: options.globalCapped ?? false,
          }
        : fn === "companion_purge_my_stories"
          ? { deleted: 2 }
          : fn === "companion_story_reaction_push_gate"
            ? (options.gate ?? { mode: "off", tester: false, hasDevice: true, hasRoom: true })
            : { updated: 1, saved: options.saved ?? true };
    return { status: 200, text: async () => JSON.stringify(body) };
  };
  const handler = createReactionsHandler({
    env,
    outbound,
    llm: options.llm ?? saying(["@speech 야근 끝나면 라면 먹어! 내가 쏠게"]),
    nowMs: options.nowMs ?? (() => Date.parse("2026-11-23T10:00:00Z")),
    randomUuid: () => `m${(ids += 1)}`,
    log: (entry) => logs.push(entry),
    translationTimeoutMs: 500,
    suggestionTimeoutMs: 500,
    ...(options.budgetMs === undefined ? {} : { budgetMs: options.budgetMs }),
    ...(options.concurrency === undefined ? {} : { concurrency: options.concurrency }),
  });
  const call = async (token = serviceKey, method = "POST") =>
    handler(
      new Request("https://ref.supabase.co/functions/v1/companion-story-reactions", {
        method,
        headers: { Authorization: `Bearer ${token}` },
        ...(method === "POST" ? { body: "{}" } : {}),
      }),
    );
  const finishes = () =>
    rpcs.filter((rpc) => rpc.fn === "companion_finish_story_reaction").map((rpc) => rpc.args);
  const count = (fn: string) => rpcs.filter((rpc) => rpc.fn === fn).length;
  return { call, rpcs, sends, logs, finishes, count, most: () => most };
}

test("RH1. 정리 → claim → 맥락 · 모델(지시에 각도) → 번역 → 끝내기(메시지 id · 조각 · meta) → 푸시 문", async () => {
  const seen: { system: string; directive: string | null }[] = [];
  const t = setup({ llm: saying(["@action 웃는다", "@speech 야근 끝나면 라면 먹어!"], seen) });
  const response = await t.call();
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ purged: 2, claimed: 1, done: 1, failed: 0, ...zero });
  expect(t.rpcs.map((rpc) => rpc.fn)).toEqual([
    "companion_purge_my_stories",
    "companion_claim_story_reactions",
    "companion_proactive_context",
    "companion_finish_story_reaction",
    "companion_story_reaction_push_gate",
  ]);
  expect(t.rpcs[1]!.args).toEqual({ p_now: "2026-11-23T10:00:00.000Z", p_limit: REACTION_BATCH });
  expect(t.rpcs[2]!.args).toMatchObject({ p_user_id: claimed(1).userId, p_character_id: "mina" });
  expect(seen[0]!.system).toContain('Use the word "야근"');
  expect(seen[0]!.system).not.toMatch(/must use/i);
  const [finish] = t.finishes();
  expect(finish).toMatchObject({
    p_reaction_id: "r1",
    p_ok: true,
    p_now: "2026-11-23T10:00:00.000Z",
    p_message_id: "m1",
    p_suggestions: null,
    p_meta: { outcome: "done", translation: "ok", model: expect.any(String) },
  });
  const segments = finish!["p_segments"] as { kind: string; text: string; translation?: string }[];
  expect(segments.map((segment) => segment.kind)).toEqual(["action", "speech"]);
  expect(segments[1]).toMatchObject({ text: "야근 끝나면 라면 먹어!" });
  expect(typeof segments[1]!.translation).toBe("string");
  expect(t.sends).toEqual([]); // 푸시 스위치 off
  expect(t.logs.at(-1)).toMatchObject({ event: "companion_story_reactions", status: 200 });
});

test("RH2. 출력 검사 막힘 · 맥락 없음 · 나이 규칙 · 방 없음 · 맥락 실패 · 모델 실패는 failed로 끝낸다(메시지 없음)", async () => {
  const cases: Parameters<typeof setup>[0][] = [
    { llm: saying(["@speech 야근 [unsafe] 위험한 답"]) },
    { context: null },
    { context: context({ allowed: false }) },
    { context: context({ hasConversation: false }) },
    { contextStatus: 500 },
    {
      llm: {
        ...fakeCompanionLlm(),
        // oxlint-disable-next-line require-yield
        async *reply() {
          throw new Error("boom");
        },
      },
    },
  ];
  for (const options of cases) {
    const t = setup(options);
    expect(await (await t.call()).json()).toEqual({
      purged: 2,
      claimed: 1,
      done: 0,
      failed: 1,
      ...zero,
    });
    expect(t.finishes()).toEqual([
      expect.objectContaining({
        p_reaction_id: "r1",
        p_ok: false,
        p_message_id: null,
        p_segments: null,
      }),
    ]);
    expect(t.count("companion_story_reaction_push_gate")).toBe(0);
  }
});

test("RH3. 서버 키만 · POST만, 정리 · claim이 실패해도 던지지 않고, 알람마다 동시에 넷까지", async () => {
  expect((await setup({}).call("user-token")).status).toBe(401);
  expect((await setup({}).call(serviceKey, "GET")).status).toBe(405);
  const broken = setup({
    failing: ["companion_purge_my_stories", "companion_claim_story_reactions"],
  });
  expect(await (await broken.call()).json()).toEqual({
    purged: 0,
    claimed: 0,
    done: 0,
    failed: 0,
    ...zero,
  });

  const many = setup({ claims: Array.from({ length: 9 }, (_, n) => claimed(n + 1)), delayMs: 2 });
  expect(await (await many.call()).json()).toEqual({
    purged: 2,
    claimed: 9,
    done: 9,
    failed: 0,
    ...zero,
  });
  expect(many.most()).toBeGreaterThan(1);
  expect(many.most()).toBeLessThanOrEqual(4);
  expect(new Set(many.finishes().map((finish) => finish["p_message_id"])).size).toBe(9);
  const invalid = setup({ claims: [{ reactionId: "x" }] });
  expect(await (await invalid.call()).json()).toEqual({
    purged: 2,
    claimed: 1,
    done: 0,
    failed: 1,
    ...zero,
  });
});

test("RH4. 단어가 없는 답도 저장한다(필수 아님) — 출력 검사는 늘 돈다", async () => {
  let moderated = 0;
  const base = saying(["@speech 수고했어! 푹 쉬어"]);
  const t = setup({
    llm: {
      ...base,
      moderate: async (request) => {
        moderated += 1;
        return base.moderate(request);
      },
    },
  });
  expect(await (await t.call()).json()).toMatchObject({ done: 1, failed: 0 });
  expect(moderated).toBe(1);
  expect(t.finishes()[0]).toMatchObject({ p_ok: true, p_message_id: "m1" });
});

test("RH5. 끝내기에 사용량 요약(모델 · 토큰)을 meta로 싣는다 — 성공 · 실패 둘 다", async () => {
  const t = setup({});
  await t.call();
  expect(t.finishes()[0]).toMatchObject({ p_meta: { usage: expect.anything(), outcome: "done" } });
  const failed = setup({ context: context({ allowed: false }) });
  await failed.call();
  expect(failed.finishes()[0]).toMatchObject({
    p_ok: false,
    p_meta: { usage: expect.anything(), outcome: "not_allowed" },
  });
});

test("RH12. 반응 허용은 `reactionAllowed`(20270119) — 나이 모름도 받되 미성년 규칙(로맨스 없음 · 출력 검사 · 13세 기준 프롬프트), 옛 DB는 `allowed`", async () => {
  let moderated = 0;
  const seen: { system: string; directive: string | null }[] = [];
  const base = saying(["@speech 수고했어! 푹 쉬어"], seen);
  const unknown = setup({
    context: context({ ageBand: "unknown", allowed: false, reactionAllowed: true }),
    llm: {
      ...base,
      moderate: async (request) => {
        moderated += 1;
        return base.moderate(request);
      },
    },
  });
  expect(await (await unknown.call()).json()).toMatchObject({ done: 1, failed: 0 });
  expect(moderated).toBe(1);
  expect(seen[0]!.system).toContain("may be a minor");
  expect(unknown.finishes()[0]).toMatchObject({
    p_ok: true,
    p_meta: { romanceTier: "standard", romanceLine: "none" },
  });
  // 선톡 허용이 참이어도 반응 허용이 거짓이면 막는다(US 미성년 · 나이 모름).
  const blocked = setup({ context: context({ allowed: true, reactionAllowed: false }) });
  expect(await (await blocked.call()).json()).toMatchObject({ done: 0, failed: 1 });
  expect(blocked.finishes()[0]).toMatchObject({ p_ok: false, p_meta: { outcome: "not_allowed" } });
  // 칸이 없는 옛 DB — 선톡 허용을 따른다.
  const old = setup({ context: context({ allowed: false }) });
  expect(await (await old.call()).json()).toMatchObject({ done: 0, failed: 1 });
});

test("RH6. 한 번에 12개까지 고르고, 시간 예산을 넘으면 남은 줄은 모델을 부르지 않고 failed로 끝낸다", async () => {
  expect(REACTION_BATCH).toBeLessThanOrEqual(12);
  expect(REACTION_BUDGET_MS).toBeLessThan(60_000); // 매분 돈다 — 다음 회차 전에 시작 판정을 끝낸다
  let clock = Date.parse("2026-11-23T10:00:00Z");
  const t = setup({
    claims: Array.from({ length: 6 }, (_, n) => claimed(n + 1)),
    // 맥락을 읽을 때마다 1분이 흐른다 — 예산 2분이면 둘까지만 시작한다.
    nowMs: () => clock,
    budgetMs: 120_000,
    concurrency: 1,
    llm: {
      ...saying(["@speech 야근 끝나면 라면 먹어!"]),
      async *reply() {
        clock += 60_000;
        yield "@speech 야근 끝나면 라면 먹어!\n";
      },
    },
  });
  expect(await (await t.call()).json()).toEqual({
    purged: 2,
    claimed: 6,
    done: 2,
    failed: 4,
    ...zero,
  });
  expect(t.count("companion_proactive_context")).toBe(2);
  expect(t.count("companion_finish_story_reaction")).toBe(6);
  expect(t.finishes().at(-1)).toMatchObject({ p_ok: false, p_meta: { outcome: "budget" } });
});

test("RH7. claim 결과의 사람 상한 건너뜀 · 대화 중 미룸 · 전체 상한 닿음을 결과 · 로그에 싣는다", async () => {
  const t = setup({ claims: [], skippedCap: 2, deferred: 3, globalCapped: true });
  expect(await (await t.call()).json()).toEqual({
    purged: 2,
    claimed: 0,
    done: 0,
    failed: 0,
    gone: 0,
    pushed: 0,
    skippedCap: 2,
    deferred: 3,
    globalCapped: true,
  });
  expect(t.logs.at(-1)?.outcome).toContain("skipped_cap=2 deferred=3 global_capped=true");
});

test("RH8. 그 사이 스토리를 지웠으면(saved: false) 저장되지 않은 것으로 세고 푸시도 없다", async () => {
  const t = setup({ saved: false, gate: { mode: "on", hasDevice: true, hasRoom: true } });
  expect(await (await t.call()).json()).toEqual({
    purged: 2,
    claimed: 1,
    done: 0,
    failed: 0,
    ...zero,
    gone: 1,
  });
  expect(t.count("companion_story_reaction_push_gate")).toBe(0);
  expect(t.sends).toEqual([]);
});

test("RH9. 푸시 — 스위치 on · 기기 · 방이 있으면 기록(묶음 「스토리 반응」)을 먼저 남기고 그 인물 방으로 보낸다", async () => {
  const t = setup({ gate: { mode: "on", tester: false, hasDevice: true, hasRoom: true } });
  expect(await (await t.call()).json()).toMatchObject({ done: 1, pushed: 1 });
  expect(t.sends.map((send) => send.url.replace("https://ref.supabase.co", ""))).toEqual([
    "/rest/v1/push_campaign_sends",
    "/functions/v1/send-push",
  ]);
  expect(t.sends[0]!.body).toEqual([
    expect.objectContaining({
      series: "스토리 반응",
      group: "sent",
      variant: "a",
      user_id: claimed(1).userId,
      character_id: "mina",
      title: "윤경",
      // 본문은 모국어 한 줄만(번역의 첫 말풍선) — 가짜 번역은 `[en] ` 머리를 붙인다.
      body: "[en] 야근 끝나면 라면 먹어! 내가 쏠게",
      lang: "en",
    }),
  ]);
  expect(t.sends[1]!.body).toMatchObject({
    audience: { userIds: [claimed(1).userId] },
    title: "윤경",
    body: "[en] 야근 끝나면 라면 먹어! 내가 쏠게",
    target: { kind: "companion-chat", characterId: "mina" },
  });
  for (const gate of [
    { mode: "testers", tester: false, hasDevice: true, hasRoom: true },
    { mode: "on", hasDevice: false, hasRoom: true },
    { mode: "on", hasDevice: true, hasRoom: false },
  ]) {
    const skipped = setup({ gate });
    expect(await (await skipped.call()).json()).toMatchObject({ done: 1, pushed: 0 });
    expect(skipped.sends).toEqual([]);
  }
});

test("RH10. 칩 스위치가 켜진 사람에게는 추천 답안 칩을 같이 저장한다(선톡과 같은 길)", async () => {
  const on = setup({
    context: context({ replySuggestions: true, suggestionsEnabled: true, suggestionDisplayMax: 2 }),
  });
  await on.call();
  expect(on.finishes()[0]).toMatchObject({
    p_suggestions: { version: 2, items: expect.any(Array) },
    p_meta: { suggestions: "ok" },
  });
  const off = setup({ context: context({ replySuggestions: false, suggestionDisplayMax: 2 }) });
  await off.call();
  expect(off.finishes()[0]).toMatchObject({ p_suggestions: null });
  expect(off.finishes()[0]!["p_meta"]).not.toHaveProperty("suggestions");
});

test("RH11. 푸시 본문 — 모국어 한 줄만 · 번역이 없거나 모국어가 한국어면 한국어 · 퀴즈 답이 번역에 새면 한국어", () => {
  const speech = (text: string, translation?: string) => ({
    kind: "speech" as const,
    text,
    ...(translation === undefined ? {} : { translation }),
  });
  const base = { lang: "en", word: "산책", angle: "word" as const };
  expect(
    reactionPushBody({
      ...base,
      segments: [{ kind: "action", text: "웃는다" }, speech("산책 좋죠!", "Walks are nice!")],
    }),
  ).toEqual({ body: "Walks are nice!", lang: "en" });
  expect(reactionPushBody({ ...base, segments: [speech("산책 좋죠!")] })).toEqual({
    body: "산책 좋죠!",
    lang: "ko",
  });
  expect(
    reactionPushBody({ ...base, lang: "ko", segments: [speech("산책 좋죠!", "산책 좋죠!")] }),
  ).toEqual({ body: "산책 좋죠!", lang: "ko" });
  expect(
    reactionPushBody({
      ...base,
      angle: "quiz",
      segments: [speech("퀴즈! a walk를 한국어로?", "Quiz! Is it 산책?")],
    }),
  ).toEqual({ body: "퀴즈! a walk를 한국어로?", lang: "ko" });
  expect(
    reactionPushBody({
      ...base,
      angle: "quiz",
      segments: [speech("퀴즈! a walk를 한국어로?", "Quiz! How do you say a walk in Korean?")],
    }),
  ).toEqual({ body: "Quiz! How do you say a walk in Korean?", lang: "en" });
  expect(reactionPushBody({ ...base, segments: [{ kind: "action", text: "웃는다" }] })).toBeNull();
});
