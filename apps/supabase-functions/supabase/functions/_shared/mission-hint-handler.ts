// `POST /functions/v1/mission-hint` — 아직 못 이룬 목표 하나의 예시 문장 하나(ADR-0193, PRD §3.5).
//
// 흐름: 인증 → 본문(`missionHintRequestSchema`) → `companion_mission_take_hint`(상한 확인 · 힌트 수 +1 · 목표 고르기) →
//   힌트 프롬프트(`hintSystem` · `hintUser`) → `normalizeHint` → 계약의 응답.
// SQL은 힌트 수를 문장을 만들기 **전에** 센다(연달아 눌러 공짜로 여러 번 받지 않게). 그래서 만들기가 실패하면 503 `hint_unavailable`
// (다시 시도 가능)로 알리지만 그 힌트는 이미 센 것이다 — 남은 힌트 수가 하나 줄어 있다.

import type { ChatSendDeps, PersonaCard, Segment } from "./chat-send.contract.ts";
import { callerUserId } from "./chat-send-http.ts";
import { defaultLlmTimeoutMs, historyFrom } from "./chat-send-reply.ts";
import { missionHintRequestSchema, type MissionHintResponse } from "./companion-contract/index.ts";
import { callRpc } from "./companion-rpc.ts";
import { missionBrief, missionTranscript, transcriptFromHistory } from "./mission-context.ts";
import { validateMission } from "./mission-definition.ts";
import { chosenHintGoal, hintSchema, hintUser, normalizeHint } from "./mission-hint.ts";
import {
  jsonResponse,
  missionErrorResponse,
  readMissionBody,
  rejectionResponse,
  type DbMissionState,
} from "./mission-http.ts";

type Rejection = { readonly result: string; readonly detail?: Record<string, unknown> };

/** `companion_mission_take_hint`의 반환(정상). */
export type HintRow = {
  readonly result: "ok";
  readonly goalId: string;
  readonly state: DbMissionState;
  readonly mission: { readonly id: string; readonly version: number; readonly definition: unknown };
  readonly persona: PersonaCard | null;
  readonly l1: string | null;
  readonly history: readonly {
    role: "user" | "assistant";
    text: string | null;
    segments: readonly Segment[];
  }[];
};

export function createMissionHintHandler(
  deps: ChatSendDeps,
): (request: Request) => Promise<Response> {
  return async (request) => {
    const respond = (response: Response, outcome?: string) => {
      deps.log({
        event: "mission_hint",
        status: response.status,
        ...(outcome === undefined ? {} : { outcome }),
      });
      return response;
    };
    if (request.method !== "POST") return respond(missionErrorResponse("method_not_allowed"));
    const { env, llm } = deps;
    if (env === null || llm === null || llm.missionHint === undefined)
      return respond(missionErrorResponse("server_misconfigured"));
    const caller = await callerUserId(deps, env, request);
    if (caller === null) return respond(missionErrorResponse("invalid_session"));
    const checked = await readMissionBody(request, missionHintRequestSchema);
    if (!checked.ok) return respond(checked.response);

    let taken: HintRow | Rejection;
    try {
      taken = await callRpc<HintRow | Rejection>(
        deps.outbound,
        env,
        "companion_mission_take_hint",
        {
          p_user_id: caller.userId,
          p_conversation_id: checked.body.conversation_id,
        },
      );
    } catch {
      return respond(missionErrorResponse("internal_error"), "take_failed");
    }
    if (taken.result !== "ok") return respond(rejectionResponse(taken), taken.result);
    const row = taken as HintRow;
    const definition = validateMission(row.mission.definition);
    const goal = definition.ok
      ? definition.mission.goals.find((entry) => entry.id === row.goalId)
      : undefined;
    if (!definition.ok || goal === undefined)
      return respond(missionErrorResponse("internal_error"), "mission_definition_invalid");
    const mission = definition.mission;
    const history = historyFrom({ history: row.history });
    const goalsDone = row.state.goals.filter((entry) => entry.done).map((entry) => entry.id);
    const user = hintUser({
      mission,
      goal,
      brief: missionBrief(mission),
      transcript: missionTranscript(mission, transcriptFromHistory(history)),
      l1: row.l1,
      goalsDone,
    });
    let hint;
    try {
      const signal = AbortSignal.timeout(deps.llmTimeoutMs ?? defaultLlmTimeoutMs);
      hint = normalizeHint(hintSchema.parse(await llm.missionHint({ user, signal })));
    } catch {
      hint = null;
    }
    // 힌트 수는 이미 셌다(SQL) — 실패를 알리되 남은 수를 함께 준다.
    if (hint === null)
      return respond(
        missionErrorResponse("hint_unavailable", { hintsLeft: row.state.hintsLeft }),
        "generation_failed_counted",
      );
    // 모델이 고른 목표(상대역의 마지막 질문) — 열린 목표가 아니면 SQL이 고른 기본 목표. SQL의 hintGoals 기록은 기본 목표 그대로다.
    const chosen = chosenHintGoal(mission, goalsDone, goal, hint.goalId);
    // (음성) 예문을 남겨 `mission-tts`가 앱이 보낸 글이 아니라 이 글을 읽게 한다. 번호 = 이번까지 받은 힌트 수. 실패해도 힌트는 준다(번호 없이).
    const hintNo = row.state.hintsUsed;
    let saved = false;
    try {
      const result = await callRpc<{ result: string } | null>(
        deps.outbound,
        env,
        "companion_mission_save_hint",
        {
          p_user_id: caller.userId,
          p_conversation_id: checked.body.conversation_id,
          p_hint_no: hintNo,
          p_goal_id: chosen.id,
          p_ko: hint.ko,
        },
      );
      saved = result?.result === "ok";
    } catch {
      saved = false;
    }
    const body: MissionHintResponse = {
      goalId: chosen.id,
      ko: hint.ko,
      roman: hint.roman,
      meaning: hint.meaning,
      hintsLeft: row.state.hintsLeft,
      ...(saved ? { hintNo } : {}),
    };
    return respond(jsonResponse(body), `ok ${chosen.id}`);
  };
}
