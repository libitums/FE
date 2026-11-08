// `POST /functions/v1/chat-send` — 턴 하나(API §2.1). 스트림 전 판정 1 ~ 12는 HTTP 오류, 그 뒤는 SSE 이벤트입니다.
//
// 흐름: 판정(gate) → 유저 메시지 저장(begin) → SSE 시작 → 입력 검사와 메인 답변을 **동시에** 시작 →
//   위기면 답을 버리고 `crisis`, 차단이면 `error` →
//   성인은 검사 통과 뒤 받는 대로 조각을 보내고, 미성년자 · 나이 모름은 답을 끝까지 받아 출력 검사를 통과한 뒤 보냄 →
//   `state` → 저장(finish) → `done`.
// 앱이 연결을 끊어도 턴은 끝까지 돌아 저장됩니다(`waitUntil`).
//
// 플레이그라운드 경로: `Authorization: Bearer <서버 키>` + `x-companion-user-id: <시험 계정 id>`. 서버 키를 가진 ops-dashboard만
// 쓸 수 있고, 판정은 같은 시험 계정 검사를 지납니다.

import type { BegunTurn, ChatSendDeps, GateResult, LearningContext } from "./chat-send.contract.ts";
import {
  callerUserId,
  createSink,
  errorResponse,
  preStreamCodes,
  readBody,
} from "./chat-send-http.ts";
import { runTurn, type TurnContext } from "./chat-send-turn.ts";
import type { PreStreamErrorCode } from "./companion-contract/index.ts";
import { callRpc } from "./companion-rpc.ts";

const historyLimit = 20;
const expressionLimit = 40;
const defaultPingIntervalMs = 15_000;

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
        p_daily_limit_seconds: env.dailyLimitSeconds,
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

    let turn: BegunTurn;
    let learning: LearningContext;
    try {
      [turn, learning] = await Promise.all([
        callRpc<BegunTurn>(deps.outbound, env, "companion_begin_turn", {
          p_user_id: caller.userId,
          p_character_id: body.character_id,
          p_client_message_id: body.client_message_id,
          p_text: body.text,
          p_input_mode: body.input_mode,
          p_history_limit: historyLimit,
        }),
        callRpc<LearningContext>(deps.outbound, env, "companion_learning_context", {
          p_user_id: caller.userId,
          p_limit: expressionLimit,
        }),
      ]);
    } catch {
      return respond(errorResponse("internal_error"), "begin_failed");
    }

    const sink = createSink(deps.pingIntervalMs ?? defaultPingIntervalMs);
    const context: TurnContext = {
      deps,
      env,
      llm,
      sink,
      body,
      gate: gate as Extract<GateResult, { result: "ok" }>,
      turn,
      learning,
      assistantMessageId: deps.randomUuid(),
      playground: caller.playground,
    };
    const work = runTurn(context)
      .catch(() => {
        sink.send({ event: "error", data: { code: "internal_error", retryable: true } });
        return "internal_error";
      })
      .then((outcome) => {
        sink.close();
        deps.log({ event: "chat_send", status: "stream", outcome });
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
