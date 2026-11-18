// `POST /functions/v1/companion-greet` — 대화가 비었을 때 캐릭터가 먼저 거는 첫 인사(새 대화 · 대화 초기화 뒤, Zeta의 첫 메시지처럼).
//
// 흐름: 판정(`companion_greet_context` — chat-send와 같은 판정) → 메시지가 이미 있으면 `none` → 인사 만들기 → L1 번역과 칩(스위치 켬)을
// 동시에 → 저장(`companion_save_greeting` — 대화 행을 잠그고 메시지가 없을 때만, 두 번 불려도 하나). 무료다(크레딧 · 체험 횟수를 쓰지 않는다).
// 인사 만들기는 둘이다.
// - 정해진 첫 말(ADR-0152): 인물이 해금된 순간 앱이 부르거나(`trigger: "unlock"`), 페르소나에 정해진 줄(`persona.unlockLines`)이 있다
//   (방을 열었는데 비어 있다 — 덕수쌤 · 해금 순간에 못 받은 인물). 그 줄을 그대로 쓴다. 답 모델 · 출력 검사를 부르지 않는다 — 글이
//   정해져 있어 검사할 것이 없다.
// - 그 밖(정해진 줄이 없는 인물의 빈 방): 답 모델로 인사(선톡과 같은 페르소나 시스템 프롬프트 + 인사 지시, 지난 대화 없음) → 출력 검사(연령과
//   상관없이 — 유저 말 없이 나가는 글). 생성 실패 · 시간 초과 · 출력 검사 차단 · 검사 실패면 페르소나의 정해진 인사
//   (`persona.greetingLines`, 없으면 아래 기본 줄) — 인사는 늘 나간다.
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
import { cannedGreeting, type GreetingPersona, unlockGreeting } from "./companion-greet-lines.ts";
import { greetingUserText } from "./companion-prompt.ts";
import { greetingSystem } from "./companion-greet-system.ts";
import { generateOpener, openerLearning, openerOutcome, recordOpener } from "./companion-opener.ts";
import { callRpc } from "./companion-rpc.ts";
import {
  generateSuggestions,
  type SuggestOutcome,
  suggestionRecord,
} from "./companion-suggest-generate.ts";
import { callerFor } from "./companion-suggest-handler.ts";
import { recentSuggestionHistory } from "./companion-suggest-prompts.ts";
import { defaultSuggestionDisplayMax } from "./companion-suggest-select.ts";
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

type GreetContext =
  | {
      readonly result: "ok";
      readonly ageBand: "adult" | "minor" | "unknown";
      /** 적용 로맨스 수위(20261213). 옛 DB는 칸이 없다 — standard. 칩은 수위를 바꾸지 않는다. */
      readonly romanceTier?: "open" | "standard";
      readonly l1: string | null;
      readonly feedbackMode: "separate" | "natural" | "prefix";
      readonly replySuggestions: boolean;
      /** 운영의 전체 끄기 · 보일 칩 수(20261122). 옛 DB에는 없다(켜짐 · 2). */
      readonly suggestionsEnabled?: boolean;
      readonly suggestionDisplayMax?: number;
      readonly persona: GreetingPersona | null;
      readonly speechLevel: SpeechLevel;
      readonly hasMessages: boolean;
      readonly memories: readonly string[];
    }
  | { readonly result: string };

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
    const scripted =
      body.trigger === "unlock" || (persona.unlockLines ?? []).some((line) => line.trim() !== "");
    const learning = scripted
      ? { pool: [], target: null, episodes: [] }
      : await openerLearning(deps.outbound, env, caller.userId, deps.random ?? Math.random);

    // 인사 만들기 + 출력 검사. 어느 단계든 실패하면 정해진 인사(검사를 지나지 않은 글은 내보내지 않는다). 해금 선톡은 만들지 않는다.
    const made = scripted
      ? { segments: [], state: null, outcome: "scripted" }
      : await generateOpener(llm, {
          system: greetingSystem(body.character_id, persona, context, learning),
          userText: greetingUserText,
          ageBand: context.ageBand,
          romanceTier: context.romanceTier,
          timeoutMs,
        });
    const { outcome } = made;
    const source: "model" | "canned" | "scripted" = scripted
      ? "scripted"
      : outcome === "model"
        ? "model"
        : "canned";
    const segments: Segment[] =
      source === "model"
        ? made.segments
        : source === "scripted"
          ? unlockGreeting(persona, context.speechLevel)
          : cannedGreeting(persona, context.speechLevel);
    const learned = openerOutcome(
      source === "model" ? learning.target : null,
      made.state,
      segments,
    );

    const messageId = deps.randomUuid();
    const budgetMs = deps.suggestionTimeoutMs ?? defaultSuggestionTimeoutMs;
    const displayMax = context.suggestionDisplayMax ?? defaultSuggestionDisplayMax;
    const chipsOn =
      context.replySuggestions && context.suggestionsEnabled !== false && displayMax > 0;
    const [translated, chips] = await Promise.all([
      startTranslation(
        llm,
        env,
        { segments, l1: context.l1, timeoutMs: deps.translationTimeoutMs, persona },
        AbortSignal.timeout(timeoutMs),
      ),
      chipsOn
        ? generateSuggestions(llm, {
            request: {
              character: { name: persona.name, role: persona.role ?? null },
              speechLevel: context.speechLevel,
              l1: context.l1,
              history: recentSuggestionHistory([{ role: "assistant", segments }]),
            },
            ageBand: context.ageBand,
            timeoutMs: budgetMs,
            budgetMs,
            displayMax,
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
          ...(chips === null
            ? {}
            : {
                suggestions: chips.status === "ok" ? "ok" : chips.outcome,
                suggestionsMs: chips.ms,
              }),
          usage: usage.summary(),
          ...(learned.meta === null ? {} : { learning: learned.meta }),
          ...(caller.playground ? { playground: true } : {}),
        },
        p_suggestions:
          chips?.status === "ok"
            ? suggestionRecord({
                items: chips.items,
                candidates: chips.candidates,
                ms: chips.ms,
                model: llm.model,
                createdAt: now(),
                playground: caller.playground,
              })
            : null,
        p_now: now(),
      });
    } catch {
      return respond(500, { error: "internal_error" }, "save_failed");
    }
    // 만드는 사이 다른 호출이 인사를 저장했거나 유저가 먼저 말을 보냈다 — 이 인사는 버린다.
    if (!saved.saved) return respond(200, answer("none", "has_messages"), "raced");
    await recordOpener(deps.outbound, env, caller.userId, learned.events, now());

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
