import { describe, expect, test } from "vitest";

import { createFixtureChatSource } from "./chat-fixture-source";
import { fakeTimers } from "./chat-fixture-timers.test-support";
import type { ChatRemote, RemoteHistory, RemoteTurnHandlers } from "./chat-remote.contract";
import type { ChatMessage } from "./chat-source.contract";
import { companionSeed } from "./companion-roster";

// `integration` 계층(ES-I1 ~ I11): 서버 모드 배달 — 보내지 못한 글 · 끊긴 답 채우기 · 기록 실패(ADR-0138).

const U1 = "11111111-1111-4111-8111-111111111111";
const A1 = "22222222-2222-4222-8222-222222222222";
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
const them = (id: string, ko: string): ChatMessage => ({
  id,
  at: 1,
  kind: "text",
  from: "them",
  text: { ko, en: "" },
});
const mine = (id: string, ko: string): ChatMessage => ({
  id,
  at: 1,
  kind: "text",
  from: "me",
  text: { ko, en: "" },
});

type Turn = {
  readonly request: Parameters<ChatRemote["openTurn"]>[0];
  readonly handlers: RemoteTurnHandlers;
};

function setup(over: { histories?: (RemoteHistory | null)[]; greet?: () => Promise<null> } = {}) {
  const turns: Turn[] = [];
  const histories = [...(over.histories ?? [])];
  let historyCalls = 0;
  const readRooms: string[] = [];
  const remote: ChatRemote = {
    loadHistory: async (characterId) => {
      historyCalls += 1;
      readRooms.push(characterId);
      return histories.length > 0
        ? (histories.shift() ?? null)
        : { messages: [], corrections: {}, ideas: null };
    },
    greet: over.greet ?? (async () => null),
    openTurn: (request, handlers) => {
      turns.push({ request, handlers });
      return { cancel: () => undefined };
    },
  };
  const timers = fakeTimers();
  const source = createFixtureChatSource({
    imageUrlOf: () => null,
    seed: companionSeed(),
    now: () => 1_000,
    timers,
    remote,
  });
  const emit = (index: number, name: string, data: unknown) =>
    turns[index]?.handlers.onEvent(name, JSON.stringify(data));
  const end = (index: number, reason: string, detail: unknown = null) =>
    turns[index]?.handlers.onEnd(reason, detail === null ? null : JSON.stringify(detail));
  const thread = () => source.thread("duksu");
  const server = () => source.thread("duksu")?.server;
  return {
    source,
    turns,
    emit,
    end,
    thread,
    server,
    timers,
    historyCalls: () => historyCalls,
    readRooms,
    queue: (history: RemoteHistory | null) => histories.push(history),
  };
}

const texts = (messages: readonly ChatMessage[] | undefined) =>
  (messages ?? []).map((m) => (m.kind === "text" ? `${m.from}:${m.text.ko}` : m.kind));

describe("보내지 못한 글", () => {
  test("ES-I1 start 전에 끊기면 내 글은 Not sent로 남고 회색 줄은 없다", async () => {
    const { source, end, thread, server } = setup();
    source.openRoom("duksu");
    await flush();
    source.sendText("duksu", "안녕");
    end(0, "network");
    const id = thread()?.messages.at(-1)?.id ?? "";
    expect(texts(thread()?.messages)).toEqual(["me:안녕"]);
    expect(server()?.unsent).toEqual([id]);
    expect(thread()?.awaitingReply).toBe(false);
    expect(thread()?.typing).toBe(false);
  });

  test("ES-I2 다시 보내면 같은 client id로 가고, 성공하면 Not sent가 빠진다", async () => {
    const { source, turns, emit, end, thread, server } = setup();
    source.openRoom("duksu");
    await flush();
    source.sendText("duksu", "안녕");
    end(0, "timeout-connect");
    const id = server()?.unsent[0] ?? "";
    source.server?.resend("duksu", id);
    expect(turns[1]?.request.clientMessageId).toBe(turns[0]?.request.clientMessageId);
    expect(server()?.unsent).toEqual([]);
    expect(thread()?.awaitingReply).toBe(true);
    emit(1, "start", { userMessageId: U1, assistantMessageId: A1 });
    emit(1, "delta", { segment: 0, kind: "speech", text: "네" });
    emit(1, "done", { assistantMessageId: A1 });
    end(1, "complete");
    expect(texts(thread()?.messages)).toEqual(["me:안녕", "them:네"]);
    expect(thread()?.messages[0]?.id).toBe(U1);
  });

  test("ES-I3 Not sent가 있으면 새 글은 서버로 가지 않고 쌓이며, 다시 보내기는 위에서부터 차례로", async () => {
    const { source, turns, emit, end, server } = setup();
    source.openRoom("duksu");
    await flush();
    source.sendText("duksu", "하나");
    end(0, "network");
    source.sendText("duksu", "둘");
    expect(turns).toHaveLength(1);
    expect(server()?.unsent).toHaveLength(2);
    source.server?.resend("duksu", server()?.unsent[1] ?? "");
    expect(turns[1]?.request.text).toBe("하나");
    emit(1, "start", { userMessageId: U1, assistantMessageId: A1 });
    emit(1, "done", { assistantMessageId: A1 });
    end(1, "complete");
    expect(turns[2]?.request.text).toBe("둘");
    expect(server()?.unsent).toHaveLength(0);
  });

  test("ES-I4 Delete는 로그와 Not sent에서 뺀다", async () => {
    const { source, end, thread, server } = setup();
    source.openRoom("duksu");
    await flush();
    source.sendText("duksu", "안녕");
    end(0, "network");
    source.server?.discard("duksu", server()?.unsent[0] ?? "");
    expect(thread()?.messages).toEqual([]);
    expect(server()?.unsent).toEqual([]);
  });

  test("ES-I10 rate_limited는 Not sent + 줄, 받은 뒤 SSE error는 답 실패 줄", async () => {
    const { source, emit, end, thread, server } = setup();
    source.openRoom("duksu");
    await flush();
    source.sendText("duksu", "안녕");
    end(0, "http-error", { error: "rate_limited" });
    expect(server()?.unsent).toHaveLength(1);
    expect(thread()?.messages.at(-1)).toMatchObject({ kind: "notice", notice: "rate-limited" });
    source.server?.discard("duksu", server()?.unsent[0] ?? "");
    source.sendText("duksu", "또");
    emit(1, "start", { userMessageId: U1, assistantMessageId: A1 });
    emit(1, "error", { code: "guardrail_blocked" });
    end(1, "complete");
    expect(server()?.unsent).toEqual([]);
    expect(thread()?.messages.at(-1)).toMatchObject({ kind: "notice", notice: "cant-reply" });
  });
});

describe("끊긴 답 채우기", () => {
  test("ES-I5 start 뒤 끊기면 fetching → 기록에 답이 서면 서버 판으로 바뀌고 none", async () => {
    const full: RemoteHistory = {
      messages: [mine(U1, "안녕"), them(`${A1}#0`, "좋네요! 어디서 마셨어요?")],
      corrections: {},
      ideas: [{ ko: "카페요", roman: "", en: "A cafe" }],
    };
    const { source, emit, end, thread, server } = setup({
      histories: [{ messages: [], corrections: {}, ideas: null }, full],
    });
    source.openRoom("duksu");
    await flush();
    source.sendText("duksu", "안녕");
    emit(0, "start", { userMessageId: U1, assistantMessageId: A1 });
    emit(0, "delta", { segment: 0, kind: "speech", text: "좋네요! 어디서" });
    end(0, "network");
    expect(server()?.recovery).toBe("fetching");
    expect(server()?.unsent).toEqual([]);
    await flush();
    expect(server()?.recovery).toBe("none");
    expect(texts(thread()?.messages)).toEqual(["me:안녕", "them:좋네요! 어디서 마셨어요?"]);
    expect(thread()?.ideas).toEqual([{ ko: "카페요", roman: "", en: "A cafe" }]);
    expect(thread()?.messages.some((m) => m.kind === "notice")).toBe(false);
  });

  test("ES-I6 30초 안에 못 채우면 stalled, reload로 다시 시도", async () => {
    const { source, emit, end, server, timers, historyCalls } = setup();
    source.openRoom("duksu");
    await flush();
    source.sendText("duksu", "안녕");
    emit(0, "start", { userMessageId: U1, assistantMessageId: A1 });
    end(0, "timeout-idle");
    await flush();
    for (const ms of [2_000, 3_000, 5_000, 20_000]) {
      timers.advance(ms);
      await flush();
    }
    expect(server()?.recovery).toBe("stalled");
    const before = historyCalls();
    source.server?.reload("duksu");
    expect(server()?.recovery).toBe("fetching");
    await flush();
    expect(historyCalls()).toBe(before + 1);
  });

  test("ES-I9 duplicate_message는 조용히 기록을 다시 읽는다", async () => {
    const { source, end, thread, historyCalls } = setup({
      histories: [
        { messages: [], corrections: {}, ideas: null },
        { messages: [mine(U1, "안녕"), them(`${A1}#0`, "네")], corrections: {}, ideas: null },
      ],
    });
    source.openRoom("duksu");
    await flush();
    source.sendText("duksu", "안녕");
    end(0, "http-error", { error: "duplicate_message" });
    await flush();
    expect(historyCalls()).toBe(2);
    expect(texts(thread()?.messages)).toEqual(["me:안녕", "them:네"]);
  });
});

describe("기록 실패", () => {
  test("ES-I7 기록을 못 읽으면 failed, reload가 성공하면 loaded", async () => {
    const { source, server, thread } = setup({
      histories: [null, { messages: [them(`${A1}#0`, "어서 와요")], corrections: {}, ideas: null }],
    });
    source.openRoom("duksu");
    expect(server()?.history).toBe("loading");
    await flush();
    expect(server()?.history).toBe("failed");
    source.server?.reload("duksu");
    await flush();
    expect(server()?.history).toBe("loaded");
    expect(texts(thread()?.messages)).toEqual(["them:어서 와요"]);
  });

  test("ES-I8 빈 방의 첫 인사를 못 받으면 failed", async () => {
    const { source, server } = setup({ greet: async () => null });
    source.openRoom("duksu");
    await flush();
    await flush();
    expect(server()?.history).toBe("failed");
  });

  test("ES-I11 refreshOpenRoom은 열린 방만 · 답을 기다리는 중엔 안 읽고, 새 글을 합친다", async () => {
    const { source, thread, historyCalls } = setup({
      histories: [
        { messages: [them(`${A1}#0`, "안녕")], corrections: {}, ideas: null },
        {
          messages: [
            them(`${A1}#0`, "안녕"),
            them("33333333-3333-4333-8333-333333333333#0", "선톡!"),
          ],
          corrections: {},
          ideas: null,
        },
      ],
    });
    source.server?.refreshOpenRoom();
    expect(historyCalls()).toBe(0);
    source.openRoom("duksu");
    await flush();
    source.sendText("duksu", "보내는 중");
    source.server?.refreshOpenRoom();
    expect(historyCalls()).toBe(1);
    source.closeRoom("duksu");
    source.openRoom("mina");
    source.server?.refreshOpenRoom();
    expect(historyCalls()).toBe(1);
    const fresh = setup({
      histories: [
        { messages: [them(`${A1}#0`, "안녕")], corrections: {}, ideas: null },
        {
          messages: [
            them(`${A1}#0`, "안녕"),
            them("33333333-3333-4333-8333-333333333333#0", "선톡!"),
          ],
          corrections: {},
          ideas: null,
        },
      ],
    });
    fresh.source.openRoom("duksu");
    await flush();
    fresh.source.server?.refreshOpenRoom();
    await flush();
    expect(texts(fresh.thread()?.messages)).toEqual(["them:안녕", "them:선톡!"]);
    expect(thread()).not.toBeNull();
  });
});

const page = (messages: ChatMessage[], ideas: RemoteHistory["ideas"] = null): RemoteHistory => ({
  messages,
  corrections: {},
  ideas,
});
const notice = (id: string): ChatMessage => ({
  id,
  at: 1,
  kind: "notice",
  notice: "ai-disclosure",
});

describe("리뷰 1차 지적", () => {
  test("ES-I12 턴 고지가 있던 턴을 다시 읽어도 고지는 하나(리뷰 C2)", async () => {
    const { source, emit, end, thread, queue } = setup();
    source.openRoom("duksu");
    await flush();
    source.sendText("duksu", "안녕");
    emit(0, "start", { userMessageId: U1, assistantMessageId: A1 });
    emit(0, "notice", { kind: "ai_disclosure" });
    emit(0, "delta", { segment: 0, kind: "speech", text: "네" });
    emit(0, "done", { assistantMessageId: A1 });
    end(0, "complete");
    queue(page([mine(U1, "안녕"), them(`${A1}#0`, "네"), notice("srv-n")]));
    source.server?.refreshOpenRoom();
    await flush();
    expect(thread()?.messages.filter((m) => m.kind === "notice")).toHaveLength(1);
  });

  test("ES-I13 stalled 뒤 다른 다시 읽기가 답을 채우면 stalled가 풀린다(리뷰 W1)", async () => {
    const { source, emit, end, server, timers, queue } = setup();
    source.openRoom("duksu");
    await flush();
    source.sendText("duksu", "안녕");
    emit(0, "start", { userMessageId: U1, assistantMessageId: A1 });
    end(0, "network");
    await flush();
    for (const ms of [2_000, 3_000, 5_000, 20_000]) {
      timers.advance(ms);
      await flush();
    }
    expect(server()?.recovery).toBe("stalled");
    queue(page([mine(U1, "안녕"), them(`${A1}#0`, "네")]));
    source.server?.refreshOpenRoom();
    await flush();
    expect(server()?.recovery).toBe("none");
  });

  test("ES-I14 닫힌 방에 채워진 답은 안 읽음을 하나 올린다(리뷰 W2)", async () => {
    const { source, emit, end, queue } = setup();
    source.openRoom("duksu");
    await flush();
    source.sendText("duksu", "안녕");
    emit(0, "start", { userMessageId: U1, assistantMessageId: A1 });
    source.closeRoom("duksu");
    queue(page([mine(U1, "안녕"), them(`${A1}#0`, "네")]));
    end(0, "network");
    await flush();
    expect(source.snapshot().rooms.find((r) => r.roomId === "duksu")?.unread).toBe(1);
  });

  test("ES-I15 같은 보기를 다시 읽으면 보기 배열은 그대로(판 재열림 없음, 리뷰 W3)", async () => {
    const ideas = [{ ko: "네", roman: "", en: "Yes" }];
    const { source, thread, queue } = setup({
      histories: [page([them(`${A1}#0`, "안녕")], ideas)],
    });
    source.openRoom("duksu");
    await flush();
    const before = thread()?.ideas;
    queue(page([them(`${A1}#0`, "안녕")], [{ ko: "네", roman: "", en: "Yes" }]));
    source.server?.refreshOpenRoom();
    await flush();
    expect(thread()?.ideas).toBe(before);
  });

  test("ES-I16 start 전에 끊겼는데 서버에 글이 있으면 서버 판으로, 답이 없으면 채운다(리뷰 W4)", async () => {
    const { source, end, thread, server, queue } = setup();
    source.openRoom("duksu");
    await flush();
    source.sendText("duksu", "안녕");
    queue(page([{ ...mine(U1, "안녕"), at: 1_000 }]));
    queue(page([{ ...mine(U1, "안녕"), at: 1_000 }, them(`${A1}#0`, "네")]));
    end(0, "timeout-idle");
    expect(server()?.unsent).toHaveLength(1);
    await flush();
    await flush();
    expect(server()?.unsent).toEqual([]);
    expect(texts(thread()?.messages)).toEqual(["me:안녕", "them:네"]);
    expect(thread()?.messages[0]?.id).toBe(U1);
    expect(server()?.recovery).toBe("none");
  });

  test("ES-I17 다시 보내기의 turn_in_progress는 확인 읽기 — 서버에 없으면 Not sent 그대로(리뷰 W4)", async () => {
    const { source, end, server, historyCalls } = setup();
    source.openRoom("duksu");
    await flush();
    source.sendText("duksu", "안녕");
    end(0, "network");
    await flush();
    source.server?.resend("duksu", server()?.unsent[0] ?? "");
    const before = historyCalls();
    end(1, "http-error", { error: "turn_in_progress" });
    await flush();
    expect(historyCalls()).toBe(before + 1);
    expect(server()?.unsent).toHaveLength(1);
  });

  test("ES-I18 refreshOpenRoom은 한가한 두 방 가운데 열린 방만 · 채우는 중엔 건너뜀(리뷰 W5)", async () => {
    const { source, emit, end, readRooms } = setup();
    source.unlockCharacter("mina");
    source.openRoom("duksu");
    await flush();
    source.closeRoom("duksu");
    source.openRoom("mina");
    await flush();
    readRooms.length = 0;
    source.server?.refreshOpenRoom();
    await flush();
    expect(readRooms).toEqual(["mina"]);
    source.sendText("mina", "안녕");
    emit(0, "start", { userMessageId: U1, assistantMessageId: A1 });
    end(0, "network"); // 채우기 시작 — 읽기 한 번
    readRooms.length = 0;
    source.server?.refreshOpenRoom();
    expect(readRooms).toEqual([]);
  });

  test("ES-I19 채우는 중 방을 지우면 남은 타이머가 알림을 부르지 않는다(리뷰 W5)", async () => {
    const { source, emit, end, timers } = setup();
    source.openRoom("duksu");
    await flush();
    source.sendText("duksu", "안녕");
    emit(0, "start", { userMessageId: U1, assistantMessageId: A1 });
    end(0, "network");
    await flush();
    source.deleteRoom("duksu");
    let calls = 0;
    source.subscribe(() => {
      calls += 1;
    });
    timers.advance(30_000);
    await flush();
    expect(calls).toBe(0);
  });
});
