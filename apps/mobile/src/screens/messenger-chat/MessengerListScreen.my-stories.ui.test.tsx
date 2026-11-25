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
import { createCoinWallet } from "./coin-wallet";
import type { SuggestedFriendsPort } from "./friend-catalog.contract";
import { friendStoriesTestIds as fsIds, type FriendStoriesPort } from "./friend-stories.contract";
import { myStoriesTestIds as ids } from "./my-stories.contract";
import {
  cardChoice,
  fakeMyStories,
  MS_HOUR,
  MS_NOW,
  myStory,
  wordChoice,
} from "./my-stories.test-support";
import { MessengerListScreen } from "./MessengerListScreen";
import { takeStoryReplyHandoff } from "./story-reply-handoff";
import { catalogOf, friend, general } from "./suggested-friends.test-support";

// `ui` 계층(MS-UI1 ~ UI7): 목록 화면의 내 스토리(ADR-0194) — 「+」 · 처음 안내 · 만들기(단어 · 레슨 카드) · 내 스토리 보기 · 반응에 답하기 ·
// 지우기. 서버는 메모리 대역입니다.

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(MS_NOW);
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
      messages: [{ kind: "text", from: "them", text: { ko: "안녕!", en: "Hi!" }, minutesAgo: 30 }],
    }),
    fixtureRoom("daeun", {
      counterpart: { id: "daeun", name: "다은", avatarPath: null },
      access: { kind: "locked", unlockEpisode: 0 },
      messages: [],
    }),
  );

const friendsPort = (): SuggestedFriendsPort => ({
  catalog: () => catalogOf([friend("mina", { name: "미나", unlockEpisode: 3 })]),
  add: () => "added",
  earlyAccess: null,
});

async function mount(fake: ReturnType<typeof fakeMyStories>, friends = friendsPort()) {
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
        source={makeSource(seed())}
        wallet={createCoinWallet({ earned: 100 })}
        onOpenRoom={onOpenRoom}
        onGoToJourney={vi.fn()}
        onLayerChange={vi.fn()}
        notice={null}
        onNoticeShown={vi.fn()}
        access="open"
        onSignIn={vi.fn()}
        friends={friends}
        stories={stories}
      />
    </ChatEventsContext.Provider>,
  );
  await flush();
  const events = () => sink.mock.calls.map(([event]) => event as { name: string });
  return { onOpenRoom, events };
}

/** 「+」 → 시작 시트 → Background → 편집(시안 26 · 27번). 처음이면 안내를 먼저 거칩니다. */
function openEditor() {
  tapId(ids.create);
  tapId(ids.startBackground);
}

/** Words · Cards 도구 → 넣기 시트에서 칸 하나(시안 28번). */
function place(tool: "word" | "card", key: string, filter?: string) {
  tapId(tool === "word" ? ids.toolWords : ids.toolCards);
  if (filter !== undefined) tapId(ids.filter(filter));
  tapId(ids.choice(key));
}

async function flush() {
  await act(async () => {
    for (let i = 0; i < 4; i += 1) await vi.advanceTimersByTimeAsync(1);
  });
}

test("MS-UI1. 켜져 있으면 친구 스토리가 없어도 스토리 줄 맨 앞에 「+」, 꺼져 있으면 없다", async () => {
  await mount(fakeMyStories({ enabled: true }));
  expect(screen.getByTestId(fsIds.row)).not.toBeNull();
  expect(screen.getByTestId(ids.create).getAttribute("accessibility-label")).toBe(
    "Make a new story",
  );
  expect(screen.queryByTestId(ids.mine)).toBeNull();
  cleanup();
  await mount(fakeMyStories({ enabled: false }));
  expect(screen.queryByTestId(ids.create)).toBeNull();
});

test("MS-UI2. 처음 「+」 → 안내(Not now = 닫힘), 다음 「+」 → 바로 시작 시트 · create_opened", async () => {
  const { events } = await mount(fakeMyStories({ words: [wordChoice("w1")] }));
  tapId(ids.create);
  expect(screen.getByTestId(ids.guide).textContent).toContain("Share a Korean word");
  tapId(ids.guideLater);
  expect(screen.queryByTestId(ids.guide)).toBeNull();
  expect(screen.queryByTestId(ids.start)).toBeNull();
  tapId(ids.create);
  expect(screen.getByTestId(ids.start)).not.toBeNull();
  expect(events().filter((e) => e.name === "my_story_create_opened")).toEqual([
    expect.objectContaining({ first: true }),
    expect.objectContaining({ first: false }),
  ]);
});

test("MS-UI3. 안내 → 시작 → 편집 → 단어 스티커 → 올림 → 내 스토리 보기(posted) · posted 이벤트", async () => {
  const fake = fakeMyStories({ words: [wordChoice("w1"), wordChoice("w2", "산책", "a walk")] });
  const { events } = await mount(fake);
  tapId(ids.create);
  tapId(ids.guideStart);
  tapId(ids.startBackground);
  expect(screen.getByTestId(ids.editorHint).textContent).toBe("Add one word or card to share it.");
  place("word", "w2");
  expect(screen.queryByTestId(ids.composer)).toBeNull();
  expect(screen.getByTestId(ids.editorHint).textContent).toBe("Drag to move, pinch to resize.");
  tapId(ids.share);
  await flush();
  expect(fake.post).toHaveBeenCalledWith(
    expect.objectContaining({ kind: "word", ko: "산책", lang: "en", clientId: "cid-1" }),
  );
  expect(screen.queryByTestId(ids.editor)).toBeNull();
  expect(screen.getByTestId(ids.cardKo).textContent).toBe("산책");
  expect(screen.getByTestId(ids.waiting)).not.toBeNull();
  expect(screen.getByTestId(ids.mine)).not.toBeNull();
  expect(events().map((e) => e.name)).toEqual(
    expect.arrayContaining(["my_story_posted", "my_story_viewed"]),
  );
});

test("MS-UI4. 레슨 카드 — 없으면 안내, 거르기 칩, 카드 스티커로 올림, 하루 상한이면 안내 글", async () => {
  await mount(fakeMyStories({ guideSeen: true }));
  openEditor();
  tapId(ids.toolCards);
  expect(screen.getByTestId(ids.empty).textContent).toContain("Finish a lesson");
  cleanup();
  const withCards = fakeMyStories({
    guideSeen: true,
    postResult: "daily_limit",
    words: [wordChoice("w1")],
    cards: [
      { episodeId: "u01", title: "Ep 1", cards: [cardChoice("c1", "u01", "도착하다")] },
      { episodeId: "u02", title: "Ep 2", cards: [cardChoice("c2", "u02", "창가 자리")] },
    ],
  });
  await mount(withCards);
  openEditor();
  tapId(ids.toolCards);
  expect(screen.getByTestId(ids.choice("c1"))).not.toBeNull();
  tapId(ids.filter("u02"));
  expect(screen.queryByTestId(ids.choice("c1"))).toBeNull();
  tapId(ids.choice("c2"));
  tapId(ids.share);
  await flush();
  expect(withCards.post).toHaveBeenCalledWith(
    expect.objectContaining({ kind: "card", ko: "창가 자리" }),
  );
  expect(screen.getByTestId(ids.composerError).textContent).toContain("enough stories for today");
  expect(screen.getByTestId(ids.editor)).not.toBeNull();
});

test("MS-UI5. 「Your story」 — 안 본 반응이면 고리 unseen, 열면 반응 · 본 것으로, Open chat → 그 방(인용 띠 없음)", async () => {
  const story = myStory("ms-1", {
    reactions: [
      {
        id: "r1",
        characterId: "mina",
        messageId: "msg-r1",
        text: "야근 끝나면 라면 먹어!",
        meaning: "Have ramen after overtime!",
        at: MS_NOW - MS_HOUR,
      },
    ],
  });
  const { onOpenRoom, events } = await mount(fakeMyStories({ stories: [story] }));
  expect(screen.getByTestId(ids.mine).getAttribute("data-state")).toBe("unseen");
  tapId(ids.mine);
  expect(screen.getByTestId(ids.reaction("r1")).textContent).toContain("야근 끝나면 라면 먹어!");
  expect(screen.getByTestId(ids.reaction("r1")).textContent).toContain("미나");
  tapId(ids.openChat("r1"));
  expect(onOpenRoom).toHaveBeenCalledWith("mina");
  expect(takeStoryReplyHandoff("mina")).toBeNull();
  expect(screen.getByTestId(ids.mine).getAttribute("data-state")).toBe("seen");
  expect(events().filter((e) => e.name === "my_story_viewed")).toEqual([
    expect.objectContaining({ from: "row", reactions: "1", unseen: "1" }),
  ]);
  expect(events().filter((e) => e.name === "my_story_chat_opened")).toEqual([
    expect.objectContaining({ characterId: "mina", message: true }),
  ]);
});

test("MS-UI6. 내 스토리 지우기 — 메뉴 → 확인 → 지움 · 닫힘 · 「Your story」 사라짐, Cancel은 그대로", async () => {
  const fake = fakeMyStories({ stories: [myStory("ms-1")] });
  const { events } = await mount(fake);
  tapId(ids.mine);
  tapId(ids.viewerMenu);
  tapId(ids.viewerDelete);
  expect(screen.getByTestId(ids.deleteDialog).textContent).toContain("Delete this story?");
  screen.getByTestId(ids.deleteDialog);
  await act(async () => {
    tapButtonIn("ui-lynx-dialog-action-cancel");
  });
  expect(screen.queryByTestId(ids.deleteDialog)).toBeNull();
  expect(fake.remove).not.toHaveBeenCalled();
  tapId(ids.viewerMenu);
  tapId(ids.viewerDelete);
  tapButtonIn("ui-lynx-dialog-action-delete");
  await flush();
  expect(fake.remove).toHaveBeenCalledWith("ms-1");
  expect(screen.queryByTestId(ids.viewer)).toBeNull();
  expect(screen.queryByTestId(ids.mine)).toBeNull();
  expect(events()).toContainEqual(
    expect.objectContaining({ name: "my_story_deleted", scope: "one", from: "viewer" }),
  );
});

test("MS-UI7. 편집 뒤로 · 시스템 뒤로는 닫힘만", async () => {
  await mount(fakeMyStories({ guideSeen: true, words: [wordChoice("w1")] }));
  openEditor();
  tapId(ids.composerClose);
  expect(screen.queryByTestId(ids.editor)).toBeNull();
});

test("MS-UI16. 올리기가 실패한 뒤 다른 거리를 고르면 새 clientId로 보내고 안내가 사라진다(리뷰 m4)", async () => {
  const fake = fakeMyStories({
    guideSeen: true,
    postResult: "failed",
    words: [wordChoice("w1"), wordChoice("w2", "산책", "a walk")],
  });
  await mount(fake);
  openEditor();
  place("word", "w1");
  tapId(ids.share);
  await flush();
  expect(screen.getByTestId(ids.composerError)).not.toBeNull();
  place("word", "w2");
  expect(screen.queryByTestId(ids.composerError)).toBeNull();
  tapId(ids.share);
  await flush();
  expect(fake.post.mock.calls.map(([draft]) => draft.clientId)).toEqual(["cid-1", "cid-2"]);
  // 같은 거리로 다시 시도하면 같은 clientId(두 번 올리지 않게).
  tapId(ids.share);
  await flush();
  expect(fake.post.mock.calls.map(([draft]) => draft.clientId)).toEqual([
    "cid-1",
    "cid-2",
    "cid-2",
  ]);
});

test("MS-UI18. 이벤트 횟수 · 속성 고정 — 안내 닫힘 · 올림 실패 · 카드 올림 · 본 반응 수 · 「+」만 있는 줄 노출(감사 A5 · A7 · A9 · A16)", async () => {
  const fake = fakeMyStories({
    postResult: "daily_limit",
    cards: [{ episodeId: "u01", title: "Ep 1", cards: [cardChoice("c1", "u01", "도착하다")] }],
  });
  const { events } = await mount(fake);
  const of = (name: string) => events().filter((e) => e.name === name);
  expect(of("friend_story_row_viewed")).toEqual([
    expect.objectContaining({ count: "0", unseen: "0", mine: true }),
  ]);
  tapId(ids.create);
  tapId(ids.guideLater);
  expect(of("my_story_guide_closed")).toEqual([expect.objectContaining({ choice: "later" })]);
  openEditor();
  place("card", "c1");
  tapId(ids.share);
  await flush();
  expect(of("my_story_post_failed")).toEqual([expect.objectContaining({ reason: "daily_limit" })]);
  expect(of("my_story_posted")).toEqual([]);
});

test("MS-UI19. 카드 올림 · 열 때 새 반응 수(unseen) · 올리기 두 번 탭은 한 번(감사 A9 · A10 · A16)", async () => {
  const fake = fakeMyStories({
    guideSeen: true,
    cards: [{ episodeId: "u01", title: "Ep 1", cards: [cardChoice("c1", "u01", "도착하다")] }],
  });
  const { events } = await mount(fake);
  openEditor();
  place("card", "c1");
  tapId(ids.share);
  tapId(ids.share);
  await flush();
  expect(fake.post).toHaveBeenCalledTimes(1);
  const of = (name: string) => events().filter((e) => e.name === name);
  expect(of("my_story_posted")).toEqual([expect.objectContaining({ kind: "card" })]);
  expect(of("my_story_viewed")).toEqual([
    expect.objectContaining({ from: "posted", reactions: "0", unseen: "0" }),
  ]);
});

test("MS-UI21. 내 스토리 읽기가 늦어도 추천 줄 노출은 세지 않고, 「+」 줄 노출은 mine true로 한 번(재리뷰 A5)", async () => {
  const fake = fakeMyStories({ enabled: true });
  let release: () => void = () => undefined;
  const slow = {
    ...fake.port,
    load: () =>
      new Promise<Awaited<ReturnType<typeof fake.port.load>>>((resolve) => {
        release = () => resolve(fake.state());
      }),
  };
  const withSuggested: SuggestedFriendsPort = {
    ...friendsPort(),
    catalog: () =>
      catalogOf([
        friend("mina", { name: "미나", unlockEpisode: 3 }),
        general("daeun", { name: "다은", intro: { en: "Loves cafés" } }),
      ]),
  };
  const { events } = await mount({ ...fake, port: slow }, withSuggested);
  const of = (name: string) => events().filter((e) => e.name === name);
  expect(of("suggested_friend_viewed")).toEqual([]);
  expect(of("friend_story_row_viewed")).toEqual([]);
  await act(async () => {
    release();
  });
  await flush();
  expect(of("suggested_friend_viewed")).toEqual([]);
  expect(of("friend_story_row_viewed")).toEqual([expect.objectContaining({ mine: true })]);
});
