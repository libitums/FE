import { expect, test } from "vitest";

import { createFixtureChatSource } from "./chat-fixture-source";
import { fakeTimers } from "./chat-fixture-timers.test-support";
import type { ChatRemote, RemoteHistory, RemoteTurnHandlers } from "./chat-remote.contract";
import { companionSeed } from "./companion-roster";

// `integration` 계층(CS-R1 ~ R4): 서버 방의 칩 탭 전송(ADR-0210 D1 「앱 인계」) — 출처가 보기의 서버 자리를 턴 요청 `suggestion`에
// 싣고(보내지 못해 다시 보내도), 직접 입력 · 글이 다른 보내기에는 싣지 않는다.

const A0 = "00000000-0000-4000-8000-000000000000";
const A1 = "22222222-2222-4222-8222-222222222222";
const U1 = "11111111-1111-4111-8111-111111111111";
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const history: RemoteHistory = {
  messages: [
    { id: `${A0}#0`, at: 900, kind: "text", from: "them", text: { ko: "뭐 해요?", en: "" } },
  ],
  corrections: {},
  ideas: [
    { ko: "공부해요", roman: "", en: "Studying" },
    { ko: "쉬어요", roman: "", en: "Resting" },
  ],
  ideasRef: { messageId: A0, indexes: [0, 2] },
};

async function openRoom() {
  const turns: { request: Parameters<ChatRemote["openTurn"]>[0]; handlers: RemoteTurnHandlers }[] =
    [];
  const remote: ChatRemote = {
    loadHistory: async () => history,
    greet: async () => null,
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
  source.openRoom("duksu");
  await flush();
  return { source, turns };
}

test("CS-R1 보기를 탭해 보내면 턴 요청에 그 칩의 메시지 · 서버 자리가 실린다", async () => {
  const { source, turns } = await openRoom();
  source.sendText("duksu", "쉬어요", { suggestion: { index: 1 } });
  expect(turns[0]?.request).toMatchObject({
    text: "쉬어요",
    suggestion: { messageId: A0, index: 2 },
  });
});

test("CS-R2 직접 입력 · 보기와 글이 다른 보내기에는 표시가 없다", async () => {
  const typed = await openRoom();
  typed.source.sendText("duksu", "쉬어요");
  expect(typed.turns[0]?.request).toBeDefined();
  expect(typed.turns[0]?.request).not.toHaveProperty("suggestion");
  const edited = await openRoom();
  edited.source.sendText("duksu", "쉬어요!", { suggestion: { index: 1 } });
  expect(edited.turns[0]?.request).toBeDefined();
  expect(edited.turns[0]?.request).not.toHaveProperty("suggestion");
});

test("CS-R3 보내지 못해 다시 보내도 같은 표시가 실린다(서버가 그 사이 새 답이면 stale로 가린다)", async () => {
  const { source, turns } = await openRoom();
  source.sendText("duksu", "공부해요", { suggestion: { index: 0 } });
  turns[0]?.handlers.onEnd("network", null);
  const mine = source.thread("duksu")?.messages.find((m) => m.kind === "text" && m.from === "me");
  source.server?.resend("duksu", mine?.id ?? "");
  expect(turns[1]?.request).toMatchObject({
    clientMessageId: turns[0]?.request.clientMessageId,
    suggestion: { messageId: A0, index: 0 },
  });
});

test("CS-R4 턴 답에 붙은 새 칩을 탭하면 그 답 메시지의 표시가 실린다", async () => {
  const { source, turns } = await openRoom();
  source.sendText("duksu", "공부해요", { suggestion: { index: 0 } });
  const emit = (name: string, data: unknown) =>
    turns[0]?.handlers.onEvent(name, JSON.stringify(data));
  emit("start", { userMessageId: U1, assistantMessageId: A1 });
  emit("delta", { segment: 0, kind: "speech", text: "좋아요" });
  emit("suggestions", {
    messageId: A1,
    status: "ok",
    items: [
      { text: "저도요", meaning: "Me too" },
      { text: "왜요?", meaning: "Why?" },
    ],
  });
  emit("done", { assistantMessageId: A1 });
  turns[0]?.handlers.onEnd("complete", null);
  await flush();
  source.sendText("duksu", "왜요?", { suggestion: { index: 1 } });
  expect(turns[1]?.request).toMatchObject({ suggestion: { messageId: A1, index: 1 } });
});
