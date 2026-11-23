// `POST /functions/v1/mission-tts` — 이 판의 상대역 메시지(진입 대사 포함) · 힌트 예문을 상대역 목소리로 읽는다(파이프라인 문서 §6, ADR-0178).
//
// 흐름: 인증 → 본문(`missionTtsRequestSchema` — 메시지 id 또는 힌트 번호만, 글은 받지 않는다) →
//   `companion_mission_voice_begin`(소유 · 판당 · 하루 상한 · 서버가 DB에서 읽을 글을 꺼냄: 말 조각만, 행동 지문 제외) →
//   읽기 글 정규화(`spokenText` — 숫자를 한국어 수로) → 캐시 자리(`mission-tts/<모델>/<음성>/<sha256>.mp3`)에 서명 → 있으면 끝(캐시 적중) →
//   없으면 ElevenLabs(1단계 `elevenSpeech`, 연결 실패 · 5xx만 한 번 다시) → 비공개 버킷 `companion-media`에 올림 → 서명 → `_finish`.
// 돌려주기: 서명 주소(1단계 음성과 같은 버킷 · mp3). 응답 본문으로 스트리밍하지 않는 까닭은 README 미션 음성 절.
// 실패는 가벼운 오류 `tts_unavailable`(503) — 앱은 조용히 글자만 둔다. 대화는 막지 않는다.

import { missionTtsRequestSchema, type MissionTtsResponse } from "./companion-contract/index.ts";
import { callerUserId } from "./chat-send-http.ts";
import { readMissionBody } from "./mission-http.ts";
import { missionTtsSignSeconds } from "./mission-voice-env.ts";
import {
  beginVoiceCall,
  defaultVoiceTimeouts,
  finishVoiceCall,
  type MissionVoiceDeps,
  type VoiceTarget,
  voiceErrorResponse,
  voiceRejection,
} from "./mission-voice-http.ts";
import { spokenText } from "./mission-voice-spoken.ts";
import {
  missionSpeech,
  missionTtsPath,
  signMissionAudio,
  uploadMissionAudio,
  VoiceVendorError,
  withOneRetry,
} from "./mission-voice-vendor.ts";

/** 한 번에 읽는 글 상한(미션 답은 한두 문장 · 40자 안팎). 넘으면 합성하지 않는다. */
export const missionTtsMaxChars = 400;

const ok = (body: MissionTtsResponse) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });

export function createMissionTtsHandler(
  deps: MissionVoiceDeps,
): (request: Request) => Promise<Response> {
  return async (request) => {
    const respond = (response: Response, outcome?: string, extra: object = {}) => {
      deps.log({
        event: "mission_tts",
        status: response.status,
        ...(outcome === undefined ? {} : { outcome }),
        ...extra,
      });
      return response;
    };
    if (request.method !== "POST") return respond(voiceErrorResponse("method_not_allowed"));
    const env = deps.env;
    if (env === null) return respond(voiceErrorResponse("server_misconfigured"));
    const caller = await callerUserId(deps, env, request);
    if (caller === null) return respond(voiceErrorResponse("invalid_session"));
    const checked = await readMissionBody(request, missionTtsRequestSchema);
    if (!checked.ok) return respond(checked.response);
    const body = checked.body;
    const target: VoiceTarget =
      body.kind === "message"
        ? { kind: "message", id: body.message_id.toLowerCase() }
        : { kind: "hint", no: body.hint_no };

    let begun;
    try {
      begun = await beginVoiceCall(deps, env, {
        userId: caller.userId,
        conversationId: body.conversation_id.toLowerCase(),
        kind: "tts",
        seconds: 0,
        target,
      });
    } catch {
      return respond(voiceErrorResponse("internal_error"), "begin_failed");
    }
    if (begun === null || begun.result !== "ok" || !("callId" in begun))
      return respond(voiceRejection(begun ?? { result: "internal_error" }), begun?.result);
    const callId = begun.callId;
    const model = env.ttsModel;
    const voice = begun.voice ?? env.defaultVoice;
    const spoken = spokenText((begun.text ?? "").trim());
    const meta = { model, voice, spokenChars: spoken.length, target: target.kind };
    const failed = async (
      outcome: "busy" | "server" | "failed",
      why: string,
      extra: object = {},
    ) => {
      await finishVoiceCall(deps, env, callId, outcome, { ...meta, why, ...extra });
      return respond(voiceErrorResponse("tts_unavailable", { reason: outcome }), why, extra);
    };
    if (spoken === "" || spoken.length > missionTtsMaxChars) return failed("failed", "text_size");

    const storageTimeout = deps.storageTimeoutMs ?? defaultVoiceTimeouts.storage;
    const expiresAt = () => new Date(deps.nowMs() + missionTtsSignSeconds * 1000).toISOString();
    const path = await missionTtsPath(model, voice, spoken);
    let url: string | null;
    try {
      url = await signMissionAudio(deps.fetch, env, path, missionTtsSignSeconds, storageTimeout);
    } catch {
      return failed("failed", "sign_failed");
    }
    if (url !== null) {
      await finishVoiceCall(deps, env, callId, "cached", { ...meta, cached: true });
      return respond(
        ok({ url, expiresAt: expiresAt(), cached: true, mime: "audio/mpeg" }),
        "cached",
        { chars: spoken.length, cached: true },
      );
    }
    if (env.elevenKey === null) {
      await finishVoiceCall(deps, env, callId, "failed", { ...meta, why: "key_missing" });
      return respond(
        voiceErrorResponse("voice_not_configured", { missing: ["ELEVENLABS_API_KEY"] }),
        "not_configured",
      );
    }

    const started = deps.nowMs();
    let audio: { value: Uint8Array; retries: number };
    try {
      audio = await withOneRetry(() =>
        missionSpeech(
          deps.fetch,
          env.elevenKey!,
          { voiceId: voice, model, text: spoken },
          deps.ttsTimeoutMs ?? defaultVoiceTimeouts.tts,
        ),
      );
    } catch (error) {
      const kind = error instanceof VoiceVendorError ? error.kind : "server";
      return failed(kind, `vendor_${kind}`, { vendorMs: deps.nowMs() - started });
    }
    const vendorMs = deps.nowMs() - started;
    try {
      await uploadMissionAudio(deps.fetch, env, path, audio.value, storageTimeout);
      url = await signMissionAudio(deps.fetch, env, path, missionTtsSignSeconds, storageTimeout);
    } catch {
      url = null;
    }
    if (url === null) return failed("failed", "storage_failed", { vendorMs });
    await finishVoiceCall(deps, env, callId, "ok", {
      ...meta,
      vendorMs,
      retries: audio.retries,
      bytes: audio.value.length,
    });
    return respond(ok({ url, expiresAt: expiresAt(), cached: false, mime: "audio/mpeg" }), "ok", {
      chars: spoken.length,
      vendorMs,
      cached: false,
    });
  };
}
