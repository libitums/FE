// 미션 음성 두 함수(`mission-stt` · `mission-tts`)의 공용 가장자리 — 의존성 · 오류 본문 · 호출 기록 RPC(`companion_mission_voice_begin` ·
// `_finish`) · 구조화 로그. 인증은 1단계 `callerUserId`(사용자 토큰, 또는 서버 키 + `x-companion-user-id`)를 그대로 씁니다.

import {
  MISSION_ERRORS,
  MISSION_VOICE_ERRORS,
  PRE_STREAM_ERRORS,
  type MissionErrorCode,
  type MissionVoiceErrorCode,
  type PreStreamErrorCode,
} from "./companion-contract/index.ts";
import type { Fetch } from "./companion-media-engines.ts";
import { callRpc } from "./companion-rpc.ts";
import type { Outbound } from "./delete-account.contract.ts";
import type { MissionVoiceEnv } from "./mission-voice-env.ts";

export type MissionVoiceLog = {
  readonly event: "mission_stt" | "mission_tts";
  readonly status: number;
  readonly outcome?: string;
  /** 원가 추적용(같은 값이 `companion.mission_voice_calls`에도 남는다). */
  readonly seconds?: number;
  readonly chars?: number;
  readonly vendorMs?: number;
  readonly cached?: boolean;
};

export type MissionVoiceDeps = {
  readonly env: MissionVoiceEnv | null;
  /** Supabase REST(RPC) · Auth. */
  readonly outbound: Outbound;
  /** ElevenLabs · Storage(바이너리 · multipart라 `fetch` 그대로). 테스트는 가짜를 넣는다. */
  readonly fetch: Fetch;
  readonly nowMs: () => number;
  /** 응답 뒤 기록(`_finish`)을 끝까지 돌게 런타임에 알린다. 없으면 기다린 뒤 응답한다. */
  readonly waitUntil?: (work: Promise<unknown>) => void;
  readonly log: (entry: MissionVoiceLog) => void;
  /** Scribe 한 번의 제한 시간(기본 12초 — 30초 녹음도 보통 2초 안). */
  readonly sttTimeoutMs?: number;
  /** TTS 한 번의 제한 시간(기본 15초). */
  readonly ttsTimeoutMs?: number;
  /** Storage 서명 · 올리기 한 번의 제한 시간(기본 10초). */
  readonly storageTimeoutMs?: number;
};

export const defaultVoiceTimeouts = { stt: 12_000, tts: 15_000, storage: 10_000 } as const;

export type VoiceHttpCode = PreStreamErrorCode | MissionErrorCode | MissionVoiceErrorCode;

const table: Record<VoiceHttpCode, { status: number; retryable: boolean }> = {
  ...PRE_STREAM_ERRORS,
  ...MISSION_ERRORS,
  ...MISSION_VOICE_ERRORS,
};

export function voiceErrorResponse(code: VoiceHttpCode, detail?: Record<string, unknown>) {
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

// ------------------------------------------------------------------ 호출 기록

export type VoiceBegun =
  | {
      readonly result: "ok";
      readonly callId: string;
      readonly missionId: string;
      readonly text?: string;
      readonly voice?: string;
    }
  | { readonly result: string; readonly detail?: Record<string, unknown> };

export type VoiceTarget =
  | { readonly kind: "message"; readonly id: string }
  | { readonly kind: "hint"; readonly no: number };

export async function beginVoiceCall(
  deps: MissionVoiceDeps,
  env: MissionVoiceEnv,
  input: {
    readonly userId: string;
    readonly conversationId: string;
    readonly kind: "stt" | "tts";
    readonly seconds: number;
    readonly target: VoiceTarget | null;
  },
): Promise<VoiceBegun> {
  return await callRpc<VoiceBegun>(deps.outbound, env, "companion_mission_voice_begin", {
    p_user_id: input.userId,
    p_conversation_id: input.conversationId,
    p_kind: input.kind,
    p_seconds: input.seconds,
    p_target: input.target,
    p_now: new Date(deps.nowMs()).toISOString(),
  });
}

/** SQL 거절 → HTTP. 모르는 코드는 `internal_error`. */
export function voiceRejection(begun: {
  readonly result: string;
  readonly detail?: Record<string, unknown>;
}): Response {
  if (!(begun.result in table)) return voiceErrorResponse("internal_error");
  return voiceErrorResponse(begun.result as VoiceHttpCode, begun.detail);
}

export type VoiceOutcome = "ok" | "cached" | "empty" | "busy" | "server" | "failed";

/** 호출 끝 기록. 실패해도 응답을 막지 않는다(로그만). `waitUntil`이 있으면 응답 뒤에 돈다. */
export async function finishVoiceCall(
  deps: MissionVoiceDeps,
  env: MissionVoiceEnv,
  callId: string,
  outcome: VoiceOutcome,
  meta: Record<string, unknown>,
): Promise<void> {
  const work = callRpc(deps.outbound, env, "companion_mission_voice_finish", {
    p_call_id: callId,
    p_outcome: outcome,
    p_meta: meta,
    p_now: new Date(deps.nowMs()).toISOString(),
  }).catch(() => undefined);
  if (deps.waitUntil !== undefined) deps.waitUntil(work);
  else await work;
}
