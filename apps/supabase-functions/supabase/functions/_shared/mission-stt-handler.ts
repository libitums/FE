// `POST /functions/v1/mission-stt` — 자기의 열린 미션 판에서 녹음 하나를 받아 적는다(파이프라인 문서 §6, ADR-0178).
//
// 흐름: 인증 → multipart(`contract_version` · `conversation_id` · `audio`) → 크기 · WAV 형식 · 길이 검사 → 키 확인 →
//   `companion_mission_voice_begin`(소유 · 열린 판 · 판당 · 하루 상한 · 기록 줄) → ElevenLabs Scribe(연결 실패 · 5xx만 한 번 다시) →
//   바로 보낼지(`autosendDecision`) → `_finish`(결과 · 벤더 시간) → `{ text, autoSend, reason, words, features, latencyMs }`.
// 녹음은 저장하지 않는다 — 메모리에서 벤더로 넘기고 버린다. 로그 · 기록에도 글 · 소리를 싣지 않는다(길이 · 결과만).
// 실패 코드: `speech_empty`(422) · `speech_busy`(429) · `speech_unavailable`(503). 턴은 세지 않는다(턴은 `chat-send`가 센다).

import {
  MISSION_STT_AUDIO_FIELD,
  MISSION_STT_MAX_BYTES,
  MISSION_STT_MAX_SECONDS,
  MISSION_STT_MIN_SECONDS,
  SUPPORTED_CONTRACT_VERSIONS,
  missionSttFieldsSchema,
  type MissionSttResponse,
} from "./companion-contract/index.ts";
import { callerUserId } from "./chat-send-http.ts";
import { autosendDecision, sttFeatures } from "./mission-voice-autosend.ts";
import {
  beginVoiceCall,
  defaultVoiceTimeouts,
  finishVoiceCall,
  type MissionVoiceDeps,
  voiceErrorResponse,
  voiceRejection,
} from "./mission-voice-http.ts";
import { scribeTranscribe, VoiceVendorError, withOneRetry } from "./mission-voice-vendor.ts";
import { checkWav } from "./mission-voice-wav.ts";

type Form = { ok: true; fields: { version: number; conversationId: string }; audio: Uint8Array };

async function readForm(request: Request): Promise<Form | { ok: false; response: Response }> {
  const fail = (response: Response) => ({ ok: false as const, response });
  const length = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(length) && length > MISSION_STT_MAX_BYTES + 4096)
    return fail(voiceErrorResponse("audio_too_long", { max: MISSION_STT_MAX_SECONDS }));
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail(voiceErrorResponse("invalid_request", { field: "body" }));
  }
  const rawVersion = form.get("contract_version");
  const version = typeof rawVersion === "string" ? Number(rawVersion) : Number.NaN;
  if (
    Number.isInteger(version) &&
    !(SUPPORTED_CONTRACT_VERSIONS as readonly number[]).includes(version)
  )
    return fail(
      voiceErrorResponse("unsupported_contract_version", {
        supported: [...SUPPORTED_CONTRACT_VERSIONS],
      }),
    );
  const parsed = missionSttFieldsSchema.safeParse({
    contract_version: version,
    conversation_id: form.get("conversation_id"),
  });
  if (!parsed.success) {
    const field = String(parsed.error.issues[0]?.path[0] ?? "body");
    return fail(voiceErrorResponse("invalid_request", { field }));
  }
  const file = form.get(MISSION_STT_AUDIO_FIELD);
  if (file === null || typeof file === "string")
    return fail(voiceErrorResponse("invalid_request", { field: MISSION_STT_AUDIO_FIELD }));
  if (file.size > MISSION_STT_MAX_BYTES)
    return fail(voiceErrorResponse("audio_too_long", { max: MISSION_STT_MAX_SECONDS }));
  return {
    ok: true,
    fields: { version, conversationId: parsed.data.conversation_id.toLowerCase() },
    audio: new Uint8Array(await file.arrayBuffer()),
  };
}

export function createMissionSttHandler(
  deps: MissionVoiceDeps,
): (request: Request) => Promise<Response> {
  return async (request) => {
    const respond = (response: Response, outcome?: string, extra: object = {}) => {
      deps.log({
        event: "mission_stt",
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
    const form = await readForm(request);
    if (!form.ok) return respond(form.response);
    const wav = checkWav(form.audio);
    if (!wav.ok)
      return respond(
        voiceErrorResponse(
          wav.code,
          wav.code === "audio_too_long" ? { max: MISSION_STT_MAX_SECONDS } : { why: wav.why },
        ),
        wav.why,
      );
    const seconds = wav.info.seconds;
    if (env.elevenKey === null)
      return respond(
        voiceErrorResponse("voice_not_configured", { missing: ["ELEVENLABS_API_KEY"] }),
      );

    let begun;
    try {
      begun = await beginVoiceCall(deps, env, {
        userId: caller.userId,
        conversationId: form.fields.conversationId,
        kind: "stt",
        seconds,
        target: null,
      });
    } catch {
      return respond(voiceErrorResponse("internal_error"), "begin_failed");
    }
    if (begun === null || begun.result !== "ok" || !("callId" in begun))
      return respond(voiceRejection(begun ?? { result: "internal_error" }), begun?.result);
    const callId = begun.callId;
    const model = env.sttModel;

    if (seconds < MISSION_STT_MIN_SECONDS) {
      await finishVoiceCall(deps, env, callId, "empty", { model, why: "too_short" });
      return respond(voiceErrorResponse("speech_empty"), "too_short", { seconds });
    }

    const started = deps.nowMs();
    let heard;
    try {
      heard = await withOneRetry(() =>
        scribeTranscribe(
          deps.fetch,
          { apiKey: env.elevenKey!, model, wav: form.audio, zeroRetention: env.zeroRetention },
          deps.sttTimeoutMs ?? defaultVoiceTimeouts.stt,
        ),
      );
    } catch (error) {
      const kind = error instanceof VoiceVendorError ? error.kind : "server";
      const vendorMs = deps.nowMs() - started;
      await finishVoiceCall(deps, env, callId, kind, { model, vendorMs });
      return respond(
        voiceErrorResponse(kind === "busy" ? "speech_busy" : "speech_unavailable"),
        kind,
        { seconds, vendorMs },
      );
    }
    const vendorMs = deps.nowMs() - started;
    const text = heard.value.text.trim();
    const features = sttFeatures(text, heard.value.words, seconds);
    if (features.chars === 0) {
      await finishVoiceCall(deps, env, callId, "empty", { model, vendorMs });
      return respond(voiceErrorResponse("speech_empty"), "empty", { seconds, vendorMs });
    }
    const decision = autosendDecision(features, env.autosend);
    await finishVoiceCall(deps, env, callId, "ok", {
      model,
      vendorMs,
      reason: decision.reason,
      retries: heard.retries,
      words: heard.value.words.length,
    });
    const body: MissionSttResponse = {
      text,
      autoSend: decision.autoSend,
      reason: decision.reason,
      words: heard.value.words,
      features,
      latencyMs: vendorMs,
    };
    return respond(
      new Response(JSON.stringify(body), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
      `ok ${decision.reason}`,
      { seconds, vendorMs },
    );
  };
}
