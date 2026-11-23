import { expect, test, vi } from "vitest";

import { createFixtureChatSource } from "./chat-fixture-source";
import { fakeTimers } from "./chat-fixture-timers.test-support";
import type { ChatRemote, RemoteHistory, RemoteTurnHandlers } from "./chat-remote.contract";
import { companionSeed } from "./companion-roster";
import type { ChatStoryQuote } from "./friend-stories.contract";

// `integration` 계층(FSI-R1 · R2): 서버 방의 스토리 답장(ADR-0177 D5) — 출처가 턴 요청에 `storyId`를 싣고(다시 보내기에도), 서버 기록의
// 인용(`message_json.story`)이 내 글에 다시 선다.

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
const quote: ChatStoryQuote = {
  storyId: "st-1",
  characterId: "duksu",
  line: "점심은 김치찌개예요. 조금 매워요!",
  imagePath: "content/images/u05-baekban/post-2.webp",
  postedAt: 500,
};

function fakeRemote(history: RemoteHistory) {
  const turns: { request: Parameters<ChatRemote["openTurn"]>[0]; handlers: RemoteTurnHandlers }[] =
    [];
  const remote: ChatRemote = {
    loadHistory: vi.fn(async () => history),
    greet: vi.fn(async () => null),
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
  return { source, turns };
}

test("FSI-R1 스토리 답장은 턴 요청에 storyId · 내 글에 인용, 보내지 못해 다시 보내도 storyId가 실린다", async () => {
  const { source, turns } = fakeRemote({ messages: [], corrections: {}, ideas: null });
  source.openRoom("duksu");
  await flush();
  source.sendText("duksu", "맛있겠다!", { story: quote });
  expect(turns[0]?.request).toMatchObject({
    characterId: "duksu",
    text: "맛있겠다!",
    storyId: "st-1",
  });
  const mine = source.thread("duksu")?.messages.find((m) => m.kind === "text" && m.from === "me");
  expect(mine).toMatchObject({ story: quote });
  // 네트워크로 받지 못함 → Not sent → 다시 보내기
  turns[0]?.handlers.onEnd("network", null);
  source.server?.resend("duksu", mine?.id ?? "");
  expect(turns[1]?.request).toMatchObject({
    storyId: "st-1",
    clientMessageId: turns[0]?.request.clientMessageId,
  });
});

test("FSI-R1 보통 글에는 storyId가 없다", async () => {
  const { source, turns } = fakeRemote({ messages: [], corrections: {}, ideas: null });
  source.openRoom("duksu");
  await flush();
  source.sendText("duksu", "안녕하세요");
  expect(turns[0]?.request).not.toHaveProperty("storyId");
  expect(source.thread("duksu")?.messages.find((m) => m.kind === "text")).not.toHaveProperty(
    "story",
  );
});

test("FSI-R2 서버 기록의 인용이 내 글에 다시 선다", async () => {
  const { source } = fakeRemote({
    messages: [
      {
        id: "u-1",
        at: 900,
        kind: "text",
        from: "me",
        text: { ko: "맛있겠다!", en: "" },
        story: quote,
      },
    ],
    corrections: {},
    ideas: null,
  });
  source.openRoom("duksu");
  await flush();
  expect(source.thread("duksu")?.messages[0]).toMatchObject({ id: "u-1", story: quote });
});
