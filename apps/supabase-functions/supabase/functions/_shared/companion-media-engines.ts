// 스냅샷 · 음성의 바깥 호출: Claude(프롬프트 · 검사 노드, 공식 SDK) · OpenAI 이미지 편집 · ElevenLabs TTS · Supabase Storage.
// 모두 주입한 `fetch` 하나로 나간다 — 테스트는 가짜 fetch를 넣는다(실제 유료 호출 없음). 키는 헤더에만 싣고 로그 · 오류 글에 넣지 않는다.
// 호출 모양은 ops-dashboard `companion_lab.py`(anthropic · image_call · run_voice)와 같다.

import Anthropic from "@anthropic-ai/sdk";

import { base64FromBytes } from "./base64.ts";
import type { MediaEnv } from "./companion-media-env.ts";
import { MEDIA_BUCKET } from "./companion-media-purge.ts";
import { serviceKeyHeaders } from "./service-key.ts";

export const OPENAI_URL = "https://api.openai.com/v1";
export const ELEVEN_URL = "https://api.elevenlabs.io/v1";
export const REFS_BUCKET = "companion-refs";

export type Fetch = typeof fetch;
export type Image = { readonly bytes: Uint8Array; readonly mime: string; readonly name: string };
export type ToolUsage = { readonly input_tokens?: number; readonly output_tokens?: number };

export class EngineError extends Error {
  constructor(
    message: string,
    /** 엔진 오류(연결 · 시간 초과 · 408 · 409 · 429 · 5xx · 이미지 없음) — 한 번 다시 해도 되는 것. */
    readonly retryable: boolean,
    /** 엔진이 안전 정책으로 거절했다(다시 하지 않는다, blocked로 닫는다). */
    readonly refused = false,
  ) {
    super(message);
  }
}

const mimeOf = (name: string): string | null => {
  const lower = name.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  return null;
};

export const retryableStatus = (status: number) =>
  status === 408 || status === 409 || status === 429 || status >= 500;
// lab: 오류 글에 refus · safety가 있으면 거절로 보고 다시 하지 않는다. OpenAI의 안전 거절 코드는 moderation_blocked.
export const refusalText = /refus|safety|moderation_blocked|content_policy/i;

// ------------------------------------------------------------------ Claude (프롬프트 · 검사 노드)

export type ToolCall = {
  readonly system: string;
  readonly tool: {
    readonly name: string;
    readonly description: string;
    readonly input_schema: object;
  };
  readonly content: string | readonly (TextBlock | ImageBlock)[];
  readonly maxTokens: number;
};
type TextBlock = { readonly type: "text"; readonly text: string };
type ImageBlock = {
  readonly type: "image";
  readonly source: { readonly type: "base64"; readonly media_type: string; readonly data: string };
};

export function imageBlock(image: { bytes: Uint8Array; mime: string }): ImageBlock {
  return {
    type: "image",
    source: { type: "base64", media_type: image.mime, data: base64FromBytes(image.bytes) },
  };
}

/** 도구를 하나 강제한 Claude 호출 → 도구 입력 · 사용량. SDK 재시도는 끈다(재시도는 엔진 오류에만 — 노드는 다시 하지 않는다). */
export async function claudeTool(
  fetchImpl: Fetch,
  apiKey: string,
  model: string,
  call: ToolCall,
  timeoutMs: number,
): Promise<{ input: unknown; usage: ToolUsage }> {
  const client = new Anthropic({ apiKey, maxRetries: 0, timeout: timeoutMs, fetch: fetchImpl });
  const response = await client.messages.create({
    model,
    max_tokens: call.maxTokens,
    system: call.system,
    tools: [call.tool as Anthropic.Tool],
    tool_choice: { type: "tool", name: call.tool.name },
    messages: [{ role: "user", content: call.content as Anthropic.MessageParam["content"] }],
  });
  const block = response.content.find((item) => item.type === "tool_use");
  if (block === undefined || block.type !== "tool_use") {
    throw new Error(`no tool use (stop_reason ${String(response.stop_reason)})`);
  }
  return {
    input: block.input,
    usage: {
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
    },
  };
}

// ------------------------------------------------------------------ ElevenLabs

/**
 * 인물 `media.voiceSettings`(camelCase)를 ElevenLabs `voice_settings`(snake_case)로 옮긴다. 범위 밖 · 숫자 아닌 값은 버리고,
 * 남은 게 없으면 `undefined`(기본 설정). `speed`는 일부러 받지 않는다 — 0.85배 재생은 앱이 하므로 서버에서 또 줄이면 겹친다.
 */
export function voiceSettingsBody(raw: unknown): Record<string, number> | undefined {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const source = raw as Record<string, unknown>;
  const out: Record<string, number> = {};
  for (const [from, to] of [
    ["stability", "stability"],
    ["similarityBoost", "similarity_boost"],
    ["style", "style"],
  ] as const) {
    const value = source[from];
    if (typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1)
      out[to] = value;
  }
  return Object.keys(out).length === 0 ? undefined : out;
}

/**
 * `POST /v1/text-to-speech/{voice}` — mp3(44.1kHz 128kbps). 모델은 인물 `media.voiceModel`이 있으면 그것, 없으면 settings의 `voice_model`.
 * `voice_settings`는 인물에 정해 둔 것만 싣는다(없으면 엔진 기본). `speed`는 보내지 않는다 — 0.85배 재생은 앱이 한다.
 */
export async function elevenSpeech(
  fetchImpl: Fetch,
  apiKey: string,
  input: {
    readonly voiceId: string;
    readonly model: string;
    readonly text: string;
    readonly voiceSettings?: unknown;
  },
  timeoutMs: number,
): Promise<Uint8Array> {
  const voiceSettings = voiceSettingsBody(input.voiceSettings);
  let response: Response;
  try {
    response = await fetchImpl(
      `${ELEVEN_URL}/text-to-speech/${encodeURIComponent(input.voiceId)}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: { "xi-api-key": apiKey, "Content-Type": "application/json", Accept: "audio/mpeg" },
        body: JSON.stringify({
          text: input.text,
          model_id: input.model,
          ...(voiceSettings === undefined ? {} : { voice_settings: voiceSettings }),
        }),
        signal: AbortSignal.timeout(timeoutMs),
      },
    );
  } catch (error) {
    throw new EngineError(`ElevenLabs connection failed: ${(error as Error).name}`, true);
  }
  if (response.status !== 200) {
    const body = (await response.text().catch(() => "")).slice(0, 200);
    throw new EngineError(
      `ElevenLabs ${response.status}: ${body}`,
      retryableStatus(response.status),
    );
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.length === 0) throw new EngineError("ElevenLabs: empty audio", true);
  return bytes;
}

// ------------------------------------------------------------------ Storage (서버 키)

const objectUrl = (env: MediaEnv, bucket: string, path: string) =>
  `${env.supabaseUrl}/storage/v1/object/${bucket}/${path.split("/").map(encodeURIComponent).join("/")}`;

/** 기준 이미지 한 장(`companion-refs/<name>`). */
export async function downloadRef(
  fetchImpl: Fetch,
  env: MediaEnv,
  name: string,
  timeoutMs: number,
): Promise<Image> {
  const mime = mimeOf(name);
  if (mime === null) throw new Error(`unsupported reference ${name}`);
  const response = await fetchImpl(objectUrl(env, REFS_BUCKET, name), {
    method: "GET",
    headers: serviceKeyHeaders(env.supabaseServiceRoleKey),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (response.status !== 200) throw new Error(`reference ${name}: ${response.status}`);
  return { bytes: new Uint8Array(await response.arrayBuffer()), mime, name };
}

/** 기준 그림 버킷의 JSON 한 개(`companion-refs/<name>`, 스냅샷 v2m 묶음의 manifest.json). 없으면(404 · 400) null, 그 밖의 실패는 던진다. */
export async function downloadRefJson(
  fetchImpl: Fetch,
  env: MediaEnv,
  name: string,
  timeoutMs: number,
): Promise<unknown | null> {
  const response = await fetchImpl(objectUrl(env, REFS_BUCKET, name), {
    method: "GET",
    headers: serviceKeyHeaders(env.supabaseServiceRoleKey),
    signal: AbortSignal.timeout(timeoutMs),
  });
  // Storage는 없는 객체에 400(「Object not found」) 또는 404를 준다.
  if (response.status === 404 || response.status === 400) return null;
  if (response.status !== 200) throw new Error(`reference ${name}: ${response.status}`);
  return await response.json();
}

/** 결과 파일 올리기(`companion-media/<path>`). 같은 경로면 덮어쓴다(재시도 안전). */
export async function uploadMedia(
  fetchImpl: Fetch,
  env: MediaEnv,
  path: string,
  bytes: Uint8Array,
  mime: string,
  timeoutMs: number,
): Promise<void> {
  const response = await fetchImpl(objectUrl(env, MEDIA_BUCKET, path), {
    method: "POST",
    headers: {
      ...serviceKeyHeaders(env.supabaseServiceRoleKey),
      "Content-Type": mime,
      "x-upsert": "true",
    },
    body: bytes as BodyInit,
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (response.status < 200 || response.status >= 300) {
    throw new Error(
      `upload ${response.status}: ${(await response.text().catch(() => "")).slice(0, 200)}`,
    );
  }
}

/** 결과 파일 하나 지우기(미리보기 정리). 없어도 괜찮다 — 실패는 던지지 않는다. */
export async function removeMedia(
  fetchImpl: Fetch,
  env: MediaEnv,
  path: string,
  timeoutMs: number,
): Promise<void> {
  await fetchImpl(`${env.supabaseUrl}/storage/v1/object/${MEDIA_BUCKET}`, {
    method: "DELETE",
    headers: {
      ...serviceKeyHeaders(env.supabaseServiceRoleKey),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prefixes: [path] }),
    signal: AbortSignal.timeout(timeoutMs),
  }).catch(() => undefined);
}
