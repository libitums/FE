import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, render, screen } from "@lynx-js/react/testing-library";

import {
  advance,
  clearBackHandlers,
  fixtureRoom,
  makeSource,
  seedOf,
  systemBack,
  tapButtonIn,
  tapId,
} from "./chat-ui.test-support";
import { ChatEventsContext } from "./chat-events";
import type { ChatFixtureSeed } from "./chat-fixture.contract";
import { createCoinWallet } from "./coin-wallet";
import type { SuggestedFriendsPort } from "./friend-catalog.contract";
import { friendStoriesTestIds as fsIds, type FriendStoriesPort } from "./friend-stories.contract";
import { myStoriesTestIds as ids } from "./my-stories.contract";
import { fakeMyStories, MS_HOUR, MS_NOW, myStory, reaction } from "./my-stories.test-support";
import { MessengerListScreen } from "./MessengerListScreen";
import { friendDirectoryTestIds } from "./suggested-friends.contract";
import { catalogOf, friend } from "./suggested-friends.test-support";

// `integration` 계층(MV-I1 ~ I5): 목록 화면 → 「Your story」 → 친구 스토리와 같은 전체 화면 보기(ADR-0194 개정 ⟨보기⟩, 시안 34 ~ 36번).
// 내 스토리 포트(메모리 대역) · 대화 스냅숏의 방(얼굴 · 친구 유무) · 방 열기 · 만들기 흐름 · 지우기 확인 상자 · 이벤트가 이어지는지 봅니다.

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(MS_NOW);
});
afterEach(() => {
  cleanup();
  clearBackHandlers();
  vi.useRealTimers();
});

const withChats = () =>
  seedOf(
    fixtureRoom("yoonkyung", {
      counterpart: { id: "yoonkyung", name: "윤경", avatarPath: null },
      messages: [{ kind: "text", from: "them", text: { ko: "안녕!", en: "Hi!" }, minutesAgo: 30 }],
    }),
    fixtureRoom("haejun", {
      counterpart: { id: "haejun", name: "권해준", avatarPath: null },
      messages: [{ kind: "text", from: "me", text: { ko: "네", en: "" }, minutesAgo: 40 }],
    }),
    fixtureRoom("gunwoo", {
      counterpart: { id: "gunwoo", name: "임건우", avatarPath: null },
      messages: [{ kind: "text", from: "them", text: { ko: "와!", en: "Wow!" }, minutesAgo: 50 }],
    }),
  );
const noChats = () =>
  seedOf(
    fixtureRoom("yoonkyung", {
      counterpart: { id: "yoonkyung", name: "윤경", avatarPath: null },
      messages: [],
    }),
  );

const friendsPort = (): SuggestedFriendsPort => ({
  catalog: () => catalogOf([friend("yoonkyung", { name: "윤경", unlockEpisode: 1 })]),
  add: () => "added",
  earlyAccess: null,
});

async function mount(fake: ReturnType<typeof fakeMyStories>, seed: ChatFixtureSeed = withChats()) {
  const sink = vi.fn();
  const onOpenRoom = vi.fn<(roomId: string) => void>();
  const stories: FriendStoriesPort = {
    load: async () => [],
    imageUrl: () => null,
    seen: { seenIds: () => new Set(), markSeen: () => undefined },
    mine: fake.port,
  };
  render(
    <ChatEventsContext.Provider value={{ sink, roomId: null }}>
      <MessengerListScreen
        source={makeSource(seed)}
        wallet={createCoinWallet({ earned: 100 })}
        onOpenRoom={onOpenRoom}
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
  await flush();
  const events = () => sink.mock.calls.map(([event]) => event as { name: string });
  return { onOpenRoom, events };
}

async function flush() {
  await act(async () => {
    for (let i = 0; i < 4; i += 1) await vi.advanceTimersByTimeAsync(1);
  });
}

const replied = () =>
  myStory("ms-2", {
    postedAt: MS_NOW - MS_HOUR,
    reactions: [
      reaction("r1", "yoonkyung", { text: "와, 서울에 온 걸 환영해!", at: MS_NOW - 50 * 60_000 }),
      reaction("r2", "haejun", { text: "창가 자리 부럽다.", at: MS_NOW - 30 * 60_000 }),
      reaction("r3", "gunwoo", {
        text: "도착하면 한강 가자!",
        messageId: null,
        at: MS_NOW - 5 * 60_000,
      }),
    ],
    seenBy: ["yoonkyung", "haejun", "gunwoo", "nobody"].map((characterId) => ({
      characterId,
      at: MS_NOW - MS_HOUR,
    })),
  });

test("MV-I1. 「Your story」 → 전체 화면 보기(막대 = 살아 있는 내 스토리 수, 시작은 가장 최근) · 답장 칸 대신 아래 바 · 새 답 2줄", async () => {
  const older = myStory("ms-1", { postedAt: MS_NOW - 3 * MS_HOUR });
  const { events } = await mount(fakeMyStories({ stories: [older, replied()] }));
  tapId(ids.mine);
  expect(screen.getByTestId(fsIds.viewer)).not.toBeNull();
  expect(screen.queryByTestId(ids.viewer)).toBeNull();
  expect(screen.getByTestId(fsIds.progress).getAttribute("accessibility-label")).toBe(
    "Story 2 of 2",
  );
  expect(screen.getByTestId(fsIds.name).textContent).toBe("Your story");
  expect(screen.queryByTestId(fsIds.replyInput)).toBeNull();
  expect(
    screen.getAllByTestId(/my-stories-reply-line-/).map((line) => line.getAttribute("data-testid")),
  ).toEqual([ids.replyLine("r2"), ids.replyLine("r3")]);
  expect(screen.getByTestId(ids.barSeen).textContent).toContain("Seen by 4");
  expect(events().filter((e) => e.name === "my_story_viewed")).toEqual([
    expect.objectContaining({ from: "row", reactions: "3", unseen: "3" }),
  ]);
  // 이전 탭으로 앞 스토리, 끝까지 보면 닫힘.
  tapId(fsIds.previous);
  expect(screen.getByTestId(fsIds.progress).getAttribute("accessibility-label")).toBe(
    "Story 1 of 2",
  );
  expect(screen.getByTestId(ids.barWaiting)).not.toBeNull();
  advance(6_000);
  advance(6_000);
  expect(screen.queryByTestId(fsIds.viewer)).toBeNull();
  expect(screen.getByTestId(ids.mine).getAttribute("data-state")).toBe("seen");
});

test("MV-I2. 새 답 줄을 누르면 그 친구 방 · 보기 닫힘 · chat_opened(메시지 없음은 false)", async () => {
  const { onOpenRoom, events } = await mount(fakeMyStories({ stories: [replied()] }));
  tapId(ids.mine);
  tapId(ids.replyLine("r3"));
  expect(onOpenRoom).toHaveBeenCalledWith("gunwoo");
  expect(screen.queryByTestId(fsIds.viewer)).toBeNull();
  expect(events().filter((e) => e.name === "my_story_chat_opened")).toEqual([
    expect.objectContaining({ characterId: "gunwoo", message: false }),
  ]);
});

test("MV-I3. 「Seen by」 → 답 목록 시트(3 friends replied · Open chat → 그 방), 시스템 뒤로는 시트만 닫는다", async () => {
  const { onOpenRoom } = await mount(fakeMyStories({ stories: [replied()] }));
  tapId(ids.mine);
  tapId(ids.barSeen);
  expect(screen.getByTestId(ids.repliesSheet).textContent).toContain("3 friends replied");
  expect(screen.getByTestId(ids.seenBy).textContent).toContain("Seen by 4");
  expect(systemBack()).toBe(true);
  expect(screen.queryByTestId(ids.repliesSheet)).toBeNull();
  expect(screen.getByTestId(fsIds.viewer)).not.toBeNull();
  tapId(ids.barSeen);
  tapId(ids.openChat("r1"));
  expect(onOpenRoom).toHaveBeenCalledWith("yoonkyung");
  expect(screen.queryByTestId(fsIds.viewer)).toBeNull();
});

test("MV-I4. 지우기 단추 → 확인 상자(그 스토리의 답 수) → 지움 · 보기 닫힘 · 「Your story」 사라짐, ⋯ 메뉴도 같은 확인", async () => {
  const fake = fakeMyStories({ stories: [replied()] });
  const { events } = await mount(fake);
  tapId(ids.mine);
  tapId(ids.viewerMenu);
  tapId(ids.viewerDelete);
  expect(screen.getByTestId(ids.deleteDialog).textContent).toContain("the 3 replies on it");
  await act(async () => {
    tapButtonIn("ui-lynx-dialog-action-cancel");
  });
  expect(screen.queryByTestId(ids.deleteDialog)).toBeNull();
  tapId(ids.barDelete);
  tapButtonIn("ui-lynx-dialog-action-delete");
  await flush();
  expect(fake.remove).toHaveBeenCalledWith("ms-2");
  expect(screen.queryByTestId(fsIds.viewer)).toBeNull();
  expect(screen.queryByTestId(ids.mine)).toBeNull();
  expect(events()).toContainEqual(
    expect.objectContaining({ name: "my_story_deleted", scope: "one", from: "viewer" }),
  );
});

test("MV-I5. 「+」 → 만들기 흐름(처음이면 안내), 친구 0명이면 줄 자리 안내 → 친구 찾기", async () => {
  const { events } = await mount(fakeMyStories({ guideSeen: true, stories: [myStory("ms-1")] }));
  tapId(ids.mine);
  tapId(ids.barAdd);
  expect(screen.queryByTestId(fsIds.viewer)).toBeNull();
  expect(screen.getByTestId(ids.start)).not.toBeNull();
  expect(events().filter((e) => e.name === "my_story_create_opened")).toHaveLength(1);
  cleanup();
  clearBackHandlers();
  await mount(fakeMyStories({ stories: [myStory("ms-1")] }), noChats());
  tapId(ids.mine);
  expect(screen.getByTestId(ids.barNoFriends).textContent).toBe("Add a friend to get replies");
  tapId(ids.barNoFriends);
  await flush();
  expect(screen.queryByTestId(fsIds.viewer)).toBeNull();
  expect(screen.getByTestId(friendDirectoryTestIds.screen)).not.toBeNull();
});
