import { describe, expect, test, vi } from "vitest";

import { uuidV4 } from "./chat-fixture-remote";
import { createFixtureChatSource } from "./chat-fixture-source";
import { fakeTimers } from "./chat-fixture-timers.test-support";
import type {
  ChatRemote,
  RemoteGreeting,
  RemoteHistory,
  RemoteTurnHandlers,
} from "./chat-remote.contract";
import { companionSeed } from "./companion-roster";

// `integration` 계층(SS-I1 ~ I7): 가짜 원격을 끼운 출처 — 기록 · 첫 인사 · 서버 턴 · 실패(ADR-0137).

const U1 = "11111111-1111-4111-8111-111111111111";
const A1 = "22222222-2222-4222-8222-222222222222";
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

function fakeRemote(
  over: { history?: RemoteHistory | null; greeting?: RemoteGreeting | null } = {},
) {
  const turns: { request: Parameters<ChatRemote["openTurn"]>[0]; handlers: RemoteTurnHandlers }[] =
    [];
  const remote: ChatRemote = {
    loadHistory: vi.fn(async () =>
      over.history === undefined ? { messages: [], corrections: {}, ideas: null } : over.history,
    ),
    greet: vi.fn(async () => (over.greeting === undefined ? null : over.greeting)),
    openTurn: (request, handlers) => {
      turns.push({ request, handlers });
      return { cancel: () => undefined };
    },
  };
  const source = createFixtureChatSource({
    imageUrlOf: () => null,
    seed: companionSeed(),
    now: () => 1_000,
    timers: fakeTimers(),
    remote,
  });
  const emit = (name: string, data: unknown) =>
    turns.at(-1)?.handlers.onEvent(name, JSON.stringify(data));
  return { source, remote, turns, emit };
}

const thread = (source: ReturnType<typeof fakeRemote>["source"]) => source.thread("duksu");

describe("기록 · 인사", () => {
  test("SS-I1 방을 열면 서버 기록을 한 번 읽어 그린다(교정 노트 · 칩 포함)", async () => {
    const { source, remote } = fakeRemote({
      history: {
        messages: [
          { id: U1, at: 1, kind: "text", from: "me", text: { ko: "안녕", en: "" } },
          {
            id: `${A1}#0`,
            at: 2,
            kind: "text",
            from: "them",
            text: { ko: "반가워요", en: "Nice" },
          },
        ],
        corrections: {
          [U1]: {
            kind: "correction",
            corrected: "안녕하세요",
            changes: [],
            items: [],
            better: null,
            meaning: null,
          },
        },
        ideas: [{ ko: "네", roman: "", en: "Yes" }],
      },
    });
    source.openRoom("duksu");
    source.openRoom("duksu");
    await flush();
    expect(remote.loadHistory).toHaveBeenCalledTimes(1);
    expect(thread(source)?.messages.map((m) => m.id)).toEqual([U1, `${A1}#0`]);
    expect(thread(source)?.notes[U1]?.correction).toMatchObject({ kind: "available", seen: false });
    expect(thread(source)?.ideas).toEqual([{ ko: "네", roman: "", en: "Yes" }]);
    expect(remote.greet).not.toHaveBeenCalled();
  });

  test("SS-I2 기록이 비면 첫 인사를 받는다 — 기다리는 동안 입력 중", async () => {
    const { source, remote } = fakeRemote({
      greeting: {
        messages: [
          {
            id: `${A1}#0`,
            at: 1,
            kind: "text",
            from: "them",
            text: { ko: "안녕하세요!", en: "Hi!" },
          },
        ],
        ideas: null,
      },
    });
    source.openRoom("duksu");
    await flush();
    expect(remote.greet).toHaveBeenCalledWith("duksu");
    await flush();
    expect(thread(source)?.messages.map((m) => m.id)).toEqual([`${A1}#0`]);
    expect(thread(source)?.typing).toBe(false);
  });

  test("SS-I3 기록을 못 읽으면 그대로 두고 다음에 열 때 다시 읽는다, 잠긴 방은 읽지 않는다", async () => {
    const { source, remote } = fakeRemote({ history: null });
    source.openRoom("duksu");
    await flush();
    source.openRoom("mina");
    source.openRoom("duksu");
    await flush();
    expect(remote.loadHistory).toHaveBeenCalledTimes(2);
    expect(remote.loadHistory).not.toHaveBeenCalledWith("mina");
  });
});

describe("서버 턴", () => {
  test("SS-I4 보내면 내 글 · 입력 중 → start(서버 id) → 조각마다 답이 자람 → 교정 · 칩 → done", async () => {
    const { source, turns, emit } = fakeRemote();
    source.openRoom("duksu");
    await flush();
    source.sendText("duksu", "  저 커피 좋아해요 ");
    expect(turns[0]?.request.characterId).toBe("duksu");
    expect(turns[0]?.request.text).toBe("저 커피 좋아해요");
    expect(turns[0]?.request.clientMessageId).toMatch(/^[0-9a-f-]{36}$/);
    expect(thread(source)?.typing).toBe(true);
    expect(thread(source)?.messages.at(-1)).toMatchObject({
      from: "me",
      text: { ko: "저 커피 좋아해요" },
    });

    emit("start", { userMessageId: U1, assistantMessageId: A1 });
    emit("delta", { segment: 0, kind: "speech", text: "저도" });
    expect(thread(source)?.messages.at(-1)).toMatchObject({ id: `${A1}#0`, text: { ko: "저도" } });
    expect(thread(source)?.typing).toBe(false);
    emit("delta", { segment: 0, kind: "speech", text: "요!" });
    emit("translation", { segment: 0, text: "Me too!" });
    emit("correction", {
      userMessageId: U1,
      status: "ok",
      kind: "correction",
      original: "저 커피 좋아해요",
      corrected: "저는 커피를 좋아해요",
      items: [],
      better: null,
      meaning: null,
    });
    emit("suggestions", {
      status: "ok",
      items: [{ text: "뭐 마셔요?", meaning: "What do you drink?" }],
    });
    emit("done", { assistantMessageId: A1 });
    turns[0]?.handlers.onEnd("complete", null);

    const t = thread(source);
    expect(t?.messages.map((m) => m.id)).toEqual([U1, `${A1}#0`]);
    expect(t?.messages.at(-1)).toMatchObject({ text: { ko: "저도요!", en: "Me too!" } });
    expect(t?.notes[U1]?.correction).toMatchObject({ kind: "available" });
    expect(t?.ideas).toEqual([{ ko: "뭐 마셔요?", roman: "", en: "What do you drink?" }]);
    expect(t?.awaitingReply).toBe(false);
  });

  test("SS-I5 사전 오류: 크레딧 부족 → 회색 줄, 일시 차단 → 입력 막힘", async () => {
    const { source, turns } = fakeRemote();
    source.sendText("duksu", "안녕");
    turns[0]?.handlers.onEnd("http-error", JSON.stringify({ error: "insufficient_credits" }));
    expect(thread(source)?.messages.at(-1)).toMatchObject({ kind: "notice", notice: "no-credits" });
    source.sendText("duksu", "안녕");
    turns[1]?.handlers.onEnd(
      "http-error",
      JSON.stringify({
        error: "temporarily_blocked",
        detail: { until: "2026-11-12T12:30:00.000Z" },
      }),
    );
    expect(thread(source)?.inputBlock).toEqual({
      kind: "temporarily-blocked",
      until: Date.parse("2026-11-12T12:30:00.000Z"),
    });
    expect(thread(source)?.awaitingReply).toBe(false);
  });

  test("SS-I6 서버가 받기 전 끊기면 회색 줄 없이 보낸 글이 Not sent로 남는다(ADR-0138로 바뀜)", () => {
    const { source, turns } = fakeRemote();
    source.sendText("duksu", "안녕");
    turns[0]?.handlers.onEnd("network", null);
    const messages = thread(source)?.messages ?? [];
    expect(messages.map((m) => m.kind)).toEqual(["text"]);
    expect(thread(source)?.server?.unsent).toEqual([messages[0]?.id]);
  });

  test("SS-I7 연 방의 답은 안 읽음을 늘리지 않고, 닫힌 방의 답은 첫 조각에 하나 늘린다 · uuid는 v4 꼴", () => {
    const { source, turns } = fakeRemote();
    source.openRoom("duksu");
    source.sendText("duksu", "안녕");
    turns[0]?.handlers.onEvent(
      "start",
      JSON.stringify({ userMessageId: U1, assistantMessageId: A1 }),
    );
    turns[0]?.handlers.onEvent("delta", JSON.stringify({ segment: 0, kind: "speech", text: "네" }));
    const unreadOf = () => source.snapshot().rooms.find((room) => room.roomId === "duksu")?.unread;
    expect(unreadOf()).toBe(0);
    source.closeRoom("duksu");
    source.sendText("duksu", "또");
    turns[1]?.handlers.onEvent(
      "start",
      JSON.stringify({
        userMessageId: `${U1.slice(0, -1)}2`,
        assistantMessageId: `${A1.slice(0, -1)}3`,
      }),
    );
    turns[1]?.handlers.onEvent("delta", JSON.stringify({ segment: 0, kind: "speech", text: "응" }));
    turns[1]?.handlers.onEvent("delta", JSON.stringify({ segment: 0, kind: "speech", text: "!" }));
    expect(unreadOf()).toBe(1);
    expect(uuidV4(() => 0.5)).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  test("SS-I8 기록을 읽는 사이 보낸 턴이 서버 id를 얻었으면 기록과 겹쳐도 한 번만 선다(리뷰 W5)", async () => {
    let resolveHistory: (value: RemoteHistory) => void = () => undefined;
    const turns: RemoteTurnHandlers[] = [];
    const remote: ChatRemote = {
      loadHistory: () => new Promise((resolve) => (resolveHistory = resolve)),
      greet: async () => null,
      openTurn: (_request, handlers) => {
        turns.push(handlers);
        return { cancel: () => undefined };
      },
    };
    const source = createFixtureChatSource({
      imageUrlOf: () => null,
      seed: companionSeed(),
      remote,
    });
    source.openRoom("duksu");
    source.sendText("duksu", "안녕");
    turns[0]?.onEvent("start", JSON.stringify({ userMessageId: U1, assistantMessageId: A1 }));
    resolveHistory({
      messages: [{ id: U1, at: 1, kind: "text", from: "me", text: { ko: "안녕", en: "" } }],
      corrections: {},
      ideas: null,
    });
    await flush();
    expect(source.thread("duksu")?.messages.filter((m) => m.id === U1)).toHaveLength(1);
  });

  test("SS-I8b 기록이 start보다 먼저 와도 내 글은 한 번만 선다(리뷰 W-a)", async () => {
    let resolveHistory: (value: RemoteHistory) => void = () => undefined;
    const turns: RemoteTurnHandlers[] = [];
    const remote: ChatRemote = {
      loadHistory: () => new Promise((resolve) => (resolveHistory = resolve)),
      greet: async () => null,
      openTurn: (_request, handlers) => {
        turns.push(handlers);
        return { cancel: () => undefined };
      },
    };
    const source = createFixtureChatSource({
      imageUrlOf: () => null,
      seed: companionSeed(),
      remote,
    });
    source.openRoom("duksu");
    source.sendText("duksu", "안녕");
    resolveHistory({
      messages: [{ id: U1, at: 1, kind: "text", from: "me", text: { ko: "안녕", en: "" } }],
      corrections: {},
      ideas: null,
    });
    await flush();
    turns[0]?.onEvent("start", JSON.stringify({ userMessageId: U1, assistantMessageId: A1 }));
    const mine = source
      .thread("duksu")
      ?.messages.filter((m) => m.kind === "text" && m.from === "me");
    expect(mine?.map((m) => m.id)).toEqual([U1]);
  });

  test("SS-I9 인사를 기다리는 사이 보내면 입력 중을 끄지 않고 인사를 내 글 앞에 둔다(리뷰 W5)", async () => {
    let resolveGreet: (value: RemoteGreeting | null) => void = () => undefined;
    const remote: ChatRemote = {
      loadHistory: async () => ({ messages: [], corrections: {}, ideas: null }),
      greet: () => new Promise((resolve) => (resolveGreet = resolve)),
      openTurn: () => ({ cancel: () => undefined }),
    };
    const source = createFixtureChatSource({
      imageUrlOf: () => null,
      seed: companionSeed(),
      remote,
    });
    source.openRoom("duksu");
    await flush();
    source.sendText("duksu", "안녕");
    resolveGreet({
      messages: [
        { id: `${A1}#0`, at: 1, kind: "text", from: "them", text: { ko: "어서 와요", en: "" } },
      ],
      ideas: null,
    });
    await flush();
    const thread = source.thread("duksu");
    expect(thread?.typing).toBe(true);
    expect(thread?.messages.map((m) => (m.kind === "text" ? m.from : m.kind))).toEqual([
      "them",
      "me",
    ]);
  });
});
