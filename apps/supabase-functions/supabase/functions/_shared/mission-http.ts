// 미션 함수(`mission-start` · `mission-hint` · `mission-finish`)와 미션 턴의 HTTP 가장자리 — 오류 본문 · 본문 검사 · SQL 거절 코드의
// HTTP 변환 · 판 상태의 모양 바꾸기. 인증은 1단계 `callerUserId`(사용자 토큰, 또는 서버 키 + `x-companion-user-id`)를 그대로 씁니다.

import {
  MISSION_ERRORS,
  PRE_STREAM_ERRORS,
  SUPPORTED_CONTRACT_VERSIONS,
  type MissionErrorCode,
  type PreStreamErrorCode,
} from "./companion-contract/index.ts";
import type { MissionDefinition } from "./mission-definition.ts";
import type { MissionProgress } from "./mission-state.ts";

export type MissionHttpCode = PreStreamErrorCode | MissionErrorCode;

const table: Record<MissionHttpCode, { status: number; retryable: boolean }> = {
  ...PRE_STREAM_ERRORS,
  ...MISSION_ERRORS,
};

/** 오류 본문 — 1단계와 같은 `{ error, retryable, detail? }`. */
export function missionErrorResponse(
  code: MissionHttpCode,
  detail?: Record<string, unknown>,
): Response {
  const { status, retryable } = table[code];
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (code === "method_not_allowed") headers["Allow"] = "POST";
  return new Response(
    JSON.stringify(
      detail === undefined ? { error: code, retryable } : { error: code, retryable, detail },
    ),
    { status, headers },
  );
}

export const jsonResponse = (body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });

/** SQL의 거절(`{ result, detail? }`) → HTTP 오류. 모르는 코드는 `internal_error`. `not_ended`는 `mission_not_ended`. */
export function rejectionResponse(rejection: {
  readonly result: string;
  readonly detail?: Record<string, unknown>;
}): Response {
  const code = rejection.result === "not_ended" ? "mission_not_ended" : rejection.result;
  if (!(code in table)) return missionErrorResponse("internal_error");
  return missionErrorResponse(code as MissionHttpCode, rejection.detail);
}

type Parser<T> = {
  safeParse(
    raw: unknown,
  ):
    | { success: true; data: T }
    | { success: false; error: { issues: readonly { path: readonly PropertyKey[] }[] } };
};

/** 본문 JSON → 계약 스키마. 계약 판이 지원 밖이면 `unsupported_contract_version`(1단계 `readBody`와 같은 규칙). */
export async function readMissionBody<T>(
  request: Request,
  schema: Parser<T>,
): Promise<{ ok: true; body: T } | { ok: false; response: Response }> {
  let raw: unknown;
  try {
    raw = JSON.parse(await request.text());
  } catch {
    return { ok: false, response: missionErrorResponse("invalid_request", { field: "body" }) };
  }
  const version = (raw as { contract_version?: unknown } | null)?.contract_version;
  if (
    typeof version === "number" &&
    !(SUPPORTED_CONTRACT_VERSIONS as readonly number[]).includes(version)
  ) {
    return {
      ok: false,
      response: missionErrorResponse("unsupported_contract_version", {
        supported: [...SUPPORTED_CONTRACT_VERSIONS],
      }),
    };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const field = String(parsed.error.issues[0]?.path[0] ?? "body");
    return { ok: false, response: missionErrorResponse("invalid_request", { field }) };
  }
  return { ok: true, body: parsed.data };
}

// ------------------------------------------------------------------ 판 상태(DB) ↔ 코어

/** DB가 돌려주는 판 상태(`companion.mission_progress_json`). */
export type DbMissionState = {
  readonly status: "active" | "finished" | "abandoned";
  readonly endReason: string | null;
  readonly goals: readonly {
    readonly id: string;
    readonly required: boolean;
    readonly label: MissionDefinition["goals"][number]["label"];
    readonly done: boolean;
  }[];
  readonly turnsUsed: number;
  readonly turnLimit: number;
  readonly turnsLeft: number;
  readonly hintsUsed: number;
  readonly hintLimit: number;
  readonly hintsLeft: number;
  readonly offTask: number;
  readonly gradingFailed: boolean;
};

/** DB 상태 → 코어의 판 상태(`{ goalsDone, learnerTurns, hintsUsed }`). 목표는 미션 파일의 순서. */
export function progressFromDb(mission: MissionDefinition, state: DbMissionState): MissionProgress {
  const done = new Set(state.goals.filter((goal) => goal.done).map((goal) => goal.id));
  return {
    goalsDone: mission.goals.map((goal) => goal.id).filter((id) => done.has(id)),
    learnerTurns: state.turnsUsed,
    hintsUsed: state.hintsUsed,
  };
}
