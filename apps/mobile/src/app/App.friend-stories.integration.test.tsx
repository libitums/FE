import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, screen } from "@lynx-js/react/testing-library";

import { memoryUnlockStore } from "../screens/messenger-chat/chat-local-stores";
import { chatFixtureSeed } from "../screens/messenger-chat/chat-fixture";
import type { ChatRemote } from "../screens/messenger-chat/chat-remote.contract";
import { COMPANION_FRIENDS } from "../screens/messenger-chat/companion-friends-roster";
import { companionSeed } from "../screens/messenger-chat/companion-roster";
import {
  friendStoriesTestIds as ids,
  type FriendStory,
} from "../screens/messenger-chat/friend-stories.contract";
import { story } from "../screens/messenger-chat/friend-stories.test-support";
import {
  messengerChatTestIds as chat,
  messengerListTestIds as list,
} from "../screens/messenger-chat/messenger-chat.contract";
import { suggestedFriendsTestIds as suggestedIds } from "../screens/messenger-chat/suggested-friends.contract";
import { App } from "./App";
import { setFriendStoriesStoresForTests } from "./friend-stories-wiring";
import {
  resetMessengerChatSourceForTests,
  setMessengerChatStoresForTests,
} from "./messenger-chat-wiring";
import { setAdultAckAskedStoreForTests, setEarlyAccessRemote } from "./suggested-friends-wiring";
import {
  appChatSource,
  openTab,
  present,
  renderTesterApp,
  tapId,
} from "./test-helpers/messenger-chat-app";
import { legacyPassedSeed } from "./test-helpers/progress-seed";

// `integration` 계층(FSI1 ~ FSI6, ADR-0177): 실제 App · 메신저 탭 · 스토리 결선(`friend-stories-wiring`) · 가짜 서버 포트
// (`companion_friend_stories` · `companion_friends`). 목록 → 보기 → 칩 · 답장 칸 → 대화방(인용 카드 · 인용 띠), 안 만난 친구 추가 → 답장,
// 못 읽음이면 추천 줄 그대로.

const NOW = Date.now();
const HOUR = 3_600_000;

function serverRemote(stories: readonly FriendStory[] | "fail") {
  const list = vi.fn(async () => {
    if (stories === "fail") throw new Error("network");
    return stories;
  });
  setEarlyAccessRemote(
    () =>
      ({
        earlyAccess: { offers: async () => [], unlock: async () => null },
        friends: {
          visible: async () => [{ id: "daeun", romanceTier: "standard" }],
          ackAdult: async () => true,
        },
        stories: { list },
      }) as unknown as ChatRemote,
  );
  return { list };
}

const seen = new Set<string>();

beforeEach(() => {
  seen.clear();
  resetMessengerChatSourceForTests({
    ...chatFixtureSeed,
    rooms: [...chatFixtureSeed.rooms, ...companionSeed(COMPANION_FRIENDS).rooms],
    birthYear: { kind: "set", year: 2000 },
  });
  setMessengerChatStoresForTests({ unlock: memoryUnlockStore([]), now: () => Date.now() });
  setAdultAckAskedStoreForTests({ asked: () => true, markAsked: () => undefined });
  setFriendStoriesStoresForTests({
    seen: { seenIds: () => new Set(seen), markSeen: (id) => void seen.add(id) },
    saveWord: () => undefined,
    isWordSaved: () => false,
  });
});
afterEach(() => {
  setEarlyAccessRemote(null);
  setAdultAckAskedStoreForTests(null);
  setFriendStoriesStoresForTests(null);
  cleanup();
  (lynx as unknown as { __globalProps: unknown }).__globalProps = undefined;
});

async function settle() {
  await act(async () => {
    for (let i = 0; i < 8; i += 1) await Promise.resolve();
  });
}

async function openMessenger() {
  await renderTesterApp(<App progressSeed={legacyPassedSeed} />);
  openTab("messenger");
  await settle();
}

const live = [
  story("owner", { id: "st-owner", postedAt: NOW - 2 * HOUR, expiresAt: NOW + 22 * HOUR }),
  story("daeun", { id: "st-daeun", postedAt: NOW - HOUR, expiresAt: NOW + 23 * HOUR }),
];

test("FSI1. 목록 → 친구 스토리 → 칩: 대화방이 열리고 보낸 글 위에 인용 카드, 내 글에 인용", async () => {
  serverRemote(live);
  await openMessenger();
  expect(present(ids.row)).toBe(true);
  tapId(ids.friend("owner"));
  expect(present(ids.viewer)).toBe(true);
  tapId(ids.chip(0));
  await settle();
  expect(present(chat.screen)).toBe(true);
  expect(screen.getByTestId(ids.quote).textContent).toContain("You replied to 사장님's story");
  const source = await appChatSource();
  const mine = source
    ?.thread("owner")
    ?.messages.filter((m) => m.kind === "text" && m.from === "me");
  expect(mine?.[(mine?.length ?? 0) - 1]).toMatchObject({
    text: { ko: "맛있겠다!" },
    story: { storyId: "st-owner" },
  });
});

test("FSI2. 답장 칸 → 대화방 인용 띠, 그 뒤 목록의 그 줄은 보통 미리보기(본 것)", async () => {
  serverRemote(live);
  await openMessenger();
  expect(screen.getByTestId(list.rowPreview("owner")).textContent).toContain("New story");
  tapId(ids.friend("owner"));
  tapId(ids.reply);
  await settle();
  expect(screen.getByTestId(ids.quoteBar).textContent).toContain("Replying to 사장님's story");
  expect(seen.has("st-owner")).toBe(true);
});

test("FSI3. 안 만난 친구 스토리 → Add friend and reply: 방이 열리고(추가 길) 인용 띠", async () => {
  serverRemote(live);
  await openMessenger();
  tapId(ids.unmet("daeun"));
  expect(screen.getByTestId(ids.viewer).textContent).toContain("NEW FRIEND");
  tapId(ids.meet);
  await settle();
  expect(present(chat.screen)).toBe(true);
  expect(screen.getByTestId(ids.quoteBar).textContent).toContain("Replying to 송다은's story");
});

test("FSI6. 스토리를 못 읽으면 추천 줄 그대로 · 오류 없음", async () => {
  serverRemote("fail");
  await openMessenger();
  expect(present(ids.row)).toBe(false);
  expect(present(suggestedIds.row)).toBe(true);
});
