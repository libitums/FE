// `chat-send`의 HTTP 가장자리: 스트림 전 오류 응답 · 호출자 확인 · 본문 검사 · SSE 쓰기.

import type { ChatSendDeps, ChatSendEnv } from "./chat-send.contract.ts";
import {
  PRE_STREAM_ERRORS,
  SUPPORTED_CONTRACT_VERSIONS,
  chatSendRequestSchema,
  formatSseEvent,
  type ChatSendRequest,
  type PreStreamErrorCode,
  type TurnEvent,
} from "./companion-contract/index.ts";
import { authUserIdRequest } from "./companion-rpc.ts";
import { bearerTokenFrom } from "./supabase-auth.ts";

const uuidShape = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ------------------------------------------------------------------ 스트림 전 응답

export function errorResponse(
  code: PreStreamErrorCode,
  detail?: Record<string, unknown>,
): Response {
  const { status, retryable } = PRE_STREAM_ERRORS[code];
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (code === "method_not_allowed") headers["Allow"] = "POST";
  return new Response(
    JSON.stringify(
      detail === undefined ? { error: code, retryable } : { error: code, retryable, detail },
    ),
    {
      status,
      headers,
    },
  );
}

function sameSecret(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i += 1) difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return difference === 0;
}

/** 사용자 id, 또는 실패면 null. 서버 키 + 헤더면 플레이그라운드 경로입니다. */
export async function callerUserId(
  deps: ChatSendDeps,
  env: ChatSendEnv,
  request: Request,
): Promise<{ userId: string; playground: boolean } | null> {
  const token = bearerTokenFrom(request.headers.get("authorization"));
  if (token === null) return null;
  if (sameSecret(token, env.supabaseServiceRoleKey)) {
    const userId = request.headers.get("x-companion-user-id")?.trim() ?? "";
    return uuidShape.test(userId) ? { userId: userId.toLowerCase(), playground: true } : null;
  }
  try {
    const response = await deps.outbound(authUserIdRequest(env, token));
    if (response.status !== 200) return null;
    const id = (JSON.parse(await response.text()) as { id?: unknown }).id;
    return typeof id === "string" && uuidShape.test(id) ? { userId: id, playground: false } : null;
  } catch {
    return null;
  }
}

type BodyCheck = { ok: true; body: ChatSendRequest } | { ok: false; response: Response };

export async function readBody(request: Request): Promise<BodyCheck> {
  let raw: unknown;
  try {
    raw = JSON.parse(await request.text());
  } catch {
    return { ok: false, response: errorResponse("invalid_request", { field: "body" }) };
  }
  const version = (raw as { contract_version?: unknown } | null)?.contract_version;
  if (
    typeof version === "number" &&
    !(SUPPORTED_CONTRACT_VERSIONS as readonly number[]).includes(version)
  ) {
    return {
      ok: false,
      response: errorResponse("unsupported_contract_version", {
        supported: [...SUPPORTED_CONTRACT_VERSIONS],
      }),
    };
  }
  const parsed = chatSendRequestSchema.safeParse(raw);
  if (!parsed.success) {
    const field = String(parsed.error.issues[0]?.path[0] ?? "body");
    return { ok: false, response: errorResponse("invalid_request", { field }) };
  }
  return { ok: true, body: parsed.data };
}

export const preStreamCodes = new Set(Object.keys(PRE_STREAM_ERRORS));

// ------------------------------------------------------------------ SSE 쓰기

export type Sink = {
  send(event: Omit<TurnEvent, "id">): void;
  close(): void;
  readonly stream: ReadableStream<Uint8Array>;
};

export function createSink(pingIntervalMs: number): Sink {
  const encoder = new TextEncoder();
  let controller: ReadableStreamDefaultController<Uint8Array> | null = null;
  let open = true;
  let nextId = 0;
  let lastWrite = Date.now();
  const write = (text: string) => {
    if (!open || controller === null) return;
    try {
      controller.enqueue(encoder.encode(text));
      lastWrite = Date.now();
    } catch {
      open = false;
    }
  };
  const timer = setInterval(
    () => {
      if (Date.now() - lastWrite >= pingIntervalMs) write(": ping\n\n");
    },
    Math.max(10, Math.floor(pingIntervalMs / 3)),
  );
  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c;
    },
    cancel() {
      // 앱이 끊었다. 턴은 계속 돈다 — 쓰기만 멈춘다.
      open = false;
    },
  });
  return {
    stream,
    send(event) {
      write(formatSseEvent({ ...event, id: nextId++ } as TurnEvent));
    },
    close() {
      clearInterval(timer);
      if (open && controller !== null) {
        try {
          controller.close();
        } catch {
          // 이미 닫힘.
        }
      }
      open = false;
    },
  };
}
