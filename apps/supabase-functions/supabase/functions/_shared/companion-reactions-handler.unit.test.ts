import { expect, test } from "vitest";

import type { ChatSendEnv, CompanionLlm } from "./chat-send.contract.ts";
import { fakeCompanionLlm } from "./companion-llm-fake.ts";
import {
  createReactionsHandler,
  REACTION_BATCH,
  type ReactionsLogEntry,
} from "./companion-reactions-handler.ts";
import type { OutboundRequest } from "./delete-account.contract.ts";

// 내 스토리 반응(ADR-0179): 서버 키 · POST만 → 정리 → claim(상한은 서버) → 사람마다 맥락 · 모델 · 단어 검사 · 번역 → 끝내기. 던지지 않는다.
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
function setup(options: {
  claims?: unknown[];
  skippedCap?: number;
  globalCapped?: boolean;
  context?: unknown;
  contextStatus?: number;
  llm?: CompanionLlm;
  failing?: string[];
  delayMs?: number;
}) {
  const rpcs: Rpc[] = [];
  const logs: ReactionsLogEntry[] = [];
  let inFlight = 0;
  let most = 0;
  const outbound = async (request: OutboundRequest) => {
    if (request.url.includes("/auth/v1/admin/users"))
      return {
        status: request.headers["apikey"] === serviceKey ? 200 : 401,
        text: async () => "{}",
      };
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
            globalCapped: options.globalCapped ?? false,
          }
        : fn === "companion_purge_my_stories"
          ? { deleted: 2 }
          : { updated: 1 };
    return { status: 200, text: async () => JSON.stringify(body) };
  };
  const handler = createReactionsHandler({
    env,
    outbound,
    llm: options.llm ?? saying(["@speech 야근 끝나면 라면 먹어! 내가 쏠게"]),
    nowMs: () => Date.parse("2026-11-23T10:00:00Z"),
    log: (entry) => logs.push(entry),
    translationTimeoutMs: 500,
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
  return { call, rpcs, logs, finishes, most: () => most };
}

test("RH1. 정리 → claim → 맥락 · 모델(지시에 단어) → 번역(올린 사람 언어) → 끝내기(done)", async () => {
  const seen: { system: string; directive: string | null }[] = [];
  const t = setup({ llm: saying(["@action 웃는다", "@speech 야근 끝나면 라면 먹어!"], seen) });
  const response = await t.call();
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({
    purged: 2,
    claimed: 1,
    done: 1,
    failed: 0,
    skippedCap: 0,
    globalCapped: false,
  });
  expect(t.rpcs.map((rpc) => rpc.fn)).toEqual([
    "companion_purge_my_stories",
    "companion_claim_story_reactions",
    "companion_proactive_context",
    "companion_finish_story_reaction",
  ]);
  expect(t.rpcs[1]!.args).toEqual({ p_now: "2026-11-23T10:00:00.000Z", p_limit: REACTION_BATCH });
  expect(t.rpcs[2]!.args).toMatchObject({ p_user_id: claimed(1).userId, p_character_id: "mina" });
  expect(seen[0]!.system).toContain('must use the word "야근"');
  const [finish] = t.finishes();
  expect(finish).toMatchObject({
    p_reaction_id: "r1",
    p_text: "야근 끝나면 라면 먹어!",
    p_ok: true,
    p_now: "2026-11-23T10:00:00.000Z",
  });
  expect(typeof finish!.p_meaning).toBe("string");
  expect(t.logs.at(-1)).toMatchObject({ event: "companion_story_reactions", status: 200 });
});

test("RH2. 단어가 없음 · 출력 검사 막힘 · 맥락 없음 · 나이 규칙 · 맥락 실패 · 모델 실패는 failed로 끝낸다", async () => {
  const cases: Parameters<typeof setup>[0][] = [
    { llm: saying(["@speech 수고했어! 푹 쉬어"]) },
    { llm: saying(["@speech 야근 [unsafe] 위험한 답"]) },
    { context: null },
    { context: context({ allowed: false }) },
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
      skippedCap: 0,
      globalCapped: false,
    });
    expect(t.finishes()).toEqual([expect.objectContaining({ p_reaction_id: "r1", p_ok: false })]);
  }
});

test("RH3. 서버 키만 · POST만, 정리 · claim이 실패해도 던지지 않고, 사람마다 동시에 넷까지", async () => {
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
    skippedCap: 0,
    globalCapped: false,
  });

  const many = setup({ claims: Array.from({ length: 9 }, (_, n) => claimed(n + 1)), delayMs: 2 });
  expect(await (await many.call()).json()).toEqual({
    purged: 2,
    claimed: 9,
    done: 9,
    failed: 0,
    skippedCap: 0,
    globalCapped: false,
  });
  expect(many.most()).toBeGreaterThan(1);
  expect(many.most()).toBeLessThanOrEqual(4);
  const invalid = setup({ claims: [{ reactionId: "x" }] });
  expect(await (await invalid.call()).json()).toEqual({
    purged: 2,
    claimed: 1,
    done: 0,
    failed: 1,
    skippedCap: 0,
    globalCapped: false,
  });
});

test("RH4. 단어가 없으면 출력 검사를 부르지 않고 끝낸다(호출 하나 아낌) — 단어가 있으면 검사한다", async () => {
  let moderated = 0;
  const counting = (lines: string[]): CompanionLlm => {
    const base = saying(lines);
    return {
      ...base,
      moderate: async (request) => {
        moderated += 1;
        return base.moderate(request);
      },
    };
  };
  await setup({ llm: counting(["@speech 수고했어! 푹 쉬어"]) }).call();
  expect(moderated).toBe(0);
  await setup({ llm: counting(["@speech 야근 끝나면 라면 먹어!"]) }).call();
  expect(moderated).toBe(1);
});

test("RH5. 끝내기에 사용량 요약(모델 · 토큰)을 meta로 싣는다 — 성공 · 실패 둘 다", async () => {
  const t = setup({});
  await t.call();
  expect(t.finishes()[0]).toMatchObject({ p_meta: { usage: expect.anything() } });
  const failed = setup({ llm: saying(["@speech 수고했어!"]) });
  await failed.call();
  expect(failed.finishes()[0]).toMatchObject({
    p_ok: false,
    p_meta: { usage: expect.anything() },
  });
});

test("RH6. 한 번에 12개까지 고르고, 시간 예산을 넘으면 남은 줄은 모델을 부르지 않고 failed로 끝낸다", async () => {
  expect(REACTION_BATCH).toBeLessThanOrEqual(12);
  let clock = Date.parse("2026-11-23T10:00:00Z");
  const claims = Array.from({ length: 6 }, (_, n) => claimed(n + 1));
  const rpcs: string[] = [];
  const handler = createReactionsHandler({
    env,
    outbound: async (request: OutboundRequest) => {
      if (request.url.includes("/auth/v1/admin/users"))
        return { status: 200, text: async () => "{}" };
      const fn = request.url.split("/rpc/")[1] ?? "";
      rpcs.push(fn);
      if (fn === "companion_proactive_context") {
        clock += 60_000; // 한 사람에 1분 — 예산 2분이면 둘까지만 시작한다
        return { status: 200, text: async () => JSON.stringify(context()) };
      }
      const body =
        fn === "companion_claim_story_reactions"
          ? { rows: claims, skippedCap: 0, globalCapped: false }
          : fn === "companion_purge_my_stories"
            ? { deleted: 0 }
            : { updated: 1 };
      return { status: 200, text: async () => JSON.stringify(body) };
    },
    llm: saying(["@speech 야근 끝나면 라면 먹어!"]),
    nowMs: () => clock,
    log: () => undefined,
    translationTimeoutMs: 500,
    budgetMs: 120_000,
    concurrency: 1,
  });
  const response = await handler(
    new Request("https://ref.supabase.co/functions/v1/companion-story-reactions", {
      method: "POST",
      headers: { Authorization: `Bearer ${serviceKey}` },
      body: "{}",
    }),
  );
  expect(await response.json()).toEqual({
    purged: 0,
    claimed: 6,
    done: 2,
    failed: 4,
    skippedCap: 0,
    globalCapped: false,
  });
  expect(rpcs.filter((fn) => fn === "companion_proactive_context")).toHaveLength(2);
  expect(rpcs.filter((fn) => fn === "companion_finish_story_reaction")).toHaveLength(6);
});

test("RH7. claim 결과의 사람 상한 건너뜀 수 · 전체 상한 닿음을 결과 · 로그에 싣는다(감사 A14)", async () => {
  const t = setup({ claims: [], skippedCap: 2, globalCapped: true });
  expect(await (await t.call()).json()).toEqual({
    purged: 2,
    claimed: 0,
    done: 0,
    failed: 0,
    skippedCap: 2,
    globalCapped: true,
  });
  expect(t.logs.at(-1)?.outcome).toContain("skipped_cap=2 global_capped=true");
});
