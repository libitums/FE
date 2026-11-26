// `POST /functions/v1/companion-story-reactions` — 내 스토리(단어 · 카드)에 친구가 다는 반응(ADR-0191). 서버 키만 받는다(pg_cron 매분).
//
// 0. 사진 스토리의 뒷정리(`deps.upkeep` — 지운 사진 · 기한 지난 거절 파일 지우기, `checking` 스토리 다시 읽기. ADR-0191 D11).
// 1. 정리 `companion_purge_my_stories(now)` — 보관을 끈 사람의 24시간 지난 스토리(알람 · Seen cascade, 대화 인용은 「Deleted story」).
// 2. claim `companion_claim_story_reactions(now, limit)` — 때가 된 알람. 스위치(`story_reactions`) · 사람 하루 상한 · 전체 하루 상한 ·
//    「그 대화가 지금 도는 중」은 서버가 본다. 상한은 claim 수로 센다 — 여기서 실패해도 비용은 쓴 것이다.
// 3. 알람마다(동시 넷까지): 반응 만들기(`companion-reaction-make.ts` — 답 · 출력 검사 · 번역 · 칩) → `companion_finish_story_reaction`이
//    그 인물 방의 메시지(origin `story_reaction`)로 저장 → 저장됐으면 푸시(`companion-reaction-push.ts`).
//    그 사이 스토리를 지웠으면 저장되지 않는다(`saved: false`) — 푸시도 없다. 한 알람의 실패는 그 줄만 failed. 던지지 않는다.

import type { ChatSendEnv, CompanionLlm } from "./chat-send.contract.ts";
import { makeReaction, type MadeReaction, type ReactionClaim } from "./companion-reaction-make.ts";
import { REACTION_ANGLES, reactionQuizWord } from "./companion-reaction-prompt.ts";
import { storyTexts, storyWords } from "./companion-story-compose.ts";
import { pushReaction } from "./companion-reaction-push.ts";
import { callRpc, isServiceKey } from "./companion-rpc.ts";
import { createUsageCollector } from "./companion-usage.ts";
import type { Outbound } from "./delete-account.contract.ts";
import { mapLimited } from "./map-limited.ts";
import { bearerTokenFrom } from "./supabase-auth.ts";

/**
 * 한 번에 고르는 알람 수 — 매분 돌아 분당 12까지(전체 상한이 먼저 막는다). 알람 하나에 RPC 둘 + 모델 호출 넷(답 · 검사 · 번역 · 칩)이고
 * 동시 넷이면 세 묶음이다. 다음 회차와 겹치지 않게 시간 예산(`budgetMs`)이 남은 줄을 끝낸다.
 */
export const REACTION_BATCH = 12;
/** 이 시간이 지나면 남은 줄은 모델을 부르지 않고 failed로 끝낸다(claimed로 남지 않게). 남은 claimed는 서버가 30분 뒤 failed로 정리. */
export const REACTION_BUDGET_MS = 40_000;
/** 알람마다 동시에. */
export const REACTION_CONCURRENCY = 4;

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
  readonly randomUuid: () => string;
  readonly log: (entry: ReactionsLogEntry) => void;
  readonly llmTimeoutMs?: number;
  readonly translationTimeoutMs?: number;
  readonly suggestionTimeoutMs?: number;
  /** 사진 스토리의 뒷정리(`companion-story-upkeep.ts` — 파일 지우기 · 다시 읽기). 없으면 건너뛴다. 던지지 않아야 한다. */
  readonly upkeep?: (now: string) => Promise<unknown>;
  /** 시간 예산(테스트) — 없으면 `REACTION_BUDGET_MS`. */
  readonly budgetMs?: number;
  /** 동시에(테스트) — 없으면 `REACTION_CONCURRENCY`. */
  readonly concurrency?: number;
};

type Result = { readonly status: "done" | "failed" | "gone"; readonly push?: string };

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const text = (value: unknown): string | null => (typeof value === "string" ? value : null);

/** 먼저 단 다른 친구의 반응(ADR-0191 D16) — 모양이 틀리면 null. */
function friendReplyOf(raw: unknown): { name: string; text: string } | null {
  if (typeof raw !== "object" || raw === null) return null;
  const row = raw as Record<string, unknown>;
  const name = text(row["name"]);
  const said = text(row["text"]);
  return name === null || said === null || said.trim() === "" ? null : { name, text: said };
}

function claimOf(raw: unknown): ReactionClaim | null {
  if (typeof raw !== "object" || raw === null) return null;
  const row = raw as Record<string, unknown>;
  const [reactionId, userId, characterId, storyId, ko, meaning, lang] = [
    text(row["reactionId"]),
    text(row["userId"]),
    text(row["characterId"]),
    text(row["storyId"]),
    text(row["ko"]),
    text(row["meaning"]),
    text(row["lang"]),
  ];
  if (reactionId === null || userId === null || characterId === null || storyId === null)
    return null;
  const kind =
    row["kind"] === "word" || row["kind"] === "photo" || row["kind"] === "text"
      ? row["kind"]
      : "card";
  // 조합 스토리(ADR-0191 D15): 글(쓴 글 · 직접 쓴 얹은 글)과 배운 단어(얹은 단어 · 카드). 색 바탕은 쓴 글이 빌 수 있다.
  const texts = kind === "photo" || kind === "text" ? storyTexts(ko ?? "", row["overlays"]) : [];
  const words = kind === "photo" || kind === "text" ? storyWords(row["overlays"]) : [];
  if (ko === null || meaning === null || lang === null) return null;
  if (ko.trim() === "" && texts.length === 0 && words.length === 0) return null;
  return {
    reactionId,
    userId,
    characterId,
    storyId,
    kind,
    texts,
    words,
    friendReply: friendReplyOf(row["friendReply"]),
    scene: text(row["scene"]),
    hooks: Array.isArray(row["hooks"])
      ? row["hooks"].filter((hook): hook is string => typeof hook === "string")
      : [],
    ko,
    roman: text(row["roman"]) ?? "",
    meaning,
    exampleKo: text(row["exampleKo"]),
    // 모르는 각도(새 서버 · 옛 함수)는 `word`로 — 가장 안전한 기본이다.
    angle: REACTION_ANGLES.find((angle) => angle === row["angle"]) ?? "word",
    lang,
  };
}

async function reactOne(
  deps: ReactionsDeps,
  env: ChatSendEnv,
  raw: unknown,
  now: string,
  overBudget: () => boolean,
): Promise<Result> {
  const claim = claimOf(raw);
  const usage = createUsageCollector();
  let made: MadeReaction = { ok: false, outcome: "invalid" };
  if (claim !== null && overBudget()) made = { ok: false, outcome: "budget" };
  else if (claim !== null) {
    try {
      const llm = deps.llm!.withUsage?.(usage.record) ?? deps.llm!;
      made = await makeReaction(deps, env, llm, claim, now);
    } catch {
      made = { ok: false, outcome: "failed" };
    }
  }
  const reactionId =
    claim?.reactionId ?? text((raw as Record<string, unknown> | null)?.["reactionId"]);
  if (reactionId === null) return { status: "failed" };
  // 비용 근거 — 단계마다 모델 · 토큰. 실패도 쓴 만큼 남긴다.
  const meta = {
    ...(made.ok ? made.meta : {}),
    usage: usage.summary(),
    outcome: made.ok ? "done" : made.outcome,
  };
  let saved = false;
  try {
    const finished = await callRpc<{ saved?: unknown } | null>(
      deps.outbound,
      env,
      "companion_finish_story_reaction",
      {
        p_reaction_id: reactionId,
        p_ok: made.ok,
        p_now: now,
        p_message_id: made.ok ? deps.randomUuid() : null,
        p_segments: made.ok ? made.segments : null,
        p_meta: meta,
        p_suggestions: made.ok ? made.suggestions : null,
      },
    );
    saved = finished?.saved === true;
  } catch {
    deps.log({ event: "companion_story_reactions", status: 200, outcome: "finish_failed" });
    return { status: "failed" };
  }
  if (!made.ok) return { status: "failed" };
  // 만들었지만 저장되지 않음 — 그 사이 스토리를 지웠거나 방이 없다.
  if (!saved || claim === null) return { status: "gone" };
  const push = await pushReaction(deps.outbound, env, {
    userId: claim.userId,
    characterId: claim.characterId,
    name: made.name,
    segments: made.segments,
    lang: made.lang,
    word: reactionQuizWord(claim),
    angle: claim.angle,
    now,
  });
  return { status: "done", push };
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

    let upkeep: unknown = null;
    try {
      upkeep = (await deps.upkeep?.(now)) ?? null;
    } catch {
      deps.log({ event: "companion_story_reactions", status: 200, outcome: "upkeep_failed" });
    }

    let purged = 0;
    try {
      const result = await callRpc<{ deleted?: unknown } | null>(
        deps.outbound,
        env,
        "companion_purge_my_stories",
        { p_now: now },
      );
      purged = typeof result?.deleted === "number" ? result.deleted : 0;
    } catch {
      deps.log({ event: "companion_story_reactions", status: 200, outcome: "purge_failed" });
    }

    let rows: unknown[] = [];
    let skippedCap = 0;
    let deferred = 0;
    let globalCapped = false;
    try {
      const result = await callRpc<Record<string, unknown> | null>(
        deps.outbound,
        env,
        "companion_claim_story_reactions",
        { p_now: now, p_limit: REACTION_BATCH },
      );
      // `{ rows, skippedCap, deferred, globalCapped }` — 사람 상한으로 건너뛴 수 · 대화 중이라 미룬 수 · 전체 상한에 닿았는가.
      rows = Array.isArray(result?.["rows"]) ? (result["rows"] as unknown[]) : [];
      skippedCap = typeof result?.["skippedCap"] === "number" ? result["skippedCap"] : 0;
      deferred = typeof result?.["deferred"] === "number" ? result["deferred"] : 0;
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
    const count = (status: Result["status"]) =>
      results.filter((result) => result.status === status).length;
    const body = {
      purged,
      claimed: rows.length,
      done: count("done"),
      failed: count("failed"),
      gone: count("gone"),
      pushed: results.filter((result) => result.push === "sent").length,
      skippedCap,
      deferred,
      globalCapped,
      ...(upkeep === null ? {} : { upkeep }),
    };
    deps.log({
      event: "companion_story_reactions",
      status: 200,
      outcome:
        `purged=${body.purged} done=${body.done}/${body.claimed} gone=${body.gone} pushed=${body.pushed}` +
        ` skipped_cap=${skippedCap} deferred=${deferred} global_capped=${globalCapped}`,
    });
    return json(200, body);
  };
}
