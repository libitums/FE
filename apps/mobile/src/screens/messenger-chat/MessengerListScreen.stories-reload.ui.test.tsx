import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, render, screen } from "@lynx-js/react/testing-library";

import { clearBackHandlers, fixtureRoom, makeSource, seedOf, tapId } from "./chat-ui.test-support";
import { ChatEventsContext } from "./chat-events";
import { createCoinWallet } from "./coin-wallet";
import type { SuggestedFriendsPort } from "./friend-catalog.contract";
import { STORY_RELOAD_MS } from "./friend-stories";
import {
  friendStoriesTestIds as ids,
  type FriendStoriesPort,
  type FriendStory,
} from "./friend-stories.contract";
import { STORY_NOW, story } from "./friend-stories.test-support";
import { MessengerListScreen } from "./MessengerListScreen";
import { catalogOf, friend, general } from "./suggested-friends.test-support";

// `ui` 계층(FS-UI14 ~ UI17): 스토리 다시 읽기(ADR-0178 「다시 읽기」) — 목록이 보이는 동안 5분마다 · 포트의 다시 읽기 신호(앱이 앞으로 옴)에
// 다시 읽고, 보기가 열려 있으면 결과를 보류했다가 닫은 뒤 반영, 못 읽으면 있던 목록을 지킨다.

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(STORY_NOW);
});
afterEach(() => {
  cleanup();
  clearBackHandlers();
  vi.useRealTimers();
});

const seed = () =>
  seedOf(
    fixtureRoom("mina", {
      counterpart: { id: "mina", name: "미나", avatarPath: null },
      messages: [{ kind: "text", from: "them", text: { ko: "안녕!", en: "Hi!" }, minutesAgo: 540 }],
    }),
  );

const friendsPort = (): SuggestedFriendsPort => ({
  catalog: () => catalogOf([friend("mina", { name: "미나", unlockEpisode: 3 }), general("daeun")]),
  add: () => "added",
  earlyAccess: null,
});

type Answer = readonly FriendStory[] | null | "throw";

/** 읽을 때마다 `answers`를 앞에서 하나씩 꺼냅니다(다 쓰면 마지막 것). */
function scriptedPort(answers: Answer[]) {
  const listeners = new Set<() => void>();
  let last: Answer = null;
  const load = vi.fn(async () => {
    last = answers.length > 0 ? (answers.shift() as Answer) : last;
    if (last === "throw") throw new Error("network");
    return last;
  });
  const port: FriendStoriesPort = {
    load,
    imageUrl: (path) => `https://cdn/${path}`,
    seen: { seenIds: () => new Set(), markSeen: () => undefined },
    subscribeReload: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
  const signal = () => {
    for (const listener of Array.from(listeners)) listener();
  };
  return { port, load, signal, listeners };
}

async function flush() {
  await act(async () => {
    for (let i = 0; i < 4; i += 1) await Promise.resolve();
  });
}

async function mount(port: FriendStoriesPort) {
  render(
    <ChatEventsContext.Provider value={{ sink: vi.fn(), roomId: null }}>
      <MessengerListScreen
        source={makeSource(seed())}
        wallet={createCoinWallet({ earned: 100 })}
        onOpenRoom={vi.fn()}
        onGoToJourney={vi.fn()}
        onLayerChange={vi.fn()}
        notice={null}
        onNoticeShown={vi.fn()}
        access="open"
        onSignIn={vi.fn()}
        friends={friendsPort()}
        stories={port}
      />
    </ChatEventsContext.Provider>,
  );
  await flush();
}

async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
  await flush();
}

const mina = [story("mina", { id: "st-mina" })];

test("FS-UI14. 목록이 보이는 동안 5분마다 다시 읽어 새 스토리가 줄에 서고, 목록을 내리면 멈춘다", async () => {
  const { port, load } = scriptedPort([[], mina]);
  await mount(port);
  expect(screen.queryByTestId(ids.row)).toBeNull();
  await advance(STORY_RELOAD_MS - 1);
  expect(load).toHaveBeenCalledTimes(1);
  await advance(1);
  expect(load).toHaveBeenCalledTimes(2);
  expect(screen.getByTestId(ids.friend("mina"))).not.toBeNull();
  cleanup();
  await advance(STORY_RELOAD_MS * 2);
  expect(load).toHaveBeenCalledTimes(2);
});

test("FS-UI15. 포트의 다시 읽기 신호(앱이 앞으로 옴)에 다시 읽고, 목록을 내리면 리스너를 뗀다", async () => {
  const { port, load, signal, listeners } = scriptedPort([[], mina]);
  await mount(port);
  expect(listeners.size).toBe(1);
  await act(async () => signal());
  await flush();
  expect(load).toHaveBeenCalledTimes(2);
  expect(screen.getByTestId(ids.friend("mina"))).not.toBeNull();
  cleanup();
  expect(listeners.size).toBe(0);
});

test("FS-UI16. 보기가 열려 있으면 다시 읽은 목록을 갈아 끼우지 않고, 닫은 뒤 반영한다", async () => {
  const { port, load, signal } = scriptedPort([mina, []]);
  await mount(port);
  tapId(ids.friend("mina"));
  expect(screen.getByTestId(ids.viewer)).not.toBeNull();
  await act(async () => signal());
  await flush();
  expect(load).toHaveBeenCalledTimes(2);
  expect(screen.getByTestId(ids.viewer)).not.toBeNull();
  expect(screen.getByTestId(ids.row)).not.toBeNull();
  tapId(ids.close);
  await flush();
  expect(screen.queryByTestId(ids.viewer)).toBeNull();
  expect(screen.queryByTestId(ids.row)).toBeNull();
});

test("FS-UI17. 다시 읽기가 실패하면(null · 던짐) 있던 스토리 줄을 지킨다", async () => {
  const { port, load } = scriptedPort([mina, null, "throw"]);
  await mount(port);
  expect(screen.getByTestId(ids.friend("mina"))).not.toBeNull();
  await advance(STORY_RELOAD_MS);
  await advance(STORY_RELOAD_MS);
  expect(load).toHaveBeenCalledTimes(3);
  expect(screen.getByTestId(ids.friend("mina"))).not.toBeNull();
});
