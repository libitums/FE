import { expect, test } from "vitest";

import { createFixtureChatSource } from "../screens/messenger-chat/chat-fixture-source";
import type { ChatFixtureRoom } from "../screens/messenger-chat/chat-source.contract";
import { foregroundChatPushRoom } from "./foreground-push";

// `unit` 계층(FP-U1 ~ U3): 앱이 앞에 있을 때 호스트가 넘긴 채팅 푸시의 인물 id → 다시 읽을 방(ADR-0200 개정).

const room = (id: string, over: Partial<ChatFixtureRoom> = {}): ChatFixtureRoom => ({
  roomId: `room-${id}`,
  counterpart: { id, name: id, avatarPath: null },
  access: { kind: "open" },
  unread: 0,
  messages: [],
  storyPoints: [],
  settings: { autoIdeas: true, storyPointId: "" },
  ideaSets: [],
  cannedReplies: [],
  photoPath: null,
  voiceLine: { durationMs: 1000, text: { ko: "네", en: "Yes" } },
  ...over,
});

const source = createFixtureChatSource({
  imageUrlOf: () => null,
  seed: {
    rooms: [room("mina"), room("clerk", { access: { kind: "locked", unlockEpisode: 4 } })],
    birthYear: { kind: "set", year: 2000 },
  },
  now: () => 1_800_000_000_000,
  timers: { setTimeout: () => 0, clearTimeout: () => undefined },
});

test("FP-U1 열 수 있는 방이 있는 인물이면 그 방 id", () => {
  expect(foregroundChatPushRoom(source, "mina")).toBe("room-mina");
});

test("FP-U2 인물 id 형식이 틀리면(빈 값 · 대문자 · 숫자 · 65자) 없음", () => {
  for (const raw of ["", "Mina", 7, null, undefined, "a".repeat(65), { id: "mina" }])
    expect(foregroundChatPushRoom(source, raw)).toBeNull();
});

test("FP-U3 기기에 방이 없거나 잠긴 인물이면 없음", () => {
  expect(foregroundChatPushRoom(source, "nobody")).toBeNull();
  expect(foregroundChatPushRoom(source, "clerk")).toBeNull();
});
