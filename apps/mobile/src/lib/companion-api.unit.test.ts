import { describe, expect, test, vi } from "vitest";

import type {
  ChatStreamClient,
  ChatStreamHandlers,
  ChatStreamRequest,
} from "./chat-stream.contract";
import { createCompanionRemote, type CompanionRemoteDeps } from "./companion-api";

// `unit` 계층(SA-U1 ~ U5): 컴패니언 서버 요청 모양 · 실패 처리(ADR-0137).

const config = { url: "https://example.supabase.co", anonKey: "anon" };

function setup(over: Partial<CompanionRemoteDeps> = {}) {
  const requests: {
    url: string;
    init: { method: string; headers: Record<string, string>; body?: string };
  }[] = [];
  let streamRequest: ChatStreamRequest | null = null;
  let streamHandlers: ChatStreamHandlers | null = null;
  const cancel = vi.fn<() => void>();
  const stream: ChatStreamClient = {
    open: (request, handlers) => {
      streamRequest = request;
      streamHandlers = handlers;
      return { streamId: "s1", cancel };
    },
    dispose: () => undefined,
  };
  const deps: CompanionRemoteDeps = {
    token: async () => "tok",
    config: () => config,
    post: async (build) => {
      const built = build(config);
      requests.push(built as never);
      return { ok: true, status: 200, bodyText: JSON.stringify({ messages: [], hasMore: false }) };
    },
    stream: () => stream,
    now: () => 1_000,
    ...over,
  };
  return {
    remote: createCompanionRemote(deps),
    requests,
    cancel,
    stream: () => ({ request: streamRequest, handlers: streamHandlers }),
  };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("기록 · 인사", () => {
  test("SA-U1 기록은 RPC companion_list_messages(인물 · 최근 30)를 토큰으로 부른다", async () => {
    const { remote, requests } = setup();
    expect(await remote.loadHistory("duksu")).toEqual({
      messages: [],
      corrections: {},
      ideas: null,
    });
    expect(requests[0]?.url).toBe(
      "https://example.supabase.co/rest/v1/rpc/companion_list_messages",
    );
    expect(requests[0]?.init.headers.Authorization).toBe("Bearer tok");
    expect(JSON.parse(requests[0]?.init.body ?? "")).toEqual({
      p_character_id: "duksu",
      p_before: null,
      p_limit: 30,
    });
  });

  test("SA-U2 인사는 companion-greet에 character_id만 보낸다", async () => {
    const { remote, requests } = setup();
    await remote.greet("mina");
    expect(requests[0]?.url).toBe("https://example.supabase.co/functions/v1/companion-greet");
    expect(JSON.parse(requests[0]?.init.body ?? "")).toEqual({ character_id: "mina" });
  });

  test("SA-U3 로그인이 없거나 실패 응답이면 null, 던지지 않는다", async () => {
    expect(await setup({ token: async () => null }).remote.loadHistory("duksu")).toBeNull();
    expect(
      await setup({
        post: async () => ({ ok: true, status: 500, bodyText: "x" }),
      }).remote.loadHistory("duksu"),
    ).toBeNull();
    expect(
      await setup({
        post: async () => {
          throw new Error("boom");
        },
      }).remote.greet("duksu"),
    ).toBeNull();
  });
});

describe("턴", () => {
  test("SA-U4 chat-send SSE를 계약 판 · 인물 · 멱등 id · 글로 연다, 이벤트는 이름 · 본문으로 넘긴다", async () => {
    const { remote, stream } = setup();
    const onEvent = vi.fn<(event: string, data: string) => void>();
    const onEnd = vi.fn<(reason: string, detail: string | null) => void>();
    remote.openTurn(
      { characterId: "duksu", text: "안녕하세요", clientMessageId: "c1" },
      { onOpen: () => undefined, onEvent, onEnd },
    );
    await flush();
    const { request, handlers } = stream();
    expect(request?.url).toBe("https://example.supabase.co/functions/v1/chat-send");
    expect(request?.headers.Authorization).toBe("Bearer tok");
    expect(request?.headers.Accept).toBe("text/event-stream");
    expect(JSON.parse(request?.body ?? "")).toEqual({
      contract_version: 1,
      character_id: "duksu",
      client_message_id: "c1",
      text: "안녕하세요",
      input_mode: "text",
    });
    handlers?.onEvent({ event: "delta", id: "1", data: "{}" }, 1);
    handlers?.onEnd("complete", null);
    handlers?.onEnd("complete", null);
    expect(onEvent).toHaveBeenCalledWith("delta", "{}");
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  test("SA-U5 로그인이 없으면 invalid_session으로 한 번 끝나고, 열기 전 취소는 cancelled", async () => {
    const onEnd = vi.fn<(reason: string, detail: string | null) => void>();
    setup({ token: async () => null }).remote.openTurn(
      { characterId: "duksu", text: "x", clientMessageId: "c" },
      { onOpen: () => undefined, onEvent: () => undefined, onEnd },
    );
    await flush();
    expect(onEnd).toHaveBeenCalledWith("http-error", JSON.stringify({ error: "invalid_session" }));

    const onEnd2 = vi.fn<(reason: string, detail: string | null) => void>();
    const { remote, cancel } = setup();
    const handle = remote.openTurn(
      { characterId: "duksu", text: "x", clientMessageId: "c" },
      { onOpen: () => undefined, onEvent: () => undefined, onEnd: onEnd2 },
    );
    handle.cancel();
    await flush();
    expect(onEnd2).toHaveBeenCalledTimes(1);
    expect(onEnd2).toHaveBeenCalledWith("cancelled", null);
    expect(cancel).not.toHaveBeenCalled();
  });

  test("ES-U10 오프라인이면 스트림을 열지 않고 network로 한 번 끝난다(ADR-0138)", async () => {
    const onEnd = vi.fn<(reason: string, detail: string | null) => void>();
    const opened = vi.fn<() => void>();
    const { remote } = setup({
      isOffline: () => true,
      stream: () => ({
        open: () => {
          opened();
          return { streamId: "s", cancel: () => undefined };
        },
        dispose: () => undefined,
      }),
    });
    remote.openTurn(
      { characterId: "duksu", text: "x", clientMessageId: "c" },
      { onOpen: () => undefined, onEvent: () => undefined, onEnd },
    );
    await flush();
    expect(opened).not.toHaveBeenCalled();
    expect(onEnd).toHaveBeenCalledTimes(1);
    expect(onEnd).toHaveBeenCalledWith("network", null);
  });
});
