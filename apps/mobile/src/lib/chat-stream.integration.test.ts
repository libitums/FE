import { afterEach, expect, test, vi } from "vitest";

import type { ChatStreamEndReason, ChatStreamSseEvent } from "./chat-stream.contract";

// `integration` 계층: 앱 결선 `chatStreamClient()`가 실제 `GlobalEventEmitter`(테스트 환경)로 호스트 이벤트를
// 받고 `NativeModules.ChatStreamModule`을 부르는지 봅니다. 호스트 모듈만 대역입니다.

type Emitter = { emit: (name: string, args: readonly unknown[]) => void };
const emitter = (): Emitter => lynx.getJSModule("GlobalEventEmitter") as unknown as Emitter;

function fakeModule() {
  const opened: unknown[][] = [];
  const cancelled: string[] = [];
  return {
    opened,
    cancelled,
    module: {
      open: (...args: unknown[]) => {
        opened.push(args);
      },
      cancel: (streamId: string) => {
        cancelled.push(streamId);
      },
    },
  };
}

async function freshClient() {
  vi.resetModules();
  const mod = await import("./chat-stream");
  return mod;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

test("CS-I1 호스트를 열고, 전역 이벤트 셋을 그 스트림의 콜백으로 받는다", async () => {
  const fake = fakeModule();
  vi.stubGlobal("NativeModules", { ChatStreamModule: fake.module });
  const { chatStreamClient } = await freshClient();
  const opens: number[] = [];
  const events: ChatStreamSseEvent[] = [];
  const ends: ChatStreamEndReason[] = [];

  const handle = chatStreamClient().open(
    { url: "https://x/functions/v1/chat-send", headers: { Authorization: "Bearer t" }, body: "{}" },
    {
      onOpen: (status) => opens.push(status),
      onEvent: (event) => events.push(event),
      onEnd: (reason) => ends.push(reason),
    },
  );

  expect(fake.opened).toEqual([
    [handle.streamId, "https://x/functions/v1/chat-send", { Authorization: "Bearer t" }, "{}"],
  ]);
  emitter().emit("chatStreamOpen", [handle.streamId, 200]);
  emitter().emit("chatStreamEvent", [
    handle.streamId,
    0,
    'event: delta\ndata: {"text":"안녕하세요"}',
  ]);
  emitter().emit("chatStreamEvent", [handle.streamId, 1, ": ping"]);
  emitter().emit("chatStreamEnd", [handle.streamId, "complete", null]);

  expect(opens).toEqual([200]);
  expect(events).toEqual([{ event: "delta", id: null, data: '{"text":"안녕하세요"}' }]);
  expect(ends).toEqual(["complete"]);
});

test("CS-I2 취소하면 호스트 cancel을 부르고 cancelled 한 번으로 끝난다", async () => {
  const fake = fakeModule();
  vi.stubGlobal("NativeModules", { ChatStreamModule: fake.module });
  const { chatStreamClient } = await freshClient();
  const ends: ChatStreamEndReason[] = [];
  const handle = chatStreamClient().open(
    { url: "https://x", headers: {}, body: "{}" },
    { onOpen: () => {}, onEvent: () => {}, onEnd: (reason) => ends.push(reason) },
  );

  handle.cancel();
  emitter().emit("chatStreamEnd", [handle.streamId, "cancelled", null]);

  expect(fake.cancelled).toEqual([handle.streamId]);
  expect(ends).toEqual(["cancelled"]);
});

test("CS-I3 호스트에 모듈이 없으면 unavailable로 끝나고 던지지 않는다", async () => {
  vi.stubGlobal("NativeModules", {});
  const { chatStreamClient } = await freshClient();
  const ends: ChatStreamEndReason[] = [];
  chatStreamClient().open(
    { url: "https://x", headers: {}, body: "{}" },
    { onOpen: () => {}, onEvent: () => {}, onEnd: (reason) => ends.push(reason) },
  );
  await vi.waitFor(() => expect(ends).toEqual(["unavailable"]));
});
