import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, screen } from "@lynx-js/react/testing-library";

import { memoryUnlockStore } from "../screens/messenger-chat/chat-local-stores";
import { chatFixtureSeed } from "../screens/messenger-chat/chat-fixture";
import type { ChatRemote } from "../screens/messenger-chat/chat-remote.contract";
import { COMPANION_FRIENDS } from "../screens/messenger-chat/companion-friends-roster";
import { companionSeed } from "../screens/messenger-chat/companion-roster";
import { friendStoriesTestIds as ids } from "../screens/messenger-chat/friend-stories.contract";
import { story } from "../screens/messenger-chat/friend-stories.test-support";
import {
  messengerChatTestIds as chat,
  messengerListTestIds as rows,
} from "../screens/messenger-chat/messenger-chat.contract";
import { suggestedFriendsTestIds as suggestedIds } from "../screens/messenger-chat/suggested-friends.contract";
import { App } from "./App";
import { setFriendStoriesStoresForTests } from "./friend-stories-wiring";
import {
  messengerUnlockStore,
  resetMessengerChatSourceForTests,
  setMessengerChatStoresForTests,
} from "./messenger-chat-wiring";
import { setAdultAckAskedStoreForTests, setEarlyAccessRemote } from "./suggested-friends-wiring";
import { openTab, present, renderTesterApp, tapId } from "./test-helpers/messenger-chat-app";
import { legacyPassedSeed } from "./test-helpers/progress-seed";

// `integration` 계층(SEI1, 2026-11-25 보고): 실제 App · 메신저 탭 · 스토리 결선 · 추천 친구 결선(먼저 만나기 RPC 가짜 서버 포트).
// 잠긴 미나의 스토리 → 위 아바타(프로필) → Chat now · 100 → 서버 unlocked → 해금 저장 · 대화방(인용 띠)이 열리고, 목록으로 돌아오면
// 미나는 친구 칸에 서며 다시 Chat now · 100을 보이지 않는다.

const NOW = Date.now();
const HOUR = 3_600_000;

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

test("SEI1. 잠긴 친구 스토리 → Chat now · 100 → 열림: 보기에 남아 답장 칸(D5 개정 ⟨보기에서 추가⟩) · 해금 저장, 닫으면 친구 칸 · 목록에 방 · 다시 사라고 하지 않는다", async () => {
  const unlock = vi.fn(async () => ({ result: "unlocked", shortBy: null, balance: 120 }) as const);
  setEarlyAccessRemote(
    () =>
      ({
        earlyAccess: {
          offers: async () => [{ characterId: "mina", price: 100, endsAt: null }],
          unlock,
        },
        friends: { visible: async () => [], ackAdult: async () => true },
        stories: {
          list: async () => [
            story("mina", { id: "st-mina", postedAt: NOW - HOUR, expiresAt: NOW + 23 * HOUR }),
          ],
        },
      }) as unknown as ChatRemote,
  );
  await renderTesterApp(<App progressSeed={legacyPassedSeed} />);
  openTab("messenger");
  await settle();
  tapId(ids.unmet("mina"));
  tapId(ids.profile);
  expect(screen.getByTestId(suggestedIds.sheetEarly).textContent).toContain("Chat now · 100");
  tapId(suggestedIds.sheetEarly);
  await settle();
  expect(unlock).toHaveBeenCalledTimes(1);
  expect(messengerUnlockStore().read().has("mina")).toBe(true);
  expect(present(chat.screen)).toBe(false);
  expect(present(ids.replyInput)).toBe(true);
  tapId(ids.close);
  await settle();
  expect(present(rows.row("mina"))).toBe(true);
  expect(present(ids.unmet("mina"))).toBe(false);
  expect(present(ids.friend("mina"))).toBe(true);
});
