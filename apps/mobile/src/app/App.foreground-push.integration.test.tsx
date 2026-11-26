import { act, fireEvent, screen, within } from "@lynx-js/react/testing-library";
import { afterEach, expect, test } from "vitest";

import type { EpisodeIntroEvent } from "../screens/episode-intro/episode-intro.contract";
import { memoryUnlockStore } from "../screens/messenger-chat/chat-local-stores";
import type { ChatRemote } from "../screens/messenger-chat/chat-remote.contract";
import type { ChatMessage } from "../screens/messenger-chat/chat-source.contract";
import { App } from "./App";
import { pushReceivedEventName } from "./foreground-push";
import {
  messengerChatSource,
  resetMessengerChatSourceForTests,
  setMessengerChatRemote,
  setMessengerChatStoresForTests,
} from "./messenger-chat-wiring";
import { replyToastTestIds as ids } from "./reply-toast.contract";
import { openTab, present, renderTesterApp, textOf } from "./test-helpers/messenger-chat-app";
import { legacyPassedSeed } from "./test-helpers/progress-seed";

// `integration` 계층(FPI1 ~ FPI5, ADR-0200 개정): 앱이 앞에 있을 때 온 인물의 채팅 메시지 푸시 — 호스트 전역 이벤트
// `pushNotificationReceived`(인물 id) → 출처가 그 방 서버 기록을 다시 읽음 → 안 읽음 오름 → 답장 토스트(같은 규칙). 실제 App 트리 ·
// 서버 모드 출처, 대역은 경계뿐(`ChatRemote` · 저장소).

const A1 = "22222222-2222-4222-8222-222222222222";
const P1 = "33333333-3333-4333-8333-333333333333";
const line = (id: string, ko: string): ChatMessage => ({
  id,
  at: 1,
  kind: "text",
  from: "them",
  text: { ko, en: "" },
});

let events: EpisodeIntroEvent[] = [];
const named = (name: string) =>
  events.filter((event) => event.name === name) as unknown as Record<string, unknown>[];
const flush = () =>
  act(async () => {
    for (let i = 0; i < 8; i += 1) await new Promise((resolve) => setTimeout(resolve, 0));
  });

afterEach(() => {
  setMessengerChatRemote(null);
  resetMessengerChatSourceForTests();
});

/** 서버 방 대역 — 기록은 `server.messages`를 그대로 돌려줍니다(푸시 전에 새 말을 더함). */
function serverRemote() {
  const messages: ChatMessage[] = [line(`${A1}#0`, "안녕")];
  let reads = 0;
  const remote: ChatRemote = {
    loadHistory: async () => {
      reads += 1;
      return { messages: [...messages], corrections: {}, ideas: null };
    },
    greet: async () => null,
    openTurn: () => ({ cancel: () => undefined }),
  };
  return { remote, messages, reads: () => reads };
}

async function boot() {
  const server = serverRemote();
  events = [];
  resetMessengerChatSourceForTests();
  setMessengerChatStoresForTests({
    unlock: memoryUnlockStore(["mina"]),
    now: () => Date.now(),
    tier: "free",
  });
  setMessengerChatRemote(() => server.remote);
  await renderTesterApp(
    <App progressSeed={legacyPassedSeed} episodeIntroEventSink={(event) => events.push(event)} />,
  );
  const source = messengerChatSource((path) => path);
  source.setBirthYear(2000);
  await flush();
  const unread = () =>
    source.snapshot().rooms.find((room) => room.counterpart.id === "mina")?.unread ?? -1;
  return { server, source, unread };
}

function push(characterId: unknown): void {
  act(() => {
    lynx.getJSModule("GlobalEventEmitter").emit(pushReceivedEventName, [characterId]);
  });
}

test("FPI1 다른 탭(여정)에서 선톡 푸시가 오면 그 방 기록을 읽어 안 읽음이 오르고 카드가 선다 — 미리보기는 새 말, kind proactive", async () => {
  const { server, unread } = await boot();
  expect(present("journey-map-screen")).toBe(true);
  const before = unread();
  server.messages.push(line(`${P1}#0`, "오늘 뭐 해?"));

  push("mina");
  await flush();

  expect(unread()).toBe(before + 1);
  expect(present(ids.card)).toBe(true);
  expect(textOf(ids.open)).toContain("미나");
  expect(textOf(ids.preview)).toContain("오늘 뭐 해?");
  expect(named("chat_reply_toast_shown")).toEqual([
    expect.objectContaining({ characterId: "mina", kind: "proactive", screen: "journey-map" }),
  ]);
});

test("FPI2 같은 메시지의 푸시가 다시 오면(이미 받음) 카드 · 안 읽음이 늘지 않는다", async () => {
  const { server, unread } = await boot();
  server.messages.push(line(`${P1}#0`, "오늘 뭐 해?"));
  push("mina");
  await flush();
  const once = unread();
  push("mina");
  await flush();
  expect(unread()).toBe(once);
  expect(named("chat_reply_toast_shown")).toHaveLength(1);
});

test("FPI3 채팅 목록에서는 카드 없이 목록 안 읽음만 맞춘다", async () => {
  const { server, unread } = await boot();
  openTab("messenger");
  expect(present("messenger-list-screen")).toBe(true);
  const before = unread();
  server.messages.push(line(`${P1}#0`, "오늘 뭐 해?"));
  push("mina");
  await flush();
  expect(unread()).toBe(before + 1);
  expect(present(ids.card)).toBe(false);
});

test("FPI4 그 인물의 방에 있으면 카드 없이 방이 새 말을 받는다", async () => {
  const { server, source } = await boot();
  openTab("messenger");
  const roomId = source.snapshot().rooms.find((room) => room.counterpart.id === "mina")?.roomId;
  if (roomId === undefined) throw new Error("미나 방 없음");
  act(() => {
    fireEvent.tap(
      within(screen.getByTestId("messenger-list-list")).getByTestId(`messenger-list-row-${roomId}`),
      {},
    );
  });
  await flush();
  expect(present("messenger-chat-screen")).toBe(true);
  server.messages.push(line(`${P1}#0`, "오늘 뭐 해?"));
  push("mina");
  await flush();
  const texts = (source.thread(roomId)?.messages ?? []).map((m) =>
    m.kind === "text" ? m.text.ko : m.kind,
  );
  expect(texts).toContain("오늘 뭐 해?");
  expect(present(ids.card)).toBe(false);
});

test("FPI5 모르는 인물 · 형식이 틀린 id면 기록을 읽지 않는다", async () => {
  const { server } = await boot();
  const reads = server.reads();
  push("nobody");
  push("Mina!");
  push(7);
  await flush();
  expect(server.reads()).toBe(reads);
  expect(present(ids.card)).toBe(false);
});
