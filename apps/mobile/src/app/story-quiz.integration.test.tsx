import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, screen } from "@lynx-js/react/testing-library";

import { createFixtureChatSource } from "../screens/messenger-chat/chat-fixture-source";
import { fakeTimers } from "../screens/messenger-chat/chat-fixture-timers.test-support";
import type {
  ChatRemote,
  RemoteTurnHandlers,
} from "../screens/messenger-chat/chat-remote.contract";
import {
  KEYS_AN,
  clearBackHandlers,
  mountChat,
  tapId,
  tapKeys,
} from "../screens/messenger-chat/chat-ui.test-support";
import { historyFrom } from "../screens/messenger-chat/companion-parse";
import { companionSeed } from "../screens/messenger-chat/companion-roster";
import { friendStoriesTestIds as fs } from "../screens/messenger-chat/friend-stories.contract";
import { messengerChatTestIds as chat } from "../screens/messenger-chat/messenger-chat.contract";
import { myStoriesTestIds as ids } from "../screens/messenger-chat/my-stories.contract";
import { createTrialStore } from "../screens/messenger-chat/trial-store";
import { chatTurnsTestIds } from "../screens/messenger-chat/chat-turns.contract";

// `integration` 계층(MSI4 ~ MSI5): 서버 기록 JSON → 앱 풀기(`historyFrom`) → 서버 모드 출처(`chat-fixture-remote`) → 대화방 화면.
// 덕수쌤 퀴즈 `meta`(서버 반영 예상)가 있으면 무료 띠 → 무료 답 → 턴이 끝나면 기록을 다시 읽어 판정 표시, 없으면(지금 서버) 반응 인용만.

const A0 = "00000000-0000-4000-8000-000000000000";
const A1 = "22222222-2222-4222-8222-222222222222";
const U1 = "11111111-1111-4111-8111-111111111111";
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => vi.useRealTimers());
afterEach(() => {
  cleanup();
  clearBackHandlers();
});

const reaction = (meta: Record<string, unknown> | undefined) => ({
  id: A0,
  role: "assistant",
  origin: "story_reaction",
  status: "complete",
  hidden: false,
  text: null,
  inputMode: null,
  segments: [{ kind: "speech", text: "퀴즈예요! 「overtime」을 한국어로?", translation: "Quiz!" }],
  notice: null,
  feedback: null,
  story: {
    kind: "mine",
    id: "33333333-3333-4333-8333-333333333333",
    characterId: "duksu",
    line: "야근",
    imagePath: null,
    postedAt: "2026-11-25T05:30:00.000Z",
  },
  createdAt: "2026-11-25T06:00:00.000Z",
  ...(meta === undefined ? {} : { meta }),
});
const answer = {
  id: U1,
  role: "user",
  origin: "turn",
  status: "complete",
  hidden: false,
  text: "안",
  inputMode: "text",
  segments: [],
  notice: null,
  feedback: null,
  meta: { quiz: { free: true, attempt: 1, result: "correct" } },
  createdAt: "2026-11-25T06:01:00.000Z",
};
const reply = {
  ...reaction({ quiz: { gift: { word: "야근" } } }),
  id: A1,
  origin: "turn",
  story: null,
  segments: [{ kind: "speech", text: "맞아요, 야근!", translation: "That's right!" }],
  createdAt: "2026-11-25T06:01:05.000Z",
};
const page = (messages: unknown[]) =>
  JSON.stringify({ messages: [...messages].reverse(), hasMore: false });

function quizRoom(pages: readonly string[]) {
  const turns: RemoteTurnHandlers[] = [];
  let read = 0;
  const loadHistory = vi.fn(async () =>
    historyFrom(pages[Math.min(read++, pages.length - 1)] ?? null),
  );
  const remote: ChatRemote = {
    loadHistory,
    greet: async () => null,
    openTurn: (_request, handlers) => {
      turns.push(handlers);
      return { cancel: () => undefined };
    },
  };
  const source = createFixtureChatSource({
    imageUrlOf: () => null,
    seed: { ...companionSeed(), birthYear: { kind: "set", year: 2000 } },
    timers: fakeTimers(),
    remote,
  });
  return { source, turns, loadHistory };
}

test("MSI4. 퀴즈 meta가 있으면 무료 띠 → 엽전 없이 답이 나가고, 턴이 끝나면 기록을 다시 읽어 「Free · quiz answer」 · 맞힘 줄", async () => {
  const room = quizRoom([
    page([reaction({ myStoryId: "33333333-3333-4333-8333-333333333333", angle: "quiz" })]),
    page([reaction({ angle: "quiz" }), answer, reply]),
  ]);
  mountChat({
    source: room.source,
    roomId: "duksu",
    tier: "free",
    trial: createTrialStore(0),
    coinBalance: 0,
  });
  await flush();
  expect(screen.getByTestId(fs.quote).textContent).toContain("Replied to your story");
  expect(screen.getByTestId(ids.quizFree)).not.toBeNull();
  tapId(chat.field);
  tapKeys(...KEYS_AN);
  tapId(chat.send);
  expect(room.turns).toHaveLength(1);
  const turn = room.turns[0];
  turn?.onEvent("start", JSON.stringify({ userMessageId: U1, assistantMessageId: A1 }));
  turn?.onEvent("delta", JSON.stringify({ segment: 0, kind: "speech", text: "맞아요, 야근!" }));
  turn?.onEvent("done", JSON.stringify({ assistantMessageId: A1, creditsSpent: 0, balance: 0 }));
  turn?.onEnd("complete", null);
  await flush();
  await flush();
  expect(room.loadHistory).toHaveBeenCalledTimes(2);
  expect(screen.getByTestId(ids.quizNote(U1)).textContent).toBe("Free · quiz answer");
  expect(screen.getByTestId(ids.quizCorrect(U1)).textContent).toBe(
    "Correct! You and 덕수쌤 got closer",
  );
  expect(screen.queryByTestId(ids.quizFree)).toBeNull();
});

test("MSI5. 퀴즈 meta가 없으면(지금 서버) 반응 인용만 — 무료 띠 · 퀴즈 표시 없음, 보통 엽전 관문", async () => {
  const room = quizRoom([page([reaction(undefined)])]);
  mountChat({
    source: room.source,
    roomId: "duksu",
    tier: "free",
    trial: createTrialStore(0),
    coinBalance: 0,
  });
  await flush();
  expect(screen.getByTestId(fs.quote).textContent).toContain("Replied to your story");
  expect(screen.queryByTestId(ids.quizFree)).toBeNull();
  tapId(chat.field);
  tapKeys(...KEYS_AN);
  tapId(chatTurnsTestIds.coinSend); // 엽전이 모자라 상점이 열리고 턴은 나가지 않는다
  expect(room.turns).toHaveLength(0);
});
