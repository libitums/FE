import { describe, expect, it, vi } from "vitest";

import type {
  ChatStreamEndReason,
  ChatStreamHandlers,
  ChatStreamNative,
  ChatStreamSseEvent,
} from "./chat-stream.contract";
import {
  chatStreamEndEventName,
  chatStreamEndReasonOf,
  chatStreamEventEventName,
  chatStreamOpenEventName,
  createChatStreamClient,
  parseSseBlock,
} from "./chat-stream";

describe("parseSseBlock", () => {
  it("CS-U1 event · id · data를 푼다", () => {
    expect(parseSseBlock('event: delta\nid: 3\ndata: {"text":"안녕"}')).toEqual({
      event: "delta",
      id: "3",
      data: '{"text":"안녕"}',
    });
  });

  it("CS-U2 event가 없으면 message, data 여러 줄은 \\n으로 잇는다", () => {
    expect(parseSseBlock("data: a\ndata: b")).toEqual({ event: "message", id: null, data: "a\nb" });
  });

  it("CS-U3 주석 줄만 있는 블록(ping)은 null", () => {
    expect(parseSseBlock(": ping")).toBeNull();
    expect(parseSseBlock("")).toBeNull();
  });

  it("CS-U4 CRLF · CR 줄바꿈과 콜론 뒤 공백 하나만 걷는다", () => {
    expect(parseSseBlock("event: done\r\ndata:  x\r\n")).toEqual({
      event: "done",
      id: null,
      data: " x",
    });
    expect(parseSseBlock("event: done\rdata:y")).toEqual({ event: "done", id: null, data: "y" });
  });

  it("CS-U5 주석 줄은 섞여 있어도 무시하고, 모르는 필드는 버린다", () => {
    expect(parseSseBlock(": ping\nretry: 10\nevent: state\ndata: {}")).toEqual({
      event: "state",
      id: null,
      data: "{}",
    });
  });
});

describe("chatStreamEndReasonOf", () => {
  it("CS-U6 아는 까닭은 그대로, 모르는 값은 network", () => {
    const known: ChatStreamEndReason[] = [
      "complete",
      "cancelled",
      "http-error",
      "network",
      "timeout-connect",
      "timeout-idle",
      "unavailable",
    ];
    for (const reason of known) expect(chatStreamEndReasonOf(reason)).toBe(reason);
    expect(chatStreamEndReasonOf("weird")).toBe("network");
    expect(chatStreamEndReasonOf(undefined)).toBe("network");
  });
});

type Recorded = {
  opens: number[];
  events: { event: ChatStreamSseEvent; seq: number }[];
  ends: { reason: ChatStreamEndReason; detail: string | null }[];
};

function recorder(): { handlers: ChatStreamHandlers; rec: Recorded } {
  const rec: Recorded = { opens: [], events: [], ends: [] };
  return {
    rec,
    handlers: {
      onOpen: (status) => rec.opens.push(status),
      onEvent: (event, seq) => rec.events.push({ event, seq }),
      onEnd: (reason, detail) => rec.ends.push({ reason, detail }),
    },
  };
}

function harness(native: ChatStreamNative | null = { open: vi.fn(), cancel: vi.fn() }) {
  const listeners = new Map<string, (args: readonly unknown[]) => void>();
  const unsubscribed: string[] = [];
  let next = 0;
  const client = createChatStreamClient({
    native,
    subscribe: (name, listener) => {
      listeners.set(name, listener);
      return () => {
        unsubscribed.push(name);
        listeners.delete(name);
      };
    },
    newStreamId: () => `s${next++}`,
  });
  const emit = (name: string, args: readonly unknown[]) => listeners.get(name)?.(args);
  return { client, native, listeners, unsubscribed, emit };
}

const request = { url: "https://x/functions/v1/chat-send", headers: { a: "b" }, body: "{}" };

describe("createChatStreamClient", () => {
  it("CS-U7 open은 새 id로 호스트를 열고, 이벤트 셋을 한 번만 구독한다", () => {
    const h = harness();
    const first = h.client.open(request, recorder().handlers);
    const second = h.client.open(request, recorder().handlers);
    expect(first.streamId).toBe("s0");
    expect(second.streamId).toBe("s1");
    expect(h.native?.open).toHaveBeenCalledWith("s0", request.url, request.headers, "{}");
    expect([...h.listeners.keys()].sort()).toEqual(
      [chatStreamEndEventName, chatStreamEventEventName, chatStreamOpenEventName].sort(),
    );
  });

  it("CS-U8 이벤트를 streamId별로 나눠 넘기고, ping 블록은 넘기지 않는다", () => {
    const h = harness();
    const a = recorder();
    const b = recorder();
    h.client.open(request, a.handlers);
    h.client.open(request, b.handlers);
    h.emit(chatStreamOpenEventName, ["s0", 200]);
    h.emit(chatStreamEventEventName, ["s0", 0, "event: delta\ndata: 1"]);
    h.emit(chatStreamEventEventName, ["s1", 0, "event: delta\ndata: 2"]);
    h.emit(chatStreamEventEventName, ["s0", 1, ": ping"]);
    h.emit(chatStreamEventEventName, ["zz", 0, "data: x"]);
    expect(a.rec.opens).toEqual([200]);
    expect(a.rec.events).toEqual([{ event: { event: "delta", id: null, data: "1" }, seq: 0 }]);
    expect(b.rec.events.map((e) => e.event.data)).toEqual(["2"]);
  });

  it("CS-U9 이미 본 seq 이하는 버린다", () => {
    const h = harness();
    const a = recorder();
    h.client.open(request, a.handlers);
    h.emit(chatStreamEventEventName, ["s0", 0, "data: a"]);
    h.emit(chatStreamEventEventName, ["s0", 0, "data: a"]);
    h.emit(chatStreamEventEventName, ["s0", 2, "data: c"]);
    h.emit(chatStreamEventEventName, ["s0", 1, "data: b"]);
    expect(a.rec.events.map((e) => e.seq)).toEqual([0, 2]);
  });

  it("CS-U10 end는 한 번, 그 뒤 그 id의 이벤트는 버린다", () => {
    const h = harness();
    const a = recorder();
    h.client.open(request, a.handlers);
    h.emit(chatStreamEndEventName, ["s0", "http-error", '{"error":"invalid_session"}']);
    h.emit(chatStreamEndEventName, ["s0", "complete", null]);
    h.emit(chatStreamEventEventName, ["s0", 0, "data: late"]);
    expect(a.rec.ends).toEqual([{ reason: "http-error", detail: '{"error":"invalid_session"}' }]);
    expect(a.rec.events).toEqual([]);
  });

  it("CS-U11 cancel은 호스트를 닫고 바로 cancelled 한 번, 뒤 이벤트는 버린다", () => {
    const h = harness();
    const a = recorder();
    const handle = h.client.open(request, a.handlers);
    handle.cancel();
    handle.cancel();
    h.emit(chatStreamEventEventName, ["s0", 0, "data: late"]);
    h.emit(chatStreamEndEventName, ["s0", "cancelled", null]);
    expect(h.native?.cancel).toHaveBeenCalledTimes(1);
    expect(h.native?.cancel).toHaveBeenCalledWith("s0");
    expect(a.rec.ends).toEqual([{ reason: "cancelled", detail: null }]);
    expect(a.rec.events).toEqual([]);
  });

  it("CS-U12 호스트 모듈이 없으면 마이크로태스크 뒤 unavailable 한 번", async () => {
    const h = harness(null);
    const a = recorder();
    h.client.open(request, a.handlers);
    expect(a.rec.ends).toEqual([]);
    await Promise.resolve();
    expect(a.rec.ends).toEqual([{ reason: "unavailable", detail: null }]);
  });

  it("CS-U13 호스트 open이 던지면 unavailable, 클라이언트는 던지지 않는다", async () => {
    const h = harness({
      open: () => {
        throw new Error("boom");
      },
      cancel: vi.fn(),
    });
    const a = recorder();
    expect(() => h.client.open(request, a.handlers)).not.toThrow();
    await Promise.resolve();
    expect(a.rec.ends).toEqual([{ reason: "unavailable", detail: null }]);
  });

  it("CS-U14 핸들러가 던져도 다른 스트림은 계속 받는다", () => {
    const h = harness();
    const b = recorder();
    h.client.open(request, {
      onOpen: () => {},
      onEvent: () => {
        throw new Error("handler");
      },
      onEnd: () => {},
    });
    h.client.open(request, b.handlers);
    expect(() => h.emit(chatStreamEventEventName, ["s0", 0, "data: a"])).not.toThrow();
    h.emit(chatStreamEventEventName, ["s1", 0, "data: b"]);
    expect(b.rec.events.map((e) => e.event.data)).toEqual(["b"]);
  });

  it("CS-U15 모양이 틀린 호스트 인자는 버리고, 모르는 까닭은 network로 끝낸다", () => {
    const h = harness();
    const a = recorder();
    h.client.open(request, a.handlers);
    h.emit(chatStreamEventEventName, ["s0", "x", "data: a"]);
    h.emit(chatStreamEventEventName, ["s0", 0, 5]);
    h.emit(chatStreamOpenEventName, ["s0", "200"]);
    h.emit(chatStreamEndEventName, ["s0", "mystery", 7]);
    expect(a.rec.events).toEqual([]);
    expect(a.rec.opens).toEqual([]);
    expect(a.rec.ends).toEqual([{ reason: "network", detail: null }]);
  });

  it("CS-U17 구독이 던지면 open은 던지지 않고 unavailable로 끝나며, 걸었던 구독은 걷는다", async () => {
    const unsubscribed: string[] = [];
    let calls = 0;
    const native = { open: vi.fn(), cancel: vi.fn() };
    const client = createChatStreamClient({
      native,
      subscribe: (name) => {
        calls += 1;
        if (calls === 2) throw new Error("no emitter");
        return () => unsubscribed.push(name);
      },
      newStreamId: () => "s0",
    });
    const a = recorder();
    expect(() => client.open(request, a.handlers)).not.toThrow();
    expect(native.open).not.toHaveBeenCalled();
    expect(unsubscribed).toEqual([chatStreamOpenEventName]);
    await Promise.resolve();
    expect(a.rec.ends).toEqual([{ reason: "unavailable", detail: null }]);
  });

  it("CS-U18 dispose는 열린 호스트 스트림을 닫는다", () => {
    const h = harness();
    h.client.open(request, recorder().handlers);
    const second = h.client.open(request, recorder().handlers);
    second.cancel();
    h.client.dispose();
    expect(h.native?.cancel).toHaveBeenCalledTimes(2);
    expect(h.native?.cancel).toHaveBeenNthCalledWith(2, "s0");
  });

  it("CS-U16 dispose는 구독을 걷고 더 넘기지 않는다", () => {
    const h = harness();
    const a = recorder();
    h.client.open(request, a.handlers);
    h.client.dispose();
    expect(h.unsubscribed.sort()).toEqual(
      [chatStreamEndEventName, chatStreamEventEventName, chatStreamOpenEventName].sort(),
    );
    h.emit(chatStreamEventEventName, ["s0", 0, "data: a"]);
    expect(a.rec.events).toEqual([]);
  });
});
