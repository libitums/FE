import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, render, screen } from "@lynx-js/react/testing-library";

import {
  advance,
  clearBackHandlers,
  fixtureRoom,
  makeSource,
  seedOf,
  tapId,
} from "./chat-ui.test-support";
import { ChatEventsContext } from "./chat-events";
import { createCoinWallet } from "./coin-wallet";
import type { SuggestedFriendsPort } from "./friend-catalog.contract";
import {
  friendStoriesTestIds as ids,
  type FriendStoriesPort,
  type FriendStory,
} from "./friend-stories.contract";
import { STORY_NOW, story } from "./friend-stories.test-support";
import { messengerListTestIds as list } from "./messenger-chat.contract";
import { MessengerListScreen } from "./MessengerListScreen";
import { takeStoryReplyHandoff } from "./story-reply-handoff";
import { catalogOf, friend, general } from "./suggested-friends.test-support";

// `ui` 계층(FS-UI49): 스토리 보기에서 안 만난 일반 인물을 추가하면(ADR-0178 D5 개정 ⟨보기에서 추가⟩) 방으로 가지 않고 보기에 남아
// 소개 카드 자리가 기존 친구와 같은 답장 칸이 된다(키보드는 열지 않음). 새 친구의 방은 바로 목록에 서고, 보낸 답장은 그 방의 마지막 말.

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(STORY_NOW);
});
afterEach(() => {
  cleanup();
  clearBackHandlers();
  vi.useRealTimers();
  takeStoryReplyHandoff("daeun");
});

const live: readonly FriendStory[] = [story("daeun", { id: "st-daeun" })];

async function mount() {
  const source = makeSource(
    seedOf(
      fixtureRoom("mina", {
        counterpart: { id: "mina", name: "미나", avatarPath: null },
        messages: [
          { kind: "text", from: "them", text: { ko: "안녕!", en: "Hi!" }, minutesAgo: 540 },
        ],
      }),
      fixtureRoom("daeun", {
        counterpart: { id: "daeun", name: "다은", avatarPath: null },
        access: { kind: "locked", unlockEpisode: 0 },
        messages: [],
      }),
    ),
  );
  const friends: SuggestedFriendsPort = {
    catalog: () =>
      catalogOf([
        friend("mina", { name: "미나", unlockEpisode: 3 }),
        general("daeun", { name: "다은", intro: { en: "Loves cafés" } }),
      ]),
    // 결선(`addSuggestedFriend`)처럼 출처의 방을 엽니다.
    add: (id) => {
      const result = source.unlockCharacter(id);
      return result.kind === "unknown"
        ? "unknown"
        : result.kind === "unlocked"
          ? "added"
          : "already";
    },
    earlyAccess: null,
  };
  const stories: FriendStoriesPort = {
    load: async () => live,
    imageUrl: (path) => `https://cdn/${path}`,
    seen: { seenIds: () => new Set(), markSeen: vi.fn() },
  };
  const sink = vi.fn();
  const onOpenRoom = vi.fn<(roomId: string) => void>();
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
        friends={friends}
        stories={stories}
      />
    </ChatEventsContext.Provider>,
  );
  await act(async () => {
    await Promise.resolve();
  });
  const names = () => sink.mock.calls.map(([event]) => (event as { name: string }).name);
  return { onOpenRoom, names };
}

test("FS-UI49. Add friend and reply → 방으로 가지 않고 보기에 남아 소개 카드 자리에 답장 칸(무료 안내 · 칩), 진행은 이어 감", async () => {
  const { onOpenRoom, names } = await mount();
  tapId(ids.unmet("daeun"));
  tapId(ids.meet);
  expect(onOpenRoom).not.toHaveBeenCalled();
  expect(screen.getByTestId(ids.viewer)).not.toBeNull();
  expect(screen.queryByTestId(ids.meetCard)).toBeNull();
  expect(screen.queryByTestId(ids.meet)).toBeNull();
  expect(screen.getByTestId(ids.replyInput)).not.toBeNull();
  expect(screen.getByTestId(ids.free)).not.toBeNull();
  expect(screen.getByTestId(ids.chip(0))).not.toBeNull();
  expect(screen.getByTestId(ids.viewer).textContent).not.toContain("NEW FRIEND");
  expect(names()).toContain("suggested_friend_added");
  expect(names()).not.toContain("friend_story_closed");
  // 키보드를 열지 않았으니(입력 중 아님) 진행은 멈추지 않는다 — 마지막 장이라 다 차면 닫힘.
  advance(7_000);
  expect(screen.queryByTestId(ids.viewer)).toBeNull();
  expect(takeStoryReplyHandoff("daeun")).toBeNull();
});

test("FS-UI49. 추가한 친구의 방은 바로 목록에 서고, 보기에서 보낸 답장이 그 방의 마지막 말", async () => {
  const { onOpenRoom } = await mount();
  tapId(ids.unmet("daeun"));
  tapId(ids.meet);
  tapId(ids.chip(0));
  await act(async () => {
    await Promise.resolve();
  });
  tapId(ids.close);
  expect(screen.queryByTestId(ids.viewer)).toBeNull();
  expect(onOpenRoom).not.toHaveBeenCalled();
  expect(screen.getByTestId(list.row("daeun"))).not.toBeNull();
  expect(screen.getByTestId(list.rowPreview("daeun")).textContent).toContain("맛있겠다!");
});
