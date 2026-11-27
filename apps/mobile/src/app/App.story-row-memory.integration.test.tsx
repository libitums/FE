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
import { messengerListTestIds as list } from "../screens/messenger-chat/messenger-chat.contract";
import { myStoriesTestIds as mine } from "../screens/messenger-chat/my-stories.contract";
import { App } from "./App";
import { setFriendStoriesStoresForTests } from "./friend-stories-wiring";
import {
  resetMessengerChatSourceForTests,
  setMessengerChatStoresForTests,
} from "./messenger-chat-wiring";
import { setAdultAckAskedStoreForTests, setEarlyAccessRemote } from "./suggested-friends-wiring";
import { openTab, renderTesterApp } from "./test-helpers/messenger-chat-app";
import { legacyPassedSeed } from "./test-helpers/progress-seed";

// `integration` 계층(SRM-I1): 실제 App · 하단 탭 · 스토리 결선(`friend-stories-wiring` · `my-stories-wiring` · `suggested-friends-wiring`)
// · 가짜 서버 포트. 메신저 탭을 다섯 번 다시 열 때, 다시 읽기(스토리 · 내 스토리 · 제안)가 끝나기 전 첫 프레임의 목록(스토리 줄 칸 ·
// 채팅방 줄)이 앞에서 본 것과 같은 순서입니다(2026-11-27 제보 — 「+」가 새로 서며 밀리고 순서가 달랐다 다시 반영).

const NOW = Date.now();
const HOUR = 3_600_000;

const live = [
  story("owner", { id: "st-owner", postedAt: NOW - 2 * HOUR, expiresAt: NOW + 22 * HOUR }),
  story("daeun", { id: "st-daeun", postedAt: NOW - HOUR, expiresAt: NOW + 23 * HOUR }),
];

/** 첫 읽기는 바로 끝나고, 그 뒤 읽기는 끝나지 않습니다(탭을 다시 연 첫 프레임을 봅니다). */
function firstOnly<T>(value: T) {
  let calls = 0;
  return vi.fn(async () => {
    calls += 1;
    if (calls === 1) return value;
    return new Promise<T>(() => undefined);
  });
}

function serverRemote() {
  const stories = firstOnly<readonly FriendStory[]>(live);
  const myStories = firstOnly({
    enabled: true,
    keep: true,
    stories: [],
    window: null,
    kinds: ["word", "card"],
  });
  const offers = firstOnly([] as const);
  setEarlyAccessRemote(
    () =>
      ({
        earlyAccess: { offers, unlock: async () => null },
        friends: {
          visible: async () => [{ id: "daeun", romanceTier: "standard" }],
          ackAdult: async () => true,
        },
        stories: { list: stories },
        myStories: { list: myStories },
      }) as unknown as ChatRemote,
  );
  return { stories, myStories };
}

beforeEach(() => {
  resetMessengerChatSourceForTests({
    ...chatFixtureSeed,
    rooms: [...chatFixtureSeed.rooms, ...companionSeed(COMPANION_FRIENDS).rooms],
    birthYear: { kind: "set", year: 2000 },
  });
  setMessengerChatStoresForTests({ unlock: memoryUnlockStore([]), now: () => Date.now() });
  setAdultAckAskedStoreForTests({ asked: () => true, markAsked: () => undefined });
  setFriendStoriesStoresForTests({
    seen: { seenIds: () => new Set(), markSeen: () => undefined },
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

/** 목록 안 모든 칸의 test-id 순서 — 스토리 줄(「+」 · 친구 · 추천) · 채팅방 줄. */
function listOrder(): string[] {
  return Array.from(screen.getByTestId(list.list).querySelectorAll("[data-testid]")).map(
    (node) => node.getAttribute("data-testid") ?? "",
  );
}

test("SRM-I1. 메신저 탭을 다섯 번 다시 열어도 다시 읽기 전 첫 프레임이 앞에서 본 목록과 같은 순서(「+」 맨 앞)입니다", async () => {
  const { stories, myStories } = serverRemote();
  await renderTesterApp(<App progressSeed={legacyPassedSeed} />);
  openTab("messenger");
  await settle();
  const shown = listOrder();
  expect(shown).toContain(ids.row);
  expect(shown.filter((id) => id === mine.create || id.startsWith(ids.friend("")))[0]).toBe(
    mine.create,
  );
  for (let round = 0; round < 5; round += 1) {
    openTab(round % 2 === 0 ? "journey" : "ranking");
    await settle();
    openTab("messenger");
    expect(listOrder()).toEqual(shown);
    await settle();
    expect(listOrder()).toEqual(shown);
  }
  expect(stories).toHaveBeenCalledTimes(6);
  expect(myStories).toHaveBeenCalledTimes(6);
});
