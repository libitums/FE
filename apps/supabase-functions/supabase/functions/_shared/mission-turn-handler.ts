// `chat-send`의 미션 갈래(ADR-0176, PRD §3.3 ② · §3.4) — 본문에 `conversation_id`가 있으면 핸들러가 이리로 보냅니다.
//
// 흐름: 인증(1단계와 같음) → 본문(`missionTurnRequestSchema`) → `companion_mission_begin_turn`(판 확인 · 중복 · 계정 단위 판정 ·
//   학습자 메시지 저장 · 프롬프트 재료, 차감 없음) → SSE 시작 → 턴(`mission-turn.ts`) → 로그 한 줄.
// 판정 · 시작이 막히면 스트림 전 HTTP 오류(`mission-http.ts`). 앱이 끊어도 턴은 끝까지 돕니다(`waitUntil`).

import type { ChatSendDeps } from "./chat-send.contract.ts";
import { callerUserId, createSink } from "./chat-send-http.ts";
import { missionTurnRequestSchema, type MissionTurnRequest } from "./companion-contract/index.ts";
import { callRpc } from "./companion-rpc.ts";
import { createUsageCollector, usageLine } from "./companion-usage.ts";
import { validateMission } from "./mission-definition.ts";
import {
  missionErrorResponse,
  progressFromDb,
  readMissionBody,
  rejectionResponse,
} from "./mission-http.ts";
import { runMissionTurn, type MissionTurnContext } from "./mission-turn.ts";
import type { MissionBeginRow } from "./mission-turn-row.ts";

const defaultPingIntervalMs = 15_000;

type Rejection = { readonly result: string; readonly detail?: Record<string, unknown> };

/** 본문에 `conversation_id`가 있는가 — 미션 턴의 갈림. 본문을 소비하지 않게 복사본을 읽는다. 읽지 못하면 컴패니언 쪽이 오류를 낸다. */
export async function isMissionTurnRequest(request: Request): Promise<boolean> {
  if (request.method !== "POST") return false;
  try {
    const raw = JSON.parse(await request.clone().text()) as Record<string, unknown> | null;
    return typeof raw === "object" && raw !== null && raw["conversation_id"] !== undefined;
  } catch {
    return false;
  }
}

export async function handleMissionTurn(deps: ChatSendDeps, request: Request): Promise<Response> {
  const respond = (response: Response, outcome: string) => {
    deps.log({ event: "chat_send", status: response.status, outcome: `mission ${outcome}` });
    return response;
  };
  const { env, llm } = deps;
  if (env === null || llm === null)
    return respond(missionErrorResponse("server_misconfigured"), "server_misconfigured");
  const caller = await callerUserId(deps, env, request);
  if (caller === null) return respond(missionErrorResponse("invalid_session"), "invalid_session");
  const checked = await readMissionBody<MissionTurnRequest>(request, missionTurnRequestSchema);
  if (!checked.ok) return respond(checked.response, "invalid_request");
  const body = checked.body;

  let begun: MissionBeginRow | Rejection;
  try {
    begun = await callRpc<MissionBeginRow | Rejection>(
      deps.outbound,
      env,
      "companion_mission_begin_turn",
      {
        p_user_id: caller.userId,
        p_conversation_id: body.conversation_id,
        p_client_message_id: body.client_message_id,
        p_text: body.text,
        p_input_mode: body.input_mode,
        p_now: new Date(deps.nowMs()).toISOString(),
      },
    );
  } catch {
    return respond(missionErrorResponse("internal_error"), "begin_failed");
  }
  if (begun.result !== "ok") return respond(rejectionResponse(begun), begun.result);
  const row = begun as MissionBeginRow;
  // 판의 정의는 미션 파일 그대로여야 한다(스크립트가 검증해 올린다). 어긋나면 프롬프트를 만들 수 없다.
  const definition = validateMission(row.mission.definition);
  if (!definition.ok)
    return respond(missionErrorResponse("internal_error"), "mission_definition_invalid");

  const sink = createSink(deps.pingIntervalMs ?? defaultPingIntervalMs);
  const usage = createUsageCollector();
  const context: MissionTurnContext = {
    deps,
    env,
    // 미션 턴은 답 · 교정이 미션 모델인 계층(`missionTurn`)을 쓴다. 가짜 계층은 그대로.
    llm: (llm.missionTurn ?? llm).withUsage?.(usage.record) ?? llm.missionTurn ?? llm,
    sink,
    body,
    userId: caller.userId,
    row,
    mission: definition.mission,
    progress: progressFromDb(definition.mission, row.state),
    assistantMessageId: deps.randomUuid(),
    playground: caller.playground,
    usage,
  };
  const work = runMissionTurn(context)
    .catch(() => {
      sink.send({ event: "error", data: { code: "internal_error", retryable: true } });
      return "internal_error";
    })
    .then((outcome) => {
      sink.close();
      const line = usageLine(usage.summary());
      deps.log({
        event: "chat_send",
        status: "stream",
        outcome: `mission ${outcome}${line === "" ? "" : ` usage ${line}`}`,
      });
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
}
