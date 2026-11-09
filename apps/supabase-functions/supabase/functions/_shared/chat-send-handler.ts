// `POST /functions/v1/chat-send` — 턴 하나(API §2.1). 스트림 전 판정 1 ~ 12는 HTTP 오류, 그 뒤는 SSE 이벤트입니다.
//
// 흐름: 판정(gate) → 체험 · 크레딧 예약과 유저 메시지 저장(begin, 한 트랜잭션) → SSE 시작 → 턴(`chat-send-turn.ts`) →
//   스트림을 닫은 뒤 추천 답변 칩 저장(만들었으면) → 턴 뒤 작업(기억 추출 · 요약, `companion-after-turn.ts`).
// 앱이 연결을 끊어도 턴과 뒤 작업은 끝까지 돕니다(`waitUntil`).
//
// 플레이그라운드 경로: `Authorization: Bearer <서버 키>` + `x-companion-user-id: <시험 계정 id>`. 서버 키를 가진 ops-dashboard만
// 쓸 수 있고, 판정은 같은 시험 계정 검사를 지납니다.

import type {
  BeginResult,
  ChatSendDeps,
  GateResult,
  LearningContext,
} from "./chat-send.contract.ts";
import type { TurnOutcome, TurnStatus } from "./chat-send-finish.ts";
import {
  callerUserId,
  createSink,
  errorResponse,
  preStreamCodes,
  readBody,
} from "./chat-send-http.ts";
import { runTurn, type TurnContext } from "./chat-send-turn.ts";
import { runAfterTurn } from "./companion-after-turn.ts";
import { saveSuggestions } from "./companion-suggest-generate.ts";
import type { PreStreamErrorCode } from "./companion-contract/index.ts";
import { callRpc } from "./companion-rpc.ts";

const historyLimit = 20;
const expressionLimit = 40;
const defaultPingIntervalMs = 15_000;
const afterTurnTimeoutMs = 30_000;

// ------------------------------------------------------------------ 핸들러

export function createChatSendHandler(deps: ChatSendDeps): (request: Request) => Promise<Response> {
  return async (request) => {
    const respond = (response: Response, outcome?: string) => {
      deps.log({
        event: "chat_send",
        status: response.status,
        ...(outcome === undefined ? {} : { outcome }),
      });
      return response;
    };

    if (request.method !== "POST") return respond(errorResponse("method_not_allowed"));
    const { env, llm } = deps;
    if (env === null || llm === null) return respond(errorResponse("server_misconfigured"));

    const caller = await callerUserId(deps, env, request);
    if (caller === null) return respond(errorResponse("invalid_session"));

    const checked = await readBody(request);
    if (!checked.ok) return respond(checked.response);
    const body = checked.body;

    let gate: GateResult;
    try {
      gate = await callRpc<GateResult>(deps.outbound, env, "companion_turn_gate", {
        p_user_id: caller.userId,
        p_character_id: body.character_id,
        p_client_message_id: body.client_message_id,
        p_now: new Date(deps.nowMs()).toISOString(),
        p_region: body.client_region ?? null,
      });
    } catch {
      return respond(errorResponse("internal_error"), "gate_failed");
    }
    if (gate.result !== "ok") {
      const code = preStreamCodes.has(gate.result)
        ? (gate.result as PreStreamErrorCode)
        : "internal_error";
      return respond(errorResponse(code, "detail" in gate ? gate.detail : undefined), code);
    }

    // 반복 위반 수 · 기억 가득 참(마이그레이션 20261117). 읽지 못해도 턴은 돈다 — 입력 차단이 지금처럼 `guardrail_blocked`로 끝날 뿐이다.
    const status = callRpc<TurnStatus | null>(deps.outbound, env, "companion_turn_status", {
      p_user_id: caller.userId,
      p_character_id: body.character_id,
      p_now: new Date(deps.nowMs()).toISOString(),
    })
      .then((value) => (typeof value?.strikes === "number" ? value : null))
      .catch(() => null);
    let begun: BeginResult;
    let learning: LearningContext;
    try {
      [begun, learning] = await Promise.all([
        callRpc<BeginResult>(deps.outbound, env, "companion_begin_turn", {
          p_user_id: caller.userId,
          p_character_id: body.character_id,
          p_client_message_id: body.client_message_id,
          p_text: body.text,
          p_input_mode: body.input_mode,
          p_history_limit: historyLimit,
          p_region: body.client_region ?? null,
          p_now: new Date(deps.nowMs()).toISOString(),
        }),
        callRpc<LearningContext>(deps.outbound, env, "companion_learning_context", {
          p_user_id: caller.userId,
          p_limit: expressionLimit,
        }),
      ]);
    } catch {
      return respond(errorResponse("internal_error"), "begin_failed");
    }
    // 판정 10 · 11(M4): 체험 한도 · 크레딧 부족이면 아무것도 저장하지 않고 402.
    if (begun.result !== "ok") {
      return respond(errorResponse(begun.result, begun.detail), begun.result);
    }
    const turn = begun;

    const sink = createSink(deps.pingIntervalMs ?? defaultPingIntervalMs);
    const context: TurnContext = {
      deps,
      env,
      llm,
      sink,
      body,
      userId: caller.userId,
      gate: gate as Extract<GateResult, { result: "ok" }>,
      turn,
      learning,
      status: await status,
      assistantMessageId: deps.randomUuid(),
      playground: caller.playground,
      historyLimit,
    };
    const work = runTurn(context)
      .catch((): TurnOutcome => {
        sink.send({ event: "error", data: { code: "internal_error", retryable: true } });
        return { outcome: "internal_error", afterTurn: null };
      })
      .then(async ({ outcome, afterTurn, suggestions }) => {
        sink.close();
        deps.log({ event: "chat_send", status: "stream", outcome });
        // 칩은 끝(finish)이 캐릭터 메시지를 만든 뒤에야 붙일 수 있다 — `done`을 늦추지 않게 스트림을 닫고 저장한다.
        if (suggestions) {
          const saved = await saveSuggestions(deps.outbound, env, {
            userId: caller.userId,
            messageId: context.assistantMessageId,
            items: suggestions,
            model: llm.model,
            createdAt: new Date(deps.nowMs()).toISOString(),
            playground: caller.playground,
          });
          if (!saved)
            deps.log({ event: "chat_send", status: "stream", outcome: "suggestions_save_failed" });
        }
        if (afterTurn === null) return;
        try {
          const result = await runAfterTurn(deps.outbound, env, llm, afterTurn, afterTurnTimeoutMs);
          deps.log({
            event: "companion_after_turn",
            status: "stream",
            outcome: `memories=${result.memories} evicted=${result.evicted} memory_full=${result.memoryFull} summarized=${result.summarized}`,
          });
        } catch {
          deps.log({ event: "companion_after_turn", status: "stream", outcome: "failed" });
        }
      });
    deps.waitUntil?.(work);

    return new Response(sink.stream, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no",
      },
    });
  };
}
