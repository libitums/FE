import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, screen } from "@lynx-js/react/testing-library";

import { memoryUnlockStore } from "../screens/messenger-chat/chat-local-stores";
import { chatFixtureSeed } from "../screens/messenger-chat/chat-fixture";
import type { ChatRemote } from "../screens/messenger-chat/chat-remote.contract";
import { friendStoriesTestIds as fsIds } from "../screens/messenger-chat/friend-stories.contract";
import { messengerChatTestIds as chat } from "../screens/messenger-chat/messenger-chat.contract";
import {
  myStoriesTestIds as ids,
  type MyStoriesState,
} from "../screens/messenger-chat/my-stories.contract";
import { myStory } from "../screens/messenger-chat/my-stories.test-support";
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
  tapKeys,
} from "./test-helpers/messenger-chat-app";
import { legacyPassedSeed } from "./test-helpers/progress-seed";

// `integration` 계층(MSI1 ~ MSI2, ADR-0179): 실제 App · 메신저 탭 · 스토리 결선(`friend-stories-wiring` → `my-stories-wiring`) · 가짜 서버
// 포트(`companion_my_stories`). 「Your story」 → 반응 → Answer → 대화방(내 스토리 인용 띠) → 보낸 글에 인용. 못 읽으면 「+」 없음.

const NOW = Date.now();
const HOUR = 3_600_000;

function serverRemote(state: MyStoriesState | "fail") {
  const list = vi.fn(async () => {
    if (state === "fail") throw new Error("network");
    return state;
  });
  setEarlyAccessRemote(
    () =>
      ({
        earlyAccess: { offers: async () => [], unlock: async () => null },
        friends: { visible: async () => [], ackAdult: async () => true },
        stories: { list: async () => [] },
        myStories: {
          list,
          post: async () => ({ result: "failed" }),
          remove: async () => true,
          setKeep: async (keep: boolean) => keep,
        },
      }) as unknown as ChatRemote,
  );
  return { list };
}

const seen = new Set<string>();

beforeEach(() => {
  seen.clear();
  resetMessengerChatSourceForTests({ ...chatFixtureSeed, birthYear: { kind: "set", year: 2000 } });
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

const withReaction = myStory("ms-1", {
  postedAt: NOW - 2 * HOUR,
  expiresAt: NOW + 22 * HOUR,
  reactions: [
    {
      id: "r1",
      characterId: "owner",
      text: "야근 끝나면 라면 먹어!",
      meaning: null,
      at: NOW - HOUR,
    },
  ],
});

test("MSI1. 「Your story」 → 반응 → Answer: 대화방 인용 띠(내 스토리), 보낸 글에 그 스토리 id · 본 반응 저장", async () => {
  serverRemote({ enabled: true, keep: true, stories: [withReaction] });
  await openMessenger();
  expect(present(fsIds.row)).toBe(true);
  expect(present(ids.create)).toBe(true);
  tapId(ids.mine);
  expect(screen.getByTestId(ids.reaction("r1")).textContent).toContain("야근 끝나면 라면 먹어!");
  expect(seen.has("r1")).toBe(true);
  tapId(ids.answer("r1"));
  await settle();
  expect(present(chat.screen)).toBe(true);
  expect(screen.getByTestId(fsIds.quoteBar).textContent).toContain("Replying about your story");
  tapId(chat.field);
  tapKeys("ㅇ", "ㅏ", "ㄴ");
  tapId(chat.send);
  await settle();
  const source = await appChatSource();
  const mine = source
    ?.thread("owner")
    ?.messages.filter((m) => m.kind === "text" && m.from === "me");
  expect(mine?.[(mine?.length ?? 0) - 1]).toMatchObject({
    story: { storyId: "ms-1", kind: "mine" },
  });
});

test("MSI2. 내 스토리를 못 읽거나 꺼져 있으면 「+」가 없다", async () => {
  serverRemote("fail");
  await openMessenger();
  expect(present(ids.create)).toBe(false);
  cleanup();
  serverRemote({ enabled: false, keep: true, stories: [] });
  await openMessenger();
  expect(present(ids.create)).toBe(false);
});
