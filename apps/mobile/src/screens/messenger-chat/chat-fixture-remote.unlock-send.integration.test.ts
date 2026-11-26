import { expect, test, vi } from "vitest";

import { createFixtureChatSource } from "./chat-fixture-source";
import type { ChatRemote, RemoteGreeting } from "./chat-remote.contract";
import { companionSeed } from "./companion-roster";

// `integration` 계층(SS-I13, ADR-0178 D5 개정 ⟨보기에서 추가⟩): 스토리 보기에서 친구를 추가한 뒤 방을 열지 않고 곧바로 답장해도, 청하는 중인
// 해금 선톡(ADR-0152)이 끝난 뒤에 턴을 연다 — 서버가 내 글을 먼저 보고 정해진 첫 말을 건너뛰지(`has_messages`) 않게.

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const greeting: RemoteGreeting = {
  messages: [
    { id: "g#0", at: 1, kind: "text", from: "them", text: { ko: "안녕하세요!", en: "Hi!" } },
  ],
  ideas: null,
};

test("SS-I13 해금 선톡을 청하는 중에 보낸 글은 그 답이 온 뒤에 턴을 연다(글은 바로 로그에), 청하는 중이 아니면 바로", async () => {
  let resolveGreet: (value: RemoteGreeting | null) => void = () => undefined;
  const greet = vi.fn<ChatRemote["greet"]>(
    () => new Promise<RemoteGreeting | null>((resolve) => (resolveGreet = resolve)),
  );
  const openTurn = vi.fn<ChatRemote["openTurn"]>(() => ({ cancel: () => undefined }));
  const remote: ChatRemote = {
    loadHistory: async () => ({ messages: [], corrections: {}, ideas: null }),
    greet,
    openTurn,
  };
  const source = createFixtureChatSource({ imageUrlOf: () => null, seed: companionSeed(), remote });
  source.unlockCharacter("mina");
  source.sendText("mina", "맛있겠다!");
  expect(source.thread("mina")?.messages.map((m) => m.kind)).toEqual(["text"]);
  await flush();
  expect(openTurn).not.toHaveBeenCalled();
  resolveGreet(greeting);
  await flush();
  expect(openTurn).toHaveBeenCalledTimes(1);
  expect(openTurn.mock.calls[0]?.[0]).toMatchObject({ characterId: "mina", text: "맛있겠다!" });
  // 인사는 내 글 앞.
  expect(source.thread("mina")?.messages[0]?.id).toBe("g#0");
  // 청하는 중이 아니면 바로 턴을 연다(이미 열린 방).
  source.sendText("duksu", "안녕");
  expect(openTurn).toHaveBeenCalledTimes(2);
});

test("SS-I13 해금 선톡을 못 받아도(실패 · 던짐) 기다리던 글은 턴을 연다", async () => {
  const openTurn = vi.fn<ChatRemote["openTurn"]>(() => ({ cancel: () => undefined }));
  const remote: ChatRemote = {
    loadHistory: async () => ({ messages: [], corrections: {}, ideas: null }),
    greet: async () => {
      throw new Error("network");
    },
    openTurn,
  };
  const source = createFixtureChatSource({ imageUrlOf: () => null, seed: companionSeed(), remote });
  source.unlockCharacter("mina");
  source.sendText("mina", "맛있겠다!");
  await flush();
  expect(openTurn).toHaveBeenCalledTimes(1);
});
