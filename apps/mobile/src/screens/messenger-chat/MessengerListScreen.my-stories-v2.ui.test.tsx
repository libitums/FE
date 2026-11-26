import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, render, screen } from "@lynx-js/react/testing-library";

import {
  clearBackHandlers,
  fixtureRoom,
  makeSource,
  seedOf,
  tapButtonIn,
  tapId,
} from "./chat-ui.test-support";
import { ChatEventsContext } from "./chat-events";
import type { ChatFixtureSeed } from "./chat-fixture.contract";
import { createCoinWallet } from "./coin-wallet";
import type { SuggestedFriendsPort } from "./friend-catalog.contract";
import { friendStoriesTestIds as fsIds, type FriendStoriesPort } from "./friend-stories.contract";
import { myStoriesTestIds as ids, type MyStoryWindow } from "./my-stories.contract";
import {
  fakeMyStories,
  MS_HOUR,
  MS_NOW,
  myStory,
  reaction,
  wordChoice,
} from "./my-stories.test-support";
import { MessengerListScreen } from "./MessengerListScreen";
import { friendDirectoryTestIds } from "./suggested-friends.contract";
import { catalogOf, friend } from "./suggested-friends.test-support";

// `ui` 계층(MS-UI22 ~ UI26): 서버 #588(ADR-0191) 반영 — 반응 목록의 「Open chat」 · Seen by(시안 16), 막 올린 뒤 · 친구 0명(17),
// 올리기 창(18), 지우기 문구(19). 서버는 메모리 대역입니다.

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

const localToday = (hour: number) => {
  const now = new Date(MS_NOW);
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour).getTime();
};

test("MS-UI22. 반응 목록(시안 16) — 「N friends replied」 · Seen by 얼굴 줄 · 반응마다 Open chat → 그 방 · chat_opened, 맨 아래 저장 안내", async () => {
  const story = myStory("ms-1", {
    reactions: [
      reaction("r1", "yoonkyung"),
      reaction("r2", "haejun", { text: "오늘도 야근해?", messageId: null }),
    ],
    seenBy: [
      { characterId: "yoonkyung", at: MS_NOW - MS_HOUR },
      { characterId: "haejun", at: MS_NOW - MS_HOUR },
      { characterId: "nobody", at: MS_NOW - MS_HOUR },
    ],
  });
  const { onOpenRoom, events } = await mount(fakeMyStories({ stories: [story] }));
  tapId(ids.mine);
  // 목록의 내 스토리는 전체 화면 보기로 엽니다(ADR-0194 개정 ⟨보기⟩) — 반응 목록은 「Seen by」 → 답 목록 시트.
  tapId(ids.barSeen);
  const list = screen.getByTestId(ids.repliesSheet);
  expect(list.textContent).toContain("2 friends replied");
  expect(list.textContent).not.toContain("Answer");
  // 방이 없는 인물(nobody)은 얼굴을 그리지 않지만 수는 서버 값 그대로
  expect(screen.getByTestId(ids.seenBy).textContent).toContain("Seen by 3");
  expect(screen.getByTestId(ids.seenBy).getAttribute("accessibility-label")).toBe(
    "Seen by 3 friends",
  );
  expect(screen.getByTestId(ids.openChat("r1")).textContent).toContain("Open chat");
  expect(screen.getByTestId(ids.savedNote).textContent).toBe(
    "Replies are saved in each friend's chat.",
  );
  tapId(ids.openChat("r2"));
  expect(onOpenRoom).toHaveBeenCalledWith("haejun");
  expect(screen.queryByTestId(fsIds.viewer)).toBeNull();
  expect(events().filter((e) => e.name === "my_story_chat_opened")).toEqual([
    expect.objectContaining({ characterId: "haejun", message: false }),
  ]);
});

test("MS-UI23. 막 올린 뒤(시안 17) — No replies yet · 한 시간 안내, 대화가 있으면 친구 추가 안내 없음", async () => {
  await mount(fakeMyStories({ guideSeen: true, words: [wordChoice("w1")] }));
  tapId(ids.create);
  tapId(ids.startBackground);
  tapId(ids.toolWords);
  tapId(ids.choice("w1"));
  tapId(ids.share);
  await flush();
  expect(screen.getByTestId(ids.barWaiting).textContent).toBe(
    "Friends usually reply within an hour.",
  );
  // 목록의 내 스토리는 전체 화면 보기로 엽니다(ADR-0194 개정 ⟨보기⟩) — 반응 목록은 「Seen by」 → 답 목록 시트.
  tapId(ids.barSeen);
  expect(screen.getByTestId(ids.repliesSheet).textContent).toContain("No replies yet");
  expect(screen.getByTestId(ids.waiting).textContent).toContain(
    "Friends usually reply within an hour.",
  );
  expect(screen.getByTestId(ids.waiting).textContent).toContain(
    "Replies show up here and in each friend's chat.",
  );
  expect(screen.queryByTestId(ids.noFriends)).toBeNull();
  expect(screen.queryByTestId(ids.savedNote)).toBeNull();
});

test("MS-UI24. 친구 0명(시안 17 아래) — 「Add a friend to get replies」 · Find friends → 친구 찾기", async () => {
  await mount(fakeMyStories({ stories: [myStory("ms-1")] }), noChats());
  tapId(ids.mine);
  // 목록의 내 스토리는 전체 화면 보기로 엽니다(ADR-0194 개정 ⟨보기⟩) — 반응 목록은 「Seen by」 → 답 목록 시트.
  tapId(ids.barSeen);
  expect(screen.getByTestId(ids.noFriends).textContent).toContain("Add a friend to get replies");
  tapId(ids.findFriends);
  await flush();
  expect(screen.queryByTestId(fsIds.viewer)).toBeNull();
  expect(screen.getByTestId(friendDirectoryTestIds.screen)).not.toBeNull();
});

test("MS-UI25. 올리기 창(시안 18) — 이번 창을 썼으면 「+」 자리가 시계 + 다음 시각, 누르면 아침 · 낮 · 밤 시트(OK = 닫힘)", async () => {
  const window: MyStoryWindow = {
    slot: "day",
    day: new Date(localToday(12)).toISOString().slice(0, 10),
    nextAt: localToday(18),
    used: true,
  };
  // 시트의 날은 기기 현지 날 — 문자열을 현지에서 다시 만든다
  const d = new Date(localToday(12));
  const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  vi.setSystemTime(localToday(15));
  const { events } = await mount(
    fakeMyStories({
      guideSeen: true,
      window: { ...window, day },
      stories: [myStory("s-day", { postedAt: localToday(13) })],
    }),
  );
  expect(screen.queryByTestId(ids.create)).toBeNull();
  const next = screen.getByTestId(ids.next);
  expect(next.textContent).toContain("6 PM");
  expect(next.textContent).toContain("Next story");
  expect(next.getAttribute("accessibility-label")).toBe("Next story opens at 6 PM");
  tapId(ids.next);
  const sheet = screen.getByTestId(ids.windowSheet);
  expect(sheet.textContent).toContain("You shared this afternoon's story");
  expect(sheet.textContent).toContain("The next one opens at 6 PM.");
  expect(screen.getByTestId(ids.windowSlot("morning")).textContent).toContain("Missed");
  expect(screen.getByTestId(ids.windowSlot("day")).textContent).toContain("Shared");
  expect(screen.getByTestId(ids.windowSlot("night")).textContent).toContain("Opens 6 PM");
  expect(screen.getByTestId(ids.windowSlot("day")).getAttribute("accessibility-label")).toBe(
    "Afternoon, 12 PM – 6 PM, Shared",
  );
  expect(screen.queryByTestId(ids.composer)).toBeNull();
  tapButtonIn("ui-lynx-bottom-sheet-action-ok");
  expect(screen.queryByTestId(ids.windowSheet)).toBeNull();
  expect(events().filter((e) => e.name === "my_story_create_opened")).toEqual([]);
});

test("MS-UI26. 올리기가 window_used로 막히면 만들기에 다음 시각 안내 · post_failed(window_used), 지우기 확인은 새 문구(시안 19)", async () => {
  const fake = fakeMyStories({
    guideSeen: true,
    postResult: "window_used",
    window: { slot: "day", day: "2026-11-23", nextAt: localToday(18), used: false },
    words: [wordChoice("w1")],
  });
  const { events } = await mount(fake);
  tapId(ids.create);
  tapId(ids.startBackground);
  tapId(ids.toolWords);
  tapId(ids.choice("w1"));
  tapId(ids.share);
  await flush();
  expect(screen.getByTestId(ids.composerError).textContent).toBe(
    "You've already shared a story in this part of the day. The next one opens at 6 PM.",
  );
  expect(events().filter((e) => e.name === "my_story_post_failed")).toEqual([
    expect.objectContaining({ reason: "window_used" }),
  ]);
  cleanup();
  clearBackHandlers();
  const withReplies = fakeMyStories({
    stories: [
      myStory("ms-1", { reactions: [reaction("r1", "yoonkyung"), reaction("r2", "haejun")] }),
    ],
  });
  await mount(withReplies);
  tapId(ids.mine);
  tapId(ids.viewerMenu);
  tapId(ids.viewerDelete);
  expect(screen.getByTestId(ids.deleteDialog).textContent).toContain(
    "Your card and the 2 replies on it will be removed. Messages in your chats stay, with a “Deleted story” note. You can't undo this.",
  );
});
