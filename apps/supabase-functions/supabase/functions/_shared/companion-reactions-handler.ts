// `POST /functions/v1/companion-story-reactions` — 내 스토리(단어 · 카드)에 친구가 다는 반응(ADR-0179). 서버 키만 받는다(pg_cron 10분마다).
//
// 1. 정리 `companion_purge_my_stories(now)` — 보관을 끈 사람의 24시간 지난 스토리(반응 cascade, 대화 인용은 「Deleted story」).
// 2. claim `companion_claim_story_reactions(now, limit)` — 때가 된 반응. 스위치(`story_reactions`) · 사람 하루 상한 · 전체 하루 상한은 서버가 본다.
//    상한은 claim 수로 센다 — 여기서 실패해도 비용은 쓴 것이다.
// 3. 사람마다(동시 넷까지): 선톡과 같은 맥락(`companion_proactive_context` — 페르소나 · 말투 · 연령 · 기억 · 최근 대화) → 반응 지시를 실은
//    시스템 프롬프트 → 답 + 출력 검사(`generateOpener`) → 말에 붙인 단어(어간)가 없으면 버림(다시 부르지 않음) → 올린 사람 언어로 번역 →
//    `companion_finish_story_reaction`. 한 사람의 실패는 그 줄만 failed. 던지지 않는다.

import type { ChatSendEnv, CompanionLlm, HistoryEntry } from "./chat-send.contract.ts";
import { startTranslation } from "./chat-send-translate.ts";
import { systemSplit } from "./companion-llm.ts";
import { generateOpener } from "./companion-opener.ts";
import type { ProactiveContext } from "./companion-proactive-context.ts";
import { companionSystemPrompt } from "./companion-prompt.ts";
import {
  includesWord,
  reactionDirective,
  reactionTextOf,
  reactionUserText,
  type ReactionStory,
} from "./companion-reaction-prompt.ts";
import { callRpc, isServiceKey } from "./companion-rpc.ts";
import { romanceLine } from "./companion-safety.ts";
import { createUsageCollector } from "./companion-usage.ts";
import type { Outbound } from "./delete-account.contract.ts";
import { mapLimited } from "./map-limited.ts";
import { bearerTokenFrom } from "./supabase-auth.ts";

/**
 * 한 번에 고르는 반응 수 — 10분마다 돌아 시간당 72까지(전체 상한이 먼저 막는다). 한 사람에 RPC 하나 + 모델 호출 셋(답 · 검사 · 번역, 각 최대
 * 30초)이라 동시 넷이면 세 묶음 — Edge Function 시간 한도(예약 150초) 안. 그래도 넘으면 시간 예산(`budgetMs`)이 남은 줄을 끝낸다.
 */
export const REACTION_BATCH = 12;
/** 이 시간이 지나면 남은 줄은 모델을 부르지 않고 failed로 끝낸다(claimed로 남지 않게). 남은 claimed는 서버가 30분 뒤 failed로 정리. */
export const REACTION_BUDGET_MS = 60_000; // 시작 판정만 하므로 마지막 줄(호출 셋)이 150초 한도 안에 끝나게(재리뷰 m-d)
/** 사람마다 동시에 — 한 사람에 모델 호출 셋(답 · 검사 · 번역). */
export const REACTION_CONCURRENCY = 4;
const historyLimit = 6;
const defaultLlmTimeoutMs = 30_000;

/** 이 함수의 기록 한 줄(대화 함수들의 `ChatSendLogEntry`와 같은 꼴). */
export type ReactionsLogEntry = {
  readonly event: "companion_story_reactions";
  readonly status: number;
  readonly outcome?: string;
};

export type ReactionsDeps = {
  readonly env: ChatSendEnv | null;
  readonly outbound: Outbound;
  readonly llm: CompanionLlm | null;
  readonly nowMs: () => number;
  readonly log: (entry: ReactionsLogEntry) => void;
  readonly llmTimeoutMs?: number;
  readonly translationTimeoutMs?: number;
  /** 시간 예산(테스트) — 없으면 `REACTION_BUDGET_MS`. */
  readonly budgetMs?: number;
  /** 동시에(테스트) — 없으면 `REACTION_CONCURRENCY`. */
  readonly concurrency?: number;
};

type Claimed = ReactionStory & {
  readonly reactionId: string;
  readonly userId: string;
  readonly characterId: string;
  readonly lang: string;
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const text = (value: unknown): string | null => (typeof value === "string" ? value : null);

function claimedOf(raw: unknown): Claimed | null {
  if (typeof raw !== "object" || raw === null) return null;
  const row = raw as Record<string, unknown>;
  const [reactionId, userId, characterId, ko, meaning, lang] = [
    text(row["reactionId"]),
    text(row["userId"]),
    text(row["characterId"]),
    text(row["ko"]),
    text(row["meaning"]),
    text(row["lang"]),
  ];
  if (reactionId === null || userId === null || characterId === null) return null;
  if (ko === null || ko.trim() === "" || meaning === null || lang === null) return null;
  return {
    reactionId,
    userId,
    characterId,
    kind: row["kind"] === "word" ? "word" : "card",
    ko,
    roman: text(row["roman"]) ?? "",
    meaning,
    exampleKo: text(row["exampleKo"]),
    lang,
  };
}

type Made =
  | { readonly ok: true; readonly text: string; readonly meaning: string | null }
  | { readonly ok: false; readonly outcome: string };

async function makeReaction(
  deps: ReactionsDeps,
  env: ChatSendEnv,
  claim: Claimed,
  now: string,
  usage: ReturnType<typeof createUsageCollector>,
): Promise<Made> {
  const context = await callRpc<ProactiveContext>(
    deps.outbound,
    env,
    "companion_proactive_context",
    {
      p_user_id: claim.userId,
      p_character_id: claim.characterId,
      p_history_limit: historyLimit,
      p_now: now,
    },
  );
  if (context === null || !context.allowed) return { ok: false, outcome: "not_allowed" };
  const llm = deps.llm!.withUsage?.(usage.record) ?? deps.llm!;
  const history = context.history.flatMap((entry): HistoryEntry[] =>
    entry.role === "user"
      ? entry.text === null
        ? []
        : [{ role: "user", text: entry.text }]
      : [{ role: "assistant", segments: entry.segments.map(({ kind, text }) => ({ kind, text })) }],
  );
  const prompt = companionSystemPrompt({
    persona: context.persona,
    speechLevel: context.speechLevel,
    ageBand: context.ageBand,
    romanceTier: context.romanceTier,
    l1: context.l1,
    expressions: [],
    summary: context.summary,
    feedbackMode: "separate",
    memories: context.memories,
    directive: reactionDirective(claim),
  });
  const timeoutMs = deps.llmTimeoutMs ?? defaultLlmTimeoutMs;
  const made = await generateOpener(llm, {
    system: `${prompt.stable}${systemSplit}${prompt.dynamic}`,
    history,
    userText: reactionUserText(claim),
    ageBand: context.ageBand,
    romanceLine: romanceLine(
      context.ageBand,
      context.romanceTier,
      context.persona,
      context.speechLevel,
    ),
    timeoutMs,
    // 단어가 없으면 출력 검사 전에 버린다 — 호출 하나를 아낀다(다시 부르지 않음).
    accept: (segments) => includesWord(reactionTextOf(segments), claim.ko),
  });
  if (made.outcome !== "model") return { ok: false, outcome: made.outcome };
  const said = reactionTextOf(made.segments);
  if (said === "") return { ok: false, outcome: "empty_reply" };
  const translated = await startTranslation(
    llm,
    env,
    {
      segments: [{ kind: "speech", text: said }],
      l1: claim.lang,
      timeoutMs: deps.translationTimeoutMs,
      persona: context.persona,
    },
    AbortSignal.timeout(timeoutMs),
  );
  const meaning = translated.status === "ok" ? translated.lines.join(" ").trim() || null : null;
  return { ok: true, text: said, meaning };
}

async function reactOne(
  deps: ReactionsDeps,
  env: ChatSendEnv,
  raw: unknown,
  now: string,
  overBudget: () => boolean,
): Promise<"done" | "failed"> {
  const claim = claimedOf(raw);
  const usage = createUsageCollector();
  let made: Made = { ok: false, outcome: "invalid" };
  if (claim !== null && overBudget()) made = { ok: false, outcome: "budget" };
  else if (claim !== null) {
    try {
      made = await makeReaction(deps, env, claim, now, usage);
    } catch {
      made = { ok: false, outcome: "failed" };
    }
  }
  const reactionId =
    claim?.reactionId ?? text((raw as Record<string, unknown> | null)?.["reactionId"]);
  if (reactionId !== null) {
    try {
      await callRpc(deps.outbound, env, "companion_finish_story_reaction", {
        p_reaction_id: reactionId,
        p_text: made.ok ? made.text : null,
        p_meaning: made.ok ? made.meaning : null,
        p_ok: made.ok,
        p_now: now,
        // 비용 근거(ADR-0179 D5) — 단계마다 모델 · 토큰. 실패도 쓴 만큼 남긴다.
        p_meta: { usage: usage.summary(), outcome: made.ok ? "done" : made.outcome },
      });
    } catch {
      deps.log({ event: "companion_story_reactions", status: 200, outcome: "finish_failed" });
    }
  }
  return made.ok ? "done" : "failed";
}

export function createReactionsHandler(
  deps: ReactionsDeps,
): (request: Request) => Promise<Response> {
  return async (request) => {
    if (request.method !== "POST") return json(405, { error: "method_not_allowed" });
    const env = deps.env;
    if (env === null || deps.llm === null) return json(500, { error: "server_misconfigured" });
    const token = bearerTokenFrom(request.headers.get("authorization"));
    if (token === null || !(await isServiceKey(deps.outbound, env, token)))
      return json(401, { error: "invalid_session" });
    const now = new Date(deps.nowMs()).toISOString();

    let purged = 0;
    try {
      const result = await callRpc<{ deleted?: unknown } | null>(
        deps.outbound,
        env,
        "companion_purge_my_stories",
        {
          p_now: now,
        },
      );
      purged = typeof result?.deleted === "number" ? result.deleted : 0;
    } catch {
      deps.log({ event: "companion_story_reactions", status: 200, outcome: "purge_failed" });
    }

    let rows: unknown[] = [];
    let skippedCap = 0;
    let globalCapped = false;
    try {
      const result = await callRpc<Record<string, unknown> | null>(
        deps.outbound,
        env,
        "companion_claim_story_reactions",
        {
          p_now: now,
          p_limit: REACTION_BATCH,
        },
      );
      // `{ rows, skippedCap, globalCapped }` — 사람 상한으로 건너뛴 수 · 전체 상한에 닿았는가(감사 A14).
      rows = Array.isArray(result?.["rows"]) ? (result["rows"] as unknown[]) : [];
      skippedCap = typeof result?.["skippedCap"] === "number" ? result["skippedCap"] : 0;
      globalCapped = result?.["globalCapped"] === true;
    } catch {
      deps.log({ event: "companion_story_reactions", status: 200, outcome: "claim_failed" });
    }

    const startedMs = deps.nowMs();
    const budgetMs = deps.budgetMs ?? REACTION_BUDGET_MS;
    const overBudget = () => deps.nowMs() - startedMs >= budgetMs;
    const results = await mapLimited(rows, deps.concurrency ?? REACTION_CONCURRENCY, (raw) =>
      reactOne(deps, env, raw, now, overBudget),
    );
    const body = {
      purged,
      claimed: rows.length,
      done: results.filter((result) => result === "done").length,
      failed: results.filter((result) => result === "failed").length,
      skippedCap,
      globalCapped,
    };
    deps.log({
      event: "companion_story_reactions",
      status: 200,
      outcome: `purged=${body.purged} done=${body.done}/${body.claimed} skipped_cap=${skippedCap} global_capped=${globalCapped}`,
    });
    return json(200, body);
  };
}
