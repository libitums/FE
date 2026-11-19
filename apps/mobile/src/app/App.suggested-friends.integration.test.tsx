import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, screen } from "@lynx-js/react/testing-library";

import { COMPANION_CATALOG } from "../screens/messenger-chat/companion-roster";
import {
  friendDirectoryTestIds as dir,
  suggestedFriendsTestIds as ids,
} from "../screens/messenger-chat/suggested-friends.contract";
import { App } from "./App";
import { messengerUnlockStore } from "./messenger-chat-wiring";
import type { ChatRemote } from "../screens/messenger-chat/chat-remote.contract";
import { setEarlyAccessRemote, setFriendCatalogForTests } from "./suggested-friends-wiring";
import {
  openTab,
  present,
  pressSystemBack,
  renderTesterApp,
  resetMessengerChatSource,
  tapId,
} from "./test-helpers/messenger-chat-app";
import { legacyPassedSeed } from "./test-helpers/progress-seed";

// `integration` 계층(SFI1 ~ SFI3): 실제 App · 메신저 탭 · 가짜 출처 싱글턴 · 해금 저장(메모리) · 추천 친구 결선. 앱 카탈로그에
// 일반 인물 하나(가짜 출처의 잠긴 방 「점원」)를 끼워, Start chatting이 해금과 같은 길(출처 unlockCharacter + 해금 저장)로 방을
// 여는지, 잠긴 이야기 인물(미나)은 먼저 만나기가 꺼져 단추가 없는지, 친구 찾기가 시스템 뒤로가기로 닫히는지 봅니다.

const clerk = {
  id: "clerk",
  name: "점원",
  avatarPath: null,
  kind: "general",
  unlockEpisodeId: null,
  unlockEpisode: null,
  intro: { en: "Works at the corner store" },
  tags: [],
  category: null,
  sheetOpening: null,
  earlyAccess: null,
} as const;

beforeEach(async () => {
  await resetMessengerChatSource();
  setFriendCatalogForTests({
    characters: [...COMPANION_CATALOG.characters, clerk],
    categories: [],
  });
});
afterEach(() => {
  setFriendCatalogForTests(null);
  setEarlyAccessRemote(null);
  cleanup();
  (lynx as unknown as { __globalProps: unknown }).__globalProps = undefined;
  vi.useRealTimers();
});

const rowAvatars = (): (string | null)[] =>
  Array.from(
    screen.getByTestId(ids.row).querySelectorAll('[data-testid^="suggested-friends-avatar-"]'),
  ).map((el) => el.getAttribute("data-testid"));

test("SFI1. 일반 인물 Start chatting → 목록 맨 위 NEW 줄 · 해금 저장 · 줄에서 빠짐 · 토스트", async () => {
  await renderTesterApp(<App progressSeed={legacyPassedSeed} />);
  openTab("messenger");
  expect(rowAvatars()).toEqual([ids.avatar("clerk"), ids.avatar("mina")]);

  fireEvent.tap(screen.getByTestId(ids.avatar("clerk")), {});
  tapId(ids.sheetStart);

  expect(present("messenger-list-row-clerk")).toBe(true);
  expect(present("messenger-list-row-clerk-new")).toBe(true);
  expect(messengerUnlockStore().read().has("clerk")).toBe(true);
  expect(rowAvatars()).toEqual([ids.avatar("mina")]);
  expect(screen.getByTestId(ids.toast).textContent).toContain("점원 added to your chats");
});

test("SFI2. 잠긴 미나 → 잠긴 시트, 운영에서는 먼저 만나기가 꺼져 Chat now가 없다", async () => {
  await renderTesterApp(<App progressSeed={legacyPassedSeed} />);
  openTab("messenger");
  expect(present(ids.early("mina"))).toBe(false);
  fireEvent.tap(screen.getByTestId(ids.avatar("mina")), {});
  expect(screen.getByTestId(ids.sheetIntro).textContent).toBe("You'll meet in Episode 3");
  expect(present(ids.sheetEarly)).toBe(false);
  pressSystemBack();
  expect(present(ids.sheet)).toBe(false);
  expect(present("messenger-list-screen")).toBe(true);
});

test("SFI3. See all → 친구 찾기, 시스템 뒤로가기로 목록에 돌아온다", async () => {
  await renderTesterApp(<App progressSeed={legacyPassedSeed} />);
  openTab("messenger");
  fireEvent.tap(screen.getByTestId(ids.seeAll), {});
  expect(present(dir.screen)).toBe(true);
  expect(screen.getByTestId(dir.action("mina")).getAttribute("data-action")).toBe("locked");
  pressSystemBack();
  expect(present(dir.screen)).toBe(false);
  expect(present(ids.row)).toBe(true);
});

test("SFI4. 서버 포트가 끼워지면 제안이 줄에 서고, Chat now · 100이 RPC를 부른 뒤 해금과 같은 길로 방을 연다", async () => {
  const unlock = vi.fn(async () => ({ result: "unlocked", shortBy: null, balance: 220 }) as const);
  setEarlyAccessRemote(
    () =>
      ({
        earlyAccess: {
          offers: async () => [{ characterId: "mina", price: 100, endsAt: null }],
          unlock,
        },
      }) as unknown as ChatRemote,
  );
  await renderTesterApp(<App progressSeed={legacyPassedSeed} />);
  openTab("messenger");
  await act(async () => {
    await Promise.resolve();
  });
  expect(screen.getByTestId(ids.early("mina")).textContent).toBe("EARLY · 100");
  fireEvent.tap(screen.getByTestId(ids.avatar("mina")), {});
  tapId(ids.sheetEarly);
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
  expect(unlock).toHaveBeenCalledWith("mina");
  expect(present("messenger-list-row-mina-new")).toBe(true);
  expect(messengerUnlockStore().read().has("mina")).toBe(true);
  expect(screen.getByTestId(ids.toast).textContent).toContain("미나 added to your chats");
});
