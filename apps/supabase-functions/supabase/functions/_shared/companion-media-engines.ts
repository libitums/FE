// 스냅샷 · 음성의 바깥 호출: Claude(프롬프트 · 검사 노드, 공식 SDK) · OpenAI 이미지 편집 · ElevenLabs TTS · Supabase Storage.
// 모두 주입한 `fetch` 하나로 나간다 — 테스트는 가짜 fetch를 넣는다(실제 유료 호출 없음). 키는 헤더에만 싣고 로그 · 오류 글에 넣지 않는다.
// 호출 모양은 ops-dashboard `companion_lab.py`(anthropic · image_call · run_voice)와 같다.

import Anthropic from "@anthropic-ai/sdk";

import { base64FromBytes, bytesFromBase64 } from "./base64.ts";
import type { MediaEnv } from "./companion-media-env.ts";
import { serviceKeyHeaders } from "./service-key.ts";

export const OPENAI_URL = "https://api.openai.com/v1";
export const ELEVEN_URL = "https://api.elevenlabs.io/v1";
export const MEDIA_BUCKET = "companion-media";
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

const retryableStatus = (status: number) =>
  status === 408 || status === 409 || status === 429 || status >= 500;
// lab: 오류 글에 refus · safety가 있으면 거절로 보고 다시 하지 않는다. OpenAI의 안전 거절 코드는 moderation_blocked.
const refusalText = /refus|safety|moderation_blocked|content_policy/i;

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

// ------------------------------------------------------------------ OpenAI 이미지 편집

/** `POST /v1/images/edits` — 기준 이미지(최대 4장) + 프롬프트 → PNG 바이트(그대로, C2PA 보존). */
export async function openaiImageEdit(
  fetchImpl: Fetch,
  apiKey: string,
  input: {
    readonly model: string;
    readonly refs: readonly Image[];
    readonly prompt: string;
    readonly size: string;
    readonly quality: string;
  },
  timeoutMs: number,
): Promise<{ png: Uint8Array; usage: unknown }> {
  const form = new FormData();
  for (const ref of input.refs.slice(0, 4)) {
    form.append("image[]", new Blob([ref.bytes as BlobPart], { type: ref.mime }), ref.name);
  }
  form.append("model", input.model);
  form.append("prompt", input.prompt);
  form.append("size", input.size);
  form.append("quality", input.quality);
  form.append("n", "1");
  let response: Response;
  try {
    response = await fetchImpl(`${OPENAI_URL}/images/edits`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    throw new EngineError(`OpenAI connection failed: ${(error as Error).name}`, true);
  }
  if (response.status !== 200) {
    const body = (await response.text().catch(() => "")).slice(0, 300);
    const refused = response.status === 400 && refusalText.test(body);
    throw new EngineError(
      `OpenAI ${response.status}: ${body}`,
      !refused && retryableStatus(response.status),
      refused,
    );
  }
  let body: { data?: { b64_json?: string }[]; usage?: unknown };
  try {
    body = (await response.json()) as typeof body;
  } catch {
    throw new EngineError("OpenAI: invalid JSON", true);
  }
  const b64 = body.data?.[0]?.b64_json;
  if (typeof b64 !== "string" || b64 === "") throw new EngineError("OpenAI: no image", true);
  const png = bytesFromBase64(b64);
  if (png === null) throw new EngineError("OpenAI: bad base64", true);
  return { png, usage: body.usage ?? null };
}

// ------------------------------------------------------------------ ElevenLabs

/**
 * `POST /v1/text-to-speech/{voice}` — mp3(44.1kHz 128kbps). `voice_settings.speed`는 보내지 않는다 — ElevenLabs 문서상 eleven_v3는
 * 받지 않는다(lab과 같다). 0.85배 재생은 앱이 한다.
 */
export async function elevenSpeech(
  fetchImpl: Fetch,
  apiKey: string,
  input: { readonly voiceId: string; readonly model: string; readonly text: string },
  timeoutMs: number,
): Promise<Uint8Array> {
  let response: Response;
  try {
    response = await fetchImpl(
      `${ELEVEN_URL}/text-to-speech/${encodeURIComponent(input.voiceId)}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: { "xi-api-key": apiKey, "Content-Type": "application/json", Accept: "audio/mpeg" },
        body: JSON.stringify({ text: input.text, model_id: input.model }),
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

/**
 * 한 유저의 결과 파일을 모두 지운다(계정 삭제). 폴더 `<user_id>/`를 1000개씩 나열해 지운다. 지운 수.
 * 실패하면 던진다 — 부르는 쪽이 계정 삭제를 막을지 정한다.
 */
export async function purgeUserMedia(
  fetchImpl: Fetch,
  env: { readonly supabaseUrl: string; readonly supabaseServiceRoleKey: string },
  userId: string,
  timeoutMs: number,
): Promise<number> {
  const headers = {
    ...serviceKeyHeaders(env.supabaseServiceRoleKey),
    "Content-Type": "application/json",
  };
  let removed = 0;
  for (let round = 0; round < 20; round += 1) {
    const list = await fetchImpl(`${env.supabaseUrl}/storage/v1/object/list/${MEDIA_BUCKET}`, {
      method: "POST",
      headers,
      body: JSON.stringify({ prefix: `${userId}/`, limit: 1000, offset: 0 }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    // 버킷이 아직 없으면(마이그레이션 전) 지울 것도 없다.
    if (list.status === 400 || list.status === 404) return removed;
    if (list.status !== 200) throw new Error(`list ${list.status}`);
    const names = ((await list.json()) as { name?: unknown }[])
      .map((item) => item.name)
      .filter((name): name is string => typeof name === "string" && name !== "");
    if (names.length === 0) return removed;
    const remove = await fetchImpl(`${env.supabaseUrl}/storage/v1/object/${MEDIA_BUCKET}`, {
      method: "DELETE",
      headers,
      body: JSON.stringify({ prefixes: names.map((name) => `${userId}/${name}`) }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (remove.status !== 200) throw new Error(`remove ${remove.status}`);
    removed += names.length;
  }
  return removed;
}
