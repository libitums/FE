// `POST /functions/v1/companion-greet` — 대화가 비었을 때 캐릭터가 먼저 거는 첫 인사(새 대화 · 대화 초기화 뒤, Zeta의 첫 메시지처럼).
//
// 흐름: 판정(`companion_greet_context` — chat-send와 같은 판정) → 메시지가 이미 있으면 `none` → 답 모델로 인사(선톡과 같은 페르소나 시스템
// 프롬프트 + 인사 지시, 지난 대화 없음) → 출력 검사(연령과 상관없이 — 유저 말 없이 나가는 글) → L1 번역과 칩(스위치 켬)을 동시에 → 저장
// (`companion_save_greeting` — 대화 행을 잠그고 메시지가 없을 때만, 두 번 불려도 하나). 생성 실패 · 시간 초과 · 출력 검사 차단 · 검사 실패면
// 페르소나의 정해진 인사(`persona.greetingLines`, 없으면 아래 기본 줄) — 인사는 늘 나간다. 무료다(크레딧 · 체험 횟수를 쓰지 않는다).
//
// 호출자: 앱은 JWT + `{ character_id }`. ops-dashboard 플레이그라운드는 서버 키 + `{ user_id, character_id }`(`companion-suggest`와 같은 규칙).

import type { ChatSendDeps, PersonaCard, Segment } from "./chat-send.contract.ts";
import { startTranslation, withTranslations } from "./chat-send-translate.ts";
import { defaultSuggestionTimeoutMs } from "./chat-send-suggest.ts";
import {
  companionGreetRequestSchema,
  type CompanionGreetResponse,
  type GreetReason,
  type SpeechLevel,
} from "./companion-contract/index.ts";
import { systemSplit } from "./companion-llm.ts";
import { recentFeedbackHistory } from "./companion-llm-prompts.ts";
import { companionSystemPrompt, greetingDirective, greetingUserText } from "./companion-prompt.ts";
import { callRpc } from "./companion-rpc.ts";
import { collectSegments, createSegmentSplitter, segmentsToPlain } from "./companion-segments.ts";
import { generateSuggestions, type SuggestOutcome } from "./companion-suggest-generate.ts";
import { callerFor } from "./companion-suggest-handler.ts";
import { createUsageCollector, usageLine } from "./companion-usage.ts";
import { bearerTokenFrom } from "./supabase-auth.ts";

/** 인사 생성 · 출력 검사 각각의 제한 시간. 넘으면 정해진 인사. */
export const defaultGreetTimeoutMs = 15_000;

export type GreetLogEntry = {
  readonly event: "companion_greet";
  readonly status: number;
  readonly outcome?: string;
};

export type GreetDeps = Omit<ChatSendDeps, "log"> & {
  readonly log: (entry: GreetLogEntry) => void;
  readonly greetTimeoutMs?: number;
};

/** 페르소나 칸 `greetingLines`(마이그레이션 20261121) — 말투 단계별 정해진 첫 인사. 없는 칸은 아래 기본 줄. */
export type GreetingPersona = PersonaCard & {
  readonly greetingLines?: Partial<Record<SpeechLevel, string>>;
};

type GreetContext =
  | {
      readonly result: "ok";
      readonly ageBand: "adult" | "minor" | "unknown";
      readonly l1: string | null;
      readonly feedbackMode: "separate" | "natural" | "prefix";
      readonly replySuggestions: boolean;
      readonly persona: GreetingPersona | null;
      readonly speechLevel: SpeechLevel;
      readonly hasMessages: boolean;
      readonly memories: readonly string[];
    }
  | { readonly result: string };

const defaultLines: Record<SpeechLevel, string> = {
  polite: "안녕하세요! 만나서 반가워요. 오늘 하루는 어땠어요?",
  casual: "안녕! 만나서 반가워. 오늘 하루는 어땠어?",
  slang: "안녕! 반가워~ 오늘 어땠어?",
};

/** 정해진 첫 인사 — 페르소나의 그 말투 줄, 없으면 페르소나의 존댓말 줄, 그것도 없으면 기본 줄. */
export function cannedGreeting(persona: GreetingPersona, speechLevel: SpeechLevel): Segment[] {
  const lines = persona.greetingLines;
  return [
    { kind: "speech", text: lines?.[speechLevel] ?? lines?.polite ?? defaultLines[speechLevel] },
  ];
}

// 판정 결과 중 응답 이유로 그대로 쓰는 것. 나머지(모르는 새 코드)는 `not_available`로 접는다.
const gateReasons = new Set<string>([
  "not_available",
  "age_restricted",
  "temporarily_blocked",
  "usage_time_limit",
  "turn_in_progress",
]);

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...(status === 405 ? { Allow: "POST" } : {}),
    },
  });

const answer = (status: "none" | "unavailable", reason: GreetReason): CompanionGreetResponse => ({
  status,
  messageId: null,
  segments: [],
  suggestions: null,
  reason,
});

export function createGreetHandler(deps: GreetDeps): (request: Request) => Promise<Response> {
  return async (request) => {
    const respond = (status: number, body: unknown, outcome?: string) => {
      deps.log({ event: "companion_greet", status, ...(outcome === undefined ? {} : { outcome }) });
      return json(status, body);
    };

    if (request.method !== "POST") return respond(405, { error: "method_not_allowed" });
    const { env, llm: baseLlm } = deps;
    if (env === null || baseLlm === null) return respond(500, { error: "server_misconfigured" });
    const token = bearerTokenFrom(request.headers.get("authorization"));
    if (token === null) return respond(401, { error: "invalid_session" });

    let raw: unknown;
    try {
      raw = JSON.parse(await request.text());
    } catch {
      return respond(400, { error: "invalid_request" });
    }
    const parsed = companionGreetRequestSchema.safeParse(raw);
    if (!parsed.success) return respond(400, { error: "invalid_request" });
    const body = parsed.data;
    const caller = await callerFor(deps, env, token, body.user_id);
    if (caller === null) return respond(401, { error: "invalid_session" });

    const now = () => new Date(deps.nowMs()).toISOString();
    let context: GreetContext | null;
    try {
      context = await callRpc<GreetContext | null>(deps.outbound, env, "companion_greet_context", {
        p_user_id: caller.userId,
        p_character_id: body.character_id,
        p_now: now(),
      });
    } catch {
      return respond(500, { error: "internal_error" }, "context_failed");
    }
    if (context === null || context.result === "character_not_found")
      return respond(404, { error: "character_not_found" }, "character_not_found");
    if (context.result === "invalid_session") return respond(401, { error: "invalid_session" });
    if (context.result !== "ok" || !("hasMessages" in context)) {
      const reason = (
        gateReasons.has(context.result) ? context.result : "not_available"
      ) as GreetReason;
      return respond(200, answer("unavailable", reason), reason);
    }
    if (context.hasMessages) return respond(200, answer("none", "has_messages"), "has_messages");

    const usage = createUsageCollector();
    const llm = baseLlm.withUsage?.(usage.record) ?? baseLlm;
    const persona: GreetingPersona = context.persona ?? { name: body.character_id };
    const timeoutMs = deps.greetTimeoutMs ?? defaultGreetTimeoutMs;
    const prompt = companionSystemPrompt({
      persona,
      speechLevel: context.speechLevel,
      ageBand: context.ageBand,
      l1: context.l1,
      expressions: [],
      summary: null,
      feedbackMode: context.feedbackMode,
      memories: context.memories,
      directive: greetingDirective,
    });

    // 인사 만들기 + 출력 검사. 어느 단계든 실패하면 정해진 인사(검사를 지나지 않은 글은 내보내지 않는다).
    let segments: Segment[] = [];
    let source: "model" | "canned" = "model";
    let outcome = "model";
    try {
      const splitter = createSegmentSplitter();
      const deltas = [];
      for await (const chunk of llm.reply({
        system: `${prompt.stable}${systemSplit}${prompt.dynamic}`,
        history: [],
        userText: greetingUserText,
        signal: AbortSignal.timeout(timeoutMs),
      })) {
        deltas.push(...splitter.push(chunk));
      }
      deltas.push(...splitter.end());
      segments = collectSegments(deltas);
      if (segments.length === 0) outcome = "empty_reply";
      else {
        const verdict = await llm.moderate({
          layer: "output_sync",
          text: segmentsToPlain(segments),
          context: null,
          ageBand: context.ageBand,
          signal: AbortSignal.timeout(timeoutMs),
        });
        if (verdict.action !== "allow") outcome = "blocked";
      }
    } catch {
      outcome = "failed";
    }
    if (outcome !== "model") {
      source = "canned";
      segments = cannedGreeting(persona, context.speechLevel);
    }

    const messageId = deps.randomUuid();
    const budgetMs = deps.suggestionTimeoutMs ?? defaultSuggestionTimeoutMs;
    const [translated, chips] = await Promise.all([
      startTranslation(
        llm,
        env,
        { segments, l1: context.l1, timeoutMs: deps.translationTimeoutMs },
        AbortSignal.timeout(timeoutMs),
      ),
      context.replySuggestions
        ? generateSuggestions(llm, {
            request: {
              character: { name: persona.name, role: persona.role ?? null },
              speechLevel: context.speechLevel,
              l1: context.l1,
              history: recentFeedbackHistory([{ role: "assistant", segments }]),
            },
            ageBand: context.ageBand,
            timeoutMs: budgetMs,
            budgetMs,
          })
        : Promise.resolve(null),
    ]);
    const stored = withTranslations(segments, translated);
    const suggestions = suggestionsOf(messageId, chips);

    let saved: { saved: boolean };
    try {
      saved = await callRpc<{ saved: boolean }>(deps.outbound, env, "companion_save_greeting", {
        p_user_id: caller.userId,
        p_character_id: body.character_id,
        p_message_id: messageId,
        p_segments: stored,
        p_meta: {
          model: llm.model,
          ageBand: context.ageBand,
          greeting: source,
          ...(source === "canned" ? { greetingFallback: outcome } : {}),
          translation: translated.status,
          ...(chips === null ? {} : { suggestions: chips.status === "ok" ? "ok" : chips.outcome }),
          usage: usage.summary(),
          ...(caller.playground ? { playground: true } : {}),
        },
        p_suggestions:
          chips?.status === "ok"
            ? {
                items: chips.items,
                model: llm.model,
                createdAt: now(),
                ...(caller.playground ? { playground: true } : {}),
              }
            : null,
        p_now: now(),
      });
    } catch {
      return respond(500, { error: "internal_error" }, "save_failed");
    }
    // 만드는 사이 다른 호출이 인사를 저장했거나 유저가 먼저 말을 보냈다 — 이 인사는 버린다.
    if (!saved.saved) return respond(200, answer("none", "has_messages"), "raced");

    const line = usageLine(usage.summary());
    const response: CompanionGreetResponse = {
      status: "ok",
      messageId,
      segments: stored,
      source,
      suggestions,
    };
    return respond(200, response, `${outcome}${line === "" ? "" : ` usage ${line}`}`);
  };
}

/** 응답의 칩 — 스위치가 꺼져 있으면 null, 실패면 `unavailable`(앱은 `companion-suggest`로 다시 받을 수 있다). */
function suggestionsOf(
  messageId: string,
  chips: SuggestOutcome | null,
): CompanionGreetResponse["suggestions"] {
  if (chips === null) return null;
  if (chips.status === "ok") return { messageId, status: "ok", items: chips.items };
  return { messageId, status: "unavailable", items: [], reason: chips.reason };
}
