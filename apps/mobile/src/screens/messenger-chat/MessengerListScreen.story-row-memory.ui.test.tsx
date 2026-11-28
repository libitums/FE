import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, render, screen } from "@lynx-js/react/testing-library";

import { clearBackHandlers, fixtureRoom, makeSource, seedOf } from "./chat-ui.test-support";
import { ChatEventsContext } from "./chat-events";
import { createCoinWallet } from "./coin-wallet";
import type { SuggestedFriendsPort } from "./friend-catalog.contract";
import {
  friendStoriesTestIds as fsIds,
  type FriendStoriesPort,
  type FriendStory,
} from "./friend-stories.contract";
import { story, STORY_NOW } from "./friend-stories.test-support";
import type { MyStoriesState } from "./my-stories.contract";
import { myStoriesTestIds as ids } from "./my-stories.contract";
import { fakeMyStories } from "./my-stories.test-support";
import { MessengerListScreen } from "./MessengerListScreen";
import { accountMemory } from "./story-row-memory";
import { suggestedFriendsTestIds as sfIds } from "./suggested-friends.contract";
import { catalogOf, friend } from "./suggested-friends.test-support";

// `ui` 계층(SRM-UI1 ~ UI3): 탭을 다시 열면(목록 재마운트) 마지막으로 보인 스토리 줄 · 「+」가 첫 프레임에 서고, 다시 읽기는 뒤에서 합니다.
// 읽기가 끝나기 전에 줄이 비었다가(추천 줄) 서며 밀리던 문제(2026-11-27 제보)의 재현입니다.

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
      messages: [{ kind: "text", from: "them", text: { ko: "안녕!", en: "Hi!" }, minutesAgo: 30 }],
    }),
  );

const friendsPort = (): SuggestedFriendsPort => ({
  catalog: () => catalogOf([friend("mina", { name: "미나", unlockEpisode: 3 })]),
  add: () => "added",
  earlyAccess: null,
});

const never = <T,>() => new Promise<T>(() => undefined);

function storiesPort(
  load: () => Promise<readonly FriendStory[] | null>,
  mineLoad: () => Promise<MyStoriesState | null>,
  memory = {
    friends: accountMemory<readonly FriendStory[]>(() => "me"),
    mine: accountMemory<MyStoriesState>(() => "me"),
  },
): FriendStoriesPort {
  const fake = fakeMyStories({ enabled: true });
  return {
    load,
    imageUrl: () => null,
    seen: { seenIds: () => new Set(), markSeen: () => undefined },
    mine: { ...fake.port, load: mineLoad, memory: memory.mine },
    memory: memory.friends,
  };
}

function mount(stories: FriendStoriesPort) {
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
        stories={stories}
      />
    </ChatEventsContext.Provider>,
  );
}

async function flush() {
  await act(async () => {
    for (let i = 0; i < 4; i += 1) await vi.advanceTimersByTimeAsync(1);
  });
}

const mineState: MyStoriesState = {
  enabled: true,
  keep: true,
  stories: [],
  window: null,
  kinds: ["word", "card"],
};

/** 스토리 줄 칸들의 test-id 순서 — 「+」가 맨 앞에 그대로 있는지(가로 위치가 밀리지 않는지) 봅니다. */
function rowOrder(): string[] {
  const row = screen.getByTestId(fsIds.row);
  return Array.from(row.querySelectorAll("[data-testid]"))
    .map((node) => node.getAttribute("data-testid") ?? "")
    .filter((id) => id === ids.create || id === fsIds.friend("mina"));
}

test("SRM-UI1. 기억한 스토리 · 내 스토리가 있으면 읽기가 끝나기 전 첫 프레임에 스토리 줄 · 「+」가 맨 앞에 섭니다", () => {
  const memory = {
    friends: accountMemory<readonly FriendStory[]>(() => "me"),
    mine: accountMemory<MyStoriesState>(() => "me"),
  };
  memory.friends.keep([story("mina")]);
  memory.mine.keep(mineState);
  mount(storiesPort(never, never, memory));
  expect(screen.queryByTestId(fsIds.row)).not.toBeNull();
  expect(rowOrder()).toEqual([ids.create, fsIds.friend("mina")]);
});

test("SRM-UI2. 한 번 읽은 뒤 목록이 다시 마운트되면(탭 재진입) 다시 읽기가 걸린 동안에도 같은 줄이 같은 순서로 서 있습니다", async () => {
  const memory = {
    friends: accountMemory<readonly FriendStory[]>(() => "me"),
    mine: accountMemory<MyStoriesState>(() => "me"),
  };
  mount(
    storiesPort(
      async () => [story("mina")],
      async () => mineState,
      memory,
    ),
  );
  await flush();
  const before = rowOrder();
  expect(before).toEqual([ids.create, fsIds.friend("mina")]);
  cleanup();
  const load = vi.fn(never<readonly FriendStory[] | null>);
  mount(storiesPort(load, never, memory));
  expect(rowOrder()).toEqual(before);
  expect(load).toHaveBeenCalledTimes(1);
});

test("SRM-UI3. 다시 읽기가 끝나면 새 목록으로 바뀝니다(기억은 첫 프레임만 — stale-while-revalidate)", async () => {
  const memory = {
    friends: accountMemory<readonly FriendStory[]>(() => "me"),
    mine: accountMemory<MyStoriesState>(() => "me"),
  };
  memory.friends.keep([story("mina")]);
  memory.mine.keep(mineState);
  mount(
    storiesPort(
      async () => [],
      async () => mineState,
      memory,
    ),
  );
  expect(rowOrder()).toEqual([ids.create, fsIds.friend("mina")]);
  await flush();
  expect(rowOrder()).toEqual([ids.create]);
  expect(memory.friends.read()).toEqual([]);
});

test("SRM-UI4. 기억한 먼저 만나기 제안이 있으면 제안이 다시 읽히기 전 첫 프레임부터 같은 줄 순서(제안 있는 인물이 앞)입니다", () => {
  const offerOf = (id: string) => ({ characterId: id, price: 100, endsAt: null });
  render(
    <ChatEventsContext.Provider value={{ sink: vi.fn(), roomId: null }}>
      <MessengerListScreen
        source={makeSource(
          seedOf(
            fixtureRoom("boss", { counterpart: { id: "boss", name: "사장님", avatarPath: null } }),
            ...["jun", "mina"].map((id) =>
              fixtureRoom(id, {
                counterpart: { id, name: id, avatarPath: null },
                access: { kind: "locked", unlockEpisode: 3 },
                messages: [],
              }),
            ),
          ),
        )}
        wallet={createCoinWallet({ earned: 100 })}
        onOpenRoom={vi.fn()}
        onGoToJourney={vi.fn()}
        onLayerChange={vi.fn()}
        notice={null}
        onNoticeShown={vi.fn()}
        access="open"
        onSignIn={vi.fn()}
        friends={{
          catalog: () =>
            catalogOf([
              friend("jun", { name: "준", unlockEpisode: 3 }),
              friend("mina", { name: "미나", unlockEpisode: 3 }),
            ]),
          add: () => "added",
          earlyAccess: async () => ({ kind: "failed" }),
          offers: never,
          lastOffers: () => [offerOf("mina")],
        }}
      />
    </ChatEventsContext.Provider>,
  );
  const order = Array.from(screen.getByTestId(sfIds.row).querySelectorAll("[data-testid]"))
    .map((node) => node.getAttribute("data-testid"))
    .filter((id) => id === sfIds.avatar("jun") || id === sfIds.avatar("mina"));
  expect(order).toEqual([sfIds.avatar("mina"), sfIds.avatar("jun")]);
});
