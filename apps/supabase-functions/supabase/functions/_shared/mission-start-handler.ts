// `POST /functions/v1/mission-start` — 롤플레이 미션 한 판을 시작합니다(ADR-0160, PRD §3.3 ①).
//
// 흐름: 인증(사용자 토큰, 또는 서버 키 + `x-companion-user-id`의 플레이그라운드 경로) → 본문(`missionStartRequestSchema`) →
//   `companion_mission_start`(판정 · 진행 중이던 판 그만둠 · 대화 행 · 판 단위 예약 · 진입 대사, 한 트랜잭션) → 계약의 응답.
// 거절은 1단계 관례대로 HTTP 상태 + `{ error, retryable, detail? }`(`mission-http.ts`). LLM은 부르지 않습니다.

import type { ChatSendDeps } from "./chat-send.contract.ts";
import { callerUserId } from "./chat-send-http.ts";
import {
  missionStartRequestSchema,
  type MissionDefinition,
  type MissionStartResponse,
} from "./companion-contract/index.ts";
import { callRpc } from "./companion-rpc.ts";
import {
  jsonResponse,
  missionErrorResponse,
  readMissionBody,
  rejectionResponse,
  type DbMissionState,
} from "./mission-http.ts";

/** `companion_mission_start`의 반환(정상). */
export type MissionStartRow = {
  readonly result: "ok";
  readonly conversationId: string;
  readonly mission: {
    readonly id: string;
    readonly version: number;
    readonly definition: MissionDefinition;
  };
  readonly state: DbMissionState;
  readonly openingMessageId: string;
  readonly opening: { readonly ko: string; readonly roman?: string; readonly en?: string };
  readonly payment: "free_daily" | "coins";
  readonly creditsReserved: number;
  readonly holdId: string | null;
  readonly freeRemaining: number;
  readonly balance: number | null;
  readonly abandoned: readonly string[];
};

type Rejection = { readonly result: string; readonly detail?: Record<string, unknown> };

export function startResponse(row: MissionStartRow): MissionStartResponse {
  const definition = row.mission.definition;
  return {
    conversationId: row.conversationId,
    missionId: row.mission.id,
    missionVersion: row.mission.version,
    title: definition.title,
    scene: definition.scene,
    counterpart: {
      label: definition.counterpart.label,
      characterId: definition.counterpart.characterId ?? null,
    },
    // 진입 대사의 학습자 언어 번역은 아직 없다 — 앱은 `en`을 쓴다(계약: null이면 en).
    opening: {
      messageId: row.openingMessageId,
      ko: row.opening.ko,
      roman: row.opening.roman ?? "",
      en: row.opening.en ?? "",
      translation: null,
    },
    goals: row.state.goals.map(({ id, required, label, done }) => ({ id, required, label, done })),
    turnLimit: row.state.turnLimit,
    turnsLeft: row.state.turnsLeft,
    hintsLeft: row.state.hintsLeft,
    charge: {
      source: row.payment === "free_daily" ? "free" : "credits",
      credits: row.creditsReserved,
    },
  };
}

export function createMissionStartHandler(
  deps: ChatSendDeps,
): (request: Request) => Promise<Response> {
  return async (request) => {
    const respond = (response: Response, outcome?: string) => {
      deps.log({
        event: "mission_start",
        status: response.status,
        ...(outcome === undefined ? {} : { outcome }),
      });
      return response;
    };
    if (request.method !== "POST") return respond(missionErrorResponse("method_not_allowed"));
    const { env } = deps;
    if (env === null) return respond(missionErrorResponse("server_misconfigured"));

    const caller = await callerUserId(deps, env, request);
    if (caller === null) return respond(missionErrorResponse("invalid_session"));
    const checked = await readMissionBody(request, missionStartRequestSchema);
    if (!checked.ok) return respond(checked.response);

    let row: MissionStartRow | Rejection;
    try {
      row = await callRpc<MissionStartRow | Rejection>(
        deps.outbound,
        env,
        "companion_mission_start",
        {
          p_user_id: caller.userId,
          p_mission_id: checked.body.mission_id,
          p_now: new Date(deps.nowMs()).toISOString(),
        },
      );
    } catch {
      return respond(missionErrorResponse("internal_error"), "start_failed");
    }
    if (row.result !== "ok") return respond(rejectionResponse(row), row.result);
    const started = row as MissionStartRow;
    return respond(
      jsonResponse(startResponse(started)),
      `ok ${started.mission.id} ${started.payment}${caller.playground ? " playground" : ""}`,
    );
  };
}
