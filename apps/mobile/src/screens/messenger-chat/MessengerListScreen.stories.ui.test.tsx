import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, render, screen } from "@lynx-js/react/testing-library";

import { clearBackHandlers, fixtureRoom, makeSource, seedOf, tapId } from "./chat-ui.test-support";
import { ChatEventsContext } from "./chat-events";
import { createCoinWallet } from "./coin-wallet";
import type { SuggestedFriendsPort } from "./friend-catalog.contract";
import {
  friendStoriesTestIds as ids,
  type FriendStoriesPort,
  type FriendStory,
} from "./friend-stories.contract";
import { HOUR_MS, STORY_NOW, story } from "./friend-stories.test-support";
import { messengerListTestIds as list } from "./messenger-chat.contract";
import { MessengerListScreen } from "./MessengerListScreen";
import { putPendingStoryOpen, takeStoryReplyHandoff } from "./story-reply-handoff";
import { suggestedFriendsTestIds as suggestedIds } from "./suggested-friends.contract";
import { catalogOf, friend, general } from "./suggested-friends.test-support";

// `ui` 계층(FS-UI7): 목록 화면 + 가짜 출처 + 가짜 스토리 포트(ADR-0178 D2 · D3 · D5) — 스토리가 없으면 추천 줄 그대로, 있으면 스토리 줄,
// 친구 스토리 → 보기 → 칩 · 답장 칸이 넘김을 남기고 방을 엶, 목록 줄 「New story」, 본 것 표시, 이벤트, 알림으로 연 스토리.

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(STORY_NOW);
});
afterEach(() => {
  cleanup();
  clearBackHandlers();
  vi.useRealTimers();
  takeStoryReplyHandoff("mina");
});

const seed = () =>
  seedOf(
    fixtureRoom("mina", {
      counterpart: { id: "mina", name: "미나", avatarPath: null },
      messages: [{ kind: "text", from: "them", text: { ko: "안녕!", en: "Hi!" }, minutesAgo: 540 }],
    }),
    fixtureRoom("daeun", {
      counterpart: { id: "daeun", name: "다은", avatarPath: null },
      access: { kind: "locked", unlockEpisode: 0 },
      messages: [],
    }),
  );

const friendsPort = (): SuggestedFriendsPort => ({
  catalog: () =>
    catalogOf([
      friend("mina", { name: "미나", unlockEpisode: 3 }),
      general("daeun", { name: "다은", intro: { en: "Loves cafés" } }),
    ]),
  add: () => "added",
  earlyAccess: null,
});

function storiesPort(stories: readonly FriendStory[] | null) {
  const seen = new Set<string>();
  const markSeen = vi.fn((id: string) => void seen.add(id));
  const port: FriendStoriesPort = {
    load: async () => stories,
    imageUrl: (path) => `https://cdn/${path}`,
    seen: { seenIds: () => new Set(seen), markSeen },
  };
  return { port, markSeen };
}

async function mount(stories: readonly FriendStory[] | null) {
  const source = makeSource(seed());
  const sink = vi.fn();
  const onOpenRoom = vi.fn<(roomId: string) => void>();
  const { port, markSeen } = storiesPort(stories);
  render(
    <ChatEventsContext.Provider value={{ sink, roomId: null }}>
      <MessengerListScreen
        source={source}
        wallet={createCoinWallet({ earned: 100 })}
        onOpenRoom={onOpenRoom}
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
  await act(async () => {
    await Promise.resolve();
  });
  const events = () => sink.mock.calls.map(([event]) => event as { name: string });
  return { onOpenRoom, events, markSeen };
}

const live = [
  story("mina", { id: "st-mina", postedAt: STORY_NOW - 2 * HOUR_MS }),
  story("daeun", { id: "st-daeun" }),
];

test("FS-UI7. 스토리가 없거나 못 읽으면 추천 줄 그대로", async () => {
  await mount(null);
  expect(screen.getByTestId(suggestedIds.row)).not.toBeNull();
  expect(screen.queryByTestId(ids.row)).toBeNull();
});

test("FS-UI7. 스토리가 있으면 스토리 줄이 맨 위 — row_viewed 한 번", async () => {
  const { events } = await mount(live);
  expect(screen.getByTestId(list.list).firstElementChild).toBe(screen.getByTestId(ids.row));
  expect(screen.queryByTestId(suggestedIds.row)).toBeNull();
  expect(events().filter((e) => e.name === "friend_story_row_viewed")).toEqual([
    expect.objectContaining({ count: "2", unseen: "1" }),
  ]);
});

test("FS-UI7. 친구 스토리 → 보기(본 것 표시 · viewed) → 칩 → 넘김 · 방 열기", async () => {
  const { onOpenRoom, events, markSeen } = await mount(live);
  tapId(ids.friend("mina"));
  expect(screen.getByTestId(ids.viewer)).not.toBeNull();
  expect(markSeen).toHaveBeenCalledWith("st-mina", live[0]?.expiresAt, STORY_NOW);
  expect(events().filter((e) => e.name === "friend_story_viewed")).toEqual([
    expect.objectContaining({
      characterId: "mina",
      met: true,
      from: "row",
      index: "1",
      total: "1",
    }),
  ]);
  // 칩은 그 자리에서 보냅니다(D5 개정) — 넘김을 남기지 않고, Open chat을 눌러야 방이 열립니다.
  tapId(ids.chip(0));
  await act(async () => {
    await Promise.resolve();
  });
  expect(screen.getByTestId(ids.viewer)).not.toBeNull();
  expect(onOpenRoom).not.toHaveBeenCalled();
  expect(takeStoryReplyHandoff("mina")).toBeNull();
  tapId(ids.openChat);
  expect(screen.queryByTestId(ids.viewer)).toBeNull();
  expect(onOpenRoom).toHaveBeenCalledWith("mina");
});

test("FS-UI7. 목록 줄의 New story → 보기, 본 뒤 줄은 보통 미리보기", async () => {
  await mount(live);
  expect(screen.getByTestId(list.rowPreview("mina")).textContent).toBe(
    "New story · 야근 끝! 편의점 라면이 최고야",
  );
  tapId(list.row("mina"));
  expect(screen.getByTestId(ids.viewer)).not.toBeNull();
  tapId(ids.close);
  expect(screen.getByTestId(list.rowPreview("mina")).textContent).toBe("안녕!");
});

test("FS-UI7. 알림으로 연 인물의 스토리가 서면 그 보기를 연다(from push)", async () => {
  putPendingStoryOpen("daeun");
  const { events } = await mount(live);
  expect(screen.getByTestId(ids.viewer)).not.toBeNull();
  expect(events().filter((e) => e.name === "friend_story_viewed")).toEqual([
    expect.objectContaining({ characterId: "daeun", met: false, from: "push" }),
  ]);
});

test("FS-UI7. 목록이 이미 서 있을 때(탭 유지) 알림이 오면 그 스토리를 연다", async () => {
  await mount(live);
  expect(screen.queryByTestId(ids.viewer)).toBeNull();
  await act(async () => {
    putPendingStoryOpen("daeun");
    for (let i = 0; i < 6; i += 1) await vi.advanceTimersByTimeAsync(1);
  });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1);
  });
  expect(screen.getByTestId(ids.viewer)).not.toBeNull();
});

test("FS-UI7. 목록이 선 뒤에 올라온 스토리도 알림이 오면 다시 읽어 연다", async () => {
  const lists: (readonly FriendStory[])[] = [[], live];
  const port: FriendStoriesPort = {
    load: async () => lists.shift() ?? live,
    imageUrl: (path) => `https://cdn/${path}`,
    seen: { seenIds: () => new Set(), markSeen: () => undefined },
  };
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
  await act(async () => {
    await Promise.resolve();
  });
  expect(screen.queryByTestId(ids.row)).toBeNull();
  await act(async () => {
    putPendingStoryOpen("daeun");
    for (let i = 0; i < 6; i += 1) await vi.advanceTimersByTimeAsync(1);
  });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1);
  });
  expect(screen.getByTestId(ids.viewer)).not.toBeNull();
});

test("FS-UI7. 알림으로 연 인물에 스토리가 없으면 방이 열린 인물은 그 방으로", async () => {
  putPendingStoryOpen("mina");
  const { onOpenRoom } = await mount([]);
  expect(onOpenRoom).toHaveBeenCalledWith("mina");
});

test("FS-UI7. 스토리 줄의 추천 아바타 → 프로필 시트(from story), Find friends → 친구 찾기", async () => {
  const { events } = await mount([live[0] as FriendStory]);
  tapId(suggestedIds.avatar("daeun"));
  expect(screen.getByTestId(suggestedIds.sheet)).not.toBeNull();
  expect(events().filter((e) => e.name === "suggested_friend_opened")).toEqual([
    expect.objectContaining({ characterId: "daeun", from: "story_row" }),
  ]);
  tapId(suggestedIds.sheetLater);
  tapId(ids.findFriends);
  expect(screen.getByTestId("friend-directory-screen")).not.toBeNull();
});

test("FS-UI7. 안 만난 친구 스토리 → Add friend and reply → 추가 · 인용 띠 넘김 · 방 열기", async () => {
  const { onOpenRoom, events } = await mount(live);
  tapId(ids.unmet("daeun"));
  tapId(ids.meet);
  expect(onOpenRoom).toHaveBeenCalledWith("daeun");
  expect(takeStoryReplyHandoff("daeun")).toMatchObject({ roomId: "daeun", text: null });
  expect(events().filter((e) => e.name === "suggested_friend_added")).toEqual([
    expect.objectContaining({ characterId: "daeun", from: "story_viewer", via: "free" }),
  ]);
});

test("FS-UI10. 보기를 닫으면 friend_story_closed 한 번 — 본 장 · 전체 · 건너뜀 · 까닭(감사 A4)", async () => {
  const { events } = await mount(live);
  tapId(ids.watchAll);
  expect(events().filter((e) => e.name === "friend_story_viewed")).toEqual([
    expect.objectContaining({ index: "1", total: "1", from: "watch_all" }),
  ]);
  tapId(ids.close);
  expect(events().filter((e) => e.name === "friend_story_closed")).toEqual([
    expect.objectContaining({ shown: "1", total: "1", skipped: "0", reason: "closed" }),
  ]);
});

test("FS-UI10. 마지막 장에서 다음을 누르면 completed, 끝내는 탭은 skipped로 세지 않는다", async () => {
  const { events } = await mount(live);
  tapId(ids.watchAll);
  tapId(ids.next);
  expect(screen.queryByTestId(ids.viewer)).toBeNull();
  expect(events().filter((e) => e.name === "friend_story_closed")).toEqual([
    expect.objectContaining({ shown: "1", total: "1", skipped: "0", reason: "completed" }),
  ]);
});

test("FS-UI11. 스토리 줄이 추천 줄을 대신하면 suggested_friend_viewed는 없고 row_viewed는 한 번(감사 A5)", async () => {
  const { events } = await mount(live);
  expect(events().filter((e) => e.name === "friend_story_row_viewed")).toHaveLength(1);
  expect(events().filter((e) => e.name === "suggested_friend_viewed")).toEqual([]);
});
