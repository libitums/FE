import { act, cleanup, fireEvent, screen, within } from "@lynx-js/react/testing-library";
import { afterEach, expect, test, vi } from "vitest";

import { setTesterAccessActive } from "../lib/tester-access";
import type { EpisodeIntroEvent } from "../screens/episode-intro/episode-intro.contract";
import { memoryUnlockStore } from "../screens/messenger-chat/chat-local-stores";
import type {
  ChatRemote,
  RemoteTurnHandlers,
} from "../screens/messenger-chat/chat-remote.contract";
import { App } from "./App";
import {
  messengerChatSource,
  resetMessengerChatSourceForTests,
  setMessengerChatRemote,
  setMessengerChatStoresForTests,
} from "./messenger-chat-wiring";
import { openTab, present, renderTesterApp, tapId } from "./test-helpers/messenger-chat-app";
import { legacyPassedSeedWithCoins } from "./test-helpers/progress-seed";

// `integration` 계층(SE-I1): 답할 문장 추천 이벤트(ADR-0195)가 실제 App의 이벤트 결선(메신저 `ChatEventsContext` → PostHog sink)과
// 서버 방 출처(첫 인사 → greeting, 턴 → turn)를 지나 한 트리에서 맞물린다. 대역은 경계뿐 — 저장소 · `ChatRemote` 포트.

const U1 = "11111111-1111-4111-8111-111111111111";
const A1 = "22222222-2222-4222-8222-222222222222";
const G1 = "33333333-3333-4333-8333-333333333333";

let events: EpisodeIntroEvent[] = [];
const named = (name: string) =>
  events.filter((event) => event.name === name) as unknown as Record<string, unknown>[];
const flush = () =>
  act(async () => {
    for (let i = 0; i < 8; i += 1) await new Promise((resolve) => setTimeout(resolve, 0));
  });

afterEach(() => {
  cleanup();
  setMessengerChatRemote(null);
  setTesterAccessActive(false);
  resetMessengerChatSourceForTests();
  vi.useRealTimers();
});

/** 빈 방 — 첫 인사에 추천 둘, 턴 답에 추천 셋. */
function serverRemote() {
  const turns: RemoteTurnHandlers[] = [];
  const remote: ChatRemote = {
    loadHistory: async () => ({ messages: [], corrections: {}, ideas: null }),
    greet: async () => ({
      messages: [
        { id: `${G1}#0`, at: 1, kind: "text", from: "them", text: { ko: "안녕!", en: "" } },
      ],
      ideas: [
        { ko: "안녕하세요", roman: "", en: "Hello" },
        { ko: "반가워요", roman: "", en: "Nice to meet you" },
      ],
    }),
    openTurn: (_request, handlers) => {
      turns.push(handlers);
      return { cancel: () => undefined };
    },
    wallet: async () => ({ balance: 40, trialRemaining: 5 }),
  };
  const reply = () =>
    act(() => {
      const handlers = turns[turns.length - 1];
      if (handlers === undefined) throw new Error("no turn");
      const emit = (name: string, data: unknown) => handlers.onEvent(name, JSON.stringify(data));
      handlers.onOpen(200);
      emit("start", { userMessageId: U1, assistantMessageId: A1 });
      emit("delta", { segment: 0, kind: "speech", text: "네, 반가워요" });
      emit("suggestions", {
        status: "ok",
        items: [
          { text: "이름이 뭐예요?", meaning: "What's your name?" },
          { text: "어디 살아요?", meaning: "Where do you live?" },
          { text: "좋아요", meaning: "Good" },
        ],
      });
      emit("done", { assistantMessageId: A1, creditsSpent: 0, balance: 40 });
      handlers.onEnd("complete", null);
    });
  return { remote, reply };
}

test("SE-I1. 서버 방: 첫 인사 추천 보임(greeting) → 누름 → 보냄(fromSuggestion) → 턴 답 추천이 저절로 열려 보임(turn · 둘째 내 글)", async () => {
  const server = serverRemote();
  resetMessengerChatSourceForTests();
  setMessengerChatStoresForTests({
    unlock: memoryUnlockStore(["mina"]),
    now: () => Date.now(),
    tier: "free",
  });
  setMessengerChatRemote(() => server.remote);
  events = [];
  await renderTesterApp(
    <App
      progressSeed={legacyPassedSeedWithCoins(40)}
      episodeIntroEventSink={(event) => events.push(event)}
    />,
  );
  openTab("messenger");
  messengerChatSource((path) => path).setBirthYear(2000);
  await flush();
  act(() => {
    fireEvent.tap(
      within(screen.getByTestId("messenger-list-list")).getByTestId("messenger-list-row-mina"),
      {},
    );
  });
  await flush();

  tapId("messenger-chat-ideas-button");
  expect(present("messenger-chat-ideas")).toBe(true);
  expect(named("chat_suggestion_shown")).toEqual([
    expect.objectContaining({
      surface: "chat",
      characterId: "mina",
      count: "2",
      replyOrigin: "greeting",
      myMessageNumber: "1",
    }),
  ]);

  tapId("messenger-chat-idea-1");
  expect(named("chat_suggestion_tapped")).toEqual([
    expect.objectContaining({ characterId: "mina", index: "1", replyOrigin: "greeting" }),
  ]);
  expect(named("chat_message_sent")).toEqual([
    expect.objectContaining({ characterId: "mina", fromSuggestion: true }),
  ]);

  server.reply();
  await flush();
  expect(named("chat_suggestion_shown")).toEqual([
    expect.objectContaining({ replyOrigin: "greeting" }),
    expect.objectContaining({ replyOrigin: "turn", count: "3", myMessageNumber: "2" }),
  ]);
  expect(JSON.stringify(events)).not.toContain("반가워요");
});
