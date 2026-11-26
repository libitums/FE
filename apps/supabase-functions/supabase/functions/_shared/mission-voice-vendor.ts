// 미션 음성의 바깥 호출 — ElevenLabs Scribe(받아 적기) · TTS(1단계 `elevenSpeech` 그대로) · Storage(1단계 `uploadMedia` + 서명 주소).
// 모두 주입한 `fetch` 하나로 나간다 — 테스트는 가짜 fetch를 넣는다(실제 유료 호출 없음). 키는 헤더에만 싣고 로그 · 오류 글에 넣지 않는다.
// Scribe 매개변수는 대시보드 `speech_vendors.py`의 `eleven_stt_build` · `eleven_stt_parse`(맥미니 진짜 호출로 검증)와 같다.

import type { MissionSttWord } from "./companion-contract/index.ts";
import {
  ELEVEN_URL,
  EngineError,
  elevenSpeech,
  type Fetch,
  objectUrl,
  type StorageEnv,
  uploadMedia,
} from "./companion-media-engines.ts";
import { MEDIA_BUCKET } from "./companion-media-purge.ts";
import { serviceKeyHeaders } from "./service-key.ts";

/** 벤더 실패의 두 갈래 — `busy`(429) · `server`(5xx · 시간 초과 · 연결 실패 · 알 수 없는 응답). `retryable`은 한 번 다시 해도 되는가. */
export class VoiceVendorError extends Error {
  constructor(
    readonly kind: "busy" | "server",
    readonly retryable: boolean,
    message: string,
  ) {
    super(message);
  }
}

const isTimeout = (error: unknown) =>
  (error as { name?: string } | null)?.name === "TimeoutError" ||
  /TimeoutError/.test(String((error as Error | null)?.message ?? ""));

/**
 * 한 번만 다시 한다 — 연결 실패 · 5xx만. 429(붐빔)와 시간 초과는 다시 하지 않는다(지연 예산 0.6초 — 오래 기다리게 하지 않는다).
 * 돌려주는 `retries`는 기록용.
 */
export async function withOneRetry<T>(
  attempt: () => Promise<T>,
): Promise<{ value: T; retries: number }> {
  try {
    return { value: await attempt(), retries: 0 };
  } catch (error) {
    if (!(error instanceof VoiceVendorError) || !error.retryable) throw error;
    return { value: await attempt(), retries: 1 };
  }
}

// ------------------------------------------------------------------ Scribe

export type ScribeInput = {
  readonly apiKey: string;
  readonly model: string;
  readonly wav: Uint8Array;
  /** `enable_logging=false`(무보존 모드)를 싣는가. */
  readonly zeroRetention: boolean;
};

/**
 * `POST /v1/speech-to-text`(multipart): `model_id` · `language_code=kor`(언어 고정) · `tag_audio_events=false`(웃음 등 태그 끔) ·
 * `timestamps_granularity=word`(낱말 시각 · logprob). 화자 분리(`diarize`)는 보내지 않는다(기본 끔 — 화자 특징값을 만들지 않음).
 * 응답 `words[]` 가운데 `type: word`만, 확신도 = `exp(logprob)`.
 */
export async function scribeTranscribe(
  fetchImpl: Fetch,
  input: ScribeInput,
  timeoutMs: number,
): Promise<{ text: string; words: MissionSttWord[] }> {
  const form = new FormData();
  form.append("model_id", input.model);
  form.append("language_code", "kor");
  form.append("tag_audio_events", "false");
  form.append("timestamps_granularity", "word");
  form.append("file", new Blob([input.wav as BlobPart], { type: "audio/wav" }), "audio.wav");
  const query = input.zeroRetention ? "?enable_logging=false" : "";
  let response: Response;
  try {
    response = await fetchImpl(`${ELEVEN_URL}/speech-to-text${query}`, {
      method: "POST",
      headers: { "xi-api-key": input.apiKey, Accept: "application/json" },
      body: form,
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    if (isTimeout(error)) throw new VoiceVendorError("server", false, "scribe timeout");
    throw new VoiceVendorError("server", true, `scribe connection failed`);
  }
  if (response.status === 429) throw new VoiceVendorError("busy", false, "scribe 429");
  if (response.status !== 200) {
    await response.text().catch(() => "");
    throw new VoiceVendorError("server", response.status >= 500, `scribe ${response.status}`);
  }
  let data: { text?: unknown; words?: unknown };
  try {
    data = (await response.json()) as typeof data;
  } catch {
    throw new VoiceVendorError("server", false, "scribe invalid json");
  }
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
  const words = (Array.isArray(data.words) ? data.words : [])
    .filter((w): w is Record<string, unknown> => w !== null && typeof w === "object")
    .filter((w) => (w["type"] ?? "word") === "word")
    .map((w) => {
      const logprob = num(w["logprob"]);
      return {
        text: typeof w["text"] === "string" ? w["text"] : "",
        start: num(w["start"]),
        end: num(w["end"]),
        confidence: logprob === null ? null : Math.min(1, Number(Math.exp(logprob).toFixed(4))),
      };
    });
  return { text: typeof data.text === "string" ? data.text : "", words };
}

// ------------------------------------------------------------------ TTS

/** 1단계 `elevenSpeech`(mp3 44.1kHz 128kbps)를 부르고 오류를 두 갈래로 바꾼다. */
export async function missionSpeech(
  fetchImpl: Fetch,
  apiKey: string,
  input: { readonly voiceId: string; readonly model: string; readonly text: string },
  timeoutMs: number,
): Promise<Uint8Array> {
  try {
    return await elevenSpeech(fetchImpl, apiKey, input, timeoutMs);
  } catch (error) {
    if (!(error instanceof EngineError)) throw new VoiceVendorError("server", false, "tts failed");
    if (error.status === 429) throw new VoiceVendorError("busy", false, "tts 429");
    const timeout = /TimeoutError/.test(error.message);
    throw new VoiceVendorError("server", error.retryable && !timeout, error.message.slice(0, 80));
  }
}

// ------------------------------------------------------------------ Storage

const hex = (bytes: ArrayBuffer) =>
  [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");

/** 같은 (모델 · 음성 · 읽는 글)은 같은 파일 — 사용자 사이에서 공유하는 캐시 자리. 글은 경로에 넣지 않고 SHA-256으로. */
export async function missionTtsPath(model: string, voice: string, spoken: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(spoken));
  return `mission-tts/${model.replace(/[^A-Za-z0-9_.-]/g, "_")}/${voice}/${hex(digest)}.mp3`;
}

/**
 * 서명 주소(서버 키). 파일이 없으면 null(Storage는 400 · 404로 답한다). 그 밖의 실패는 던진다.
 * 공유 캐시라 앱이 자기 토큰으로 서명할 수 없다(정책 `companion_media_owner_read`는 `<user_id>/`만) — 그래서 서버가 서명한다.
 */
export async function signMissionAudio(
  fetchImpl: Fetch,
  env: StorageEnv,
  path: string,
  expiresIn: number,
  timeoutMs: number,
): Promise<string | null> {
  const url = objectUrl(env, MEDIA_BUCKET, path).replace("/object/", "/object/sign/");
  const response = await fetchImpl(url, {
    method: "POST",
    headers: {
      ...serviceKeyHeaders(env.supabaseServiceRoleKey),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ expiresIn }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (response.status === 400 || response.status === 404) {
    await response.text().catch(() => "");
    return null;
  }
  if (response.status !== 200) throw new Error(`sign ${response.status}`);
  const signed = ((await response.json()) as { signedURL?: unknown }).signedURL;
  if (typeof signed !== "string" || signed === "") throw new Error("sign: no url");
  return /^https?:\/\//.test(signed) ? signed : `${env.supabaseUrl}/storage/v1${signed}`;
}

export const uploadMissionAudio = (
  fetchImpl: Fetch,
  env: StorageEnv,
  path: string,
  audio: Uint8Array,
  timeoutMs: number,
) => uploadMedia(fetchImpl, env, path, audio, "audio/mpeg", timeoutMs);
