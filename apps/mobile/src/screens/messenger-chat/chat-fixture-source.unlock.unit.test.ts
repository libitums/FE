import { describe, expect, test, vi } from "vitest";

import { chatFixtureSeed } from "./chat-fixture";
import { fakeTimers } from "./chat-fixture-timers.test-support";
import { createFixtureChatSource } from "./chat-fixture-source";
import { orderChatRooms } from "./chat-list";
import type { ChatRoomSummary, ChatSource, ChatThread } from "./chat-source.contract";

// `unit` 계층(MC2-U20): 가짜 출처의 인물 해금 · NEW · 재시작 뒤 모습(messenger-chat-1-5 spec §5.1).
// 기본 씨앗(chatFixtureSeed)으로 돌린다 — 미나는 잠긴 채 시작한다.

const NOW = 1_800_000_000_000;

function setup(unlocked?: readonly string[]) {
  const timers = fakeTimers();
  const source = createFixtureChatSource({
    imageUrlOf: (path) => `url:${path}`,
    seed: chatFixtureSeed,
    now: () => NOW,
    timers,
    ...(unlocked === undefined ? {} : { unlocked }),
  });
  return { source, timers };
}

const summaryOf = (source: ChatSource, roomId: string): ChatRoomSummary => {
  const found = source.snapshot().rooms.find((room) => room.roomId === roomId);
  expect(found, `summary(${roomId})`).toBeDefined();
  return found as ChatRoomSummary;
};
const threadOf = (source: ChatSource, roomId: string): ChatThread => {
  const thread = source.thread(roomId);
  expect(thread, `thread(${roomId})`).not.toBeNull();
  return thread as ChatThread;
};
const minaOpening = () => chatFixtureSeed.rooms.find((room) => room.roomId === "mina")?.opening;

describe("기본 씨앗의 미나 (MC2-U20)", () => {
  test("MC2-U20. 미나는 에피소드 3 에서 열리는 잠긴 방이고 메시지가 0 이다", () => {
    const { source } = setup();
    const mina = summaryOf(source, "mina");
    expect(mina.access).toEqual({ kind: "locked", unlockEpisode: 3 });
    expect(mina.lastMessage).toBeNull();
    expect(mina.unread).toBe(0);
    expect(mina.isNew).toBe(false);
    expect(threadOf(source, "mina").messages).toEqual([]);
  });

  test("MC2-U20. 잠긴 미나에게는 보낼 수 없다(무동작)", () => {
    const { source } = setup();
    source.sendText("mina", "안녕");
    expect(threadOf(source, "mina").messages).toEqual([]);
  });
});

describe("unlockCharacter (MC2-U20)", () => {
  test("MC2-U20. 해금하면 unlocked 이고 방이 열린다", () => {
    const { source } = setup();
    expect(source.unlockCharacter("mina")).toEqual({ kind: "unlocked", roomId: "mina" });
    expect(summaryOf(source, "mina").access).toEqual({ kind: "open" });
  });

  test("MC2-U20. 로그에는 opening 한 줄(상대, 지금 시각)만 놓인다", () => {
    const { source } = setup();
    const opening = minaOpening();
    expect(opening).toBeDefined();
    source.unlockCharacter("mina");
    const messages = threadOf(source, "mina").messages;
    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({ kind: "text", from: "them", at: NOW, text: opening });
  });

  test("MC2-U20. 안 읽은 1 · NEW · 갱신 시각이 지금이라 목록 맨 위로 온다", () => {
    const { source } = setup();
    source.unlockCharacter("mina");
    const mina = summaryOf(source, "mina");
    expect(mina.unread).toBe(1);
    expect(mina.isNew).toBe(true);
    expect(mina.updatedAt).toBe(NOW);
    expect(orderChatRooms(source.snapshot().rooms)[0]?.roomId).toBe("mina");
  });

  test("MC2-U20. 구독자에게 한 번 알린다", () => {
    const { source } = setup();
    const listener = vi.fn<() => void>();
    source.subscribe(listener);
    source.unlockCharacter("mina");
    expect(listener).toHaveBeenCalledTimes(1);
  });

  test("MC2-U20. 다시 부르면 already-open 이고 아무것도 바뀌지 않는다", () => {
    const { source } = setup();
    source.unlockCharacter("mina");
    const before = threadOf(source, "mina");
    const listener = vi.fn<() => void>();
    source.subscribe(listener);
    expect(source.unlockCharacter("mina")).toEqual({ kind: "already-open", roomId: "mina" });
    expect(listener).not.toHaveBeenCalled();
    expect(threadOf(source, "mina")).toBe(before);
    expect(threadOf(source, "mina").messages).toHaveLength(1);
  });

  test("MC2-U20. 처음부터 열린 인물(사장님)은 already-open 이다", () => {
    const { source } = setup();
    expect(source.unlockCharacter("owner")).toEqual({ kind: "already-open", roomId: "owner" });
  });

  test("MC2-U20. 모르는 id 는 unknown 이고 던지지 않는다", () => {
    const { source } = setup();
    expect(() => source.unlockCharacter("nobody")).not.toThrow();
    expect(source.unlockCharacter("nobody")).toEqual({ kind: "unknown" });
    expect(source.unlockCharacter("")).toEqual({ kind: "unknown" });
  });

  test("MC2-U20. opening 이 없는 인물(점원)은 열리지만 로그는 빈 채이고 안 읽음이 없다", () => {
    const { source } = setup();
    expect(source.unlockCharacter("clerk")).toEqual({ kind: "unlocked", roomId: "clerk" });
    expect(threadOf(source, "clerk").messages).toEqual([]);
    expect(summaryOf(source, "clerk").unread).toBe(0);
  });

  test("MC2-U20. 지운 방은 해금되지 않는다(unknown)", () => {
    const { source } = setup();
    source.deleteRoom("mina");
    expect(source.unlockCharacter("mina")).toEqual({ kind: "unknown" });
  });
});

describe("openRoom 과 NEW (MC2-U20)", () => {
  test("MC2-U20. 방을 열면 NEW 가 사라지고 안 읽음이 0 이 된다", () => {
    const { source } = setup();
    source.unlockCharacter("mina");
    expect(summaryOf(source, "mina").isNew).toBe(true);
    source.openRoom("mina");
    const mina = summaryOf(source, "mina");
    expect(mina.isNew).toBe(false);
    expect(mina.unread).toBe(0);
  });

  test("MC2-U20. 이미 그 방이 열려 있을 때 해금되면 안 읽음은 0 이다", () => {
    const { source } = setup();
    source.openRoom("mina");
    source.unlockCharacter("mina");
    expect(summaryOf(source, "mina").unread).toBe(0);
    expect(threadOf(source, "mina").messages).toHaveLength(1);
  });
});

describe("options.unlocked (MC2-U20)", () => {
  test("MC2-U20. 재시작 뒤 모습 — 처음부터 열린 채이고 opening 하나 · 안 읽음 0 · NEW 아님이다", () => {
    const { source } = setup(["mina"]);
    const mina = summaryOf(source, "mina");
    expect(mina.access).toEqual({ kind: "open" });
    expect(mina.unread).toBe(0);
    expect(mina.isNew).toBe(false);
    const messages = threadOf(source, "mina").messages;
    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({ from: "them", text: minaOpening() });
  });

  test("MC2-U20. 이미 열린 채 시작한 인물을 다시 해금하면 already-open 이다", () => {
    const { source } = setup(["mina"]);
    expect(source.unlockCharacter("mina")).toEqual({ kind: "already-open", roomId: "mina" });
  });

  test("MC2-U20. 목록에 없는 id 는 무시된다(던지지 않는다)", () => {
    expect(() => setup(["nobody"])).not.toThrow();
    const { source } = setup(["nobody"]);
    expect(summaryOf(source, "mina").access.kind).toBe("locked");
  });
});

describe("dispose (MC2-U20)", () => {
  test("MC2-U20. 해금한 뒤 걸린 뜻 타이머도 dispose 뒤에는 0 이다", () => {
    const { source, timers } = setup();
    expect(source.unlockCharacter("mina")).toEqual({ kind: "unlocked", roomId: "mina" });
    source.sendText("mina", "안녕하세요");
    const mine = threadOf(source, "mina").messages.find(
      (m) => m.kind === "text" && m.from === "me",
    );
    expect(mine).toBeDefined();
    source.requestMeaning("mina", (mine as { id: string }).id);
    expect(timers.pending()).toBeGreaterThan(0);
    source.dispose();
    expect(timers.pending()).toBe(0);
  });
});
