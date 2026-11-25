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
  type MyTextStoryDraft,
} from "../screens/messenger-chat/my-stories.contract";
import { myStory } from "../screens/messenger-chat/my-stories.test-support";
import { App } from "./App";
import { setFriendStoriesStoresForTests } from "./friend-stories-wiring";
import {
  resetMessengerChatSourceForTests,
  setMessengerChatStoresForTests,
} from "./messenger-chat-wiring";
import { setAdultAckAskedStoreForTests, setEarlyAccessRemote } from "./suggested-friends-wiring";
import { nativeInput } from "../screens/messenger-chat/chat-ui.test-support";
import {
  appChatSource,
  openTab,
  present,
  renderTesterApp,
  tapId,
  tapKeys,
} from "./test-helpers/messenger-chat-app";
import { legacyPassedSeed } from "./test-helpers/progress-seed";

// `integration` 계층(MSI1 ~ MSI3, ADR-0194 · ADR-0191): 실제 App · 메신저 탭 · 스토리 결선(`friend-stories-wiring` → `my-stories-wiring`) ·
// 가짜 서버 포트(`companion_my_stories`). 「Your story」 → 반응 → Open chat → 그 인물 방(인용 띠 없음). 못 읽으면 「+」 없음. 이번 창을
// 썼으면 「+」 자리가 다음 시각이고 누르면 창 시트. 읽기에 기기 UTC 차이를 싣는다.

const NOW = Date.now();
const HOUR = 3_600_000;

function serverRemote(state: MyStoriesState | "fail") {
  const list = vi.fn(async (_tzOffsetMin: number) => {
    if (state === "fail") throw new Error("network");
    return state;
  });
  const postText = vi.fn(async (draft: MyTextStoryDraft) => ({
    result: "ok" as const,
    story: myStory("text-1", {
      kind: "text",
      word: null,
      ko: draft.ko,
      roman: "",
      meaning: draft.meaning ?? "",
      example: null,
      background: draft.background,
      postedAt: Date.now(),
      expiresAt: Date.now() + 24 * HOUR,
    }),
    window: null,
  }));
  const correct = vi.fn(async (_text: string) => ({
    result: "ok" as const,
    correction: {
      kind: "same" as const,
      ko: "오늘 너무 좋았어",
      meaning: "Today was great",
      tip: null,
    },
  }));
  setEarlyAccessRemote(
    () =>
      ({
        earlyAccess: { offers: async () => [], unlock: async () => null },
        friends: { visible: async () => [], ackAdult: async () => true },
        stories: { list: async () => [] },
        myStories: {
          list,
          post: async () => ({ result: "failed" }),
          postText,
          correct,
          remove: async () => true,
          setKeep: async (keep: boolean) => keep,
        },
      }) as unknown as ChatRemote,
  );
  return { list, postText, correct };
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
      messageId: "msg-r1",
      text: "야근 끝나면 라면 먹어!",
      meaning: null,
      at: NOW - HOUR,
    },
  ],
});

test("MSI1. 「Your story」 → 반응 → Open chat: 그 인물 방이 열리고 인용 띠는 없다, 보낸 글은 보통 글 · 본 반응 저장 · 읽기에 UTC 차이", async () => {
  const { list } = serverRemote({
    enabled: true,
    keep: true,
    stories: [withReaction],
    window: null,
    kinds: ["word", "card"],
  });
  await openMessenger();
  expect(list).toHaveBeenCalledWith(-new Date().getTimezoneOffset() || 0);
  expect(present(fsIds.row)).toBe(true);
  expect(present(ids.create)).toBe(true);
  tapId(ids.mine);
  expect(screen.getByTestId(ids.reaction("r1")).textContent).toContain("야근 끝나면 라면 먹어!");
  expect(seen.has("r1")).toBe(true);
  tapId(ids.openChat("r1"));
  await settle();
  expect(present(chat.screen)).toBe(true);
  expect(present(fsIds.quoteBar)).toBe(false);
  tapId(chat.field);
  tapKeys("ㅇ", "ㅏ", "ㄴ");
  tapId(chat.send);
  await settle();
  const source = await appChatSource();
  const mine = source
    ?.thread("owner")
    ?.messages.filter((m) => m.kind === "text" && m.from === "me");
  expect(mine?.[(mine?.length ?? 0) - 1]).not.toHaveProperty("story");
});

test("MSI3. 이번 창을 썼으면 「+」 자리가 시계 + 다음 시각, 누르면 창 시트 · 만들기는 열리지 않는다", async () => {
  const now = new Date();
  const day = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  serverRemote({
    enabled: true,
    keep: true,
    stories: [],
    window: { slot: "day", day, nextAt: NOW + 2 * HOUR, used: true },
    kinds: ["word", "card"],
  });
  await openMessenger();
  expect(present(ids.create)).toBe(false);
  expect(present(ids.next)).toBe(true);
  tapId(ids.next);
  await settle();
  expect(present(ids.windowSheet)).toBe(true);
  expect(present(ids.composer)).toBe(false);
});

test("MSI2. 내 스토리를 못 읽거나 꺼져 있으면 「+」가 없다", async () => {
  serverRemote("fail");
  await openMessenger();
  expect(present(ids.create)).toBe(false);
  cleanup();
  serverRemote({ enabled: false, keep: true, stories: [], window: null, kinds: ["word", "card"] });
  await openMessenger();
  expect(present(ids.create)).toBe(false);
});

test("MSI6. 서버가 글 스토리를 받으면(kinds에 text) 「+」 → Background → Aa → 교정 → Share가 함수 결선으로 글 스토리를 올린다, 없으면 Aa가 없다", async () => {
  const remote = serverRemote({
    enabled: true,
    keep: true,
    stories: [],
    window: null,
    kinds: ["word", "card", "text"],
  });
  await openMessenger();
  tapId(ids.create);
  if (present(ids.guide)) tapId(ids.guideStart);
  tapId(ids.startBackground);
  tapId(ids.swatch("blue"));
  tapId(ids.toolText);
  await act(async () => nativeInput("input", "오늘 너무 좋았어", "ui-lynx-text-field-input"));
  tapId(ids.textCheck);
  await settle();
  expect(remote.correct).toHaveBeenCalledWith("오늘 너무 좋았어");
  tapId(ids.share);
  await settle();
  expect(remote.postText).toHaveBeenCalledWith(
    expect.objectContaining({
      background: "blue",
      ko: "오늘 너무 좋았어",
      meaning: "Today was great",
      original: null,
      overlays: [],
      tzOffsetMin: -new Date().getTimezoneOffset() || 0,
    }),
  );
  expect(present(ids.storyBackground)).toBe(true);
  cleanup();
  serverRemote({ enabled: true, keep: true, stories: [], window: null, kinds: ["word", "card"] });
  await openMessenger();
  tapId(ids.create);
  if (present(ids.guide)) tapId(ids.guideStart);
  tapId(ids.startBackground);
  expect(present(ids.toolText)).toBe(false);
  expect(present(ids.toolWords)).toBe(true);
});
