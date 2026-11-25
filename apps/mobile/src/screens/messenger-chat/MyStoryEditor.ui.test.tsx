import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import {
  clearBackHandlers,
  fixtureRoom,
  makeSource,
  nativeInput,
  seedOf,
  tapId,
} from "./chat-ui.test-support";
import { ChatEventsContext } from "./chat-events";
import { createCoinWallet } from "./coin-wallet";
import type { SuggestedFriendsPort } from "./friend-catalog.contract";
import type { FriendStoriesPort } from "./friend-stories.contract";
import { myStoriesTestIds as ids } from "./my-stories.contract";
import { cardChoice, fakeMyStories, MS_NOW, wordChoice } from "./my-stories.test-support";
import { MessengerListScreen } from "./MessengerListScreen";
import { catalogOf, friend } from "./suggested-friends.test-support";

// `ui` 계층(MS-UI31 ~ UI36): 스토리 만들기(시안 26 ~ 28) — 시작 시트 · 바탕 위 편집 · 넣기 시트, 서버가 받는 종류(`kinds`, 서버 반영
// 예상)에 따라 Aa · 스티커 수 · 올릴 길이 갈린다. 서버는 메모리 대역입니다.

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(MS_NOW);
});
afterEach(() => {
  cleanup();
  clearBackHandlers();
  vi.useRealTimers();
});

const friendsPort = (): SuggestedFriendsPort => ({
  catalog: () => catalogOf([friend("mina", { name: "미나", unlockEpisode: 1 })]),
  add: () => "added",
  earlyAccess: null,
});

async function flush() {
  await act(async () => {
    for (let i = 0; i < 4; i += 1) await vi.advanceTimersByTimeAsync(1);
  });
}

async function mount(fake: ReturnType<typeof fakeMyStories>) {
  const sink = vi.fn();
  const stories: FriendStoriesPort = {
    load: async () => [],
    imageUrl: () => null,
    seen: { seenIds: () => new Set(), markSeen: () => undefined },
    mine: fake.port,
  };
  render(
    <ChatEventsContext.Provider value={{ sink, roomId: null }}>
      <MessengerListScreen
        source={makeSource(
          seedOf(
            fixtureRoom("mina", {
              counterpart: { id: "mina", name: "미나", avatarPath: null },
              messages: [
                { kind: "text", from: "them", text: { ko: "안녕!", en: "Hi!" }, minutesAgo: 30 },
              ],
            }),
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
        friends={friendsPort()}
        stories={stories}
      />
    </ChatEventsContext.Provider>,
  );
  await flush();
  return { events: () => sink.mock.calls.map(([event]) => event as { name: string }) };
}

const words = [wordChoice("w1"), wordChoice("w2", "찌개", "stew")];
const cards = [{ episodeId: "u01", title: "Ep 1", cards: [cardChoice("c1", "u01", "도착하다")] }];

test("MS-UI31. 시작 시트(시안 26) — 사진을 받지 않는 서버면 Background만, 누르면 편집", async () => {
  await mount(fakeMyStories({ guideSeen: true, words }));
  tapId(ids.create);
  expect(screen.getByTestId(ids.start).textContent).toContain("New story");
  expect(screen.queryByTestId(ids.startCamera)).toBeNull();
  expect(screen.queryByTestId(ids.startPhotos)).toBeNull();
  tapId(ids.startBackground);
  expect(screen.queryByTestId(ids.start)).toBeNull();
  expect(screen.getByTestId(ids.editor)).not.toBeNull();
});

test("MS-UI32. 지금 서버(word · card) — Aa 없음, 스티커는 하나(바꿔 끼움), 빈 바탕은 Share 꺼짐, 바탕색 고르기", async () => {
  const fake = fakeMyStories({ guideSeen: true, words, cards });
  await mount(fake);
  tapId(ids.create);
  tapId(ids.startBackground);
  expect(screen.queryByTestId(ids.toolText)).toBeNull();
  tapId(ids.share);
  await flush();
  expect(fake.post).not.toHaveBeenCalled();
  tapId(ids.swatch("green"));
  expect(screen.getByTestId(ids.swatch("green")).getAttribute("accessibility-label")).toBe(
    "Green, selected",
  );
  expect(screen.getByTestId(ids.editor).getAttribute("class")).toContain("my-story-bg-green");
  tapId(ids.toolWords);
  expect(screen.getByTestId(ids.composer).textContent).toContain("Add to your story");
  expect(screen.getByTestId(ids.composer).textContent).toContain("Tap a word to place it.");
  tapId(ids.choice("w1"));
  tapId(ids.toolCards);
  tapId(ids.choice("c1"));
  expect(screen.queryByTestId(ids.sticker("s1"))).toBeNull();
  expect(screen.getByTestId(ids.sticker("s2")).textContent).toContain("도착하다");
  tapId(ids.share);
  await flush();
  expect(fake.post).toHaveBeenCalledWith(expect.objectContaining({ kind: "card", ko: "도착하다" }));
});

test("MS-UI33. 스티커 — 고르면 ×로 빼고, 두 손가락으로 크기 · 회전", async () => {
  await mount(fakeMyStories({ guideSeen: true, words, kinds: ["word", "card", "text"] }));
  tapId(ids.create);
  tapId(ids.startBackground);
  tapId(ids.toolWords);
  tapId(ids.choice("w1"));
  tapId(ids.toolWords);
  tapId(ids.choice("w2"));
  const sticker = screen.getByTestId(ids.sticker("s2"));
  act(() => {
    fireEvent.touchstart(sticker, {
      touches: [
        { pageX: 0, pageY: 0 },
        { pageX: 100, pageY: 0 },
      ],
    });
    fireEvent.touchmove(sticker, {
      touches: [
        { pageX: 0, pageY: 0 },
        { pageX: 0, pageY: 200 },
      ],
    });
  });
  expect(screen.getByTestId(ids.sticker("s2")).getAttribute("style")).toContain("scale(2)");
  // ×는 catchtap — 바탕의 「고른 것 풀기」 탭으로 번지지 않게.
  act(() => {
    fireEvent.tap(screen.getByTestId(ids.stickerRemove("s2")), { eventType: "catchEvent" });
  });
  expect(screen.queryByTestId(ids.sticker("s2"))).toBeNull();
  expect(screen.getByTestId(ids.sticker("s1"))).not.toBeNull();
});

test("MS-UI34. 글 서버(text) — Aa → 쓰고 Check → 고친 글 제안 → Use this → 바탕 위 글, Share는 글 스토리(바탕 · 원래 글 · overlays)", async () => {
  const fake = fakeMyStories({
    guideSeen: true,
    words,
    kinds: ["word", "card", "text"],
    correction: {
      result: "ok",
      correction: {
        kind: "correction",
        ko: "오늘 처음으로 김치찌개를 만들었어!",
        meaning: "I made kimchi stew for the first time today!",
        tip: "처음 → 처음으로",
      },
    },
  });
  await mount(fake);
  tapId(ids.create);
  tapId(ids.startBackground);
  tapId(ids.swatch("purple"));
  tapId(ids.toolText);
  act(() => nativeInput("input", "오늘 처음 김치찌개를 만들었어!", "ui-lynx-text-field-input"));
  tapId(ids.textCheck);
  await flush();
  expect(fake.correct).toHaveBeenCalledWith("오늘 처음 김치찌개를 만들었어!");
  expect(screen.getByTestId(ids.textSuggestion).textContent).toContain("처음 → 처음으로");
  tapId(ids.textUse);
  expect(screen.queryByTestId(ids.textEntry)).toBeNull();
  expect(screen.getByTestId(ids.textBlock).textContent).toContain(
    "오늘 처음으로 김치찌개를 만들었어!",
  );
  tapId(ids.toolWords);
  expect(screen.getByTestId(ids.composer).textContent).toContain("Up to 8 on one story.");
  tapId(ids.choice("w2"));
  tapId(ids.share);
  await flush();
  expect(fake.postText).toHaveBeenCalledWith(
    expect.objectContaining({
      background: "purple",
      ko: "오늘 처음으로 김치찌개를 만들었어!",
      original: "오늘 처음 김치찌개를 만들었어!",
      overlays: [expect.objectContaining({ kind: "word", ko: "찌개", x: 0.5, y: 0.55 })],
      lang: "en",
    }),
  );
  expect(fake.post).not.toHaveBeenCalled();
  // 올린 글 스토리 보기 — 바탕 · 글 · 얹은 단어
  const card = screen.getByTestId(ids.storyBackground);
  expect(card.getAttribute("class")).toContain("my-story-bg-purple");
  expect(card.textContent).toContain("찌개");
});

test("MS-UI35. 교정이 막히면 안내만 · 글을 놓지 않는다, Keep mine은 내 글 그대로", async () => {
  const blocked = fakeMyStories({
    guideSeen: true,
    kinds: ["word", "card", "text"],
    correction: { result: "blocked" },
  });
  await mount(blocked);
  tapId(ids.create);
  tapId(ids.startBackground);
  tapId(ids.toolText);
  act(() => nativeInput("input", "나쁜 말", "ui-lynx-text-field-input"));
  tapId(ids.textCheck);
  await flush();
  expect(screen.getByTestId(ids.textEntry).textContent).toContain("We can't use this text.");
  expect(screen.queryByTestId(ids.textBlock)).toBeNull();
});

test("MS-UI36. 글 스토리 올리기가 text_blocked면 편집에 안내 · post_failed(text_blocked)", async () => {
  const fake = fakeMyStories({
    guideSeen: true,
    words,
    kinds: ["word", "card", "text"],
    correction: {
      result: "ok",
      correction: { kind: "same", ko: "안녕", meaning: "Hi", tip: null },
    },
  });
  fake.postText.mockResolvedValueOnce({ result: "text_blocked" });
  const { events } = await mount(fake);
  tapId(ids.create);
  tapId(ids.startBackground);
  tapId(ids.toolText);
  act(() => nativeInput("input", "안녕", "ui-lynx-text-field-input"));
  tapId(ids.textCheck);
  await flush();
  expect(screen.getByTestId(ids.textBlock).textContent).toContain("안녕");
  tapId(ids.share);
  await flush();
  expect(screen.getByTestId(ids.composerError).textContent).toBe(
    "This text can't be shared. Try different words.",
  );
  expect(events().filter((e) => e.name === "my_story_post_failed")).toEqual([
    expect.objectContaining({ reason: "text_blocked" }),
  ]);
});
