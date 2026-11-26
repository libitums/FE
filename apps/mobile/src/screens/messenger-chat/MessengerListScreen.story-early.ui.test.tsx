import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, render, screen } from "@lynx-js/react/testing-library";

import { clearBackHandlers, fixtureRoom, makeSource, seedOf, tapId } from "./chat-ui.test-support";
import { ChatEventsContext } from "./chat-events";
import { createCoinWallet } from "./coin-wallet";
import type { EarlyAccessResult, SuggestedFriendsPort } from "./friend-catalog.contract";
import { friendStoriesTestIds as ids, type FriendStoriesPort } from "./friend-stories.contract";
import { STORY_NOW, story } from "./friend-stories.test-support";
import { MessengerListScreen } from "./MessengerListScreen";
import { takeStoryReplyHandoff } from "./story-reply-handoff";
import { suggestedFriendsTestIds as suggestedIds } from "./suggested-friends.contract";
import { catalogOf, friend } from "./suggested-friends.test-support";

// `ui` 계층(SE-UI1 · SE-UI2, 2026-11-25 보고): 안 만난 친구 스토리의 위 아바타(프로필) → 시트 「Chat now · 100」 → 열림이면
// 「Add friend and reply」와 같은 끝(ADR-0178 D4 · ADR-0162 D5) — ~~시트 · 보기가 닫히고 그 방이 인용 띠와 함께 열린다~~ → 시트만 닫히고 보기에 남아
// 소개 카드 자리가 답장 칸이 된다(D5 개정 ⟨보기에서 추가⟩, 2026-11-26). 보기가 연 때의 추천(locked)을 들고 있어도, 이미 친구가 된 인물이면
// 다시 시트(Chat now · 100)를 열지 않고 같은 끝(답장 칸)이다.

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

const flush = async () => {
  await act(async () => {
    for (let i = 0; i < 4; i += 1) await Promise.resolve();
  });
};

async function mount(result: () => Promise<EarlyAccessResult>) {
  const source = makeSource(
    seedOf(
      fixtureRoom("boss", { counterpart: { id: "boss", name: "사장님", avatarPath: null } }),
      fixtureRoom("mina", {
        counterpart: { id: "mina", name: "미나", avatarPath: null },
        access: { kind: "locked", unlockEpisode: 3 },
        messages: [],
      }),
    ),
  );
  const early = vi.fn<(id: string) => Promise<EarlyAccessResult>>(result);
  const friends: SuggestedFriendsPort = {
    catalog: () => catalogOf([friend("mina", { name: "미나", unlockEpisode: 3 })]),
    add: (id) => (source.unlockCharacter(id).kind === "unlocked" ? "added" : "already"),
    earlyAccess: early,
    offers: async () => [{ characterId: "mina", price: 100, endsAt: null }],
  };
  const stories: FriendStoriesPort = {
    load: async () => [story("mina")],
    imageUrl: (path) => `https://cdn/${path}`,
    seen: { seenIds: () => new Set(), markSeen: () => undefined },
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
  await flush();
  const events = (name: string) =>
    sink.mock.calls.map(([event]) => event as { name: string }).filter((e) => e.name === name);
  return { source, early, onOpenRoom, events };
}

test("SE-UI1. 보기 위 아바타(잠긴 안 만난 친구) → Chat now · 100 → 열림: 시트만 닫히고 보기에 남아 답장 칸, 방으로 가지 않음", async () => {
  const { early, onOpenRoom, events } = await mount(async () => ({ kind: "unlocked" }));
  tapId(ids.unmet("mina"));
  tapId(ids.profile);
  expect(screen.getByTestId(suggestedIds.sheetEarly).textContent).toContain("Chat now · 100");
  tapId(suggestedIds.sheetEarly);
  await flush();
  expect(early).toHaveBeenCalledTimes(1);
  expect(screen.queryByTestId(suggestedIds.sheet)).toBeNull();
  expect(screen.getByTestId(ids.viewer)).not.toBeNull();
  expect(screen.queryByTestId(ids.meetCard)).toBeNull();
  expect(screen.getByTestId(ids.replyInput)).not.toBeNull();
  expect(onOpenRoom).not.toHaveBeenCalled();
  expect(takeStoryReplyHandoff("mina")).toBeNull();
  expect(events("suggested_friend_added")).toEqual([
    expect.objectContaining({ characterId: "mina", from: "story_viewer", via: "early" }),
  ]);
  // 보기를 닫으면 목록의 스토리 줄에서 미나는 이제 친구 — 안 만난 칸이 아니다.
  tapId(ids.close);
  expect(screen.queryByTestId(ids.unmet("mina"))).toBeNull();
  expect(screen.getByTestId(ids.friend("mina"))).not.toBeNull();
});

test("SE-UI2. 보기를 연 뒤 다른 길로 이미 친구가 됐으면 아바타는 시트 없이 답장 칸으로 — 값을 다시 묻지 않는다", async () => {
  const { source, early, onOpenRoom } = await mount(async () => ({ kind: "unlocked" }));
  tapId(ids.unmet("mina"));
  await act(async () => {
    source.unlockCharacter("mina");
    await Promise.resolve();
  });
  tapId(ids.profile);
  await flush();
  expect(screen.queryByTestId(suggestedIds.sheet)).toBeNull();
  expect(early).not.toHaveBeenCalled();
  expect(screen.getByTestId(ids.viewer)).not.toBeNull();
  expect(screen.getByTestId(ids.replyInput)).not.toBeNull();
  expect(onOpenRoom).not.toHaveBeenCalled();
  expect(takeStoryReplyHandoff("mina")).toBeNull();
});
