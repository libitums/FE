// `POST /functions/v1/companion-proactive` — 선톡(PRD §3.8, API §2.3). 서버 키만 받는다(pg_cron · ops-dashboard).
//
// 본문 { user_id, character_id, force? } — 한 대화(플레이그라운드). `force`는 빈도 판정(유저 설정 off · 선호 시각 · 조용한 시간 · 하루 상한 ·
// 공백)을 모두 건너뛴다. 연령 · 지역 규칙은 건너뛰지 않는다.
// 본문 { batch: n } — 후보(`companion_proactive_candidates`)를 n개까지(예약 작업).
// 선톡은 유저 없이 나가므로 연령과 상관없이 출력 검사를 지난 것만 저장한다. 크레딧을 차감하지 않는다.
// ⚠ 푸시는 아직 보내지 않는다 — `send-push`에 컴패니언 목적지가 없다(API §2.3, M3 남은 일). 앱은 다음 조회 때 메시지 목록에서 본다.

import type { ChatSendDeps, HistoryEntry, PersonaCard, Segment } from "./chat-send.contract.ts";
import { startTranslation, withTranslations } from "./chat-send-translate.ts";
import { collectSegments, createSegmentSplitter, segmentsToPlain } from "./companion-segments.ts";
import { systemSplit } from "./companion-llm.ts";
import {
  companionSystemPrompt,
  proactiveDirective,
  proactiveUserText,
} from "./companion-prompt.ts";
import { callRpc, isServiceKey } from "./companion-rpc.ts";
import { bearerTokenFrom } from "./supabase-auth.ts";
import { createUsageCollector } from "./companion-usage.ts";

const historyLimit = 12;
const uuidShape = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type ProactiveContext = {
  persona: PersonaCard;
  speechLevel: "polite" | "casual" | "slang";
  summary: string | null;
  l1: string | null;
  ageBand: "adult" | "minor" | "unknown";
  hasConversation: boolean;
  allowed: boolean;
  capReached: boolean;
  /** 빈도 판정(20261115): off · quiet_hours · hour · daily_cap · gap · spacing, 보내도 되면 null. 이전 DB에는 없다. */
  skipReason?: string | null;
  memories: string[];
  history: { role: "user" | "assistant"; text: string | null; segments: Segment[] }[];
} | null;

type Target = { userId: string; characterId: string };
type Outcome = {
  userId: string;
  characterId: string;
  result: string;
  messageId?: string;
  segments?: Segment[];
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

async function proactiveOne(deps: ChatSendDeps, target: Target, force: boolean): Promise<Outcome> {
  const env = deps.env!;
  const usage = createUsageCollector();
  const llm = deps.llm!.withUsage?.(usage.record) ?? deps.llm!;
  const now = new Date(deps.nowMs()).toISOString();
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
  if (!context.allowed) return { ...target, result: "not_allowed_for_age" };
  // `force`(플레이그라운드)는 빈도 판정(설정 off · 시각 · 상한 · 공백)을 모두 건너뛴다 — 연령 · 지역은 위에서 이미 막았다.
  if (!force) {
    const skip =
      context.skipReason === undefined
        ? context.capReached
          ? "daily_cap"
          : null
        : context.skipReason;
    if (skip !== null) return { ...target, result: skip };
  }

  const prompt = companionSystemPrompt({
    persona: context.persona,
    speechLevel: context.speechLevel,
    ageBand: context.ageBand,
    l1: context.l1,
    expressions: [],
    summary: context.summary,
    feedbackMode: "separate",
    memories: context.memories,
    directive: proactiveDirective,
  });
  const history = context.history.flatMap((entry): HistoryEntry[] =>
    entry.role === "user"
      ? entry.text === null
        ? []
        : [{ role: "user", text: entry.text }]
      : [{ role: "assistant", segments: entry.segments.map(({ kind, text }) => ({ kind, text })) }],
  );
  const splitter = createSegmentSplitter();
  const deltas = [];
  for await (const chunk of llm.reply({
    system: `${prompt.stable}${systemSplit}${prompt.dynamic}`,
    history,
    userText: proactiveUserText,
    signal: AbortSignal.timeout(deps.llmTimeoutMs ?? 45_000),
  })) {
    deltas.push(...splitter.push(chunk));
  }
  deltas.push(...splitter.end());
  const segments = collectSegments(deltas);
  if (segments.length === 0) return { ...target, result: "empty_reply" };

  const verdict = await llm.moderate({
    layer: "output_sync",
    text: segmentsToPlain(segments),
    context: null,
    ageBand: context.ageBand,
    signal: AbortSignal.timeout(deps.llmTimeoutMs ?? 45_000),
  });
  if (verdict.action !== "allow") return { ...target, result: "blocked" };
  // 턴과 같이 L1 번역을 붙여 저장한다(이벤트가 없으니 메시지 목록으로만 보인다). 실패해도 번역 없이 보낸다.
  const translated = await startTranslation(
    llm,
    env,
    { segments, l1: context.l1, timeoutMs: deps.translationTimeoutMs },
    AbortSignal.timeout(deps.llmTimeoutMs ?? 45_000),
  );
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
      translation: translated.status,
      usage: usage.summary(),
    },
    p_now: now,
  });
  return { ...target, result: "sent", messageId, segments: stored };
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

    let targets: Target[];
    const force = body["force"] === true;
    if (typeof body["user_id"] === "string" && typeof body["character_id"] === "string") {
      if (!uuidShape.test(body["user_id"])) return json(400, { error: "invalid_request" });
      targets = [{ userId: body["user_id"], characterId: body["character_id"] }];
    } else {
      const batch =
        typeof body["batch"] === "number"
          ? Math.max(1, Math.min(50, Math.floor(body["batch"])))
          : 20;
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
