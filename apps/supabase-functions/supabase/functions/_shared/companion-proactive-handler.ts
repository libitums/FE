// `POST /functions/v1/companion-proactive` — 선톡(PRD §3.8, API §2.3). 서버 키만 받는다(pg_cron · ops-dashboard).
//
// 본문 { user_id, character_id, force? } — 한 대화(플레이그라운드). `force`는 빈도 판정(유저 설정 off · 선호 시각 · 조용한 시간 · 하루 상한 ·
// 공백 · 답 없는 선톡 상한 · 늘어난 공백)을 모두 건너뛰고, 막혔을 까닭은 결과의 `wouldSkip`으로 알려 준다. 연령 · 지역 규칙과, 유저가 한 번도
// 말하지 않은 대화(첫 인사만 있음 — `no_user_message`)는 건너뛰지 않는다.
// 본문 { batch: n } — 후보(`companion_proactive_candidates`)를 n개까지(예약 작업).
// 본문 { mode: "memory_flush", batch?: n } — 쉬는 대화의 기억 마저 뽑기(`companion-memory-flush.ts`, 예약 작업).
// 선톡은 유저 없이 나가므로 연령과 상관없이 출력 검사를 지난 것만 저장한다. 크레딧을 차감하지 않는다. 지시에는 지난 대화 뒤 며칠 · 현지
// 시간대 · 마지막 화제 · 최근 선톡 글(되풀이 금지) · 답 없는 선톡 수를 싣고, 칩 스위치가 켜져 있으면 칩도 붙인다(20261123).
// ⚠ 푸시는 아직 보내지 않는다 — `send-push`에 컴패니언 목적지가 없다(API §2.3, M3 남은 일). 앱은 다음 조회 때 메시지 목록에서 본다.

import type { ChatSendDeps, HistoryEntry, PersonaCard, Segment } from "./chat-send.contract.ts";
import { startTranslation, translationContext, withTranslations } from "./chat-send-translate.ts";
import { defaultSuggestionTimeoutMs, suggestionsMeta } from "./chat-send-suggest.ts";
import type { ReplySuggestion } from "./companion-contract/index.ts";
import { systemSplit } from "./companion-llm.ts";
import { flushIdleMemories } from "./companion-memory-flush.ts";
import {
  generateOpener,
  openerLearning,
  openerOutcome,
  recordOpener,
  withOpenerLine,
} from "./companion-opener.ts";
import {
  companionSystemPrompt,
  proactiveDirectiveFor,
  proactiveUserText,
  timeOfDay,
} from "./companion-prompt.ts";
import { callRpc, isServiceKey } from "./companion-rpc.ts";
import { generateSuggestions, suggestionRecord } from "./companion-suggest-generate.ts";
import type { ChoiceSet } from "./companion-suggest.contract.ts";
import { recentSuggestionHistory } from "./companion-suggest-prompts.ts";
import { bearerTokenFrom } from "./supabase-auth.ts";
import { createUsageCollector } from "./companion-usage.ts";

const historyLimit = 12;
const lastTopicLimit = 120;
const uuidShape = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type ProactiveContext = {
  persona: PersonaCard;
  speechLevel: "polite" | "casual" | "slang";
  summary: string | null;
  l1: string | null;
  ageBand: "adult" | "minor" | "unknown";
  hasConversation: boolean;
  /** 유저가 한 번이라도 말했는가(20261122). 첫 인사만 있는 대화에는 `force`여도 보내지 않는다. 옛 DB에는 없다. */
  hasUserMessage?: boolean;
  allowed: boolean;
  capReached: boolean;
  /** 빈도 판정(20261115 · 20261123): off · quiet_hours · hour · daily_cap · gap · spacing · unanswered_limit · backoff, 보내도 되면 null. */
  skipReason?: string | null;
  /** 선톡 맥락(20261123). 옛 DB에는 없다. */
  unanswered?: number;
  lastUserMessageAt?: string | null;
  localHour?: number | null;
  recentProactive?: string[];
  replySuggestions?: boolean;
  suggestionsEnabled?: boolean;
  suggestionDisplayMax?: number;
  recentChoiceSets?: ChoiceSet[];
  memories: string[];
  history: { role: "user" | "assistant"; text: string | null; segments: Segment[] }[];
} | null;

type Target = { userId: string; characterId: string };
type Outcome = {
  userId: string;
  characterId: string;
  result: string;
  /** `force`로 건너뛴 빈도 판정의 까닭(막히지 않았으면 없음). */
  wouldSkip?: string;
  messageId?: string;
  segments?: Segment[];
  suggestions?: ReplySuggestion[];
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

async function proactiveOne(deps: ChatSendDeps, target: Target, force: boolean): Promise<Outcome> {
  const env = deps.env!;
  const usage = createUsageCollector();
  const llm = deps.llm!.withUsage?.(usage.record) ?? deps.llm!;
  const nowMs = deps.nowMs();
  const now = new Date(nowMs).toISOString();
  const context = await callRpc<ProactiveContext>(
    deps.outbound,
    env,
    "companion_proactive_context",
    {
      p_user_id: target.userId,
      p_character_id: target.characterId,
      p_history_limit: historyLimit,
      p_now: now,
    },
  );
  if (context === null) return { ...target, result: "character_not_found" };
  if (!context.hasConversation) return { ...target, result: "no_conversation" };
  if (context.hasUserMessage === false) return { ...target, result: "no_user_message" };
  if (!context.allowed) return { ...target, result: "not_allowed_for_age" };
  const skip =
    context.skipReason === undefined
      ? context.capReached
        ? "daily_cap"
        : null
      : context.skipReason;
  // `force`(플레이그라운드)는 빈도 판정을 모두 건너뛴다 — 연령 · 지역은 위에서 이미 막았다.
  if (skip !== null && !force) return { ...target, result: skip };
  const wouldSkip = skip === null ? {} : { wouldSkip: skip };

  const history = context.history.flatMap((entry): HistoryEntry[] =>
    entry.role === "user"
      ? entry.text === null
        ? []
        : [{ role: "user", text: entry.text }]
      : [{ role: "assistant", segments: entry.segments.map(({ kind, text }) => ({ kind, text })) }],
  );
  const lastUser = [...history].reverse().find((entry) => entry.role === "user");
  const lastAt = context.lastUserMessageAt ? Date.parse(context.lastUserMessageAt) : NaN;
  const learning = await openerLearning(
    deps.outbound,
    env,
    target.userId,
    deps.random ?? Math.random,
  );
  const prompt = companionSystemPrompt({
    persona: context.persona,
    speechLevel: context.speechLevel,
    ageBand: context.ageBand,
    l1: context.l1,
    expressions: learning.pool,
    summary: context.summary,
    feedbackMode: "separate",
    memories: context.memories,
    directive: withOpenerLine(
      proactiveDirectiveFor({
        daysSince: Number.isNaN(lastAt) ? null : (nowMs - lastAt) / 86_400_000,
        timeOfDay: timeOfDay(context.localHour ?? null),
        lastTopic:
          lastUser?.role === "user" ? lastUser.text.trim().slice(0, lastTopicLimit) || null : null,
        recentOpeners: context.recentProactive ?? [],
        unanswered: context.unanswered ?? 0,
      }),
      learning.target,
    ),
  });
  const made = await generateOpener(llm, {
    system: `${prompt.stable}${systemSplit}${prompt.dynamic}`,
    history,
    userText: proactiveUserText,
    ageBand: context.ageBand,
    timeoutMs: deps.llmTimeoutMs ?? 45_000,
  });
  if (made.outcome !== "model") return { ...target, ...wouldSkip, result: made.outcome };
  const segments = made.segments;
  const learned = openerOutcome(learning.target, made.state, segments);
  // 턴과 같이 L1 번역을 붙여 저장한다(이벤트가 없으니 메시지 목록으로만 보인다). 실패해도 번역 없이 보낸다.
  // 칩 스위치가 켜져 있으면 칩도 같이 만든다(첫 인사와 같은 길). 옛 DB(스위치 칸 없음)면 만들지 않는다.
  const displayMax = context.suggestionDisplayMax ?? 0;
  const chipsOn =
    context.replySuggestions === true && context.suggestionsEnabled !== false && displayMax > 0;
  const budgetMs = deps.suggestionTimeoutMs ?? defaultSuggestionTimeoutMs;
  const [translated, chips] = await Promise.all([
    startTranslation(
      llm,
      env,
      {
        segments,
        l1: context.l1,
        timeoutMs: deps.translationTimeoutMs,
        context: translationContext(history),
        persona: context.persona,
      },
      AbortSignal.timeout(deps.llmTimeoutMs ?? 45_000),
    ),
    chipsOn
      ? generateSuggestions(llm, {
          request: {
            character: { name: context.persona.name, role: context.persona.role ?? null },
            speechLevel: context.speechLevel,
            l1: context.l1,
            history: recentSuggestionHistory([...history, { role: "assistant", segments }]),
            summary: context.summary,
            recentChoiceSets: context.recentChoiceSets ?? [],
          },
          ageBand: context.ageBand,
          timeoutMs: budgetMs,
          budgetMs,
          displayMax,
        })
      : Promise.resolve(null),
  ]);
  const stored = withTranslations(segments, translated);

  const messageId = deps.randomUuid();
  await callRpc(deps.outbound, env, "companion_save_proactive", {
    p_user_id: target.userId,
    p_character_id: target.characterId,
    p_message_id: messageId,
    p_segments: stored,
    p_meta: {
      model: llm.model,
      forced: force,
      ...wouldSkip,
      ...(force ? { playground: true } : {}),
      translation: translated.status,
      ...suggestionsMeta(chips),
      usage: usage.summary(),
      ...(learned.meta === null ? {} : { learning: learned.meta }),
    },
    p_now: now,
    ...(chips?.status === "ok"
      ? {
          p_suggestions: suggestionRecord({
            items: chips.items,
            candidates: chips.candidates,
            ms: chips.ms,
            model: llm.model,
            createdAt: now,
            playground: force,
          }),
        }
      : {}),
  });
  await recordOpener(deps.outbound, env, target.userId, learned.events, now);
  return {
    ...target,
    ...wouldSkip,
    result: "sent",
    messageId,
    segments: stored,
    ...(chips?.status === "ok" ? { suggestions: chips.items } : {}),
  };
}

export function createProactiveHandler(
  deps: ChatSendDeps,
): (request: Request) => Promise<Response> {
  return async (request) => {
    if (request.method !== "POST") return json(405, { error: "method_not_allowed" });
    if (deps.env === null || deps.llm === null) return json(500, { error: "server_misconfigured" });
    const token = bearerTokenFrom(request.headers.get("authorization"));
    if (token === null || !(await isServiceKey(deps.outbound, deps.env, token)))
      return json(401, { error: "invalid_session" });

    let body: Record<string, unknown>;
    try {
      body = JSON.parse(await request.text()) as Record<string, unknown>;
    } catch {
      return json(400, { error: "invalid_request" });
    }
    const batch =
      typeof body["batch"] === "number" ? Math.max(1, Math.min(50, Math.floor(body["batch"]))) : 20;

    if (body["mode"] === "memory_flush") {
      const outcomes = await flushIdleMemories(deps, batch);
      deps.log({
        event: "companion_memory_flush",
        status: 200,
        outcome: `extracted=${outcomes.filter((o) => o.result === "extracted").length}/${outcomes.length}`,
      });
      return json(200, { processed: outcomes.length, outcomes });
    }

    let targets: Target[];
    const force = body["force"] === true;
    if (typeof body["user_id"] === "string" && typeof body["character_id"] === "string") {
      if (!uuidShape.test(body["user_id"])) return json(400, { error: "invalid_request" });
      targets = [{ userId: body["user_id"], characterId: body["character_id"] }];
    } else {
      targets = await callRpc<Target[]>(deps.outbound, deps.env, "companion_proactive_candidates", {
        p_now: new Date(deps.nowMs()).toISOString(),
        p_limit: batch,
      });
    }

    const outcomes: Outcome[] = [];
    for (const target of targets) {
      try {
        outcomes.push(await proactiveOne(deps, target, force && targets.length === 1));
      } catch {
        outcomes.push({ ...target, result: "failed" });
      }
    }
    deps.log({
      event: "companion_proactive",
      status: 200,
      outcome: `sent=${outcomes.filter((o) => o.result === "sent").length}/${outcomes.length}`,
    });
    return json(200, { processed: outcomes.length, outcomes });
  };
}
