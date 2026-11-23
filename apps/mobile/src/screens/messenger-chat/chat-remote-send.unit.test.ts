import { expect, test } from "vitest";

import type { RoomState } from "./chat-fixture-room";
import { mediaLineId } from "./chat-media-rules";
import { mediaSender, type MediaSenderDeps } from "./chat-remote-send";
import type { ChatMessage } from "./chat-source.contract";

// `unit` 계층(CM-U20): 매체 요청의 자리표시자 — 같은 대상에 응답 전에 다시 요청해도(다시 만들기를 거듭 누름) 대기 줄의 시작 시각은
// 처음 요청한 때 그대로다(리뷰 #541). 대기 문구의 단계가 처음으로 돌아가지 않는다.

test("CM-U20 응답 전에 같은 대상에 다시 요청하면 자리표시자의 startedAt은 처음 값 그대로", async () => {
  let clock = 1_000;
  const room = { messages: [] as ChatMessage[] } as unknown as RoomState;
  const put: MediaSenderDeps["put"] = (target, line) => {
    target.messages = [...target.messages.filter((message) => message.id !== line.id), line];
  };
  const send = mediaSender({
    port: {
      // 응답이 오지 않는 요청.
      request: () => new Promise(() => undefined),
      load: async () => [],
      sign: async () => null,
      balance: async () => null,
    },
    now: () => clock,
    alive: () => true,
    put,
    replace: () => undefined,
    changed: () => undefined,
    noticeLine: () => ({ id: "n", at: 0, kind: "notice", notice: "x" }) as unknown as ChatMessage,
    accept: async () => undefined,
    emit: () => undefined,
    readBalance: () => undefined,
  });
  const target = { messageId: "a1", text: { ko: "네", en: "Yes" } };
  void send(room, target, "photo", true);
  clock = 7_000;
  void send(room, target, "photo", true);
  expect(room.messages).toEqual([
    { id: mediaLineId("a1", "photo", "req"), at: 7_000, kind: "photo-pending", startedAt: 1_000 },
  ]);
});
