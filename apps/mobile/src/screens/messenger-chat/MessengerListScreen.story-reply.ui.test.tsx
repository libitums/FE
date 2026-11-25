import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, render, screen } from "@lynx-js/react/testing-library";

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
import type { ChatTier } from "./free-turns";
import { friendStoriesTestIds as ids, type FriendStory } from "./friend-stories.contract";
import { STORY_NOW, story } from "./friend-stories.test-support";
import { MessengerListScreen } from "./MessengerListScreen";
import { createTrialStore } from "./trial-store";
import { catalogOf, friend } from "./suggested-friends.test-support";

// `ui` 계층(FS-UI20 ~ UI22): 목록 화면 + 가짜 출처 — 보기에서 바로 보낸 답장(ADR-0178 D5 개정)의 관문 · 이벤트 · 엽전 부족 → 상점.

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

async function mount({
  stories,
  balance = 100,
  trial = 0,
  tier = "free",
}: {
  readonly stories: readonly FriendStory[];
  readonly balance?: number;
  readonly trial?: number | null;
  readonly tier?: ChatTier;
}) {
  const source = makeSource(seed());
  const sink = vi.fn();
  const trialStore = createTrialStore(trial);
  render(
    <ChatEventsContext.Provider value={{ sink, roomId: null }}>
      <MessengerListScreen
        source={source}
        wallet={createCoinWallet({ earned: balance })}
        onOpenRoom={vi.fn()}
        onGoToJourney={vi.fn()}
        onLayerChange={vi.fn()}
        notice={null}
        onNoticeShown={vi.fn()}
        access="open"
        onSignIn={vi.fn()}
        friends={{
          catalog: () => catalogOf([friend("mina", { name: "미나", unlockEpisode: 3 })]),
          add: () => "added",
          earlyAccess: null,
        }}
        stories={{
          load: async () => stories,
          imageUrl: () => null,
          seen: { seenIds: () => new Set(), markSeen: () => undefined },
          replyPlan: () => ({ trial: trialStore, tier }),
        }}
      />
    </ChatEventsContext.Provider>,
  );
  await act(async () => {
    await Promise.resolve();
  });
  const events = (name: string) =>
    sink.mock.calls.map(([event]) => event as { name: string }).filter((e) => e.name === name);
  const mine = () =>
    source
      .thread("mina")
      ?.messages.filter((m) => m.kind === "text" && m.from === "me")
      .map((m) => (m.kind === "text" ? m.text.ko : "")) ?? [];
  return { events, mine, trialStore };
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

test("FS-UI20. 첫 답장 무료 — 체험 · 엽전을 쓰지 않고 storyFree, replied(where viewer), 같은 스토리 둘째는 보통 관문", async () => {
  const { events, mine, trialStore } = await mount({
    stories: [story("mina", { id: "st-mina" })],
    trial: 5,
  });
  tapId(ids.friend("mina"));
  tapId(ids.chip(0));
  await flush();
  expect(mine()).toEqual(["맛있겠다!"]);
  expect(events("chat_message_sent")).toEqual([
    expect.objectContaining({ characterId: "mina", paid: false, storyFree: true }),
  ]);
  expect(events("friend_story_replied")).toEqual([
    expect.objectContaining({ characterId: "mina", via: "chip", free: true, where: "viewer" }),
  ]);
  expect(trialStore.remaining()).toBe(5);
  act(() => {
    nativeInput("input", "또 보내요", ids.replyInput);
  });
  tapId(ids.replySend);
  await flush();
  expect(events("friend_story_replied")[1]).toEqual(
    expect.objectContaining({ via: "typed", free: false }),
  );
  // 무료가 아닌 둘째 답장은 체험 한 통을 씁니다.
  expect(trialStore.remaining()).toBe(4);
});

test("FS-UI21. 체험을 다 썼고 엽전이 모자라면 보내지 않고 상점을 연다 · 글은 칸에 남고 안내", async () => {
  const { events, mine } = await mount({
    stories: [story("mina", { id: "st-mina", freeReply: false })],
    balance: 0,
    trial: 0,
  });
  tapId(ids.friend("mina"));
  act(() => {
    nativeInput("focus", "", ids.replyInput);
    nativeInput("input", "안녕하세요", ids.replyInput);
  });
  tapId(ids.replySend);
  await flush();
  expect(mine()).toEqual([]);
  expect(events("chat_coins_short")).toEqual([
    expect.objectContaining({ reason: "message", shortBy: "3" }),
  ]);
  expect(screen.getByTestId("coin-shop-screen")).toBeTruthy();
  expect(screen.getByTestId(ids.replyError).textContent).toBe("Not enough coins");
  expect(screen.getByTestId(ids.viewer).getAttribute("accessibility-elements-hidden")).toBe("true");
});

test("FS-UI22. 무제한이면 관문 없이 보내고 엽전이 그대로", async () => {
  const { events, mine } = await mount({
    stories: [story("mina", { id: "st-mina", freeReply: false })],
    balance: 0,
    tier: "unlimited",
  });
  tapId(ids.friend("mina"));
  tapId(ids.chip(2));
  await flush();
  expect(mine()).toEqual(["나도 배고파"]);
  expect(events("chat_message_sent")).toEqual([
    expect.objectContaining({ paid: false, cost: "0" }),
  ]);
});
