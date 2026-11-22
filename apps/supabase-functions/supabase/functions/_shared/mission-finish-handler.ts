// `POST /functions/v1/mission-finish` — 판을 닫고 채점해 리포트를 돌려줍니다(ADR-0177, PRD §3.3 ③ · §3.6 · §3.7).
//
// 흐름: 인증 → 본문(`missionFinishRequestSchema`) → `companion_mission_close`의 네 결과:
//   (close는 필수 목표를 모두 이룬 진행 중인 판을 학습자의 끝내기로 보고 `finish`로 닫은 뒤 채점 재료를 준다)
//   graded(이미 채점됨) → 그대로 · abandoned(그만둠) → 그대로 · not_ended(필수를 못 이룸) → 409 `mission_not_ended` ·
//   grade(채점 재료) → 채점 호출(`graderSystem` · `graderUser`) → `normalizeGrade` → `companion_mission_save_result`(점수는 SQL이 계산).
// 채점 호출이 실패(시간 초과 · 거절 · 깨진 출력)하면 `companion_mission_grading_failed`로 값을 돌려주고 `grading_failed`(다시 시도할 수
// 있음)로 답합니다. 같은 요청을 다시 보내면 채점만 다시 돕니다 — 몇 번 불러도 같은 결과(채점이 있으면 그대로)입니다.

import type { ChatSendDeps } from "./chat-send.contract.ts";
import { callerUserId } from "./chat-send-http.ts";
import { defaultLlmTimeoutMs, historyFrom } from "./chat-send-reply.ts";
import {
  missionFinishRequestSchema,
  missionReportSchema,
  type MissionEndReason,
  type MissionFinishResponse,
  type MissionReport,
} from "./companion-contract/index.ts";
import { callRpc } from "./companion-rpc.ts";
import { missionBrief, missionTranscript, transcriptFromHistory } from "./mission-context.ts";
import { validateMission, type MissionDefinition } from "./mission-definition.ts";
import {
  graderSchema,
  graderUser,
  normalizeGrade,
  type MissionCorrection,
} from "./mission-grader.ts";
import {
  jsonResponse,
  missionErrorResponse,
  progressFromDb,
  readMissionBody,
  rejectionResponse,
  type DbMissionState,
} from "./mission-http.ts";
import type { MissionScoring } from "./mission-score.ts";
import type { Segment } from "./chat-send.contract.ts";

type Rejection = { readonly result: string; readonly detail?: Record<string, unknown> };

/** `companion_mission_close`의 `grade` 결과 — 채점 재료. */
export type GradeMaterial = {
  readonly result: "grade";
  readonly conversationId: string;
  readonly endReason: MissionEndReason;
  readonly mission: { readonly id: string; readonly version: number; readonly definition: unknown };
  readonly state: DbMissionState;
  readonly transcript: readonly {
    role: "user" | "assistant";
    text: string | null;
    segments: readonly Segment[];
  }[];
  readonly corrections: readonly {
    original?: string;
    corrected?: string | null;
    kind?: MissionCorrection["kind"];
  }[];
  readonly weights: { task: number; accuracy: number; expression: number; hintPenalty: number };
  readonly profile: { readonly l1: string | null; readonly ageBand: string };
};

type Graded = { readonly result: "graded"; readonly report: unknown };

/** 채점 재료 → 채점 호출의 user 글과 다듬기에 쓰는 값. */
export function graderRequest(material: GradeMaterial, mission: MissionDefinition) {
  const corrections: MissionCorrection[] = material.corrections
    .filter((entry) => typeof entry.original === "string" && typeof entry.corrected === "string")
    .map((entry) => ({
      original: entry.original as string,
      corrected: entry.corrected as string,
      kind: entry.kind ?? null,
    }));
  const history = historyFrom({ history: material.transcript });
  const progress = progressFromDb(mission, material.state);
  const user = graderUser({
    mission,
    brief: missionBrief(mission),
    transcript: missionTranscript(mission, transcriptFromHistory(history)),
    corrections,
    turnGoalsDone: progress.goalsDone,
    l1: material.profile.l1,
  });
  const scoring: MissionScoring = {
    weights: {
      task: Number(material.weights.task),
      accuracy: Number(material.weights.accuracy),
      expression: Number(material.weights.expression),
    },
    hintPenalty: Number(material.weights.hintPenalty),
  };
  return { user, progress, scoring };
}

/** SQL 리포트 → 계약의 리포트(모르는 칸은 버린다). 모양이 어긋나면 null. */
export function reportFrom(raw: unknown): MissionReport | null {
  const parsed = missionReportSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export function createMissionFinishHandler(
  deps: ChatSendDeps,
): (request: Request) => Promise<Response> {
  return async (request) => {
    const respond = (response: Response, outcome?: string) => {
      deps.log({
        event: "mission_finish",
        status: response.status,
        ...(outcome === undefined ? {} : { outcome }),
      });
      return response;
    };
    const graded = (raw: unknown, outcome: string) => {
      const report = reportFrom(raw);
      if (report === null) return respond(missionErrorResponse("internal_error"), "report_shape");
      const body: MissionFinishResponse = { status: "graded", report };
      return respond(jsonResponse(body), outcome);
    };
    if (request.method !== "POST") return respond(missionErrorResponse("method_not_allowed"));
    const { env, llm } = deps;
    if (env === null || llm === null) return respond(missionErrorResponse("server_misconfigured"));
    const caller = await callerUserId(deps, env, request);
    if (caller === null) return respond(missionErrorResponse("invalid_session"));
    const checked = await readMissionBody(request, missionFinishRequestSchema);
    if (!checked.ok) return respond(checked.response);
    const { conversation_id: conversationId, abandon } = checked.body;
    const rpc = <T>(fn: string, args: Record<string, unknown>) =>
      callRpc<T>(deps.outbound, env, fn, {
        p_user_id: caller.userId,
        p_conversation_id: conversationId,
        ...args,
      });
    const now = () => new Date(deps.nowMs()).toISOString();
    const abandoned = (outcome: string) => {
      const body: MissionFinishResponse = { status: "abandoned", conversationId };
      return respond(jsonResponse(body), outcome);
    };

    let closed: GradeMaterial | Graded | Rejection;
    try {
      closed = await rpc("companion_mission_close", { p_abandon: abandon === true, p_now: now() });
    } catch {
      return respond(missionErrorResponse("internal_error"), "close_failed");
    }
    if (closed.result === "graded") return graded((closed as Graded).report, "already_graded");
    if (closed.result === "abandoned") return abandoned("abandoned");
    if (closed.result !== "grade") return respond(rejectionResponse(closed), closed.result);
    const material = closed as GradeMaterial;
    const definition = validateMission(material.mission.definition);
    if (!definition.ok)
      return respond(missionErrorResponse("internal_error"), "mission_definition_invalid");
    const mission = definition.mission;
    if (llm.gradeMission === undefined)
      return respond(missionErrorResponse("server_misconfigured"), "no_grader");

    const { user, progress, scoring } = graderRequest(material, mission);
    let draft;
    try {
      const signal = AbortSignal.timeout(deps.llmTimeoutMs ?? defaultLlmTimeoutMs);
      // 구조화 출력이라도 받은 뒤 다시 확인한다 — 깨진 출력은 채점 실패로 친다.
      draft = graderSchema.parse(await llm.gradeMission({ user, signal }));
    } catch {
      let released: Rejection & { refunded?: number; payment?: string | null; report?: unknown };
      try {
        released = await rpc("companion_mission_grading_failed", { p_now: now() });
      } catch {
        return respond(missionErrorResponse("internal_error"), "grading_failed_release_failed");
      }
      if (released.result === "graded") return graded(released.report, "already_graded");
      if (released.result === "abandoned") return abandoned("abandoned");
      if (released.result !== "released")
        return respond(rejectionResponse(released), released.result);
      const body: MissionFinishResponse = {
        status: "grading_failed",
        conversationId,
        retryable: true,
        // 값을 돌려받았는가 — 엽전이든 하루 무료 횟수든. 이미 돌려준 판(다시 시도의 실패)이면 거짓.
        refunded: released.payment !== null && released.payment !== undefined,
      };
      return respond(jsonResponse(body), "grading_failed");
    }

    const grade = normalizeGrade(mission, draft, {
      turnGoalsDone: progress.goalsDone,
      hintsUsed: progress.hintsUsed,
      scoring,
    });
    // 채점자의 판정만 보낸다 — 턴에서 쌓인 것과의 합집합은 SQL이 한다(byTurn · byGrader를 따로 남긴다).
    const verdicts = new Map(draft.goals.map((goal) => [goal.id.trim(), goal]));
    const result = {
      goals: mission.goals.map((goal) => {
        const verdict = verdicts.get(goal.id);
        const achieved = verdict?.done === true;
        return {
          id: goal.id,
          achieved,
          evidence: achieved ? verdict?.evidence?.trim() || null : null,
        };
      }),
      accuracy: grade.score.accuracy,
      expressions: grade.expressions.map(({ id, used }) => ({ id, used })),
      retry: grade.retry,
      summary: grade.summary,
      graderModel: llm.graderModel ?? llm.model,
    };
    let saved: Graded | Rejection;
    try {
      saved = await rpc("companion_mission_save_result", {
        p_result: result,
        p_now: now(),
      });
    } catch {
      return respond(missionErrorResponse("internal_error"), "save_failed");
    }
    if (saved.result === "abandoned") return abandoned("abandoned");
    if (saved.result !== "graded") return respond(rejectionResponse(saved), saved.result);
    const report = reportFrom((saved as Graded).report);
    // 점수는 SQL이 계산한다 — 코어 식과 어긋나면 로그만 남긴다(실험실 번들의 식이 어긋났다는 신호).
    if (report !== null && report.totalScore !== grade.score.total)
      deps.log({ event: "mission_finish", status: 200, outcome: "score_mismatch" });
    return graded((saved as Graded).report, `graded ${report?.outcome ?? ""}`.trim());
  };
}
