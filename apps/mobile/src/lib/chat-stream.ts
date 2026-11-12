// 호스트 `ChatStreamModule`이 올리는 전역 이벤트 셋을 스트림별 콜백으로 나눠 주는 어댑터입니다.
// 호스트가 이미 빈 줄 경계로 잘라 UTF-8로 푼 SSE 블록을 보내므로, 여기서는 블록의 필드만 풉니다.
// **어떤 경우에도 던지지 않습니다** — 호스트가 없거나 틀린 인자를 보내도 `onEnd` 한 번으로 끝납니다.

import type {
  ChatStreamClient,
  ChatStreamClientDeps,
  ChatStreamEndReason,
  ChatStreamHandle,
  ChatStreamHandlers,
  ChatStreamNative,
  ChatStreamRequest,
  ChatStreamSseEvent,
} from "./chat-stream.contract";

export const chatStreamOpenEventName = "chatStreamOpen";
export const chatStreamEventEventName = "chatStreamEvent";
export const chatStreamEndEventName = "chatStreamEnd";

const endReasons: readonly ChatStreamEndReason[] = [
  "complete",
  "cancelled",
  "http-error",
  "network",
  "timeout-connect",
  "timeout-idle",
  "unavailable",
];

/** SSE 블록 하나를 풉니다. `data` 줄이 없으면(주석뿐인 ping) `null`입니다. */
export function parseSseBlock(text: string): ChatStreamSseEvent | null {
  let event = "message";
  let id: string | null = null;
  const data: string[] = [];
  for (const line of text.split(/\r\n|\r|\n/)) {
    if (line === "" || line.startsWith(":")) continue;
    const colon = line.indexOf(":");
    const field = colon < 0 ? line : line.slice(0, colon);
    let value = colon < 0 ? "" : line.slice(colon + 1);
    if (value.startsWith(" ")) value = value.slice(1);
    if (field === "event") event = value;
    else if (field === "id") id = value;
    else if (field === "data") data.push(value);
  }
  if (data.length === 0) return null;
  return { event, id, data: data.join("\n") };
}

/** 호스트가 보낸 까닭 문자열을 읽습니다. 모르는 값은 `network`입니다. */
export function chatStreamEndReasonOf(raw: unknown): ChatStreamEndReason {
  return endReasons.find((reason) => reason === raw) ?? "network";
}

type Live = { readonly handlers: ChatStreamHandlers; lastSeq: number };

function safely(call: () => void): void {
  try {
    call();
  } catch {
    // 핸들러의 실패는 다른 스트림 · 호스트 이벤트 흐름을 막지 않습니다.
  }
}

export function createChatStreamClient(deps: ChatStreamClientDeps): ChatStreamClient {
  const live = new Map<string, Live>();
  let unsubscribes: (() => void)[] | null = null;

  const finish = (streamId: string, reason: ChatStreamEndReason, detail: string | null): void => {
    const stream = live.get(streamId);
    if (stream === undefined) return;
    live.delete(streamId);
    safely(() => stream.handlers.onEnd(reason, detail));
  };

  const onOpen = (args: readonly unknown[]): void => {
    const [streamId, status] = args;
    if (typeof streamId !== "string" || typeof status !== "number") return;
    const stream = live.get(streamId);
    if (stream !== undefined) safely(() => stream.handlers.onOpen(status));
  };

  const onEvent = (args: readonly unknown[]): void => {
    const [streamId, seq, text] = args;
    if (typeof streamId !== "string" || typeof seq !== "number" || typeof text !== "string") return;
    const stream = live.get(streamId);
    if (stream === undefined || seq <= stream.lastSeq) return;
    stream.lastSeq = seq;
    const event = parseSseBlock(text);
    if (event !== null) safely(() => stream.handlers.onEvent(event, seq));
  };

  const onEnd = (args: readonly unknown[]): void => {
    const [streamId, reason, detail] = args;
    if (typeof streamId !== "string") return;
    finish(streamId, chatStreamEndReasonOf(reason), typeof detail === "string" ? detail : null);
  };

  /** 셋 모두 걸렸을 때만 구독을 확정합니다. 하나라도 던지면 걸었던 것을 걷고 false입니다. */
  const ensureSubscribed = (): boolean => {
    if (unsubscribes !== null) return true;
    const made: (() => void)[] = [];
    try {
      made.push(deps.subscribe(chatStreamOpenEventName, onOpen));
      made.push(deps.subscribe(chatStreamEventEventName, onEvent));
      made.push(deps.subscribe(chatStreamEndEventName, onEnd));
    } catch {
      for (const unsubscribe of made) safely(unsubscribe);
      return false;
    }
    unsubscribes = made;
    return true;
  };

  const open = (request: ChatStreamRequest, handlers: ChatStreamHandlers): ChatStreamHandle => {
    const streamId = deps.newStreamId();
    live.set(streamId, { handlers, lastSeq: -1 });
    const unavailable = (): void => {
      void Promise.resolve().then(() => finish(streamId, "unavailable", null));
    };
    const native = ensureSubscribed() ? deps.native : null;
    if (native === null) {
      unavailable();
    } else {
      try {
        native.open(streamId, request.url, request.headers, request.body);
      } catch {
        unavailable();
      }
    }
    return {
      streamId,
      cancel: () => {
        if (!live.has(streamId)) return;
        safely(() => native?.cancel(streamId));
        finish(streamId, "cancelled", null);
      },
    };
  };

  const dispose = (): void => {
    // 열린 호스트 스트림도 닫습니다 — 받지 않을 연결을 서버가 끝낼 때까지 두지 않습니다.
    for (const streamId of live.keys()) safely(() => deps.native?.cancel(streamId));
    for (const unsubscribe of unsubscribes ?? []) safely(unsubscribe);
    unsubscribes = null;
    live.clear();
  };

  return { open, dispose };
}

function nativeChatStream(): ChatStreamNative | null {
  try {
    // `NativeModules`가 없거나 `null`인 경우는 `storage.ts`의 가드와 같은 이유입니다.
    if (typeof NativeModules === "undefined" || NativeModules === null) return null;
    const module = (NativeModules as Record<string, unknown>)["ChatStreamModule"] as
      | { open?: unknown; cancel?: unknown }
      | null
      | undefined;
    if (typeof module?.open !== "function" || typeof module.cancel !== "function") return null;
    const open = module.open as ChatStreamNative["open"];
    const cancel = module.cancel as ChatStreamNative["cancel"];
    return {
      open: (streamId, url, headers, body) => open.call(module, streamId, url, headers, body),
      cancel: (streamId) => cancel.call(module, streamId),
    };
  } catch {
    return null;
  }
}

type GlobalEventEmitter = {
  addListener: (name: string, listener: (...args: unknown[]) => void) => void;
  removeListener: (name: string, listener: (...args: unknown[]) => void) => void;
};

function subscribeGlobalEvent(
  eventName: string,
  listener: (args: readonly unknown[]) => void,
): () => void {
  const emitter = lynx.getJSModule("GlobalEventEmitter") as unknown as GlobalEventEmitter;
  // 호스트는 인자 배열 하나를 보내고, 이미터는 그것을 펼쳐 넘깁니다.
  const forward = (...args: unknown[]): void => listener(args);
  emitter.addListener(eventName, forward);
  return () => emitter.removeListener(eventName, forward);
}

let shared: ChatStreamClient | null = null;
let counter = 0;

/** 앱 결선입니다. 모듈 싱글턴 하나를 돌려줍니다(background 스레드에서만 부릅니다). */
export function chatStreamClient(): ChatStreamClient {
  shared ??= createChatStreamClient({
    native: nativeChatStream(),
    subscribe: subscribeGlobalEvent,
    newStreamId: () => `chat-stream-${Date.now().toString(36)}-${(counter++).toString(36)}`,
  });
  return shared;
}
