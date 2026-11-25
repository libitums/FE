import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, screen } from "@lynx-js/react/testing-library";

import type { EpisodeIntroEvent } from "../episode-intro/episode-intro.contract";
import { createFixtureChatSource } from "./chat-fixture-source";
import { fakeTimers } from "./chat-fixture-timers.test-support";
import type { ChatRemote, RemoteTurnHandlers } from "./chat-remote.contract";
import {
  KEYS_AN,
  clearBackHandlers,
  mountChat,
  mountChatOpen,
  tapId,
  tapKeys,
} from "./chat-ui.test-support";
import { companionSeed } from "./companion-roster";
import { messengerChatTestIds as ids } from "./messenger-chat.contract";

// `ui` 계층(SE-UI1 ~ UI5): 답할 문장 추천(보기 판)의 보임 · 누름 이벤트와 `chat_message_sent.fromSuggestion`(ADR-0194).

const A0 = "00000000-0000-4000-8000-000000000000";
const A1 = "22222222-2222-4222-8222-222222222222";
const U1 = "11111111-1111-4111-8111-111111111111";
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

let events: EpisodeIntroEvent[];
const sink = (event: EpisodeIntroEvent) => void events.push(event);
const named = (name: string) =>
  events.filter((event) => event.name === name) as unknown as Record<string, unknown>[];

beforeEach(() => {
  vi.useRealTimers();
  events = [];
});
afterEach(() => {
  cleanup();
  clearBackHandlers();
});

/** 덕수쌤 서버 방 — 기록의 마지막 캐릭터 메시지가 선톡(proactive)이고 추천 둘이 붙어 있습니다. */
function serverSource() {
  const turns: RemoteTurnHandlers[] = [];
  const remote: ChatRemote = {
    loadHistory: async () => ({
      messages: [
        { id: `${A0}#0`, at: 1, kind: "text", from: "them", text: { ko: "뭐 해요?", en: "" } },
      ],
      corrections: {},
      ideas: [
        { ko: "공부해요", roman: "", en: "Studying" },
        { ko: "쉬어요", roman: "", en: "Resting" },
      ],
      ideasOrigin: "proactive",
    }),
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
  const reply = (index: number) => {
    const emit = (name: string, data: unknown) => turns[index]?.onEvent(name, JSON.stringify(data));
    emit("start", { userMessageId: U1, assistantMessageId: A1 });
    emit("delta", { segment: 0, kind: "speech", text: "좋아요" });
    emit("suggestions", {
      status: "ok",
      items: [
        { text: "저도요", meaning: "Me too" },
        { text: "왜요?", meaning: "Why?" },
        { text: "네", meaning: "Yes" },
      ],
    });
    emit("done", { assistantMessageId: A1 });
    turns[index]?.onEnd("complete", null);
  };
  return { source, reply };
}

async function openServerRoom() {
  const server = serverSource();
  mountChat({ source: server.source, roomId: "duksu", eventSink: sink });
  await flush();
  return server;
}

test("SE-UI1 판이 그 묶음으로 처음 그려질 때 보임을 한 번 낸다 — 접었다 다시 열어도 한 번, 추천 글은 싣지 않는다", async () => {
  await openServerRoom();
  expect(named("chat_suggestion_shown")).toEqual([]);

  tapId(ids.ideasButton);
  expect(named("chat_suggestion_shown")).toEqual([
    {
      name: "chat_suggestion_shown",
      surface: "chat",
      daysSinceFirstOpen: expect.any(String) as unknown,
      characterId: "duksu",
      count: "2",
      replyOrigin: "proactive",
      myMessageNumber: "1",
    },
  ]);
  tapId(ids.ideasButton); // 접기
  tapId(ids.ideasButton); // 다시 열기
  expect(named("chat_suggestion_shown")).toHaveLength(1);
  expect(JSON.stringify(events)).not.toContain("공부해요");
});

test("SE-UI2 보기를 누르면 누름(순번 · 보인 수 · 출처 · 내 글 번호)을 내고, 보낸 글은 fromSuggestion true", async () => {
  await openServerRoom();
  tapId(ids.ideasButton);
  tapId(ids.idea(1));
  expect(named("chat_suggestion_tapped")).toEqual([
    expect.objectContaining({
      characterId: "duksu",
      index: "1",
      count: "2",
      replyOrigin: "proactive",
      myMessageNumber: "1",
    }),
  ]);
  expect(named("chat_message_sent")).toEqual([
    expect.objectContaining({ characterId: "duksu", fromSuggestion: true }),
  ]);
});

test("SE-UI3 턴 답에 붙은 새 묶음은 판이 저절로 열리며 보임(turn · 둘째 내 글)을 한 번 더 낸다", async () => {
  const { reply } = await openServerRoom();
  tapId(ids.ideasButton);
  tapId(ids.idea(0));
  await flush();
  reply(0);
  await flush();
  expect(screen.getByTestId(ids.ideasPanel).textContent).toContain("저도요");
  expect(named("chat_suggestion_shown")).toEqual([
    expect.objectContaining({ replyOrigin: "proactive", count: "2", myMessageNumber: "1" }),
    expect.objectContaining({ replyOrigin: "turn", count: "3", myMessageNumber: "2" }),
  ]);
});

test("SE-UI4 입력 칸에 써서 보내면 fromSuggestion false, 누름은 없다", () => {
  mountChatOpen({ eventSink: sink });
  tapKeys(...KEYS_AN);
  tapId(ids.send);
  expect(named("chat_message_sent")).toEqual([expect.objectContaining({ fromSuggestion: false })]);
  expect(named("chat_suggestion_tapped")).toEqual([]);
});

test("SE-UI5 같은 보기를 빠르게 두 번 눌러도 누름은 한 번 — 출처를 모르는 앱 안 방은 unknown", () => {
  mountChatOpen({ eventSink: sink });
  tapId(ids.ideasButton);
  const el = screen.getByTestId(ids.idea(2));
  const target = el.querySelector('[data-testid="ui-lynx-button"]') ?? el;
  fireEvent.tap(target, {});
  fireEvent.tap(target, {});
  expect(named("chat_suggestion_tapped")).toEqual([
    expect.objectContaining({ index: "2", count: "3", replyOrigin: "unknown" }),
  ]);
});
