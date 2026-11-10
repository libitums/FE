// `POST /functions/v1/companion-suggest` — 추천 답변 칩(학습자가 탭해서 보낼 다음 말 셋: 이어 가기 · 되묻기 · 리액션).
//
// 칩 스위치(`reply_suggestions`)가 켜져 있으면 `chat-send`가 캐릭터 답마다 칩을 만들어 SSE `suggestions`로 보내고 그 메시지에 저장합니다
// (`chat-send-suggest.ts`). 이 함수는 「다시 만들기」(`refresh: true`)와, 자동 생성이 `unavailable`이었거나 이벤트가 오지 않은 턴의 대체
// 경로입니다. 만든 칩은 마지막 캐릭터 메시지에 저장하고(`messages.suggestions`), 같은 메시지에 다시 부르면 모델을 부르지 않고 저장된 칩을
// 돌려줍니다 — 자동으로 만든 칩도 같은 자리라 그대로 돌려줍니다. 새 턴이 오면 마지막 메시지가 바뀌어 캐시가 저절로 무효가 됩니다.
//
// 호출자: 앱은 JWT + `{ character_id }`. ops-dashboard 플레이그라운드는 서버 키 + `{ user_id, character_id }`(`companion-proactive`와
// 같은 `isServiceKey` 규칙). 둘 다 `chat-send`와 같은 판정(시험 계정 · 티어 · 연령 · 일시 차단 · 이용 시간 · 진행 중인 턴)을 지납니다.
//
// ⚠ 무료입니다 — 크레딧을 차감하지 않습니다. 다시 만들기마다 모델 호출 한 번이라 남용되면 비용이 듭니다. 차감 · 하루 상한을
// 둘지는 정하지 않았습니다(열린 질문).

import type { ChatSendEnv } from "./chat-send.contract.ts";
import { historyFrom } from "./chat-send-reply.ts";
import {
  companionSuggestRequestSchema,
  type CompanionSuggestResponse,
  type SuggestReason,
} from "./companion-contract/index.ts";
import type { CompanionSuggestDeps, SuggestContext } from "./companion-suggest.contract.ts";
import { generateSuggestions, saveSuggestions } from "./companion-suggest-generate.ts";
import { recentFeedbackHistory } from "./companion-llm-prompts.ts";
import { authUserIdRequest, callRpc, isServiceKey } from "./companion-rpc.ts";
import { bearerTokenFrom } from "./supabase-auth.ts";

/** 맥락 메시지 수 — 피드백과 같은 6개(약 세 번 주고받기). */
const suggestHistoryLimit = 6;
export const defaultSuggestTimeoutMs = 8_000;
const uuidShape = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...(status === 405 ? { Allow: "POST" } : {}),
    },
  });

const answer = (
  status: CompanionSuggestResponse["status"],
  messageId: string | null,
  reason?: SuggestReason,
): CompanionSuggestResponse => ({
  status,
  messageId,
  items: [],
  cached: false,
  ...(reason === undefined ? {} : { reason }),
});

// 판정 결과 중 칩 응답의 이유로 그대로 쓰는 것입니다. 나머지(모르는 새 코드)는 `not_available`로 접습니다.
const gateReasons = new Set<string>([
  "not_available",
  "age_restricted",
  "temporarily_blocked",
  "usage_time_limit",
  "turn_in_progress",
]);

export type Caller = { userId: string; playground: boolean };

/** 서버 키 + 본문 `user_id`면 플레이그라운드, 아니면 앱 JWT. 앱 토큰으로 `user_id`를 보내면 거절합니다. `companion-greet`도 씁니다. */
export async function callerFor(
  deps: Pick<CompanionSuggestDeps, "outbound">,
  env: ChatSendEnv,
  token: string,
  bodyUserId: string | undefined,
): Promise<Caller | null> {
  if (bodyUserId !== undefined) {
    if (!uuidShape.test(bodyUserId) || !(await isServiceKey(deps.outbound, env, token)))
      return null;
    return { userId: bodyUserId.toLowerCase(), playground: true };
  }
  try {
    const response = await deps.outbound(authUserIdRequest(env, token));
    if (response.status !== 200) return null;
    const id = (JSON.parse(await response.text()) as { id?: unknown }).id;
    return typeof id === "string" && uuidShape.test(id) ? { userId: id, playground: false } : null;
  } catch {
    return null;
  }
}

export function createSuggestHandler(
  deps: CompanionSuggestDeps,
): (request: Request) => Promise<Response> {
  return async (request) => {
    const respond = (status: number, body: unknown, outcome?: string) => {
      deps.log({
        event: "companion_suggest",
        status,
        ...(outcome === undefined ? {} : { outcome }),
      });
      return json(status, body);
    };

    if (request.method !== "POST") return respond(405, { error: "method_not_allowed" });
    const { env, llm } = deps;
    if (env === null || llm === null) return respond(500, { error: "server_misconfigured" });
    const token = bearerTokenFrom(request.headers.get("authorization"));
    if (token === null) return respond(401, { error: "invalid_session" });

    let raw: unknown;
    try {
      raw = JSON.parse(await request.text());
    } catch {
      return respond(400, { error: "invalid_request" });
    }
    const parsed = companionSuggestRequestSchema.safeParse(raw);
    if (!parsed.success) return respond(400, { error: "invalid_request" });
    const body = parsed.data;

    const caller = await callerFor(deps, env, token, body.user_id);
    if (caller === null) return respond(401, { error: "invalid_session" });

    let context: SuggestContext | null;
    try {
      context = await callRpc<SuggestContext | null>(
        deps.outbound,
        env,
        "companion_suggest_context",
        {
          p_user_id: caller.userId,
          p_character_id: body.character_id,
          p_history_limit: suggestHistoryLimit,
          p_now: new Date(deps.nowMs()).toISOString(),
        },
      );
    } catch {
      return respond(500, { error: "internal_error" }, "context_failed");
    }
    if (context === null || context.result === "character_not_found")
      return respond(404, { error: "character_not_found" }, "character_not_found");
    if (context.result === "invalid_session") return respond(401, { error: "invalid_session" });
    if (context.result !== "ok" || !("latest" in context)) {
      const reason = (
        gateReasons.has(context.result) ? context.result : "not_available"
      ) as SuggestReason;
      return respond(200, answer("unavailable", null, reason), reason);
    }

    // 추천할 자리가 아니면 모델을 부르지 않습니다.
    const latest = context.latest;
    const none = (reason: SuggestReason) =>
      respond(200, answer("none", latest?.id ?? null, reason), reason);
    if (!context.replySuggestions) return none("suggestions_off");
    if (latest === null) return none("no_assistant_message");
    if (context.latestTurnBlocked) return none("latest_turn_blocked");
    if (latest.status === "crisis" || latest.origin === "crisis") return none("latest_turn_crisis");
    if (latest.refusal) return none("latest_turn_refusal");

    const stored = latest.suggestions?.items;
    if (body.refresh !== true && Array.isArray(stored) && stored.length === 3) {
      const response: CompanionSuggestResponse = {
        status: "ok",
        messageId: latest.id,
        items: [...stored],
        cached: true,
      };
      return respond(200, response, "cached");
    }

    const generated = await generateSuggestions(llm, {
      request: {
        character: { name: context.persona?.name ?? "", role: context.persona?.role ?? null },
        speechLevel: context.speechLevel,
        l1: context.l1,
        history: recentFeedbackHistory(historyFrom(context)),
      },
      ageBand: context.ageBand,
      timeoutMs: deps.suggestTimeoutMs ?? defaultSuggestTimeoutMs,
    });
    if (generated.status !== "ok") {
      const outcome = generated.outcome === "timeout" ? "generation_failed" : generated.outcome;
      return respond(200, answer("unavailable", latest.id, generated.reason), outcome);
    }
    const items = generated.items;

    const saved = await saveSuggestions(deps.outbound, env, {
      userId: caller.userId,
      messageId: latest.id,
      items,
      model: llm.model,
      createdAt: new Date(deps.nowMs()).toISOString(),
      playground: caller.playground,
    });
    // 저장 실패는 칩을 막지 않습니다 — 다음 탭에 다시 만들 뿐입니다.
    if (!saved) deps.log({ event: "companion_suggest", status: 200, outcome: "save_failed" });
    const response: CompanionSuggestResponse = {
      status: "ok",
      messageId: latest.id,
      items,
      cached: false,
    };
    return respond(200, response, "generated");
  };
}
