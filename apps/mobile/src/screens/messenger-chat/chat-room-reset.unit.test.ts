import { describe, expect, test, vi } from "vitest";

import { createFixtureChatSource } from "./chat-fixture-source";
import { fakeTimers } from "./chat-fixture-timers.test-support";
import type { ChatRemote } from "./chat-remote.contract";
import { clearOutcomeFrom } from "./companion-parse";
import { companionSeed } from "./companion-roster";
import { makeSource } from "./chat-ui.test-support";

// `unit` 계층(CC-U1 ~ U5, ADR-0156): 대화 비우기 — 서버 방은 `companion_clear_chat`이 끝난 뒤에만 비우고(방은 남고 열려
// 있으면 기록 · 첫 인사를 다시 읽음), 못 지우면 대화 그대로 · 답을 기다리는 중이면 busy · 앱 안 방은 처음 모습(opening)으로.

const A1 = "22222222-2222-4222-8222-222222222222";
const flush = async () => {
  for (let i = 0; i < 5; i += 1) await new Promise((resolve) => setTimeout(resolve, 0));
};

function serverSource(clear: ChatRemote["clearChat"]) {
  const loadHistory = vi.fn(async () => ({
    messages: [
      {
        id: `${A1}#0`,
        at: 1,
        kind: "text" as const,
        from: "them" as const,
        text: { ko: "안녕", en: "Hi" },
      },
    ],
    corrections: {},
    ideas: null,
  }));
  const greet = vi.fn(async () => null);
  const remote: ChatRemote = {
    loadHistory,
    greet,
    openTurn: () => ({ cancel: () => undefined }),
    ...(clear === undefined ? {} : { clearChat: clear }),
  };
  const source = createFixtureChatSource({
    imageUrlOf: () => null,
    seed: companionSeed(),
    timers: fakeTimers(),
    remote,
    unlocked: ["duksu"],
  });
  return { source, loadHistory, greet };
}

describe("clearRoom (CC-U1 ~ U4)", () => {
  test("CC-U1 서버 방: 서버가 지운 뒤 방은 남고 대화가 비며, 열린 방이면 기록 · 첫 인사를 다시 읽는다", async () => {
    const clearChat = vi.fn(async () => "cleared" as const);
    const { source, loadHistory, greet } = serverSource(clearChat);
    source.openRoom("duksu");
    await flush();
    expect(source.thread("duksu")?.messages.length).toBe(1);
    loadHistory.mockResolvedValueOnce({ messages: [], corrections: {}, ideas: null });

    const outcome = await source.clearRoom("duksu");
    await flush();

    expect(outcome).toBe("cleared");
    expect(clearChat).toHaveBeenCalledWith("duksu");
    expect(source.thread("duksu")).not.toBeNull();
    expect(source.thread("duksu")?.messages).toEqual([]);
    expect(loadHistory).toHaveBeenCalledTimes(2);
    expect(greet).toHaveBeenCalledTimes(1);
  });

  test("CC-U2 서버 방: 못 지우면(null) failed · busy면 busy — 대화는 그대로다", async () => {
    const clearChat = vi.fn<NonNullable<ChatRemote["clearChat"]>>(async () => null);
    const { source } = serverSource(clearChat);
    source.openRoom("duksu");
    await flush();

    expect(await source.clearRoom("duksu")).toBe("failed");
    clearChat.mockResolvedValueOnce("busy");
    expect(await source.clearRoom("duksu")).toBe("busy");
    expect(source.thread("duksu")?.messages.length).toBe(1);
  });

  test("CC-U3 서버 방: 비우기 포트가 없는 옛 원격이면 failed이고 서버를 부르지 않는다", async () => {
    const { source } = serverSource(undefined);
    source.openRoom("duksu");
    await flush();

    expect(await source.clearRoom("duksu")).toBe("failed");
    expect(source.thread("duksu")?.messages.length).toBe(1);
  });

  test("CC-U4 앱 안 방은 기기에서만 처음 모습(opening 한 줄)으로 돌아가고, 잠긴 · 없는 방은 failed다", async () => {
    const source = makeSource();
    source.sendText("mina", "안녕하세요");
    const before = source.thread("mina")?.messages.length ?? 0;
    expect(before).toBeGreaterThan(1);

    expect(await source.clearRoom("mina")).toBe("cleared");
    expect(source.thread("mina")?.messages.length ?? 0).toBeLessThanOrEqual(1);
    expect(source.snapshot().rooms.some((room) => room.roomId === "mina")).toBe(true);
    expect(await source.clearRoom("nope")).toBe("failed");
  });
});

test("CC-U5 서버 답 해석 — cleared · busy만, 그 밖은 null", () => {
  expect(clearOutcomeFrom('{"status":"cleared"}')).toBe("cleared");
  expect(clearOutcomeFrom('{"status":"busy"}')).toBe("busy");
  expect(clearOutcomeFrom('{"status":"nope"}')).toBeNull();
  expect(clearOutcomeFrom(null)).toBeNull();
  expect(clearOutcomeFrom("not json")).toBeNull();
});
