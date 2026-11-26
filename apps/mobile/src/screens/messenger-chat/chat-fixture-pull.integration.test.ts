import { describe, expect, test } from "vitest";

import { createFixtureChatSource } from "./chat-fixture-source";
import { fakeTimers } from "./chat-fixture-timers.test-support";
import type { ChatRemote, RemoteHistory } from "./chat-remote.contract";
import type { ChatMessage } from "./chat-source.contract";
import { companionSeed } from "./companion-roster";

// `integration` 계층(FP-I1 ~ I7, ADR-0200 개정): 앱이 앞에 있을 때 온 인물의 채팅 메시지 푸시 → 출처가 그 방 기록을 다시 읽는다
// (`server.pullRoom`). 닫힌 방에 새 인물 말이 서면 안 읽음 하나(토스트의 원천 — 답 한 턴과 같다), 이미 있는 말(SSE로 먼저 옴)이면
// 그대로, 열린 방은 조용히 다시 읽기, 답을 기다리는 중이면 읽지 않음, 못 읽으면 잠시 뒤 다시.

const P1 = "33333333-3333-4333-8333-333333333333";
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
const them = (id: string, ko: string): ChatMessage => ({
  id,
  at: 1,
  kind: "text",
  from: "them",
  text: { ko, en: "" },
});
const page = (messages: ChatMessage[]): RemoteHistory => ({
  messages,
  corrections: {},
  ideas: null,
});
const texts = (messages: readonly ChatMessage[] | undefined) =>
  (messages ?? []).map((m) => (m.kind === "text" ? `${m.from}:${m.text.ko}` : m.kind));

function setup(histories: (RemoteHistory | null | Error)[]) {
  const queue = [...histories];
  let historyCalls = 0;
  const remote: ChatRemote = {
    loadHistory: async () => {
      historyCalls += 1;
      const next = queue.length > 0 ? (queue.shift() ?? null) : page([]);
      if (next instanceof Error) throw next;
      return next;
    },
    greet: async () => null,
    openTurn: () => ({ cancel: () => undefined }),
  };
  const timers = fakeTimers();
  const source = createFixtureChatSource({
    imageUrlOf: () => null,
    seed: companionSeed(),
    now: () => 1_000,
    timers,
    remote,
  });
  const unread = (roomId: string) =>
    source.snapshot().rooms.find((room) => room.roomId === roomId)?.unread ?? -1;
  return { source, timers, unread, historyCalls: () => historyCalls };
}

describe("앞에서 받은 채팅 푸시 — 그 방 다시 읽기", () => {
  test("FP-I1 닫힌 방에 새 인물 말이 서면 합치고 안 읽음을 하나 올린다(말풍선이 둘이어도 하나)", async () => {
    const { source, unread, historyCalls } = setup([
      page([them(`${P1}#0`, "선톡!"), them(`${P1}#1`, "뭐 해?")]),
    ]);
    const before = unread("duksu");
    source.server?.pullRoom("duksu");
    await flush();
    expect(historyCalls()).toBe(1);
    expect(texts(source.thread("duksu")?.messages).slice(-2)).toEqual([
      "them:선톡!",
      "them:뭐 해?",
    ]);
    expect(unread("duksu")).toBe(before + 1);
  });

  test("FP-I2 이미 받은 말(SSE · 앞선 푸시)이면 안 읽음을 올리지 않는다 — 같은 메시지는 한 번", async () => {
    const same = page([them(`${P1}#0`, "선톡!")]);
    const { source, unread } = setup([same, same]);
    source.server?.pullRoom("duksu");
    await flush();
    const once = unread("duksu");
    source.server?.pullRoom("duksu");
    await flush();
    expect(unread("duksu")).toBe(once);
    expect(texts(source.thread("duksu")?.messages).filter((t) => t === "them:선톡!")).toHaveLength(
      1,
    );
  });

  test("FP-I3 열린 방이면 조용히 다시 읽어 새 말을 합치고 안 읽음은 0", async () => {
    const { source, unread } = setup([page([]), page([them(`${P1}#0`, "선톡!")])]);
    source.openRoom("duksu");
    await flush();
    source.server?.pullRoom("duksu");
    await flush();
    expect(texts(source.thread("duksu")?.messages)).toContain("them:선톡!");
    expect(unread("duksu")).toBe(0);
  });

  test("FP-I4 그 방이 답을 기다리는 중이면 읽지 않는다(답은 SSE가 가져온다)", async () => {
    const { source, historyCalls } = setup([page([])]);
    source.openRoom("duksu");
    await flush();
    source.sendText("duksu", "안녕");
    source.closeRoom("duksu");
    const calls = historyCalls();
    source.server?.pullRoom("duksu");
    await flush();
    expect(historyCalls()).toBe(calls);
  });

  test("FP-I5 기록을 못 읽으면 2초 뒤 한 번 더 읽어 채운다", async () => {
    const { source, timers, unread, historyCalls } = setup([
      null,
      page([them(`${P1}#0`, "선톡!")]),
    ]);
    const before = unread("duksu");
    source.server?.pullRoom("duksu");
    await flush();
    expect(unread("duksu")).toBe(before);
    timers.advance(2_000);
    await flush();
    expect(historyCalls()).toBe(2);
    expect(unread("duksu")).toBe(before + 1);
  });

  test("FP-I6 없는 방 · 잠긴 방은 읽지 않는다", async () => {
    const { source, historyCalls } = setup([]);
    const locked = source.snapshot().rooms.find((room) => room.access.kind !== "open");
    source.server?.pullRoom("no-such-room");
    if (locked !== undefined) source.server?.pullRoom(locked.roomId);
    await flush();
    expect(historyCalls()).toBe(0);
  });

  test("FP-I7 기록 읽기가 던져도(네트워크 오류) 삼키고 2초 뒤 한 번 더 읽어 채운다(리뷰 지적)", async () => {
    const { source, timers, unread, historyCalls } = setup([
      new Error("network"),
      page([them(`${P1}#0`, "선톡!")]),
    ]);
    const before = unread("duksu");
    source.server?.pullRoom("duksu");
    await flush();
    expect(unread("duksu")).toBe(before);
    timers.advance(2_000);
    await flush();
    expect(historyCalls()).toBe(2);
    expect(unread("duksu")).toBe(before + 1);
  });
});
