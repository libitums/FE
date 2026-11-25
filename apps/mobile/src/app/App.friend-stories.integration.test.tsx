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
import { contentSyncEventName } from "./use-episode-content-refresh";
import {
  appChatSource,
  openTab,
  present,
  renderTesterApp,
  tapId,
} from "./test-helpers/messenger-chat-app";
import { legacyPassedSeed } from "./test-helpers/progress-seed";
import { nativeInput } from "../screens/messenger-chat/chat-ui.test-support";

// `integration` 계층(FSI1 ~ FSI11, ADR-0178): 실제 App · 메신저 탭 · 스토리 결선(`friend-stories-wiring`) · 가짜 서버 포트
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

test("FSI1. 목록 → 친구 스토리 → 칩: 보기에 남은 채 그 방에 인용과 함께 보내고 「Sent」, Open chat → 방", async () => {
  serverRemote(live);
  await openMessenger();
  expect(present(ids.row)).toBe(true);
  tapId(ids.friend("owner"));
  expect(present(ids.viewer)).toBe(true);
  tapId(ids.chip(0));
  await settle();
  expect(present(ids.viewer)).toBe(true);
  expect(present(chat.screen)).toBe(false);
  expect(screen.getByTestId(ids.sent).textContent).toContain("Sent");
  const source = await appChatSource();
  const mine = source
    ?.thread("owner")
    ?.messages.filter((m) => m.kind === "text" && m.from === "me");
  expect(mine?.[(mine?.length ?? 0) - 1]).toMatchObject({
    text: { ko: "맛있겠다!" },
    story: { storyId: "st-owner" },
  });
  tapId(ids.openChat);
  await settle();
  expect(present(chat.screen)).toBe(true);
  expect(screen.getByTestId(ids.quote).textContent).toContain("You replied to 사장님's story");
});

test("FSI2. 답장 칸에 쓰고 보내기 → 보기를 떠나지 않고 인용과 함께 보냄 · 칸이 비고, 목록 줄은 본 것", async () => {
  serverRemote(live);
  await openMessenger();
  expect(screen.getByTestId(list.rowPreview("owner")).textContent).toContain("New story");
  tapId(ids.friend("owner"));
  act(() => {
    nativeInput("focus", "", ids.replyInput);
    nativeInput("input", "저도 라면 좋아해요", ids.replyInput);
  });
  tapId(ids.replySend);
  await settle();
  expect(present(ids.viewer)).toBe(true);
  expect(screen.getByTestId(ids.replyInput).getAttribute("default-value") ?? "").toBe("");
  const source = await appChatSource();
  const mine = source
    ?.thread("owner")
    ?.messages.filter((m) => m.kind === "text" && m.from === "me");
  expect(mine?.[(mine?.length ?? 0) - 1]).toMatchObject({
    text: { ko: "저도 라면 좋아해요" },
    story: { storyId: "st-owner" },
  });
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

test("FSI7. 목록을 연 뒤 올라온 스토리 — 다른 탭에 갔다 채팅 탭으로 돌아오면 다시 읽어 줄에 선다(ADR-0178 「다시 읽기」)", async () => {
  const { list } = serverRemote([]);
  await openMessenger();
  expect(present(ids.row)).toBe(false);
  list.mockResolvedValue(live);
  openTab("journey");
  await settle();
  openTab("messenger");
  await settle();
  expect(list).toHaveBeenCalledTimes(2);
  expect(present(ids.friend("owner"))).toBe(true);
});

test("FSI8. 목록을 연 뒤 올라온 스토리 — 앱이 앞으로 오면(contentSyncOpportunity) 그 자리에서 다시 읽어 줄에 선다", async () => {
  const { list } = serverRemote([]);
  await openMessenger();
  expect(present(ids.row)).toBe(false);
  list.mockResolvedValue(live);
  act(() => {
    lynx.getJSModule("GlobalEventEmitter").emit(contentSyncEventName, []);
  });
  await settle();
  expect(list).toHaveBeenCalledTimes(2);
  expect(present(ids.friend("owner"))).toBe(true);
});

test("FSI9. 줄은 스토리 있는 인물을 최신 순(친구 · 안 만난 친구 함께, 구분 선 없음), Watch all의 다음 인물도 그 순서", async () => {
  serverRemote([
    ...live,
    story("guesthouse", {
      id: "st-guesthouse",
      postedAt: NOW - HOUR / 2,
      expiresAt: NOW + 23 * HOUR,
    }),
  ]);
  await openMessenger();
  const faces = Array.from(screen.getByTestId(ids.row).querySelectorAll("[data-testid]"))
    .map((el) => el.getAttribute("data-testid") ?? "")
    .filter((id) => /^friend-stories-(friend|unmet)-/.test(id));
  expect(faces).toEqual([ids.friend("guesthouse"), ids.unmet("daeun"), ids.friend("owner")]);
  expect(present("friend-stories-divider")).toBe(false);
  tapId(ids.watchAll);
  expect(screen.getByTestId(ids.name).textContent).toContain("익선 게스트하우스");
  tapId(ids.next);
  expect(screen.getByTestId(ids.name).textContent).toContain("사장님");
});

test("FSI10. 한 인물의 스토리 여럿 — 진행 막대는 그 인물만, 다 보면 닫히고 줄 칸은 가장 새 것", async () => {
  serverRemote([
    story("owner", { id: "st-owner-1", postedAt: NOW - 3 * HOUR, expiresAt: NOW + 21 * HOUR }),
    story("owner", { id: "st-owner-2", postedAt: NOW - HOUR, expiresAt: NOW + 23 * HOUR }),
    story("daeun", { id: "st-daeun", postedAt: NOW - HOUR, expiresAt: NOW + 23 * HOUR }),
  ]);
  await openMessenger();
  tapId(ids.friend("owner"));
  expect(screen.getByTestId(ids.progress).getAttribute("accessibility-label")).toBe("Story 1 of 2");
  tapId(ids.next);
  expect(screen.getByTestId(ids.progress).getAttribute("accessibility-label")).toBe("Story 2 of 2");
  tapId(ids.next);
  expect(present(ids.viewer)).toBe(false);
  expect(seen.has("st-owner-1") && seen.has("st-owner-2")).toBe(true);
});

test("FSI11. 보기 위 아바타 → 프로필 시트(보기는 덮임) → Start chatting: 보기를 닫고 그 방, 안 만난 친구는 추천 시트", async () => {
  serverRemote(live);
  await openMessenger();
  tapId(ids.friend("owner"));
  tapId(ids.profile);
  expect(present(suggestedIds.sheet)).toBe(true);
  expect(screen.getByTestId(suggestedIds.sheetName).textContent).toBe("사장님");
  expect(screen.getByTestId(ids.viewer).getAttribute("accessibility-elements-hidden")).toBe("true");
  tapId(suggestedIds.sheetStart);
  await settle();
  expect(present(ids.viewer)).toBe(false);
  expect(present(suggestedIds.sheet)).toBe(false);
  expect(present(chat.screen)).toBe(true);

  cleanup();
  serverRemote(live);
  await openMessenger();
  tapId(ids.unmet("daeun"));
  tapId(ids.profile);
  expect(screen.getByTestId(suggestedIds.sheetName).textContent).toBe("송다은");
  expect(present(ids.viewer)).toBe(true);
});

test("FSI6. 스토리를 못 읽으면 추천 줄 그대로 · 오류 없음", async () => {
  serverRemote("fail");
  await openMessenger();
  expect(present(ids.row)).toBe(false);
  expect(present(suggestedIds.row)).toBe(true);
});
