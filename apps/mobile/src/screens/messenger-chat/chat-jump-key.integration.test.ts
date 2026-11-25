import { describe, expect, test, vi } from "vitest";

import { jumpKeyOf } from "./chat-jump-key";
import { createFixtureChatSource } from "./chat-fixture-source";
import { fakeTimers } from "./chat-fixture-timers.test-support";
import type { ChatRemote, RemoteTurnHandlers } from "./chat-remote.contract";
import { companionSeed } from "./companion-roster";

// `integration` 계층(chat-scroll-follow G): 실제 출처(가짜 원격)가 그리는 로그로 jumpKey를 센다 — 보낸 글이 서는 때 한 번만
// 바뀌고, start의 서버 id 교체 · 답 조각 · 교정 · done은 계기가 아니다.

const U1 = "11111111-1111-4111-8111-111111111111";
const A1 = "22222222-2222-4222-8222-222222222222";
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

function remoteSource() {
  const turns: RemoteTurnHandlers[] = [];
  const remote: ChatRemote = {
    loadHistory: vi.fn(async () => ({
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
    })),
    greet: vi.fn(async () => null),
    openTurn: (_request, handlers) => {
      turns.push(handlers);
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
    turns[turns.length - 1]?.onEvent(name, JSON.stringify(data));
  const key = () => jumpKeyOf(source.thread("duksu")?.messages ?? []);
  return { source, emit, key };
}

describe("jumpKey × 서버 턴", () => {
  test("JK-I1. 보내면 한 번 바뀌고, 서버 id로 바뀌는 동안 · 답이 자라는 동안은 그대로다", async () => {
    const { source, emit, key } = remoteSource();
    source.openRoom("duksu");
    await flush();
    const opened = key();

    source.sendText("duksu", "저 커피 좋아해요");
    const sent = key();
    expect(sent).not.toBe(opened);
    expect(source.thread("duksu")?.messages.slice(-1)[0]?.id).toMatch(/^local-/);

    emit("start", {
      userMessageId: U1,
      assistantMessageId: "33333333-3333-4333-8333-333333333333",
    });
    expect(source.thread("duksu")?.messages.some((message) => message.id === U1)).toBe(true);
    expect(key()).toBe(sent);

    emit("delta", { segment: 0, kind: "speech", text: "저도" });
    emit("delta", { segment: 0, kind: "speech", text: "요!" });
    emit("done", { assistantMessageId: "33333333-3333-4333-8333-333333333333" });
    expect(key()).toBe(sent);
  });
});
