// 스냅샷의 OpenAI 이미지 편집 호출(`companion-media-engines.ts`에서 나눔). 기준 이미지 + 프롬프트 → PNG, 중간 그림 스트리밍(선택).

import { bytesFromBase64 } from "./base64.ts";
import {
  EngineError,
  type Fetch,
  type Image,
  OPENAI_URL,
  refusalText,
  retryableStatus,
} from "./companion-media-engines.ts";

/**
 * `POST /v1/images/edits` — 기준 이미지(최대 4장) + 프롬프트 → PNG 바이트(그대로, C2PA 보존).
 * `partialImages`가 1 ~ 3이면 스트리밍(`stream`, `partial_images`)으로 받아, 다 그리기 전의 흐릿한 중간 그림이 올 때마다 `onPartial`을
 * 부른다(앱의 미리보기). 중간 그림 한 장마다 이미지 출력 토큰 100개가 더 든다. 생성이 빨리 끝나면 요청보다 적게 올 수 있다.
 * `onPartial`이 실패해도 그림은 계속 받는다 — 미리보기는 덤이다.
 */
export async function openaiImageEdit(
  fetchImpl: Fetch,
  apiKey: string,
  input: {
    readonly model: string;
    readonly refs: readonly Image[];
    readonly prompt: string;
    readonly size: string;
    readonly quality: string;
    /** `complexity`(low · medium · high). 없으면 보내지 않는다(엔진 기본 high). */
    readonly complexity?: string | null;
    readonly partialImages?: number;
    readonly onPartial?: (png: Uint8Array, index: number) => Promise<void>;
    /** 결과 파일 형식. 없으면 보내지 않는다(엔진 기본 PNG — 스냅샷은 C2PA를 지키려고 PNG 그대로 둔다). 친구 스토리는 webp. */
    readonly outputFormat?: "png" | "webp" | "jpeg";
    /** webp · jpeg의 압축 정도(0 ~ 100). 없으면 보내지 않는다(엔진 기본 100 — 1024x1536 webp가 1.5 MB). */
    readonly outputCompression?: number;
  },
  timeoutMs: number,
): Promise<{ png: Uint8Array; usage: unknown; partials: number }> {
  const partialImages = Math.max(0, Math.min(3, Math.trunc(input.partialImages ?? 0)));
  const form = new FormData();
  for (const ref of input.refs.slice(0, 4)) {
    form.append("image[]", new Blob([ref.bytes as BlobPart], { type: ref.mime }), ref.name);
  }
  form.append("model", input.model);
  form.append("prompt", input.prompt);
  form.append("size", input.size);
  form.append("quality", input.quality);
  form.append("n", "1");
  if (input.complexity) form.append("complexity", input.complexity);
  if (input.outputFormat) form.append("output_format", input.outputFormat);
  if (input.outputCompression !== undefined)
    form.append("output_compression", String(input.outputCompression));
  if (partialImages > 0) {
    form.append("stream", "true");
    form.append("partial_images", String(partialImages));
  }
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
  if (partialImages > 0) return readImageStream(response, input.onPartial);
  return readImageJson(response);
}

/** 스트리밍이 아닌 이미지 응답(`data[0].b64_json`) → 그림 바이트. */
async function readImageJson(
  response: Response,
): Promise<{ png: Uint8Array; usage: unknown; partials: number }> {
  let body: { data?: { b64_json?: string }[]; usage?: unknown };
  try {
    body = (await response.json()) as typeof body;
  } catch {
    throw new EngineError("OpenAI: invalid JSON", true);
  }
  // 본문이 JSON이어도 객체가 아니면(`null` · 숫자) 잘못된 응답과 같게 다룹니다 — TypeError로 새지 않게(리뷰 #441).
  if (body === null || typeof body !== "object")
    throw new EngineError("OpenAI: invalid JSON", true);
  const b64 = body.data?.[0]?.b64_json;
  if (typeof b64 !== "string" || b64 === "") throw new EngineError("OpenAI: no image", true);
  const png = bytesFromBase64(b64);
  if (png === null) throw new EngineError("OpenAI: bad base64", true);
  return { png, usage: body.usage ?? null, partials: 0 };
}

type ImageStreamEvent = {
  type?: unknown;
  b64_json?: unknown;
  partial_image_index?: unknown;
  usage?: unknown;
  error?: { message?: unknown };
};

/** 이미지 스트림(SSE) — `image_edit.partial_image`마다 `onPartial`, `image_edit.completed`의 그림을 돌려준다. */
async function readImageStream(
  response: Response,
  onPartial: ((png: Uint8Array, index: number) => Promise<void>) | undefined,
): Promise<{ png: Uint8Array; usage: unknown; partials: number }> {
  if (response.body === null) throw new EngineError("OpenAI: empty stream", true);
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  let partials = 0;
  const handle = async (block: string) => {
    const data = block
      .split("\n")
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trimStart())
      .join("\n");
    if (data === "" || data === "[DONE]") return null;
    let event: ImageStreamEvent;
    try {
      event = JSON.parse(data) as ImageStreamEvent;
    } catch {
      throw new EngineError("OpenAI: invalid stream event", true);
    }
    if (event === null || typeof event !== "object") return null;
    if (event.type === "error" || event.error !== undefined) {
      const message = String(event.error?.message ?? "stream error").slice(0, 300);
      const refused = refusalText.test(message);
      throw new EngineError(`OpenAI stream: ${message}`, !refused, refused);
    }
    if (typeof event.b64_json !== "string" || event.b64_json === "") return null;
    const png = bytesFromBase64(event.b64_json);
    if (png === null) throw new EngineError("OpenAI: bad base64", true);
    if (typeof event.type === "string" && event.type.endsWith(".partial_image")) {
      partials += 1;
      const index =
        typeof event.partial_image_index === "number" ? event.partial_image_index : partials - 1;
      await onPartial?.(png, index).catch(() => undefined);
      return null;
    }
    if (typeof event.type === "string" && event.type.endsWith(".completed"))
      return { png, usage: event.usage ?? null };
    return null;
  };
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (value !== undefined) buffer += value.replace(/\r\n/g, "\n");
      let cut = buffer.indexOf("\n\n");
      while (cut !== -1) {
        const final = await handle(buffer.slice(0, cut));
        if (final !== null) return { ...final, partials };
        buffer = buffer.slice(cut + 2);
        cut = buffer.indexOf("\n\n");
      }
      if (done) break;
    }
    const final = buffer.trim() === "" ? null : await handle(buffer);
    if (final !== null) return { ...final, partials };
  } catch (error) {
    if (error instanceof EngineError) throw error;
    throw new EngineError(`OpenAI stream failed: ${(error as Error).name}`, true);
  } finally {
    reader.releaseLock();
  }
  throw new EngineError("OpenAI: no image", true);
}

/**
 * `POST /v1/images/generations` — 기준 이미지 없이 프롬프트만으로 한 장(친구 스토리의 사물 · 풍경 컷, ADR-0192 D5).
 * 오류 · 거절 판정은 편집 호출과 같다.
 */
export async function openaiImageGenerate(
  fetchImpl: Fetch,
  apiKey: string,
  input: {
    readonly model: string;
    readonly prompt: string;
    readonly size: string;
    readonly quality: string;
    readonly outputFormat?: "png" | "webp" | "jpeg";
    readonly outputCompression?: number;
  },
  timeoutMs: number,
): Promise<{ png: Uint8Array; usage: unknown; partials: number }> {
  let response: Response;
  try {
    response = await fetchImpl(`${OPENAI_URL}/images/generations`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: input.model,
        prompt: input.prompt,
        size: input.size,
        quality: input.quality,
        n: 1,
        ...(input.outputFormat ? { output_format: input.outputFormat } : {}),
        ...(input.outputCompression === undefined
          ? {}
          : { output_compression: input.outputCompression }),
      }),
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
  return readImageJson(response);
}
